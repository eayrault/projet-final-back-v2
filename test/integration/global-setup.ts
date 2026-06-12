/**
 * globalSetup pour les tests d'intégration.
 * Charge les variables d'environnement depuis .env.test si présent,
 * puis ferme la connexion PostgreSQL partagée une seule fois après tous les tests.
 */
import { config } from "dotenv";
import { resolve } from "path";
import sql from "../../src/db/db.js";

export function setup() {
  config({ path: resolve(process.cwd(), ".env.test") });
}

export async function teardown() {
  await sql.end();
}
