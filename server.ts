import express from "express";
import { createServer as createViteServer } from "vite";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { scrapeVercelEndpoint } from "./scrape-vercel.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // --- Vercel Proxy Scrape API ---
  app.post("/api/vercel-scrape", async (req, res) => {
    try {
      const { origin, date, maxWorkers, token } = req.body;
      if (!origin || !date || !maxWorkers || !token) {
        return res.status(400).json({ error: "Missing required parameters: origin, date, maxWorkers, token" });
      }

      console.log(`[VERCEL PROXY] Request received for ${origin} on ${date}`);

      // Invoke Playwright Stealth script to bypass Vercel Security Checkpoint
      const results = await scrapeVercelEndpoint({
        origin,
        date,
        maxWorkers: parseInt(maxWorkers, 10),
        token
      });

      res.json({ success: true, data: results });
    } catch (e: any) {
      console.error("[VERCEL PROXY] Error executing scrape:", e);
      res.status(500).json({ error: e.message || "Failed to proxy Vercel scrape." });
    }
  });

  // Catch-all to ensure unmatched /api routes return JSON
  app.all("/api/*", (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.status(404).json({ success: false, error: "Not found" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Minimal Proxy Server running on http://localhost:${PORT}`);
  });
}

startServer();
