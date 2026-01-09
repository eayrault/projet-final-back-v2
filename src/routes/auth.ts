import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import sql from "../db/db.js";
import {
  type UserLogin,
  UserLoginResponse,
  UserLoginSchema,
  type UserRefreshToken,
  UserRefreshTokenSchema,
  type UserRegister,
  UserRegisterResponse,
  UserRegisterSchema,
} from "../models/User.js";
import {
  createRefreshToken,
  generateToken,
  hashPassword,
  revokeRefreshToken,
  verifyPassword,
  verifyRefreshToken,
} from "../plugins/auth.js";

interface UserInterface {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  created_at: string;
  updated_at: string;
}

export default async function authRoutes(app: FastifyInstance) {
  app.withTypeProvider<ZodTypeProvider>().post<{ Body: UserRegister }>(
    "/register",
    {
      schema: {
        body: UserRegisterSchema,
        response: {
          201: UserRegisterResponse,
        },
      },
    },
    async (request, reply) => {
      const { username, first_name, last_name, email, password } = request.body;

      const existingUser = await sql`
        SELECT * FROM user_auth WHERE email = ${email}
      `;
      if (existingUser.length > 0) {
        return reply.status(400).send({ message: "Email already in use" });
      }

      const existingUsername = await sql`
      SELECT * FROM users WHERE username = ${username}
    `;
      if (existingUsername.length > 0) {
        return reply.status(400).send({ message: "Username already in use" });
      }

      const hashedPassword = await hashPassword(password);

      const newUser = await sql.begin(async (sql) => {
        const [user] = await sql<UserInterface[]>`
        INSERT INTO users (username, first_name, last_name)
        VALUES (${username}, ${first_name}, ${last_name})
        RETURNING *
      `;

        await sql`
        INSERT INTO user_auth (user_id, email, password_hash)
        VALUES (${user.id}, ${email}, ${hashedPassword})
      `;

        return { ...user, email };
      });

      return reply
        .status(201)
        .send({ username: newUser.username, email: newUser.email });
    }
  );

  app.withTypeProvider<ZodTypeProvider>().post<{ Body: UserLogin }>(
    "/login",
    {
      schema: {
        body: UserLoginSchema,
        response: { 200: UserLoginResponse },
      },
    },
    async (request, reply) => {
      const { email, password } = request.body;

      const result = await sql`
        SELECT u.*, ua.email, ua.password_hash 
        FROM users u
        INNER JOIN user_auth ua ON u.id = ua.user_id
        WHERE ua.email = ${email}
      `;

      const user = result[0];

      if (!user) {
        return reply.status(400).send({ message: "Invalid email or password" });
      }

      const isPasswordValid = await verifyPassword(
        user.password_hash,
        password
      );
      if (!isPasswordValid) {
        return reply.status(400).send({ message: "Invalid email or password" });
      }

      const accessToken = await generateToken({
        userId: user.id,
        username: user.username,
        role: user.role,
      });

      const refreshToken = await createRefreshToken(user.id);

      return reply.send({ accessToken, refreshToken });
    }
  );

  app.withTypeProvider<ZodTypeProvider>().post<{ Body: UserRefreshToken }>(
    "/logout",
    {
      schema: {
        body: UserRefreshTokenSchema,
      },
    },
    async (request, reply) => {
      try {
        const { refreshToken } = request.body;

        if (!refreshToken) {
          return reply.status(400).send({ message: "Refresh token required" });
        }

        const revoked = await revokeRefreshToken(refreshToken);

        if (!revoked) {
          return reply.status(400).send({ message: "Invalid refresh token" });
        }

        return reply.send({ message: "Logout successful" });
      } catch (error) {
        console.error("Logout error:", error);
        return reply.status(500).send({ message: "Internal server error" });
      }
    }
  );

  app.withTypeProvider<ZodTypeProvider>().post<{ Body: UserRefreshToken }>(
    "/refresh",
    {
      schema: {
        body: UserRefreshTokenSchema,
        response: {
          200: UserLoginResponse,
        },
      },
    },
    async (request, reply) => {
      try {
        const { refreshToken } = request.body;

        if (!refreshToken) {
          return reply.status(400).send({ message: "Refresh token required" });
        }

        const userPayload = await verifyRefreshToken(refreshToken);

        if (!userPayload) {
          return reply
            .status(401)
            .send({ message: "Invalid or expired refresh token" });
        }

        await revokeRefreshToken(refreshToken);

        const newAccessToken = await generateToken({
          userId: userPayload.userId,
          username: userPayload.username,
          role: userPayload.role,
        });

        const newRefreshToken = await createRefreshToken(userPayload.userId);

        return reply.send({
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
        });
      } catch (error) {
        console.error("Refresh token error:", error);
        return reply.status(500).send({ message: "Internal server error" });
      }
    }
  );
}
