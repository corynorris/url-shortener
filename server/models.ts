import { query } from "./db.js";

export interface UrlRecord {
	id: number;
	url: string;
	created_at: Date;
}

export async function findByShortId(id: number): Promise<UrlRecord | null> {
	const result = await query(
		"SELECT id, url, created_at FROM urls WHERE id = $1",
		[id],
	);
	return result.rows[0] ?? null;
}

export async function createShortUrl(url: string): Promise<UrlRecord> {
	const result = await query(
		"INSERT INTO urls (url) VALUES ($1) RETURNING id, url, created_at",
		[url],
	);
	return result.rows[0];
}

export async function listShortUrls(
	searchQuery?: string,
	limit = 50,
): Promise<UrlRecord[]> {
	const safeLimit = Math.max(1, Math.min(limit, 100));
	const trimmedQuery = searchQuery?.trim();

	if (trimmedQuery) {
		const result = await query(
			"SELECT id, url, created_at FROM urls WHERE url ILIKE $1 ORDER BY created_at DESC LIMIT $2",
			[`%${trimmedQuery}%`, safeLimit],
		);
		return result.rows;
	}

	const result = await query(
		"SELECT id, url, created_at FROM urls ORDER BY created_at DESC LIMIT $1",
		[safeLimit],
	);
	return result.rows;
}

export async function getAllUrls(): Promise<UrlRecord[]> {
	const result = await query(
		"SELECT id, url, created_at FROM urls ORDER BY id ASC",
	);
	return result.rows;
}

export async function deleteUrlsByIds(ids: number[]): Promise<void> {
	if (ids.length === 0) return;
	await query("DELETE FROM urls WHERE id = ANY($1)", [ids]);
}
