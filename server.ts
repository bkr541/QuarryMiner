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

// Apply fetch polyfill for Node.js environments
import fetch, { Headers, Request, Response } from 'node-fetch';
if (!globalThis.fetch) {
  (globalThis as any).fetch = fetch;
  (globalThis as any).Headers = Headers;
  (globalThis as any).Request = Request;
  (globalThis as any).Response = Response;
}

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

      // Clean up empty fields
      if (payload.proxy_profile_id === "") {
        payload.proxy_profile_id = null;
      }
      if (payload.slug === "") {
        payload.slug = null;
      }

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
      const payload = { ...req.body };

      // Clean up empty fields
      if (payload.proxy_profile_id === "") {
        payload.proxy_profile_id = null;
      }
      if (payload.slug === "") {
        payload.slug = null;
      }

      const { data, error } = await supabase
        .from('environments')
        .update(payload)
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

  // --- Scrape Configurations API ---

  // List scrape configs
  app.get("/api/scrape_configs", async (req, res) => {
    try {
      const { search = '', sort = 'created_at', order = 'desc' } = req.query;
      let query = supabase
        .from('scrape_configurations')
        .select(`
          *,
          environment:environments(id, name),
          extract_schema:extract_schemas(id, name),
          webhook:webhooks(id, name)
        `)
        .eq('user_id', req.userId);

      if (search) {
        query = query.ilike('name', `%${search}%`);
      }

      const { data, error } = await query.order(sort as string, { ascending: order === 'asc' });
      if (error) throw error;
      res.json({ success: true, data });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  // Get single scrape config
  app.get("/api/scrape_configs/:id", async (req, res) => {
    try {
      const { data, error } = await supabase
        .from('scrape_configurations')
        .select(`
          *,
          environment:environments(id, name),
          extract_schema:extract_schemas(id, name),
          webhook:webhooks(id, name)
        `)
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

  // Create scrape config
  app.post("/api/scrape_configs", async (req, res) => {
    try {
      const payload = { ...req.body, user_id: req.userId };

      // Clean up empty UUIDs
      if (payload.environment_id === "") payload.environment_id = null;
      if (payload.extract_schema_id === "") payload.extract_schema_id = null;
      if (payload.webhook_id === "") payload.webhook_id = null;

      const { data, error } = await supabase
        .from('scrape_configurations')
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

  // Update scrape config
  app.patch("/api/scrape_configs/:id", async (req, res) => {
    try {
      const payload = { ...req.body };

      // Clean up empty UUIDs
      if (payload.environment_id === "") payload.environment_id = null;
      if (payload.extract_schema_id === "") payload.extract_schema_id = null;
      if (payload.webhook_id === "") payload.webhook_id = null;

      const { data, error } = await supabase
        .from('scrape_configurations')
        .update(payload)
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

  // Delete scrape config
  app.delete("/api/scrape_configs/:id", async (req, res) => {
    try {
      const { error } = await supabase
        .from('scrape_configurations')
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

  // --- System Settings API ---
  app.get("/api/settings", async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('include_intercepted_responses')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        throw error;
      }

      const setting = data || { include_intercepted_responses: false };
      res.json({ success: true, data: setting });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/settings", async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    try {
      const { include_intercepted_responses } = req.body;

      // Find the most recent row to update
      const { data: existing } = await supabase
        .from('system_settings')
        .select('id')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      let result, err;
      if (existing) {
        ({ data: result, error: err } = await supabase
          .from('system_settings')
          .update({ include_intercepted_responses, updated_at: new Date().toISOString() })
          .eq('id', existing.id)
          .select('include_intercepted_responses')
          .single());
      } else {
        // Fallback to inserting a new row (might violate id=1 constraint if present, but adheres to instructions)
        ({ data: result, error: err } = await supabase
          .from('system_settings')
          .insert([{ id: 1, include_intercepted_responses, updated_at: new Date().toISOString() }])
          .select('include_intercepted_responses')
          .single());
      }

      if (err) throw err;
      res.json({ success: true, data: result || { include_intercepted_responses } });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  // --- Scraping Runs API ---
  app.get("/api/scraping_runs", async (req, res) => {
    try {
      const { limit = 50 } = req.query;
      const { data, error } = await supabase
        .from('scraping_runs')
        .select('*')
        .eq('user_id', req.userId)
        .order('created_at', { ascending: false })
        .limit(Number(limit));
      if (error) throw error;
      res.json({ success: true, data });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  // API Route for scraping
  app.post("/api/scrape", async (req, res) => {
    const { url, waitSelector, scrollCount = 0, formats = ["HTML", "JSON"], capture } = req.body;

    if (!url) {
      return res.status(400).json({ error: "URL is required" });
    }

    let includeInterceptedResponses = false;
    try {
      const { data } = await supabase
        .from('system_settings')
        .select('include_intercepted_responses')
        .eq('id', 1)
        .single();
      if (data) {
        includeInterceptedResponses = !!data.include_intercepted_responses;
      }
    } catch (e) {
      console.warn("Failed to fetch system_settings, defaulting to false");
    }
    console.log(`[SCRAPE] include_intercepted_responses=${includeInterceptedResponses}`);

    let targetUrl = url;
    if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
      targetUrl = `https://${targetUrl}`;
    }

    let actualScrollCount = scrollCount;
    let actualWaitSelector = waitSelector;
    let actualFormats = (formats || []).map((f: string) => String(f).toLowerCase());

    if (capture?.primarySource === 'network') {
      actualScrollCount = 0;
      actualWaitSelector = "";
      if (!actualFormats.includes('json')) {
        actualFormats.push('json');
      }
    }

    let maxRetries = 5;
    if (capture?.primarySource === 'network') {
      maxRetries = 1; // Explicitly stop network captures from retrying on logic failures
    }

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
        let primaryNetworkJson: any = null;
        let primaryNetworkMatchedUrl: string = "";

        if (actualFormats.includes("json") || capture?.primarySource === 'network') {
          page.on('response', async (response) => {
            const contentType = response.headers()['content-type'] || '';
            if (contentType.includes('application/json')) {
              try {
                const json = await response.json();
                interceptedJson.push({ url: response.url(), data: json });

                // If this is our targeted primary network interception point
                if (capture?.primarySource === 'network' && capture?.network?.urlIncludes) {
                  if (response.url().includes(capture.network.urlIncludes)) {
                    primaryNetworkJson = json;
                    primaryNetworkMatchedUrl = response.url();
                    console.log(`[NETWORK CAPTURE] Successfully intercepted target URL: ${response.url()}`);
                  }
                }

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

        let response: any = null;
        let pageError: string | null = null;
        let interceptedResponsePromise: Promise<any> | null = null;

        if (capture?.primarySource === 'network' && capture?.network?.urlIncludes) {
          console.log(`[NETWORK CAPTURE] Setting up waitForResponse for: ${capture.network.urlIncludes}`);
          // Fire explicitly in background
          interceptedResponsePromise = page.waitForResponse(res => res.url().includes(capture.network.urlIncludes!) && res.status() >= 200 && res.status() <= 299, { timeout: 45000 }).catch(e => {
            console.warn(`[NETWORK CAPTURE] Failed to intercept URL within timeout: ${e.message}`);
            return null;
          });
        }

        response = await page.goto(targetUrl, {
          waitUntil: "commit",
          timeout: 45000
        }).catch(e => {
          pageError = e.message;
          return null;
        });

        console.log(`[STEALTH] page.goto completed for attempt ${attempt}`);

        if (response && (response.status() === 403 || response.status() === 429)) {
          console.warn(`[BLOCK] Received ${response.status()} status code. Attempting in-place solve...`);
        }

        try {
          await solvePressAndHold();
        } catch (e: any) {
          console.warn(`[STEALTH] solvePressAndHold skipped: ${e.message}`);
        }

        let content = "";
        try {
          content = await page.content();
        } catch (e: any) {
          pageError = pageError || e.message;
          console.warn(`[STEALTH] Failed to read page.content(): ${e.message}`);
        }

        const title = await page.title().catch(() => "");

        const blockPatterns = [
          "Access to this page has been denied",
          "px-captcha",
          "Verify you are human",
          "Cloudflare",
          "unusual activity from your computer network",
          "Please verify you are a human",
          "Checking your browser before accessing",
          "Pardon Our Interruption",
          "Are you a human?",
          "Request blocked",
          "Access Denied"
        ];

        let matchedMarkers = blockPatterns.filter(pattern => content.includes(pattern) || title.includes(pattern));

        if (pageError && (pageError.includes("ERR_ABORTED") || pageError.includes("403"))) {
          matchedMarkers.push("ERR_ABORTED/403");
        }

        // Only append the HTTP status if the text markers ALSO triggered.
        // Otherwise, successful bypassed solves will incorrectly trip a failure since 'response' points to the initial 403 load!
        if (response && (response.status() === 403 || response.status() === 429) && matchedMarkers.length > 0) {
          matchedMarkers.push(`HTTP ${response.status()}`);
        }

        if (matchedMarkers.length > 0) {
          console.warn(`[BLOCK] Bot detected on attempt ${attempt}. Markers: ${matchedMarkers.join(', ')}`);

          let screenshotBase64 = "";
          try {
            screenshotBase64 = await page.screenshot({ fullPage: true, type: 'png' }).then(b => b.toString('base64'));
          } catch (e) { /* ignore */ }

          const htmlSnippet = content.substring(0, 3000);

          await browser.close();

          return res.status(200).json({
            ok: false,
            success: false,
            errorType: "bot_detection",
            message: "Bot detection blocked access",
            diagnostics: {
              urlRequested: targetUrl,
              finalUrl: page.url(),
              title,
              statusHint: `challenge/blocked`,
              detectedMarkers: matchedMarkers,
              screenshotBase64,
              htmlSnippet
            }
          });
        }

        // If we survived the block logic, NOW wait for the network interceptor if applicable!
        if (interceptedResponsePromise) {
          console.log(`[NETWORK CAPTURE] Awaiting background intercept response...`);
          const interceptedResponse = await interceptedResponsePromise;
          if (interceptedResponse) {
            try {
              primaryNetworkJson = await interceptedResponse.json();
              primaryNetworkMatchedUrl = interceptedResponse.url();
              console.log(`[NETWORK CAPTURE] Successfully evaluated and saved intercept response.`);
            } catch (e) {
              console.warn(`[NETWORK CAPTURE] Failed to parse intercepted JSON: ${e}`);
            }
          }
        }

        if (capture?.primarySource === 'network' && !primaryNetworkJson) {
          let screenshotBase64 = "";
          try {
            screenshotBase64 = await page.screenshot({ fullPage: true, type: 'png' }).then(b => b.toString('base64'));
          } catch (e) { /* ignore */ }

          await browser.close();
          return res.status(200).json({
            ok: false,
            success: false,
            errorType: "network_timeout",
            message: "Target network request was not intercepted within the timeout period.",
            diagnostics: {
              urlRequested: targetUrl,
              finalUrl: page.url(),
              title,
              statusHint: "timeout",
              detectedMarkers: [],
              screenshotBase64,
              htmlSnippet: content.substring(0, 3000)
            }
          });
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
        const finalTitle = await page.title();

        let markdown = "";
        if (actualFormats.includes("markdown")) {
          const turndownService = new TurndownService();
          markdown = turndownService.turndown(finalContent);
        }

        await browser.close();

        // Save successful run to database
        try {
          await supabase.from('scraping_runs').insert([{
            user_id: req.userId,
            url: targetUrl,
            status: 'success',
            metadata: {
              title: finalTitle,
              formats_requested: actualFormats,
              attempt_count: attempt,
              intercepted_json_count: interceptedJson.length
            }
          }]);
        } catch (dbErr) {
          console.error("Failed to log successful run to db:", dbErr);
        }

        // Format final JSON payload including target `primarySource` network data
        let finalJsonPayload: any = undefined;
        if (actualFormats.includes("json") || capture?.primarySource === 'network') {
          if (capture?.primarySource === 'network') {
            finalJsonPayload = {
              primarySource: 'network',
              primary: primaryNetworkJson
            };
            if (includeInterceptedResponses) {
              finalJsonPayload.intercepted = interceptedJson;
            }
          } else {
            finalJsonPayload = interceptedJson;
          }
        }

        if (capture?.primarySource === 'network') {
          return res.json({
            ok: true,
            success: true,
            url: targetUrl,
            title: finalTitle,
            matchedUrl: primaryNetworkMatchedUrl,
            json: finalJsonPayload
          });
        }

        return res.json({
          ok: true,
          success: true,
          json: finalJsonPayload,
          data: {
            url: targetUrl,
            title: finalTitle,
            html: actualFormats.includes("html") ? finalContent : undefined,
            markdown: actualFormats.includes("markdown") ? markdown : undefined,
            json: finalJsonPayload,
          }
        });
      } catch (error: any) {
        if (browser) await browser.close();
        console.error(`Attempt ${attempt} failed:`, error.message);
        lastError = error;
      }
    }

    const errorMessage = lastError?.message || "Bot detection blocked access";

    // Save failed run to database
    try {
      await supabase.from('scraping_runs').insert([{
        user_id: req.userId,
        url: targetUrl,
        status: 'failed',
        error_message: errorMessage,
        metadata: {
          formats_requested: formats,
          attempt_count: attempt
        }
      }]);
    } catch (dbErr) {
      console.error("Failed to log failed run to db:", dbErr);
    }

    // Check if this was a manually thrown logic block for bot detection
    if (errorMessage === "Bot detection blocked access") {
      return res.status(200).json({
        ok: false,
        errorType: "bot_detection",
        message: errorMessage,
        diagnostics: {
          urlRequested: targetUrl,
          finalUrl: targetUrl,
          title: "Access Denied",
          statusHint: "challenge/blocked",
          detectedMarkers: [],
          screenshotBase64: "", // Missing since Playwright instance is already closed in the try/catch loop
          htmlSnippet: ""
        }
      });
    }

    res.status(500).json({ error: errorMessage });
  });

  // Catch-all to ensure unmatched /api routes return JSON, preventing fallback to Vite SPA handler
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
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
