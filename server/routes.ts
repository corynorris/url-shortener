import { Router, type Request, type Response } from "express";
import { findByShortId, createShortUrl } from "./models.js";

const router: Router = Router();

function getBaseUrl(req: Request): string {
  return process.env.BASE_URL || `${req.protocol}://${req.get("host")}`;
}

function isValidUrl(str: string): boolean {
  try {
    const url = new URL(str);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

// POST /new/:url* — create a shortened URL
router.post("/new/:url(*)", async (req: Request, res: Response) => {
  const url = req.params.url;

  if (!url || !isValidUrl(url)) {
    res.status(400).json({ error: "invalid url" });
    return;
  }

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
});

// GET /new/:url* — also support GET for creating shortened URLs (backwards compat)
router.get("/new/:url(*)", async (req: Request, res: Response) => {
  const url = req.params.url;

  if (!url || !isValidUrl(url)) {
    res.status(400).json({ error: "invalid url" });
    return;
  }

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
