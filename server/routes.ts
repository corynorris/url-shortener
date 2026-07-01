import { Router, type Request, type Response } from "express";
import { createShortUrl, findByShortId, listShortUrls } from "./models.js";

const router: Router = Router();

function getBaseUrl(req: Request): string {
  const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get("host")}`;
  return baseUrl.replace(/\/$/, "");
}

function normalizeUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (
    trimmed.length === 0 ||
    trimmed.length > 2048 ||
    /[\u0000-\u001F\u007F\s]/.test(trimmed)
  ) {
    return null;
  }

  const withProtocol = /^[a-z][a-z0-9+.-]*:/i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  try {
    const url = new URL(withProtocol);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (!url.hostname || url.username || url.password) return null;
    return url.href;
  } catch {
    return null;
  }
}

async function createUrlResponse(req: Request, res: Response, rawUrl: string) {
  const url = normalizeUrl(rawUrl);
  if (!url) return res.status(400).json({ error: "invalid url" });

  try {
    const record = await createShortUrl(url);
    const baseUrl = getBaseUrl(req);
    res.json({
      short_url: `${baseUrl}/${record.id}`,
      given_url: record.url,
    });
  } catch (err) {
    console.error("Error creating short URL:", err);
    res.status(500).json({ error: "failed to create short url" });
  }
}

// GET /api/urls — list stored URLs, newest first
router.get("/api/urls", async (req: Request, res: Response) => {
  const query = typeof req.query.q === "string" ? req.query.q : undefined;
  const limit =
    typeof req.query.limit === "string" ? parseInt(req.query.limit, 10) : 50;

  try {
    const records = await listShortUrls(query, Number.isFinite(limit) ? limit : 50);
    const baseUrl = getBaseUrl(req);
    res.json(
      records.map((record) => ({
        id: record.id,
        short_url: `${baseUrl}/${record.id}`,
        given_url: record.url,
        created_at: record.createdAt,
      })),
    );
  } catch (err) {
    console.error("Error listing URLs:", err);
    res.status(500).json({ error: "failed to list urls" });
  }
});

// POST /api/urls — create a shortened URL
router.post("/api/urls", async (req: Request, res: Response) => {
  const url = typeof req.body?.url === "string" ? req.body.url : "";
  await createUrlResponse(req, res, url);
});

// POST /new/:url* — create a shortened URL
router.post("/new/:url(*)", async (req: Request, res: Response) => {
  await createUrlResponse(req, res, req.params.url);
});

// GET /new/:url* — also support GET for creating shortened URLs (backwards compat)
router.get("/new/:url(*)", async (req: Request, res: Response) => {
  await createUrlResponse(req, res, req.params.url);
});

// GET /:id — redirect to original URL
router.get("/:id(\\d+)", async (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);

  if (isNaN(id)) {
    res.status(400).json({ error: "invalid id" });
    return;
  }

  try {
    const record = await findByShortId(id);
    if (!record) {
      res.status(404).json({ error: "no url found for given id" });
      return;
    }
    res.redirect(301, record.url);
  } catch (err) {
    console.error("Error looking up URL:", err);
    res.status(500).json({ error: "internal server error" });
  }
});

// Health check
router.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok" });
});

export default router;
