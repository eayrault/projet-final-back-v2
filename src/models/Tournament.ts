import { z } from "zod";

export const TournamentSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  attendees: z.number().int(),
  game_id: z.string().uuid(),
  event_id: z.string().uuid(),
  start_date: z.date(),
  end_date: z.date(),
  created_at: z.date(),
  updated_at: z.date(),
});

export const TournamentCreateSchema = z.object({
  name: z.string().min(3).max(200),
  description: z.string().optional(),
  game_id: z.string().uuid(),
  event_id: z.string().uuid(),
  start_date: z.iso.datetime(),
  end_date: z.iso.datetime(),
});

export const TournamentUpdateSchema = z.object({
  name: z.string().min(3).max(200).optional(),
  description: z.string().optional(),
  game_id: z.string().uuid().optional(),
  event_id: z.string().uuid().optional(),
  start_date: z.iso.datetime().optional(),
  end_date: z.iso.datetime().optional(),
});

export const TournamentDetailsSchema = TournamentSchema.extend({
	game_name: z.string(),
	event_name: z.string(),
});

export type TournamentCreate = z.infer<typeof TournamentCreateSchema>;
export type TournamentUpdate = z.infer<typeof TournamentUpdateSchema>;
export type Tournament = z.infer<typeof TournamentSchema>;
export type TournamentDetails = z.infer<typeof TournamentDetailsSchema>;
