import express from "express";
import path from "node:path";
import { migrate } from "./db.js";
import routes from "./routes.js";

const publicPath = path.resolve(process.cwd(), "public");
const port =
  process.env.PORT || process.argv[2]
    ? parseInt(process.env.PORT || process.argv[2], 10)
    : 3000;

const app = express();

app.use(express.json({ limit: "16kb" }));

// Serve static files from public/
app.use(express.static(publicPath));

// API routes
app.use("/", routes);

// Root: serve static page
app.get("/", (_req, res) => {
  res.sendFile(path.join(publicPath, "index.html"));
});

(async () => {
  try {
    await migrate();
  } catch (err) {
    console.error("Could not connect to PostgreSQL:", err);
    process.exit(1);
  }

  app.listen(port, () => {
    console.log(`URL shortener running at http://localhost:${port}`);
  });
})();
