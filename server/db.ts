import pg from "pg";

const { Pool } = pg;

const pool = new Pool({
	connectionString:
		process.env.DATABASE_URL || "postgres://localhost:5432/url_shortener",
});

export async function query(
	text: string,
	params?: unknown[],
): Promise<pg.QueryResult> {
	return pool.query(text, params);
}

export async function getClient(): Promise<pg.PoolClient> {
	return pool.connect();
}

export async function migrate(): Promise<void> {
	await pool.query(`
    CREATE TABLE IF NOT EXISTS urls (
      id SERIAL PRIMARY KEY,
      url TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

export async function closePool(): Promise<void> {
	await pool.end();
}
