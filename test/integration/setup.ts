/**
 * Crée une instance Fastify configurée exactement comme dans index.ts,
 * mais sans démarrer le serveur HTTP (inject() suffit pour les tests).
 * La base de données utilisée est celle définie dans DATABASE_URL,
 * qui doit pointer vers une base de test dédiée.
 */
import cookie from "@fastify/cookie";
import Fastify from "fastify";
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from "fastify-type-provider-zod";
import authRoutes from "../../src/routes/auth.js";
import eventRegistrationRoutes from "../../src/routes/event-registrations.js";
import eventsRoutes from "../../src/routes/events.js";
import gamesRoutes from "../../src/routes/games.js";
import tournamentRoutes from "../../src/routes/tournament.js";
import userRoutes from "../../src/routes/user.js";

export async function buildApp() {
  const app = Fastify({ logger: false });

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  await app.withTypeProvider<ZodTypeProvider>();

  app.register(cookie);
  app.register(authRoutes, { prefix: "/auth" });
  app.register(userRoutes, { prefix: "/user" });
  app.register(eventsRoutes, { prefix: "/events" });
  app.register(gamesRoutes, { prefix: "/games" });
  app.register(tournamentRoutes, { prefix: "/tournament" });
  app.register(eventRegistrationRoutes, { prefix: "/event-registrations" });

  await app.ready();
  return app;
}
