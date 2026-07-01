# Code Context: URL Shortener

## What the App Does

A URL shortener microservice. Users submit a URL via `/new/:url` and get back a JSON response with a shortened URL. Visiting the shortened URL (`/:id`) performs a 301 redirect to the original URL. The root path serves a static HTML instruction page. Intended for deployment on Heroku.

## Tech Stack and Key Dependencies

| Dependency        | Version                      | Purpose                                                         |
| ----------------- | ---------------------------- | --------------------------------------------------------------- |
| **Node.js**       | (runtime, no version pinned) | JavaScript runtime                                              |
| **Express**       | ^4.14.0 (circa 2016)         | HTTP server / routing                                           |
| **Mongoose**      | ^5.7.6 (circa 2019)          | MongoDB ODM                                                     |
| **is-url**        | ^1.2.2                       | URL validation                                                  |
| **serve-favicon** | ^2.3.0                       | Serve favicon                                                   |
| **platform**      | ^1.3.1                       | (unused dependency)                                             |
| **ESLint**        | ^3.9.0 (circa 2016)          | Dev: linting (airbnb config, react/jsx-a11y plugins — not used) |

No lockfile (`package-lock.json` or `yarn.lock`). No `node_modules/` committed.

## File Structure Overview

```
url-shortener/
├── .eslintrc.js          # ESLint config (airbnb, with react/jsx-a11y plugins — irrelevant)
├── .gitignore            # Ignores node_modules/, npm-debug.log
├── README.md             # Brief description + usage examples
├── package.json          # Dependencies + npm scripts (start, deploy, test stub)
├── server.js             # Main entry point — Express app with 3 routes
├── models/
│   └── url.js            # Mongoose schema/model for shortened URLs
└── public/
    ├── favicon.ico       # 16x16 Windows icon
    └── index.html        # Static HTML instruction page (~74KB, minified, contains inline CSS)
```

## How It's Built / Deployed

- **Start:** `npm start` → `node server.js` (port from `PORT` env, CLI arg, or default 3000)
- **Deploy:** `npm run deploy` → `git push heroku master` (Heroku git-based deployment)
- **Database:** MongoDB, connection string from `MONGODB_URI` environment variable

No build step, bundler, or transpiler. Plain Node.js/CommonJS.

## Key Code — server.js

### Routes (3 total)

1. **`GET /`** — Serves `public/index.html` (the instruction page)
2. **`GET /new/:url*`** — Creates a shortened URL. Validates with `is-url`. Saves to MongoDB. Returns JSON: `{ short_url, given_url }`
3. **`GET /:id`** — Looks up URL by numeric ID. On found: 301 redirect. On not found: JSON error.

### Model — models/url.js

- Schema: `{ id: Number, url: String }`
- Auto-incrementing `id` via `pre('save')` hook that counts existing documents and sets `id = count + 1`
- The `id` is **not** unique-constrained or indexed, leading to potential race conditions
- The model is exported **before** the `pre('save')` middleware is attached — but this happens to work because Mongoose middleware is set on the schema, not the model

## Obvious Issues and Outdated Patterns

### Critical

1. **Race condition in ID generation** (`models/url.js`, lines 10-15): The `pre('save')` hook uses `urlModel.count({})` to determine the next ID. Under concurrent saves, two documents can get the same ID. Should use an atomic counter (e.g., a dedicated counter collection with `findOneAndUpdate` and `$inc`) or a different ID strategy.

2. **Missing error handling in `shortenUrl`** (`server.js`, line 19): `newUrl.save(callback)` passes the callback directly to Mongoose's save. If Mongoose validation fails, `shortUrl` will be undefined (the callback's second arg for an error path). The route handler at line 26 then accesses `shortUrl.id` which would throw if `shortUrl` is undefined. The `if (err) throw err` at line 23 also crashes the server instead of returning an error response.

3. **No unique index on `id`** (`models/url.js`): The `id` field has no `unique: true` or index. Combined with the race condition, duplicate IDs silently overwrite redirects.

4. **No MongoDB connection error handling** (`server.js`, line 9): `mongoose.connect()` is called without any error callback or promise catch. If MongoDB is unreachable, the server starts but all requests fail with unhandled errors.

### Moderate

5. **Unused dependency — `platform`** (`package.json`): `platform@^1.3.1` is listed in dependencies but never imported or used anywhere in the codebase.

6. **Irrelevant dev dependencies** (`package.json`): `eslint-plugin-react`, `eslint-plugin-jsx-a11y` are installed but the project has no React or JSX code. ESLint config also extends `airbnb` and sets `browser` env, but the project is a Node.js server.

7. **Outdated packages with known vulnerabilities**: `mongoose@5.7.6` (2019), `express@4.14.0` (2016), `eslint@3.9.0` (2016). No lockfile means dependency resolution is non-deterministic.

8. **`var` instead of `const`/`let`**: `models/url.js` uses `var` throughout (lines 1-2, 4, 9). `server.js` was partially updated (`let`/`const` in some places) but `models/url.js` was not.

9. **Missing `package-lock.json`**: Not committed and likely not generated. Reproducible builds are impossible.

### Minor

10. **Hardcoded Heroku URL** (`server.js`, line 27): The short URL response embeds `https://boiling-bayou-79322.herokuapp.com/` literally. This breaks if deployed to a different Heroku dyno or a different platform.

11. **No port logging** (`server.js`, line 44): `app.listen(port)` without a callback — no console message to confirm the server started.

12. **`GET /new/:url*` route is fragile** (`server.js`, line 22): Uses `req.url.slice(5)` to extract the URL instead of `req.params.url`. This means the `*` wildcard captures the leading `/` as part of the param, and the slice is a workaround.

13. **index.html is 74KB of mostly inline CSS**: The HTML file contains a massive amount of Bootstrap-like CSS that's embedded for a simple instruction page with ~10 lines of actual content.

14. **No tests**: `npm test` just echoes an error message and exits 1.

15. **Missing `engines` field in package.json**: No Node.js version specified for Heroku.

## Start Here

Open `server.js` first — it's the entry point and contains all HTTP routing. Then `models/url.js` for the data layer.
