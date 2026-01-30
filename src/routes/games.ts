import type { FastifyInstance } from "fastify";
import { z } from "zod";
import sql from "../db/db.js";
import {
  type GameCreate,
  GameCreateSchema,
  GameResponseSchema,
  type GameUpdate,
  GameUpdateSchema,
} from "../models/Games.js";
import { authenticate } from "../plugins/auth.js";

interface DatabaseGame {
  id: string;
  name: string;
  description: string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

export default async function gamesRoutes(app: FastifyInstance) {
  app.get(
    "/",
    {
      schema: {
        response: {
          200: z.array(GameResponseSchema),
        },
      },
    },
    async (request, reply) => {
      const games = (await sql`
		SELECT * FROM games
		ORDER BY name ASC
	  `) as DatabaseGame[];

      return reply.send(games);
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
          200: GameResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;

      const result = (await sql`
		SELECT * FROM games
		WHERE id = ${id}
	  `) as DatabaseGame[];

      const game = result[0];

      if (!game) {
        return reply.status(404).send({ message: "Game not found" });
      }

      return reply.send(game);
    }
  );

  app.post<{
    Body: GameCreate;
  }>(
    "/",
    {
      schema: {
        body: GameCreateSchema,
        response: {
          201: GameResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { name, description } = request.body;

      const existingGame = await sql`
		SELECT * FROM games WHERE name = ${name}
	  `;

      if (existingGame.length > 0) {
        return reply.status(400).send({ message: "Game already exists" });
      }

      const result = (await sql`
		INSERT INTO games (name, description)
		VALUES (${name}, ${description ?? null})
		RETURNING *
	  `) as DatabaseGame[];

      const newGame = result[0];

      return reply.status(201).send(newGame);
    }
  );

  app.put<{
    Params: { id: string };
    Body: GameUpdate;
  }>(
    "/:id",
    {
      schema: {
        params: z.object({
          id: z.string().uuid(),
        }),
        body: GameUpdateSchema,
        response: {
          200: GameResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const { name, description } = request.body;

      const existingGame = await sql`
        SELECT * FROM games WHERE id = ${id}
      `;

      if (existingGame.length === 0) {
        return reply.status(404).send({ message: "Game not found" });
      }

      if (name) {
        const nameExists = await sql`
          SELECT * FROM games 
          WHERE name = ${name} AND id != ${id}
        `;
        if (nameExists.length > 0) {
          return reply
            .status(400)
            .send({ message: "Game name already in use" });
        }
      }

      const result = (await sql`
		UPDATE games
		SET 
		  name = COALESCE(${name ?? null}, name),
		  description = COALESCE(${description ?? null}, description),
		  updated_at = NOW()
		WHERE id = ${id}
		RETURNING *
	  `) as DatabaseGame[];

      const updatedGame = result[0];

      return reply.send(updatedGame);
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

      const existingGame = await sql`
        SELECT * FROM games WHERE id = ${id}
      `;

      if (existingGame.length === 0) {
        return reply.status(404).send({ message: "Game not found" });
      }

      await sql`
        DELETE FROM games WHERE id = ${id}
      `;

      return reply.send({ message: "Game deleted successfully" });
    }
  );
}
