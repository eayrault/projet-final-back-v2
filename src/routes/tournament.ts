import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import sql from "../db/db.js";
import {
  TournamentCreateSchema,
  TournamentUpdateSchema,
  TournamentSchema,
  TournamentDetailsSchema,
  type Tournament,
  type TournamentDetails,
  type TournamentCreate,
  type TournamentUpdate,
} from "../models/Tournament.js";
import { z } from "zod";

export default async function tournamentRoutes(app: FastifyInstance) {
  app.get(
    "/",
    {
      schema: {
        response: {
          200: z.array(TournamentDetailsSchema),
          500: z.object({ message: z.string() }),
        },
      },
    },
    async (_request, reply) => {
      try {
        const tournaments = (await sql`
          SELECT 
            t.id,
            t.name,
            t.descriptions,
            t.attendees,
            t.game_id,
            t.event_id,
            t.start_date,
            t.created_at,
            t.updated_at,
            g.name as game_name,
            e.name as event_name
          FROM tournaments t
          INNER JOIN games g ON t.game_id = g.id
          INNER JOIN events e ON t.event_id = e.id
          ORDER BY t.start_date DESC
        `) as TournamentDetails[];

        return reply.send(tournaments);
      } catch (_error) {
        return reply
          .status(500)
          .send({ message: "Error fetching tournaments" });
      }
    }
  );

  app.withTypeProvider<ZodTypeProvider>().get<{
    Params: { id: string };
  }>(
    "/:id",
    {
      schema: {
        params: z.object({
          id: z.string().uuid(),
        }),
        response: {
          200: TournamentDetailsSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        const { id } = request.params;

        const tournaments = (await sql`
          SELECT 
            t.id,
            t.name,
            t.descriptions,
            t.attendees,
            t.game_id,
            t.event_id,
            t.start_date,
            t.created_at,
            t.updated_at,
            g.name as game_name,
            e.name as event_name
          FROM tournaments t
          INNER JOIN games g ON t.game_id = g.id
          INNER JOIN events e ON t.event_id = e.id
          WHERE t.id = ${id}
        `) as TournamentDetails[];

        if (tournaments.length === 0) {
          return reply.status(404).send({ message: "Tournament not found" });
        }

        return reply.send(tournaments[0]);
      } catch (error) {
        console.error("Error fetching tournament:", error);
        return reply.status(500).send({ message: "Internal server error" });
      }
    }
  );

  app.post<{
    Body: TournamentCreate;
  }>(
    "/",
    {
      schema: {
        body: TournamentCreateSchema,
        response: {
          201: TournamentSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        const { name, descriptions, attendees, game_id, event_id, start_date } =
          request.body;

        const gameExists = await sql`
          SELECT id FROM games WHERE id = ${game_id}
        `;
        if (gameExists.length === 0) {
          return reply.status(400).send({ message: "Game not found" });
        }

        const eventExists = await sql`
          SELECT id FROM events WHERE id = ${event_id}
        `;
        if (eventExists.length === 0) {
          return reply.status(400).send({ message: "Event not found" });
        }

        const newTournament = await sql`
          INSERT INTO tournaments (name, descriptions, attendees, game_id, event_id, start_date)
          VALUES (${name}, ${descriptions || null}, ${attendees || 0}, ${game_id}, ${event_id}, ${start_date})
          RETURNING *
        ` as Tournament[];

        return reply.status(201).send(newTournament[0]);
      } catch (error) {
        console.error("Error creating tournament:", error);
        return reply.status(500).send({ message: "Internal server error" });
      }
    }
  );

  app.put<{
    Params: { id: string };
    Body: TournamentUpdate;
  }>(
    "/:id",
    {
      schema: {
        params: z.object({
          id: z.string().uuid(),
        }),
        body: TournamentUpdateSchema,
        response: {
          200: TournamentSchema,
        },
      },
    },
    async (request, reply) => {
      try {
        const { id } = request.params;
        const updates = request.body;

        const tournamentExists = await sql`
          SELECT id FROM tournaments WHERE id = ${id}
        ` as Tournament[];

        if (tournamentExists.length === 0) {
          return reply.status(404).send({ message: "Tournament not found" });
        }

        if (updates.game_id) {
          const gameExists = await sql`
            SELECT id FROM games WHERE id = ${updates.game_id}
          `;
          if (gameExists.length === 0) {
            return reply.status(400).send({ message: "Game not found" });
          }
        }

        if (updates.event_id) {
          const eventExists = await sql`
            SELECT id FROM events WHERE id = ${updates.event_id}
          `;
          if (eventExists.length === 0) {
            return reply.status(400).send({ message: "Event not found" });
          }
        }

        const updatedTournament = await sql`
          UPDATE tournaments
          SET ${sql(updates, "name", "descriptions", "attendees", "game_id", "event_id", "start_date")}
          WHERE id = ${id}
          RETURNING *
        ` as Tournament[];

        return reply.send(updatedTournament[0]);
      } catch (error) {
        console.error("Error updating tournament:", error);
        return reply.status(500).send({ message: "Internal server error" });
      }
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
      try {
        const { id } = request.params;

        const deletedTournament = await sql`
          DELETE FROM tournaments
          WHERE id = ${id}
          RETURNING id
        `;

        if (deletedTournament.length === 0) {
          return reply.status(404).send({ message: "Tournament not found" });
        }

        return reply.send({ message: "Tournament deleted successfully" });
      } catch (error) {
        console.error("Error deleting tournament:", error);
        return reply.status(500).send({ message: "Internal server error" });
      }
    }
  );
}