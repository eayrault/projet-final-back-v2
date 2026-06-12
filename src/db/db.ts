import postgres from "postgres";

if (process.env.NODE_ENV !== "production") {
  try {
    process.loadEnvFile();
  } catch {
    // Pas de fichier .env (CI, Docker, etc.) : on utilise les variables système
  }
}

const connectionString =
	process.env.DATABASE_URL ||
	"postgresql://eliot:motdepasse@localhost:5432/projet-final-back";

const sql = postgres(connectionString, {
	transform: {
		undefined: null,
	},
});

export default sql;
