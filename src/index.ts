import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import Fastify from "fastify";
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from "fastify-type-provider-zod";
import authRoutes from "./routes/auth.js";
import eventRegistrationRoutes from "./routes/event-registrations.js";
import eventsRoutes from "./routes/events.js";
import gamesRoutes from "./routes/games.js";
import tournamentRoutes from "./routes/tournament.js";
import userRoutes from "./routes/user.js";

try {
  process.loadEnvFile();
} catch (_) {
  console.warn(".env file not found. Using system environment variables.");
}

const app = Fastify({ logger: true });

await app
  .register(cors, {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  })
  .withTypeProvider<ZodTypeProvider>();

app.setValidatorCompiler(validatorCompiler);
app.setSerializerCompiler(serializerCompiler);

app.register(authRoutes, { prefix: "/auth" });
app.register(tournamentRoutes, { prefix: "/tournament" });
app.register(userRoutes, { prefix: "/user" });
app.register(eventsRoutes, { prefix: "/events" });
app.register(gamesRoutes, { prefix: "/games" });
app.register(eventRegistrationRoutes, { prefix: "/event-registrations" });
app.register(cookie);

// app.setErrorHandler((error: FastifyError, _request, reply) => {
//   app.log.error(error);
//   reply.status(error.statusCode || 500).send({
//     message: error.message,
//     code: error.code,
//   });
// });

const start = async () => {
	try {
    const port = Number(process.env.PORT);
    await app.listen({ port, host: "0.0.0.0" });
    console.log(`Server running on port ${port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
