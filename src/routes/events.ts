import type { FastifyInstance } from "fastify";
import { z } from "zod";
import sql from "../db/db.js";
import {
	type EventCreate,
	EventCreateSchema,
	EventResponseSchema,
	type EventUpdate,
	EventUpdateSchema,
} from "../models/Events.js";
import { authenticate, requireRole } from "../plugins/auth.js";


export default async function eventsRoutes(app: FastifyInstance) {
  app.get(
    "/my-events",
    {
      preHandler: authenticate,
      schema: {
        response: {
          200: z.array(EventResponseSchema),
        },
      },
    },
    async (request, reply) => {
      const userId = request.currentUser.userId;
      const events = await sql`
        SELECT * FROM events
        WHERE created_by = ${userId}
        ORDER BY start_date ASC
      `;
      return reply.send(events);
    }
  );

  app.get(
    "/",
    {
      schema: {
        response: {
          200: z.array(EventResponseSchema),
        },
      },
    },
    async (request, reply) => {
      const events = await sql`
        SELECT * FROM events
        ORDER BY start_date ASC
      `;

      return reply.send(events);
    }
  );

  app.get<{
    Params: { id: string };
  }>(
    "/:id",
    {
      schema: {
        params: z.object({
          id: z.string().uuid(),
        }),
        response: {
          200: EventResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;

      const result = await sql`
        SELECT * FROM events
        WHERE id = ${id}
      `;

      const event = result[0];

      if (!event) {
        return reply.status(404).send({ message: "Event not found" });
      }

      return reply.send(event);
    }
  );

  app.post<{
    Body: EventCreate;
  }>(
    "/",
    {
      preHandler: authenticate,
      schema: {
        body: EventCreateSchema,
        response: {
          201: EventResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { name, description, start_date, end_date } = request.body;

      const now = new Date();
      if (new Date(start_date) < now) {
        return reply.status(400).send({
          message: "You cannot create an event with a start date in the past.",
        });
      }

      if (new Date(end_date) <= new Date(start_date)) {
        return reply.status(400).send({
          message: "The end date must be after the start date.",
        });
      }

      const [newEvent] = await sql`
        INSERT INTO events (name, description, start_date, end_date, created_by)
        VALUES (${name}, ${description ?? null}, ${start_date}, ${end_date}, ${
        request.currentUser.userId
      })
        RETURNING *
      `;

      return reply.status(201).send(newEvent);
    }
  );

  app.put<{
    Params: { id: string };
    Body: EventUpdate;
  }>(
    "/:id",
    {
      preHandler: authenticate,
      schema: {
        params: z.object({
          id: z.string().uuid(),
        }),
        body: EventUpdateSchema,
        response: {
          200: EventResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const { name, description, start_date, end_date } = request.body;

      const existingEvent = await sql`
        SELECT * FROM events WHERE id = ${id}
      `;

      if (existingEvent.length === 0) {
        return reply.status(404).send({ message: "Event not found" });
      }

      const [updatedEvent] = await sql`
        UPDATE events
        SET 
          name = COALESCE(${name ?? null}, name),
          description = COALESCE(${description ?? null}, description),
          start_date = COALESCE(${start_date ?? null}, start_date),
		  end_date = COALESCE(${end_date ?? null}, end_date),
          updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `;

      return reply.send(updatedEvent);
    }
  );

  app.delete<{
    Params: { id: string };
  }>(
    "/:id",
    {
      preHandler: [authenticate, requireRole("admin")],
      schema: {
        params: z.object({
          id: z.string().uuid(),
        }),
        response: {
          200: z.object({
            message: z.string(),
          }),
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;

      const existingEvent = await sql`
        SELECT * FROM events WHERE id = ${id}
      `;

      if (existingEvent.length === 0) {
        return reply.status(404).send({ message: "Event not found" });
      }

      await sql`
        DELETE FROM events WHERE id = ${id}
      `;

      return reply.send({ message: "Event deleted successfully" });
    }
  );
}
