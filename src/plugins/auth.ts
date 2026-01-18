import * as argon2 from "argon2";
import { createHash, randomBytes } from "crypto";
import type { FastifyReply, FastifyRequest } from "fastify";
import type { JWTPayload } from "jose";
import * as jose from "jose";
import sql from "../db/db.js";

process.loadEnvFile();

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);

export interface UserPayload extends JWTPayload {
	userId: string;
	username: string;
	role: string;
}

declare module "fastify" {
	interface FastifyRequest {
		currentUser: UserPayload;
	}
}

export const hashPassword = async (password: string): Promise<string> => {
	console.log(argon2.hash(password));
	return await argon2.hash(password);
};

export const verifyPassword = async (
	hashedPassword: string,
	plainPassword: string,
): Promise<boolean> => {
	try {
		return await argon2.verify(hashedPassword, plainPassword);
	} catch (err) {
		return false;
	}
};

export const generateToken = async (payload: UserPayload): Promise<string> => {
	const jwt = await new jose.SignJWT(payload)
		.setProtectedHeader({ alg: "HS256" })
		.setIssuedAt()
		.setExpirationTime("1h")
		.sign(JWT_SECRET);
	return jwt;
};

export const createRefreshToken = async (userId: string): Promise<string> => {
	const refreshToken = randomBytes(32).toString("hex");
	const hash = createHash("sha256").update(refreshToken).digest("hex");
	const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

	await sql`
		INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
		VALUES (${userId}, ${hash}, ${expiresAt})
	`;

	return refreshToken;
};

export const verifyRefreshToken = async (
	token: string,
): Promise<UserPayload | null> => {
	try {
		const hash = createHash("sha256").update(token).digest("hex");

		const result = (await sql`
      SELECT rt.user_id, u.username, u.role
      FROM refresh_tokens rt
      INNER JOIN users u ON rt.user_id = u.id
      WHERE rt.token_hash = ${hash}
      AND rt.expires_at > NOW()
    `) as Array<{
			user_id: string;
			username: string;
			role: string;
		}>;

		if (result.length === 0) {
			return null;
		}

		const user = result[0];

		return {
			userId: user.user_id,
			username: user.username,
			role: user.role,
		};
	} catch (err) {
		console.error("Error verifying refresh token:", err);
		return null;
	}
};

export const revokeRefreshToken = async (token: string): Promise<boolean> => {
	try {
		const hash = createHash("sha256").update(token).digest("hex");

		const result = await sql`
      DELETE FROM refresh_tokens
      WHERE token_hash = ${hash}
      RETURNING id
    `;

		return result.length > 0;
	} catch (err) {
		console.error("Error revoking refresh token:", err);
		return false;
	}
};

export const authenticate = async (
	request: FastifyRequest,
	reply: FastifyReply,
) => {
	try {
    const token = request.cookies.accessToken;

    if (!token) {
      return reply.status(401).send({ message: "No token provided" });
    }

    const user = await verifyRefreshToken(token);

    if (!user) {
      return reply.status(401).send({ message: "Invalid token" });
    }

    request.currentUser = user;
  } catch (err) {
    return reply.status(401).send({ message: "Authentication failed" });
  }
};

export const requireRole = (role: string) => {
	return async (request: FastifyRequest, reply: FastifyReply) => {
		if (!request.currentUser) {
			return reply
				.status(401)
				.send({ message: "Unauthorized: Authentication required" });
		}

		if (request.currentUser.role !== role) {
			return reply
				.status(403)
				.send({ message: "Forbidden: Insufficient role" });
		}
	};
};
