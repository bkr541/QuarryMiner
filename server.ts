import express from "express";
import { createServer as createViteServer } from "vite";
import { chromium } from "playwright-extra";
import stealth from "puppeteer-extra-plugin-stealth";
import UserAgents from "user-agents";
import cors from "cors";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { execSync } from "child_process";
import TurndownService from "turndown";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: [".env.local", ".env"] });

const supabaseUrl = process.env.SUPABASE_URL || "http://localhost:54321"; // Dummy local fallback
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "dummy-key";
const supabase = createClient(supabaseUrl, supabaseKey);

// Extend Express Request
declare module 'express-serve-static-core' {
  interface Request {
    userId?: string;
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Add stealth plugin
chromium.use(stealth());

// Ensure Playwright uses the local browsers directory
const browsersPath = path.resolve(__dirname, ".playwright-browsers");
process.env.PLAYWRIGHT_BROWSERS_PATH = browsersPath;

// Check if browsers are installed, if not, try to install them
function ensureBrowsers() {
  if (!fs.existsSync(browsersPath) || fs.readdirSync(browsersPath).length === 0) {
    console.log("Playwright browsers not found in local directory. Installing...");
    try {
      execSync(`tsx install-browsers.js`, { stdio: 'inherit' });
    } catch (error) {
      console.error("Failed to install browsers on startup:", error);
    }
  } else {
    console.log("Playwright browsers found in:", browsersPath);
  }
}

ensureBrowsers();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // Dummy Auth Middleware: stub user_id since auth isn't in place yet
  app.use((req, res, next) => {
    // In a real app this would parse JWT/sessions from req.headers.authorization
    req.userId = "00000000-0000-0000-0000-000000000000"; // Dummy UUID for constraint satisfaction
    next();
  });

  // --- Environments API ---

