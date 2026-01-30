import { z } from "zod";

export const EventSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  attendees: z.number().int().min(0).default(0),
  start_date: z.date(),
  end_date: z.date(),
  created_at: z.date().optional(),
  updated_at: z.date().optional(),
});

export const EventCreateSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  start_date: z.iso.datetime(),
  end_date: z.iso.datetime(),
});

export const EventUpdateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  start_date: z.iso.datetime().optional(),
  end_date: z.iso.datetime().optional(),
});

export const EventResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  attendees: z.number().int(),
  start_date: z.date(),
  end_date: z.date(),
  created_at: z.date(),
  updated_at: z.date(),
});

export type Event = z.infer<typeof EventSchema>;
export type EventCreate = z.infer<typeof EventCreateSchema>;
export type EventUpdate = z.infer<typeof EventUpdateSchema>;
export type EventResponse = z.infer<typeof EventResponseSchema>;
