import crypto from "node:crypto";
import fcookie from "@fastify/cookie";
import fjwt from "@fastify/jwt";
import dotenv from "dotenv";
import Fastify, { type FastifyReply, type FastifyRequest } from "fastify";
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from "fastify-type-provider-zod";
import sql from "postgres";
import z from "zod";

dotenv.config();

const requiredEnvVars = ["DATABASE_URL", "JWT_SECRET"];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`Variable d'environnement manquante: ${envVar}`);
    process.exit(1);
  }
}

const db = sql(process.env.DATABASE_URL!);

const app = Fastify({
  logger: true,
  bodyLimit: 1048576, // 1MB
}).withTypeProvider<ZodTypeProvider>();

app.setValidatorCompiler(validatorCompiler);
app.setSerializerCompiler(serializerCompiler);

app.register(fjwt, {
  secret: process.env.JWT_SECRET!,
  sign: {
    expiresIn: "15m",
    algorithm: "HS256",
  },
  verify: {
    algorithms: ["HS256"],
  },
});

app.register(fcookie, {
  secret: process.env.JWT_SECRET!,
  parseOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  },
});

const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

const rateLimit = (maxRequests: number, windowMs: number) => {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const clientIP = request.ip;
    const now = Date.now();
    const windowStart = now - windowMs;

    let clientData = rateLimitStore.get(clientIP);

    if (!clientData || clientData.resetTime < windowStart) {
      clientData = { count: 1, resetTime: now + windowMs };
      rateLimitStore.set(clientIP, clientData);
      return;
    }

    if (clientData.count >= maxRequests) {
      return reply.status(429).send({
        error: "Too Many Requests",
        retryAfter: Math.ceil((clientData.resetTime - now) / 1000),
      });
    }

    clientData.count++;
  };
};

declare module "@fastify/jwt" {
  interface FastifyJWT {
    user: { id: number; email: string; role: string };
  }
}

declare module "fastify" {
  interface FastifyInstance {
    authenticate(
      request: import("fastify").FastifyRequest,
      reply: import("fastify").FastifyReply
    ): Promise<void>;
  }
}

const hashPassword = (password: string, salt: string): string => {
  return crypto
    .pbkdf2Sync(password, salt, 100000, 64, "sha512")
    .toString("hex");
};

const verifyPassword = (
  password: string,
  hash: string,
  salt: string
): boolean => {
  return hash === hashPassword(password, salt);
};

app.post(
  "/login",
  {
    preHandler: rateLimit(5, 15 * 60 * 1000), // 5 tentatives par 15 minutes
    schema: {
      body: z.object({
        email: z.string().email().max(254), // Limite RFC
        password: z.string().min(8).max(128), // Limite raisonnable
      }),
      response: {
        200: z.object({
          accessToken: z.string(),
        }),
        401: z.object({
          message: z.string(),
        }),
        500: z.object({
          message: z.string(),
        }),
      },
    },
  },
  async (req, reply) => {
    const { email, password } = req.body;

    try {
      // En production, récupérer depuis la DB avec le hash et salt
      // const user = await db`SELECT id, email, password_hash, salt, role FROM users WHERE email = ${email}`;

      // Simulation pour la démo (À REMPLACER par vraie vérification DB)
      if (email !== "admin@test.com" || password !== "password123") {
        // Délai constant pour éviter les attaques par timing
        await new Promise((resolve) => setTimeout(resolve, 100));
        return reply.status(401).send({ message: "Invalid credentials" });
      }

      const user = { id: 1, email, role: "admin" };

      // Génération des tokens
      const accessToken = app.jwt.sign(user);
      const refreshToken = app.jwt.sign(
        { id: user.id, type: "refresh" },
        { expiresIn: "7d" }
      );

      // Hachage du refresh token pour stockage sécurisé
      const refreshTokenHash = crypto
        .createHash("sha256")
        .update(refreshToken)
        .digest("hex");

      // Stockage du refresh token haché en BDD
      try {
        await db`
          INSERT INTO refresh_tokens (token_hash, user_id, expires_at, created_at) 
          VALUES (${refreshTokenHash}, ${user.id}, NOW() + INTERVAL '7 days', NOW())
          ON CONFLICT (user_id) DO UPDATE SET 
            token_hash = EXCLUDED.token_hash,
            expires_at = EXCLUDED.expires_at,
            created_at = EXCLUDED.created_at
        `;
      } catch (dbError) {
        app.log.error({ err: dbError }, "Erreur stockage refresh token:");
        return reply.status(500).send({ message: "Internal server error" });
      }

      reply.setCookie("refreshToken", refreshToken, {
        path: "/",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60,
      });

      return { accessToken };
    } catch (error) {
      app.log.error({ err: error }, "Erreur lors de la connexion:");
      return reply.status(500).send({ message: "Internal server error" });
    }
  }
);

