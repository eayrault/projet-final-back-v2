import postgres from "postgres";

process.loadEnvFile();

const connectionString =
	process.env.DATABASE_URL ||
	"postgresql://eliot:motdepasse@localhost:5432/projet-final-back";

const sql = postgres(connectionString, {
	transform: {
		undefined: null,
	},
});

export default sql;
