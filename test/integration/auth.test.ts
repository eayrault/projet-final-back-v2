/**
 * Tests d'intégration — Routes d'authentification
 *
 * Prérequis : une base PostgreSQL de test doit être accessible.
 * Configurer DATABASE_URL dans un fichier .env.test avant de lancer ces tests :
 *
 *   DATABASE_URL=postgres://eliot:motdepasse@localhost:5432/projet-final-test
 *   JWT_SECRET=test-secret
 *
 * Lancer avec : pnpm test:integration
 */
import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import sql from "../../src/db/db.js";
import { buildApp } from "./setup.js";

let app: FastifyInstance;

beforeAll(async () => {
  app = await buildApp();
});

afterAll(async () => {
  await app.close();
});

// Nettoyer les tables avant chaque test pour garantir l'isolation
beforeEach(async () => {
  await sql`DELETE FROM event_registrations`;
  await sql`DELETE FROM refresh_tokens`;
  await sql`DELETE FROM user_auth`;
  await sql`DELETE FROM users`;
});

// ─── POST /auth/register ──────────────────────────────────────────────────────

describe("POST /auth/register", () => {
  const validBody = {
    username: "testuser",
    first_name: "Test",
    last_name: "User",
    email: "test@example.com",
    password: "password123",
  };

  it("retourne 201 et les données de l'utilisateur créé", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: validBody,
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.username).toBe("testuser");
    expect(body.email).toBe("test@example.com");
    // Le mot de passe ne doit jamais apparaître dans la réponse
    expect(body.password).toBeUndefined();
  });

  it("crée bien une ligne dans users ET dans user_auth", async () => {
    await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: validBody,
    });

    const users = await sql`SELECT * FROM users WHERE username = 'testuser'`;
    const auth = await sql`SELECT * FROM user_auth WHERE email = 'test@example.com'`;

    expect(users).toHaveLength(1);
    expect(auth).toHaveLength(1);
    // Le mot de passe stocké doit être haché, pas en clair
    expect(auth[0].password_hash).not.toBe("password123");
  });

  it("retourne 400 si l'email est déjà utilisé", async () => {
    await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: validBody,
    });

    const response = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { ...validBody, username: "autreusername" },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().message).toMatch(/email already in use/i);
  });

  it("retourne 400 si le username est déjà utilisé", async () => {
    await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: validBody,
    });

    const response = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { ...validBody, email: "autre@example.com" },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().message).toMatch(/username already in use/i);
  });

  it("retourne 400 si le body est invalide (email manquant)", async () => {
    const { email, ...withoutEmail } = validBody;
    const response = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: withoutEmail,
    });

    expect(response.statusCode).toBe(400);
  });
});

// ─── POST /auth/login ─────────────────────────────────────────────────────────

describe("POST /auth/login", () => {
  beforeEach(async () => {
    // Créer un utilisateur de test avant chaque test de login
    await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: {
        username: "loginuser",
        first_name: "Login",
        last_name: "User",
        email: "login@example.com",
        password: "password123",
      },
    });
  });

  it("retourne 200 et pose des cookies httpOnly sur les bons identifiants", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: "login@example.com", password: "password123" },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.user.username).toBe("loginuser");

    // Vérifier que les cookies sont définis
    const cookies = response.cookies;
    const accessToken = cookies.find((c) => c.name === "accessToken");
    const refreshToken = cookies.find((c) => c.name === "refreshToken");
    expect(accessToken).toBeDefined();
    expect(refreshToken).toBeDefined();
    expect(accessToken?.httpOnly).toBe(true);
    expect(refreshToken?.httpOnly).toBe(true);
  });

  it("retourne 401 pour un mauvais mot de passe", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: "login@example.com", password: "mauvais" },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json().message).toMatch(/invalid email or password/i);
  });

  it("retourne 401 pour un email inexistant", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: "inexistant@example.com", password: "password123" },
    });

    expect(response.statusCode).toBe(401);
  });

  it("stocke le refresh token haché en base de données", async () => {
    await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: "login@example.com", password: "password123" },
    });

    const tokens = await sql`SELECT * FROM refresh_tokens`;
    expect(tokens).toHaveLength(1);
    // Le token stocké doit être un hash SHA-256 (64 caractères hex), pas le token brut
    expect(tokens[0].token_hash).toHaveLength(64);
  });
});
