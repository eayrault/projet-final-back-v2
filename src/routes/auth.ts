import type {
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
  FastifySchema,
} from "fastify";
import sql from "../db/db.js";
import {
  createRefreshToken,
  authenticate,
  generateToken,
  hashPassword,
  revokeRefreshToken,
  type UserPayload,
  verifyPassword,
  verifyRefreshToken,
} from "../plugins/auth.js";
import {
  UserLoginSchema,
  UserSchema,
  UserRegisterSchema,
  UserBasicSchema,
  UserRegisterResponse,
  UserLoginSchemaResponse,
  type UserRegister,
  type UserLogin,
} from "../models/User.js";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { hash } from "crypto";

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

      return reply.status(201).send(newUser);
    }
  );

  app.withTypeProvider<ZodTypeProvider>().post<{ Body: UserLogin }>(
    "/login",
    {
      schema: {
        body: UserLoginSchema,
        response: { 200: UserLoginSchemaResponse },
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

  app
    .withTypeProvider<ZodTypeProvider>()
    .post("/logout", async (request: FastifyRequest, reply: FastifyReply) => {
      const { token } = request.cookies;

      if (token) {
        await revokeRefreshToken(token);
      }
      return reply.send({ message: "Logout successful" });
    });

  // app
  //   .withTypeProvider<ZodTypeProvider>()
  //   .post("/refresh", async (request: FastifyRequest, reply: FastifyReply) => {
  //     const { token } = request.cookies;

  //     if (!token) {
  //       return reply.status(401).send({ message: "No token provided" });
  //     }

  //     try {
  //       const payload = await verifyRefreshToken(token);

  //       if (!payload) {
  //         return reply.status(401).send({ message: "Invalid token payload" });
  //       }

  //       const newToken = await generateToken(payload);

  //       reply.setCookie("token", newToken, {
  //         httpOnly: true,
  //         secure: process.env.NODE_ENV === "production",
  //         sameSite: "strict",
  //         maxAge: 3600,
  //       });

  //       return reply.send({ message: "Token refreshed successfully" });
  //     } catch (err) {
  //       return reply.status(401).send({ message: "Invalid token" });
  //     }
  //   });
}