app.post(
  "/refresh",
  {
    preHandler: rateLimit(10, 15 * 60 * 1000),
    schema: {
      response: {
        200: z.object({ accessToken: z.string() }),
        401: z.object({ message: z.string() }),
        403: z.object({ message: z.string() }),
      },
    },
  },
  async (req, reply) => {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return reply.status(401).send({ message: "No refresh token provided" });
    }

    try {
      const decoded = app.jwt.verify<{ id: number; type: string }>(
        refreshToken
      );

      if (decoded.type !== "refresh") {
        return reply.status(403).send({ message: "Invalid token type" });
      }

      const refreshTokenHash = crypto
        .createHash("sha256")
        .update(refreshToken)
        .digest("hex");
      const storedToken = await db`
        SELECT user_id, expires_at FROM refresh_tokens 
        WHERE token_hash = ${refreshTokenHash} 
          AND user_id = ${decoded.id}
          AND expires_at > NOW()
          AND revoked = FALSE
      `;

      if (storedToken.length === 0) {
        return reply
          .status(403)
          .send({ message: "Invalid or expired refresh token" });
      }

      const user = await db`
        SELECT id, email, role FROM users WHERE id = ${decoded.id}
      `;

      if (user.length === 0) {
        return reply.status(403).send({ message: "User not found" });
      }

      const newAccessToken = app.jwt.sign({
        id: user[0]?.id,
        email: user[0]?.email,
        role: user[0]?.role,
      });

      return { accessToken: newAccessToken };
    } catch (err) {
      app.log.error({ err }, "Erreur refresh token:");
      return reply
        .status(403)
        .send({ message: "Invalid or expired refresh token" });
    }
  }
);

// Route de déconnexion sécurisée
app.post("/logout", async (req, reply) => {
  const refreshToken = req.cookies.refreshToken;

  if (refreshToken) {
    try {
      const refreshTokenHash = crypto
        .createHash("sha256")
        .update(refreshToken)
        .digest("hex");

      // Marquer le token comme révoqué au lieu de le supprimer (audit trail)
      await db`
        UPDATE refresh_tokens 
        SET revoked = TRUE, revoked_at = NOW() 
        WHERE token_hash = ${refreshTokenHash}
      `;
    } catch (error) {
      app.log.error({ err: error }, "Erreur lors de la révocation du token:");
    }
  }

  // Supprimer le cookie
  reply.clearCookie("refreshToken", {
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });

  return { message: "Successfully logged out" };
});

// Middleware d'authentification sécurisé
app.decorate(
  "authenticate",
  async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      await req.jwtVerify();

      // Vérification supplémentaire : l'utilisateur existe-t-il toujours ?
      const user = await db`SELECT id FROM users WHERE id = ${req.user.id}`;
      if (user.length === 0) {
        throw new Error("User not found");
      }
    } catch (err) {
      app.log.warn(
        {
          error: err,
          user: req.user?.id,
        },
        "Échec d'authentification:"
      );
      return reply.status(401).send({ message: "Authentication required" });
    }
  }
);

// Route protégée avec validation stricte
app.get(
  "/dashboard",
  {
    onRequest: [app.authenticate],
    schema: {
      response: {
        200: z.object({
          message: z.string(),
          user: z.object({
            id: z.number(),
            email: z.string(),
            role: z.string(),
          }),
        }),
      },
    },
  },
  async (req) => {
    return {
      message: `Bienvenue utilisateur ${req.user.id}`,
      user: {
        id: req.user.id,
        email: req.user.email,
        role: req.user.role,
      },
    };
  }
);

app.addHook("onRequest", async (request, reply) => {
  reply.header("X-Content-Type-Options", "nosniff");
  reply.header("X-Frame-Options", "DENY");
  reply.header("X-XSS-Protection", "1; mode=block");
  reply.header("Referrer-Policy", "strict-origin-when-cross-origin");

  if (process.env.NODE_ENV === "production") {
    reply.header(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains"
    );
  }
});

app.setErrorHandler((error, request, reply) => {
  request.log.error(error);

  if (process.env.NODE_ENV === "production") {
    reply.status(500).send({ message: "Internal Server Error" });
  } else {
    if (error instanceof Error) {
      reply.status(500).send({ message: error.message, stack: error.stack });
    } else {
      reply.status(500).send({ message: String(error) });
    }
  }
});

const start = async () => {
  try {
    const port = parseInt(process.env.PORT || "3000");
    const host = process.env.HOST || "0.0.0.0";

    await app.listen({ port, host });
    console.log(`Server running on http://localhost:${port}`);

    setInterval(async () => {
      try {
        await db`DELETE FROM refresh_tokens WHERE expires_at < NOW()`;
      } catch (error) {
        app.log.error({ err: error }, "Erreur nettoyage tokens:");
      }
    }, 24 * 60 * 60 * 1000);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
