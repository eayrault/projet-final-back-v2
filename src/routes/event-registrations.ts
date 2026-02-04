import type { FastifyInstance } from "fastify";
import { z } from "zod";
import sql from "../db/db.js";
import {
	type EventRegistration,
	EventRegistrationCreateSchema,
	EventRegistrationSchema,
	type EventRegistrationWithDetails,
	EventRegistrationWithDetailsSchema,
} from "../models/EventRegistration.js";
import { authenticate } from "../plugins/auth.js";

export default async function eventRegistrationRoutes(app: FastifyInstance) {
	app.post<{
    Body: { event_id: string };
  }>(
    "/",
    {
      preHandler: authenticate,
      schema: {
        body: EventRegistrationCreateSchema,
        response: {
          201: z.object({
            message: z.string(),
            registration: EventRegistrationSchema,
          }),
        },
      },
    },
    async (request, reply) => {
      try {
        const { event_id } = request.body;
        const user_id = request.currentUser?.userId;

        const eventExists = await sql`
          SELECT id, name, attendees FROM events WHERE id = ${event_id}
        `;

        if (eventExists.length === 0) {
          return reply.status(404).send({ message: "Event not found" });
        }

        const alreadyRegistered = await sql`
          SELECT id FROM event_registrations 
          WHERE user_id = ${user_id} AND event_id = ${event_id}
        `;

        if (alreadyRegistered.length > 0) {
          return reply.status(400).send({
            message: "You are already registered for this event",
          });
        }

        const result = await sql.begin(async (sql) => {
          const registration = (await sql`
            INSERT INTO event_registrations (user_id, event_id)
            VALUES (${user_id}, ${event_id})
            RETURNING *
          `) as EventRegistration[];

          await sql`
            UPDATE events 
            SET attendees = attendees + 1
            WHERE id = ${event_id}
          `;

          return registration[0];
        });

        return reply.status(201).send({
          message: "Successfully registered for the event",
          registration: result,
        });
      } catch (error) {
        console.error("Error registering for event:", error);
        return reply.status(500).send({ message: "Internal server error" });
      }
    }
  );

  app.delete<{
    Params: { eventId: string };
  }>(
    "/:eventId",
    {
      preHandler: authenticate,
      schema: {
        params: z.object({
          eventId: z.string().uuid(),
        }),
        response: {
          200: z.object({
            message: z.string(),
          }),
        },
      },
    },
    async (request, reply) => {
      try {
        const { eventId } = request.params;
        const user_id = request.currentUser?.userId;

        const registration = await sql`
          SELECT id FROM event_registrations 
          WHERE user_id = ${user_id} AND event_id = ${eventId}
        `;

        if (registration.length === 0) {
          return reply.status(404).send({
            message: "Registration not found",
          });
        }

        await sql.begin(async (sql) => {
          await sql`
            DELETE FROM event_registrations 
            WHERE user_id = ${user_id} AND event_id = ${eventId}
          `;

          await sql`
            UPDATE events 
            SET attendees = GREATEST(0, attendees - 1)
            WHERE id = ${eventId}
          `;
        });

        return reply.send({
          message: "Successfully unregistered from the event",
        });
      } catch (error) {
        console.error("Error unregistering from event:", error);
        return reply.status(500).send({ message: "Internal server error" });
      }
    }
  );

  app.get(
    "/my-events",
    {
      preHandler: authenticate,
      schema: {
        response: {
          200: z.array(EventRegistrationWithDetailsSchema),
          500: z.object({ message: z.string() }),
        },
      },
    },
    async (request, reply) => {
      try {
        const user_id = request.currentUser?.userId;

        const myEvents = (await sql`
          SELECT 
            er.id,
            er.user_id,
            er.event_id,
            er.registered_at,
            e.name as event_name,
            e.description as event_description,
            e.start_date as event_start_date,
            u.username
          FROM event_registrations er
          INNER JOIN events e ON er.event_id = e.id
          INNER JOIN users u ON er.user_id = u.id
          WHERE er.user_id = ${user_id}
          ORDER BY e.start_date ASC
        `) as EventRegistrationWithDetails[];

        return reply.send(myEvents);
      } catch (error) {
        console.error("Error fetching user events:", error);
        return reply.status(500).send({ message: "Internal server error" });
      }
    }
  );

	app.get<{
    Params: { eventId: string };
  }>(
    "/:eventId/participants",
    {
      schema: {
        params: z.object({
          eventId: z.string().uuid(),
        }),
        response: {
          200: z.array(
            z.object({
              user_id: z.string().uuid(),
              username: z.string(),
              first_name: z.string(),
              last_name: z.string(),
              registered_at: z.date(),
            })
          ),
        },
      },
    },
    async (request, reply) => {
      try {
        const { eventId } = request.params;

        const eventExists = await sql`
          SELECT id FROM events WHERE id = ${eventId}
        `;

        if (eventExists.length === 0) {
          return reply.status(404).send({ message: "Event not found" });
        }

        const participants = await sql`
          SELECT 
            u.id as user_id,
            u.username,
            u.first_name,
            u.last_name,
            er.registered_at
          FROM event_registrations er
          INNER JOIN users u ON er.user_id = u.id
          WHERE er.event_id = ${eventId}
          ORDER BY er.registered_at ASC
        `;

        return reply.send(participants);
      } catch (error) {
        console.error("Error fetching event participants:", error);
        return reply.status(500).send({ message: "Internal server error" });
      }
    }
  );

	app.get<{
		Params: { eventId: string };
	}>(
		"/check/:eventId",
		{
			preHandler: authenticate,
			schema: {
				params: z.object({
					eventId: z.string().uuid(),
				}),
				response: {
					200: z.object({
						isRegistered: z.boolean(),
					}),
				},
			},
		},
		async (request, reply) => {
			try {
				const { eventId } = request.params;
				const user_id = request.currentUser?.userId;

				const registration = await sql`
          SELECT id FROM event_registrations 
          WHERE user_id = ${user_id} AND event_id = ${eventId}
        `;

				return reply.send({
					isRegistered: registration.length > 0,
				});
			} catch (error) {
				console.error("Error checking registration:", error);
				return reply.status(500).send({ message: "Internal server error" });
			}
		},
	);
}
