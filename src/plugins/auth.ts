import * as argon2 from "argon2";
import { randomBytes, createHash } from "crypto";
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
  plainPassword: string
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
  token: string
): Promise<UserPayload | null> => {
  try {
    const { payload } = await jose.jwtVerify(token, JWT_SECRET);
    return payload as unknown as UserPayload;
  } catch (err) {
    return null;
  }
};

export const revokeRefreshToken = async (token: string): Promise<void> => {
  const hash = createHash("sha256").update(token).digest("hex");

  await sql`
  		SELECT user_id
		FROM refresh_tokens
		WHERE token_hash = ${hash}
		AND expires_at > NOW()
	`;
};

export const authenticate = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const header = request.cookies.token;

  if (!header) {
    return reply
      .status(401)
      .send({ message: "Unauthorized: No token provided" });
  }
  const token = header.split(" ")[1];
  const user = await verifyRefreshToken(token);

  if (!user) {
    return reply.status(401).send({ message: "Unauthorized: Invalid token" });
  }

  request.currentUser = user;
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
