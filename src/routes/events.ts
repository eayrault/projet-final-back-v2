import type { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import sql from "../db/db.js";
import {
  EventCreateSchema,
  EventUpdateSchema,
  EventResponseSchema,
  type EventCreate,
  type EventUpdate,
} from "../models/Events.js";

function formatEventResponse(event: any) {
  return {
    ...event,
    start_date: event.start_date instanceof Date 
      ? event.start_date.toISOString() 
      : event.start_date,
    created_at: event.created_at instanceof Date 
      ? event.created_at.toISOString() 
      : event.created_at,
    updated_at: event.updated_at instanceof Date 
      ? event.updated_at.toISOString() 
      : event.updated_at,
  };
}

export default async function eventsRoutes(app: FastifyInstance) {
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

      const formattedEvents = events.map(formatEventResponse);

      return reply.send(formattedEvents);
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

      return reply.send(formatEventResponse(event));
    }
  );

  app.post<{
    Body: EventCreate;
  }>(
    "/",
    {
      schema: {
        body: EventCreateSchema,
        response: {
          201: EventResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { name, description, start_date } = request.body;

      const [newEvent] = await sql`
        INSERT INTO events (name, description, start_date)
        VALUES (${name}, ${description ?? null}, ${start_date})
        RETURNING *
      `;

      return reply.status(201).send(formatEventResponse(newEvent));
    }
  );

  app.put<{
    Params: { id: string };
    Body: EventUpdate;
  }>(
    "/:id",
    {
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
      const { name, description, start_date } = request.body;

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
          updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `;

      return reply.send(formatEventResponse(updatedEvent));
    }
  );

  app.delete<{
    Params: { id: string };
  }>(
    "/:id",
    {
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