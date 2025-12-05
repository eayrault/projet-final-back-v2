import cookie from "@fastify/cookie";
import fastify, { type FastifyError } from "fastify";
import {
  serializerCompiler,
  validatorCompiler,
} from "fastify-type-provider-zod";
import authRoutes from "./routes/auth.js";

try {
  process.loadEnvFile();
} catch (_) {
  console.warn(".env file not found. Using system environment variables.");
}

const app = fastify();

app.setValidatorCompiler(validatorCompiler);
app.setSerializerCompiler(serializerCompiler);

app.register(authRoutes, { prefix: "/auth" });


app.setErrorHandler((error: FastifyError, _request, reply) => {
  app.log.error(error);
  reply.status(error.statusCode || 500).send({
    message: error.message,
    code: error.code,
  });
});

const start = async () => {
  try {
    const port = Number(process.env.PORT);
    await app.listen({ port, host: "0.0.0.0" });
    console.log("Server running on port 3000");
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