  // List environments
  app.get("/api/environments", async (req, res) => {
    try {
      const { search = '', sort = 'created_at', order = 'desc', matchType } = req.query;
      let query = supabase
        .from('environments')
        .select('*')
        .eq('user_id', req.userId);

      if (search) {
        query = query.or(`name.ilike.%${search}%,match_host.ilike.%${search}%`);
      }
      if (matchType && matchType !== 'All') {
        // Assume 'All' means no filter, otherwise exact match for match_type enum
        query = query.eq('match_type', (matchType as string).toLowerCase());
      }

      const { data, error } = await query.order(sort as string, { ascending: order === 'asc' });
      if (error) throw error;
      res.json({ success: true, data });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  // Get single environment
  app.get("/api/environments/:id", async (req, res) => {
    try {
      const { data, error } = await supabase
        .from('environments')
        .select('*')
        .eq('id', req.params.id)
        .eq('user_id', req.userId)
        .single();
      if (error) throw error;
      res.json({ success: true, data });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  // Create environment
  app.post("/api/environments", async (req, res) => {
    try {
      const payload = { ...req.body, user_id: req.userId };
      const { data, error } = await supabase
        .from('environments')
        .insert([payload])
        .select()
        .single();
      if (error) throw error;
      res.json({ success: true, data });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  // Update environment
  app.patch("/api/environments/:id", async (req, res) => {
    try {
      const { data, error } = await supabase
        .from('environments')
        .update(req.body)
        .eq('id', req.params.id)
        .eq('user_id', req.userId)
        .select()
        .single();
      if (error) throw error;
      res.json({ success: true, data });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  // Delete environment
  app.delete("/api/environments/:id", async (req, res) => {
    try {
      const { error } = await supabase
        .from('environments')
        .delete()
        .eq('id', req.params.id)
        .eq('user_id', req.userId);
      if (error) throw error;
      res.json({ success: true });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  // API Route for scraping
  app.post("/api/scrape", async (req, res) => {
    const { url, waitSelector, scrollCount = 0, formats = ["HTML", "JSON"] } = req.body;

    if (!url) {
      return res.status(400).json({ error: "URL is required" });
    }

    let targetUrl = url;
    if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
      targetUrl = `https://${targetUrl}`;
    }

    const maxRetries = 5;
    let attempt = 0;
    let lastError = null;

    while (attempt < maxRetries) {
      attempt++;
      let browser;
      try {
        const userAgent = new UserAgents({ deviceCategory: "desktop" }).toString();

        browser = await chromium.launch({
          headless: true,
          args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-blink-features=AutomationControlled",
            "--disable-infobars",
            "--window-position=0,0",
            "--ignore-certifcate-errors",
            "--ignore-certifcate-errors-spki-list",
            "--disable-web-security",
            "--disable-features=IsolateOrigins,site-per-process",
          ],
          ignoreDefaultArgs: ["--enable-automation"],
        });

        const context = await browser.newContext({
          userAgent,
          viewport: { width: 1920 + Math.floor(Math.random() * 100), height: 1080 + Math.floor(Math.random() * 100) },
          deviceScaleFactor: 1,
          hasTouch: false,
          isMobile: false,
          extraHTTPHeaders: {
            "Accept-Language": "en-US,en;q=0.9",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
            "Sec-Fetch-Site": "none",
            "Sec-Fetch-Mode": "navigate",
            "Sec-Fetch-User": "?1",
            "Sec-Fetch-Dest": "document",
            "Upgrade-Insecure-Requests": "1",
            "Cache-Control": "max-age=0",
          }
        });

        const page = await context.newPage();

        const interceptedJson: any[] = [];
        if (formats.includes("JSON")) {
          page.on('response', async (response) => {
            const contentType = response.headers()['content-type'] || '';
            if (contentType.includes('application/json')) {
              try {
                const json = await response.json();
                interceptedJson.push({ url: response.url(), data: json });
              } catch (e) {
                // Ignore errors (e.g. 204 No Content)
              }
            }
          });
        }

        // Advanced Stealth Masking
        await page.addInitScript(() => {
          // Mask webdriver
          Object.defineProperty(navigator, 'webdriver', { get: () => undefined });

          // Mask languages
          Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });

          // Mask plugins
          Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });

          // Mask chrome object
          (window as any).chrome = {
            runtime: {},
            loadTimes: function () { },
            csi: function () { },
            app: {}
          };

          // Mask permissions
          const originalQuery = window.navigator.permissions.query;
          window.navigator.permissions.query = (parameters) => (
            parameters.name === 'notifications' ?
              Promise.resolve({ state: Notification.permission } as PermissionStatus) :
              originalQuery(parameters)
          );

          // Mask WebGL
          const getParameter = WebGLRenderingContext.prototype.getParameter;
          WebGLRenderingContext.prototype.getParameter = function (parameter) {
            if (parameter === 37445) return 'Intel Inc.';
            if (parameter === 37446) return 'Intel(R) Iris(R) Plus Graphics 640';
            return getParameter.apply(this, [parameter]);
          };
        });

        // Helper for curved mouse movement
        const moveMouseHumanLike = async (toX: number, toY: number) => {
          const from = await page.evaluate(() => ({ x: window.innerWidth / 2, y: window.innerHeight / 2 }));
          const steps = 25 + Math.floor(Math.random() * 15);

          for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
            const x = from.x + (toX - from.x) * ease;
            const y = from.y + (toY - from.y) * ease;
            await page.mouse.move(x, y);
            if (i % 5 === 0) await page.waitForTimeout(5 + Math.random() * 10);
          }
        };

        // Helper to solve "Press and Hold" if detected
        const solvePressAndHold = async () => {
          const pressAndHoldSelectors = [
            "#px-captcha",
            "div[class*='captcha']",
            "iframe[src*='captcha']",
            "div[id*='captcha']",
            "button[id*='press']",
            ".px-captcha-container",
            "div[aria-label*='Press and Hold']"
          ];

          for (const selector of pressAndHoldSelectors) {
            try {
              const element = await page.$(selector);
              if (element && await element.isVisible()) {
                console.log(`[STEALTH] Detected potential Challenge: ${selector}`);

                const box = await element.boundingBox();
                if (box) {
                  const x = box.x + box.width / 2 + (Math.random() * 20 - 10);
                  const y = box.y + box.height / 2 + (Math.random() * 20 - 10);

                  await moveMouseHumanLike(x, y);
                  await page.mouse.down();

                  // Hold with "jitter" and "wiggle"
                  const holdDuration = 5000 + Math.random() * 3000;
                  const intervals = 10;
                  for (let i = 0; i < intervals; i++) {
                    await page.waitForTimeout(holdDuration / intervals);
                    await page.mouse.move(x + (Math.random() * 4 - 2), y + (Math.random() * 4 - 2));
                  }

                  await page.mouse.up();
                  console.log(`[STEALTH] Solved ${selector}, waiting for validation...`);
                  await page.waitForTimeout(7000);
                  return true;
                }
              }
            } catch (e) {
              // Ignore
            }
          }
          return false;
        };

        // Random delay to simulate human behavior
        await new Promise(r => setTimeout(r, 3000 + Math.random() * 4000));

        console.log(`Scraping Attempt ${attempt}: ${targetUrl}`);

        const response = await page.goto(targetUrl, {
          waitUntil: "commit",
          timeout: 60000
        });
        console.log(`[STEALTH] page.goto completed for attempt ${attempt}`);

        if (response && (response.status() === 403 || response.status() === 429)) {
          console.warn(`[BLOCK] Received ${response.status()} status code. Attempting in-place solve...`);
        }

        await solvePressAndHold();
        await page.waitForTimeout(5000 + Math.random() * 5000);

        let content = await page.content();

        const isBlocked = () => {
          const blockPatterns = [
            "Access to this page has been denied",
            "px-captcha",
            "Verify you are human",
            "Cloudflare",
            "unusual activity from your computer network",
            "Please verify you are a human",
            "Checking your browser before accessing",
            "Pardon Our Interruption",
            "Are you a human?"
          ];
          return blockPatterns.some(pattern => content.includes(pattern));
        };

        if (isBlocked()) {
          console.warn(`[BLOCK] Bot detected on attempt ${attempt}. Trying to solve...`);
          await solvePressAndHold();
          await page.waitForTimeout(5000);
          content = await page.content();

          if (isBlocked()) {
            console.warn(`[BLOCK] Still blocked. Retrying with new session...`);
            await browser.close();
            await new Promise(r => setTimeout(r, attempt * 7000));
            continue;
          } else {
            console.log("[STEALTH] Successfully bypassed block.");
          }
        }

        // Handle Infinite Scroll
        for (let i = 0; i < scrollCount; i++) {
          // Human-like scroll
          await page.evaluate(() => {
            window.scrollBy({
              top: window.innerHeight * 0.8,
              behavior: 'smooth'
            });
          });
          await page.waitForTimeout(1500 + Math.random() * 1000);
        }

        // Smart Wait
        if (waitSelector) {
          try {
            await page.waitForSelector(waitSelector, { timeout: 15000 });
          } catch (e) {
            console.warn(`Wait selector "${waitSelector}" not found.`);
          }
        }

        const finalContent = await page.content();
        const title = await page.title();

        let markdown = "";
        if (formats.includes("Markdown")) {
          const turndownService = new TurndownService();
          markdown = turndownService.turndown(finalContent);
        }

        await browser.close();

        return res.json({
          success: true,
          data: {
            url: targetUrl,
            title,
            html: formats.includes("HTML") ? finalContent : undefined,
            markdown: formats.includes("Markdown") ? markdown : undefined,
            json: formats.includes("JSON") ? interceptedJson : undefined,
          },
        });
      } catch (error: any) {
        if (browser) await browser.close();
        console.error(`Attempt ${attempt} failed:`, error.message);
        lastError = error;
      }
    }

    res.status(500).json({ error: `Failed after ${maxRetries} attempts. Last error: ${lastError?.message || "Bot detection blocked access"}` });
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
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
