import { z } from "zod";

export const GameSchema = z.object({
	id: z.string().uuid().optional(),
	name: z.string().min(1).max(255),
	descriptions: z.string().optional(),
	created_at: z.string().optional(),
	updated_at: z.string().optional(),
});

export const GameCreateSchema = GameSchema.omit({
	id: true,
	created_at: true,
	updated_at: true,
});

export const GameUpdateSchema = GameCreateSchema.partial();

export const GameResponseSchema = z.object({
	id: z.string().uuid(),
	name: z.string(),
	descriptions: z.string().nullable(),
	created_at: z.string(),
	updated_at: z.string(),
});

export type Game = z.infer<typeof GameSchema>;
export type GameCreate = z.infer<typeof GameCreateSchema>;
export type GameUpdate = z.infer<typeof GameUpdateSchema>;
export type GameResponse = z.infer<typeof GameResponseSchema>;
