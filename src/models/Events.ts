import { z } from "zod";

export const EventSchema = z.object({
	id: z.string().uuid().optional(),
	name: z.string().min(1).max(255),
	description: z.string().optional(),
	attendees: z.number().int().min(0).default(0),
	start_date: z.string().datetime(),
	created_at: z.string().optional(),
	updated_at: z.string().optional(),
});

export const EventCreateSchema = EventSchema.omit({
	id: true,
	created_at: true,
	updated_at: true,
	attendees: true,
});

export const EventUpdateSchema = EventCreateSchema.partial();

export const EventResponseSchema = z.object({
	id: z.string().uuid(),
	name: z.string(),
	description: z.string().nullable(),
	attendees: z.number().int(),
	start_date: z.string(),
	created_at: z.string(),
	updated_at: z.string(),
});

export type Event = z.infer<typeof EventSchema>;
export type EventCreate = z.infer<typeof EventCreateSchema>;
export type EventUpdate = z.infer<typeof EventUpdateSchema>;
export type EventResponse = z.infer<typeof EventResponseSchema>;
