import cookie from "@fastify/cookie";
import * as argon2 from "argon2";
import type { FastifyReply, FastifyRequest } from "fastify";
import type { JWTPayload } from "jose";
import * as jose from "jose";

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

export const verifyToken = async (
	token: string,
): Promise<UserPayload | null> => {
	try {
		const { payload } = await jose.jwtVerify(token, JWT_SECRET);
		return payload as unknown as UserPayload;
	} catch (err) {
		return null;
	}
};

export const authenticate = async (
	request: FastifyRequest,
	reply: FastifyReply,
) => {
	const token = request.cookies.token;

	if (!token) {
		return reply
			.status(401)
			.send({ message: "Unauthorized: No token provided" });
	}

	const user = await verifyToken(token);

	if (!user) {
		return reply.status(401).send({ message: "Unauthorized: Invalid token" });
	}

	request.currentUser = user;
};
