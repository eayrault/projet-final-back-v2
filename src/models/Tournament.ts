import { z } from "zod";

export const TournamentSchema = z.object({
	id: z.string().uuid(),
	name: z.string(),
	descriptions: z.string().nullable(),
	attendees: z.number().int(),
	game_id: z.string().uuid(),
	event_id: z.string().uuid(),
	start_date: z.string(),
	created_at: z.string(),
	updated_at: z.string(),
});

export const TournamentCreateSchema = z.object({
	name: z.string().min(3).max(200),
	descriptions: z.string().optional(),
	attendees: z.number().int().min(0).default(0),
	game_id: z.string().uuid(),
	event_id: z.string().uuid(),
	start_date: z.string().datetime(),
});

export const TournamentUpdateSchema = z.object({
	name: z.string().min(3).max(200).optional(),
	descriptions: z.string().optional(),
	attendees: z.number().int().min(0).optional(),
	game_id: z.string().uuid().optional(),
	event_id: z.string().uuid().optional(),
	start_date: z.string().datetime().optional(),
});

export const TournamentDetailsSchema = TournamentSchema.extend({
	game_name: z.string(),
	event_name: z.string(),
});

export type TournamentCreate = z.infer<typeof TournamentCreateSchema>;
export type TournamentUpdate = z.infer<typeof TournamentUpdateSchema>;
export type Tournament = z.infer<typeof TournamentSchema>;
export type TournamentDetails = z.infer<typeof TournamentDetailsSchema>;
