import { describe, expect, it } from "vitest";
import {
  generateToken,
  hashPassword,
  verifyPassword,
} from "../../src/plugins/auth.js";

// Ces tests nécessitent la variable JWT_SECRET dans l'environnement.
// Vitest la charge automatiquement depuis le fichier .env si vitest.config.ts
// est configuré avec envFile, ou on peut la définir ici directement.
process.env.JWT_SECRET = "test-secret-key-for-unit-tests";

// ─── hashPassword / verifyPassword ────────────────────────────────────────────

describe("hashPassword", () => {
  it("retourne une chaîne hachée différente du mot de passe en clair", async () => {
    const plain = "monmotdepasse";
    const hashed = await hashPassword(plain);
    expect(hashed).not.toBe(plain);
    expect(typeof hashed).toBe("string");
    expect(hashed.length).toBeGreaterThan(0);
  });

  it("produit un hash différent à chaque appel (salt aléatoire)", async () => {
    const plain = "monmotdepasse";
    const hash1 = await hashPassword(plain);
    const hash2 = await hashPassword(plain);
    expect(hash1).not.toBe(hash2);
  });
});

describe("verifyPassword", () => {
  it("retourne true pour le bon mot de passe", async () => {
    const plain = "monmotdepasse";
    const hashed = await hashPassword(plain);
    const result = await verifyPassword(hashed, plain);
    expect(result).toBe(true);
  });

  it("retourne false pour un mauvais mot de passe", async () => {
    const hashed = await hashPassword("bonmotdepasse");
    const result = await verifyPassword(hashed, "mauvaisMotDePasse");
    expect(result).toBe(false);
  });

  it("retourne false pour un hash invalide sans lever d'exception", async () => {
    const result = await verifyPassword("hash-invalide", "motdepasse");
    expect(result).toBe(false);
  });
});

// ─── generateToken ────────────────────────────────────────────────────────────

describe("generateToken", () => {
  const payload = {
    userId: "123e4567-e89b-12d3-a456-426614174000",
    username: "johndoe",
    role: "user",
  };

  it("retourne une chaîne non vide", async () => {
    const token = await generateToken(payload);
    expect(typeof token).toBe("string");
    expect(token.length).toBeGreaterThan(0);
  });

  it("retourne un JWT en trois parties séparées par des points", async () => {
    const token = await generateToken(payload);
    const parts = token.split(".");
    expect(parts).toHaveLength(3);
  });
  it("produit un token différent pour deux payloads différents", async () => {
    const token1 = await generateToken(payload);
    const token2 = await generateToken({ ...payload, userId: "autre-id" });
    expect(token1).not.toBe(token2);
  });
});
