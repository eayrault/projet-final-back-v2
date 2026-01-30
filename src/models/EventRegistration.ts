import { z } from "zod";

export const EventRegistrationCreateSchema = z.object({
	event_id: z.string().uuid(),
});

export const EventRegistrationSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  event_id: z.string().uuid(),
  registered_at: z.date(),
});

export const EventRegistrationWithDetailsSchema = EventRegistrationSchema.extend({
  event_name: z.string(),
  event_description: z.string().nullable(),
  event_start_date: z.date(),
  username: z.string(),
});

export type EventRegistrationCreate = z.infer<
	typeof EventRegistrationCreateSchema
>;
export type EventRegistration = z.infer<typeof EventRegistrationSchema>;
export type EventRegistrationWithDetails = z.infer<
	typeof EventRegistrationWithDetailsSchema
>;
