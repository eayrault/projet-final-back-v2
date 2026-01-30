import { z } from "zod";

export const GameSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  created_at: z.date().optional(),
  updated_at: z.date().optional(),
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
  description: z.string().nullable(),
  created_at: z.date(),
  updated_at: z.date(),
});

export type Game = z.infer<typeof GameSchema>;
export type GameCreate = z.infer<typeof GameCreateSchema>;
export type GameUpdate = z.infer<typeof GameUpdateSchema>;
export type GameResponse = z.infer<typeof GameResponseSchema>;
