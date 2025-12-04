import { z } from "zod";

export const UserSchema = z.object({
	username: z.string().min(3).max(30),
	first_name: z.string().min(1).max(50),
	last_name: z.string().min(1).max(50),
	email: z.email(),
	password: z.string().min(6),
	created_at: z.string().optional(),
	updated_at: z.string().optional(),
});

export const UserUpdateSchema = UserSchema.partial().extend({
	password: z.string().min(6).optional(),
});

export const UserRegisterSchema = UserSchema.omit({
	created_at: true,
	updated_at: true,
});

export const UserLoginSchema = z.object({
	email: z.email(),
	password: z.string().min(6),
});

export type User = z.infer<typeof UserSchema>;
export type UserUpdate = z.infer<typeof UserUpdateSchema>;
export type UserLogin = z.infer<typeof UserLoginSchema>;
export type UserRegister = z.infer<typeof UserRegisterSchema>;
