import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { connectDB } from "./db.js";
import routes from "./routes.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const port = process.env.PORT || process.argv[2] ? parseInt(process.env.PORT || process.argv[2], 10) : 3000;

const app = express();

// Serve static files from public/
app.use(express.static(path.join(__dirname, "..", "public")));

// API routes
app.use("/", routes);

// Root: serve static page
app.get("/", (_req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "index.html"));
});

(async () => {
  try {
    await connectDB();
    app.listen(port, () => {
      console.log(`URL shortener running on port ${port}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
})();
