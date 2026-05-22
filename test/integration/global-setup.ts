/**
 * globalSetup pour les tests d'intégration.
 * Charge les variables d'environnement depuis .env.test, puis ferme
 * la connexion PostgreSQL partagée une seule fois après tous les tests.
 */
import { readFileSync } from "fs";
import { resolve } from "path";
import sql from "../../src/db/db.js";

export function setup() {
  // Charger .env.test si présent
  try {
    const envPath = resolve(process.cwd(), ".env.test");
    const lines = readFileSync(envPath, "utf-8").split("\n");
    for (const line of lines) {
      const [key, ...rest] = line.split("=");
      if (key && rest.length) {
        process.env[key.trim()] = rest.join("=").trim();
      }
    }
  } catch {
    // Pas de .env.test : on utilise les variables système existantes
  }
}

export async function teardown() {
  await sql.end();
}
