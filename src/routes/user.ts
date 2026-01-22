import type { FastifyInstance } from "fastify";
import { z } from "zod";
import sql from "../db/db.js";
import { type UserUpdate, UserUpdateSchema } from "../models/User.js";
import { hashPassword } from "../plugins/auth.js";

const UserResponseSchema = z.object({
	id: z.string().uuid(),
	username: z.string(),
	first_name: z.string(),
	last_name: z.string(),
	email: z.string().email(),
	role: z.string(),
	created_at: z.string(),
	updated_at: z.string(),
});

function formatUserResponse(user: any) {
	return {
		...user,
		created_at:
			user.created_at instanceof Date
				? user.created_at.toISOString()
				: user.created_at,
		updated_at:
			user.updated_at instanceof Date
				? user.updated_at.toISOString()
				: user.updated_at,
	};
}

export default async function userRoutes(app: FastifyInstance) {
	app.get(
		"/",
		{
			schema: {
				response: {
					200: z.array(UserResponseSchema),
				},
			},
		},
		async (_request, reply) => {
			const users = await sql`
        SELECT u.*, ua.email
        FROM users u
        INNER JOIN user_auth ua ON u.id = ua.user_id
        ORDER BY u.created_at DESC
      `;

			const formattedUsers = users.map(formatUserResponse);

			return reply.send(formattedUsers);
		},
	);

	app.get<{
		Params: { id: string };
	}>(
		"/:id",
		{
			schema: {
				params: z.object({
					id: z.string().uuid(),
				}),
				response: {
					200: UserResponseSchema,
				},
			},
		},
		async (request, reply) => {
			const { id } = request.params;

			const result = await sql`
        SELECT u.*, ua.email
        FROM users u
        INNER JOIN user_auth ua ON u.id = ua.user_id
        WHERE u.id = ${id}
      `;

			const user = result[0];

			if (!user) {
				return reply.status(404).send({ message: "User not found" });
			}

			return reply.send(formatUserResponse(user));
		},
	);

	app.put<{
		Params: { id: string };
		Body: UserUpdate;
	}>(
		"/:id",
		{
			schema: {
				params: z.object({
					id: z.string().uuid(),
				}),
				body: UserUpdateSchema,
				response: {
					200: UserResponseSchema,
				},
			},
		},
		async (request, reply) => {
			const { id } = request.params;
			const { username, first_name, last_name, email, password } = request.body;

			const existingUser = await sql`
        SELECT u.*, ua.email
        FROM users u
        INNER JOIN user_auth ua ON u.id = ua.user_id
        WHERE u.id = ${id}
      `;

			if (existingUser.length === 0) {
				return reply.status(404).send({ message: "User not found" });
			}

			if (username) {
				const usernameExists = await sql`
          SELECT * FROM users 
          WHERE username = ${username} AND id != ${id}
        `;
				if (usernameExists.length > 0) {
					return reply.status(400).send({ message: "Username already in use" });
				}
			}

			if (email) {
				const emailExists = await sql`
          SELECT * FROM user_auth 
          WHERE email = ${email} AND user_id != ${id}
        `;
				if (emailExists.length > 0) {
					return reply.status(400).send({ message: "Email already in use" });
				}
			}

			const updatedUser = await sql.begin(async (sql) => {
				if (username || first_name || last_name) {
					await sql`
            UPDATE users
            SET 
              username = COALESCE(${username ?? null}, username),
              first_name = COALESCE(${first_name ?? null}, first_name),
              last_name = COALESCE(${last_name ?? null}, last_name),
              updated_at = NOW()
            WHERE id = ${id}
          `;
				}

				if (email || password) {
					const hashedPassword = password ? await hashPassword(password) : null;

					await sql`
            UPDATE user_auth
            SET 
              email = COALESCE(${email ?? null}, email),
              password_hash = COALESCE(${hashedPassword}, password_hash)
            WHERE user_id = ${id}
          `;
				}

				const result = await sql`
          SELECT u.*, ua.email
          FROM users u
          INNER JOIN user_auth ua ON u.id = ua.user_id
          WHERE u.id = ${id}
        `;

				return result[0];
			});

			return reply.send(formatUserResponse(updatedUser));
		},
	);

	app.delete<{
		Params: { id: string };
	}>(
		"/:id",
		{
			schema: {
				params: z.object({
					id: z.string().uuid(),
				}),
				response: {
					200: z.object({
						message: z.string(),
					}),
				},
			},
		},
		async (request, reply) => {
			const { id } = request.params;

			const existingUser = await sql`
        SELECT * FROM users WHERE id = ${id}
      `;

			if (existingUser.length === 0) {
				return reply.status(404).send({ message: "User not found" });
			}

			await sql`
        DELETE FROM users WHERE id = ${id}
      `;

			return reply.send({ message: "User deleted successfully" });
		},
	);
}
