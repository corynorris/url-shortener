import { Router, type Request, type Response } from "express";
import {
  createShortUrl,
  findByShortId,
  listShortUrls,
  getAllUrls,
  deleteUrlsByIds,
} from "./models.js";
import type { IUrl } from "./models.js";

const router: Router = Router();

function getBaseUrl(req: Request): string {
  const baseUrl =
    process.env.BASE_URL || `${req.protocol}://${req.get("host")}`;
  return baseUrl.replace(/\/$/, "");
}

/**
 * Detect URLs where the hostname appears duplicated in the path,
 * e.g. https://demos.corynorris.me/demos.corynorris.me/comments/
 * These are usually malformed and will never resolve.
 */
function isSuspiciousUrl(url: URL): boolean {
  const hostname = url.hostname.toLowerCase();
  if (hostname.length === 0) return false;

  // Normalize trailing slash for path segment comparison
  const path =
    url.pathname.toLowerCase() + (url.pathname.endsWith("/") ? "" : "/");

  // Check if any full path segment equals the hostname
  const segments = path.split("/").filter(Boolean);
  return segments.some((seg) => seg === hostname);
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
    if (isSuspiciousUrl(url)) return null;
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
    const records = await listShortUrls(
      query,
      Number.isFinite(limit) ? limit : 50,
    );
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

/** Timeout (ms) for checking a single URL. */
const URL_CHECK_TIMEOUT = 15_000;

/** Maximum number of concurrent URL checks. */
const CHECK_CONCURRENCY = 10;

/**
 * Quick pre-check: reject URLs that are structurally suspicious without
 * even fetching them (hostname duplicated in path, etc.).
 */
function quickStructuralCheck(targetUrl: string): string | null {
  try {
    const url = new URL(targetUrl);
    if (isSuspiciousUrl(url)) {
      return "Suspicious URL (hostname in path)";
    }
    return null;
  } catch {
    return "Invalid URL syntax";
  }
}

/**
 * Attempt to reach a URL with HEAD, falling back to GET.
 * Returns { ok: true } if a 2xx response is received.
 */
async function checkUrlHealth(
  targetUrl: string,
): Promise<{ ok: boolean; reason?: string }> {
  const structuralIssue = quickStructuralCheck(targetUrl);
  if (structuralIssue) {
    return { ok: false, reason: structuralIssue };
  }

  const deadline = Date.now() + URL_CHECK_TIMEOUT;

  for (const method of ["HEAD", "GET"] as const) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) {
      return { ok: false, reason: "Timeout" };
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), remaining);

    try {
      const response = await fetch(targetUrl, {
        method,
        signal: controller.signal,
        redirect: "follow",
      });
      clearTimeout(timer);

      if (response.ok) {
        return { ok: true };
      }
      return { ok: false, reason: `HTTP ${response.status}` };
    } catch (err) {
      clearTimeout(timer);

      if (method === "GET") {
        const message = err instanceof Error ? err.message : String(err);
        return { ok: false, reason: message };
      }
      // HEAD failed — fall through to GET
    }
  }

  return { ok: false, reason: "Unknown error" };
}

/**
 * Check all stored URLs in concurrent batches.
 * Returns arrays of working and broken results.
 */
async function checkAllStoredUrls(records: IUrl[]) {
  const results: Array<{
    id: number;
    url: string;
    ok: boolean;
    reason?: string;
  }> = [];

  for (let i = 0; i < records.length; i += CHECK_CONCURRENCY) {
    const batch = records.slice(i, i + CHECK_CONCURRENCY);
    const batchResults = await Promise.allSettled(
      batch.map(async (record) => {
        const { ok, reason } = await checkUrlHealth(record.url);
        return { id: record.id, url: record.url, ok, reason };
      }),
    );

    for (const result of batchResults) {
      if (result.status === "fulfilled") {
        results.push(result.value);
      } else {
        results.push({
          id: 0,
          url: "",
          ok: false,
          reason: "Internal check error",
        });
      }
    }
  }

  return results;
}

// POST /check — check all stored URLs and remove broken ones
router.post("/check", async (_req: Request, res: Response) => {
  try {
    const allUrls = await getAllUrls();

    if (allUrls.length === 0) {
      res.json({
        checked: 0,
        removed: 0,
        remaining: 0,
        workingUrls: [],
        removedUrls: [],
      });
      return;
    }

    const results = await checkAllStoredUrls(allUrls);

    const working = results.filter((r) => r.ok);
    const broken = results.filter((r) => !r.ok);

    if (broken.length > 0) {
      await deleteUrlsByIds(broken.map((r) => r.id));
    }

    res.json({
      checked: results.length,
      removed: broken.length,
      remaining: working.length,
      workingUrls: working.map((r) => ({ id: r.id, url: r.url })),
      removedUrls: broken.map((r) => ({
        id: r.id,
        url: r.url,
        reason: r.reason,
      })),
    });
  } catch (err) {
    console.error("Error checking URLs:", err);
    res.status(500).json({ error: "failed to check urls" });
  }
});

// Health check
router.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok" });
});

export default router;
