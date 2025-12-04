import postgres from "postgres";

const connectionString =
	process.env.DATABASE_URL ||
	"postgresql://eliot:motdepasse@localhost:5432/projet-final-back";

const sql = postgres(connectionString, {
	transform: {
		undefined: null,
	},
});

export default sql;
