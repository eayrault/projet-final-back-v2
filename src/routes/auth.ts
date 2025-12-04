import cookie from "@fastify/cookie";
import type { FastifyInstance, FastifyReply, FastifyRequest, FastifySchema } from "fastify";
import sql from "../db/db.js";
import {
	generateToken,
	hashPassword,
	type UserPayload,
	verifyPassword,
} from "../plugins/auth.js";
import {
  UserLoginSchema,
  UserSchema,
  UserRegisterSchema,
  type UserRegister,
  type UserLogin,
} from "../models/User.js";
import { ZodTypeProvider } from "fastify-type-provider-zod";

interface UserInterface {
    id: string;
    username: string;
    first_name: string;
    last_name: string;
    email: string;
    password: string;
    role: string;
    created_at: string;
    updated_at: string;
}

export default async function authRoutes(app: FastifyInstance) {
    app.post<{ Body: UserRegister }>(
      "/register",
      {
        schema: {
          body: UserRegisterSchema,
          response: {
            201: UserSchema.omit({ password: true }),
          },
        } as FastifySchema,
      },
      async (request, reply) => {
        const { username, first_name, last_name, email, password } =
          request.body;

        const existingUser = (await sql`
        SELECT * FROM users WHERE email = ${email}
      `) as UserInterface[];
        if (existingUser.length > 0) {
          return reply.status(400).send({ message: "Email already in use" });
        }

        const hashedPassword = await hashPassword(password);

        const newUser = await sql`
                INSERT INTO users (username, first_name, last_name, email, password)
                VALUES (${username}, ${first_name}, ${last_name}, ${email}, ${hashedPassword})
                RETURNING id, username, first_name, last_name, email, created_at AS "createdAt", updated_at AS "updatedAt"
            `;

        return reply.status(201).send(newUser[0]);
      }
    );

    app.post<{ Body: UserLogin}>(
        "/login",
        {
            schema: {
                body: UserLoginSchema,
            } as FastifySchema,
        },
        async (request, reply) => {
            const { email, password } = request.body;

            const users = await sql`SELECT * FROM users WHERE email = ${email}`;
            const user = users[0];

            if (!user) {
                return reply.status(400).send({ message: "Invalid email or password" });
            }

            const isPasswordValid = await verifyPassword(user.password, password);
            if (!isPasswordValid) {
                return reply.status(400).send({ message: "Invalid email or password" });
            }

            const payload: UserPayload = {
                userId: user.id,
                username: user.username,
                role: user.role,
            };

            const token = await generateToken(payload);

            reply.setCookie("token", token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "strict",
                maxAge: 3600,
            });

            return reply.send({ message: "Login successful" });
        }
    );

    app.post("/logout", async (request: FastifyRequest, reply: FastifyReply) => {
        reply.clearCookie("token", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
        });
        return reply.send({ message: "Logout successful" });
    });
}
