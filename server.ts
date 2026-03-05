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
import crypto from "crypto";

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

  // --- Crypto & Cache Helpers ---
  function generateApiKey() {
    return "qm_" + crypto.randomBytes(24).toString('base64url');
  }

  function hashApiKey(plaintext: string) {
    return crypto.createHash('sha256').update(plaintext).digest('hex');
  }

  function verifyApiKey(plaintext: string, storedHash: string) {
    const hash = hashApiKey(plaintext);
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(storedHash, 'hex'));
  }

  function generateCacheKey(apiEndpointId: string, params: any) {
    const normalized: any = {};
    if (params) {
      Object.keys(params).sort().forEach(k => {
        let val = params[k];
        if (typeof val === 'string') {
          val = val.trim();
          if ((k === 'o' || k === 'd' || k === 'origin' || k === 'destination') && val.length === 3) {
            val = val.toUpperCase();
          }
        }
        normalized[k] = val;
      });
    }
    const paramsStr = JSON.stringify(normalized);
    return crypto.createHash('sha256').update(apiEndpointId + ':' + paramsStr).digest('hex');
  }

  // --- Internal Scrape Runner ---
  async function runScrapeInternal(args: any) {
    const { url, waitSelector, scrollCount = 0, formats = ["HTML", "JSON"], capture } = args;

    if (!url) {
      return { status: 400, body: { error: "URL is required" } };
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
          headless: false,
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
            const url = response.url();
            const contentType = response.headers()['content-type'] || '';
            const isFrontier = url.includes('flyfrontier.com');

            if (isFrontier || contentType.includes('application/json')) {
              console.log(`[NETWORK CAPTURE] Observed: [${response.status()}] ${url.substring(0, 120)} (${contentType})`);
            }

            if (contentType.includes('application/json')) {
              try {
                const json = await response.json();
                interceptedJson.push({ url, data: json });

                // If we survived the block logic...
                if (capture?.primarySource === 'network' && capture?.network?.urlIncludes) {
                  if (url.includes(capture.network.urlIncludes)) {
                    primaryNetworkJson = json;
                    primaryNetworkMatchedUrl = url;
                    console.log(`[NETWORK CAPTURE] Successfully intercepted target URL: ${url}`);
                  }
                }
              } catch (e) { }
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
        // Helper to solve "Press and Hold" if detected
        const solvePressAndHold = async () => {
          const pressAndHoldSelectors = [
            "#px-captcha",
            "div[class*='captcha']",
            "iframe[src*='captcha']",
            "div[id*='captcha']",
            "button[id*='press']",
            ".px-captcha-container",
            "div[aria-label*='Press and Hold']",
            "#challenge-stage",
            ".ctp-checkbox-label",
            "text='Access to this page has been denied'"
          ];

          // Poll periodically for up to 15 seconds waiting for the CAPTCHA to appear
          for (let attempt = 0; attempt < 15; attempt++) {
            const frames = page.frames();

            for (const frame of frames) {
              for (const selector of pressAndHoldSelectors) {
                try {
                  const element = await frame.$(selector);
                  if (element && await element.isVisible()) {
                    console.log(`[STEALTH] Detected potential Challenge in frame: ${selector}`);

                    // Wait for the iframe's internal JS to fully initialize and attach its event listeners before clicking
                    await page.waitForTimeout(3000);

                    // native Playwright boundingBox inside an iframe already returns main-frame relative coords
                    const box = await element.boundingBox();
                    if (box) {
                      const x = box.x + box.width / 2 + (Math.random() * 20 - 10);
                      const y = box.y + box.height / 2 + (Math.random() * 20 - 10);

                      // Move mouse naturally
                      await moveMouseHumanLike(x, y);
                      await page.mouse.down();

                      // Hold with "jitter" and "wiggle" to spoof human biometrics
                      const holdDuration = 6000 + Math.random() * 4000;
                      const intervals = 15;
                      for (let i = 0; i < intervals; i++) {
                        await page.waitForTimeout(holdDuration / intervals);
                        // jiggle 1-2 pixels
                        await page.mouse.move(x + (Math.random() * 4 - 2), y + (Math.random() * 4 - 2));
                      }

                      await page.mouse.up();
                      console.log(`[STEALTH] Solved ${selector}, waiting for validation...`);
                      await page.waitForTimeout(8000);
                      return true;
                    }
                  }
                } catch (e) {
                  // Ignore frame-specific errors
                }
              }
            }
            // Wait 1 second before checking again
            await page.waitForTimeout(1000);
          }
          return false;
        };

        const waitForLoadingBear = async (depth = 0) => {
          if (depth > 2) return; // Prevent infinite refresh loops

          const loadingPatterns = [
            ".loading-image", // Frontier's bear
            ".loading-spinner",
            ".spinner",
            "div[class*='Loading']",
            "img[src*='loading']",
            "img[src*='bear']",
            "svg[class*='Loading']",
            ".loading-icon"
          ];

          console.log(`[STEALTH] Checking for loading indicators (depth ${depth})...`);
          for (let i = 0; i < 40; i++) { // Poll for up to 60 seconds
            let foundLoading = false;
            for (const selector of loadingPatterns) {
              const elements = await page.$$(selector);
              for (const el of elements) {
                if (await el.isVisible()) {
                  foundLoading = true;
                  break;
                }
              }
              if (foundLoading) break;
            }

            if (!foundLoading) {
              // Also check for specific innerText patterns that imply loading
              const bodyText = await page.evaluate(() => document.body ? document.body.innerText : "");
              if (bodyText.includes("Finding the best fares") || bodyText.includes("Loading your results") || bodyText.includes("Just a moment")) {
                foundLoading = true;
              }
            }

            if (!foundLoading) {
              console.log(`[STEALTH] No loading indicators found (at step ${i}).`);

              const title = await page.title().catch(() => "");
              const bodyText = await page.evaluate(() => document.body ? document.body.innerText : "");
              if (title.includes("Access Denied") || (bodyText.length < 2000 && bodyText.includes("Access to this page has been denied"))) {
                console.warn(`[STEALTH] Still on Access Denied page after "solve". Refreshing...`);
                await page.reload({ waitUntil: 'domcontentloaded' }).catch(() => { });
                await page.waitForTimeout(5000);
                return await waitForLoadingBear(depth + 1);
              }

              if (i > 0) await page.waitForTimeout(3000); // Small buffer after it disappears
              return;
            }

            console.log(`[STEALTH] Loading screen active, waiting...`);
            await page.waitForTimeout(1500);
          }
          console.log(`[STEALTH] Loading indicator polling finished.`);
        };

        // Random delay to simulate human behavior
        await new Promise(r => setTimeout(r, 3000 + Math.random() * 4000));

        console.log(`Scraping Attempt ${attempt}: ${targetUrl}`);

        let response: any = null;
        let pageError: string | null = null;
        let interceptedResponsePromise: Promise<any> | null = null;

        if (capture?.primarySource === 'network' && capture?.network?.urlIncludes) {
          console.log(`[NETWORK CAPTURE] Monitoring all responses for: ${capture.network.urlIncludes}`);
          // We won't use a strict background promise here anymore because 
          // Frontier's long loading cycles can cause them to expire or miss the trigger.
          // Instead, we will rely on checking the interceptedJson array periodically.
        }

        response = await page.goto(targetUrl, {
          waitUntil: "commit",
          timeout: 60000
        }).catch(e => {
          pageError = e.message;
          return null;
        });

        console.log(`[STEALTH] page.goto completed for attempt ${attempt}`);

        if (response && (response.status() === 403 || response.status() === 429)) {
          console.warn(`[BLOCK] Received ${response.status()} status code. Attempting in-place solve...`);
        }

        let didSolve = false;
        try {
          didSolve = await solvePressAndHold();
        } catch (e: any) {
          console.warn(`[STEALTH] solvePressAndHold skipped: ${e.message}`);
        }

        // If we actively solved a captcha, wait briefly to allow the page to visibly navigate to the target data state.
        if (didSolve) {
          console.log(`[STEALTH] Captcha solved. Navigating fresh to original URL to trigger flight data request...`);
          await page.mouse.move(100 + Math.random() * 100, 100 + Math.random() * 100);
          await page.waitForTimeout(2000);

          // Navigate fresh so the SPA re-fires the flight data POST request from scratch
          await page.goto(targetUrl, {
            waitUntil: 'domcontentloaded',
            timeout: 60000,
          }).catch((e: any) => {
            console.warn(`[STEALTH] Fresh nav after solve had navigation error: ${e.message}`);
          });

          console.log(`[STEALTH] Fresh nav complete. Current URL: ${page.url()}`);
          await waitForLoadingBear();
          console.log(`[STEALTH] Loading finished, waiting for final intercept stabilization...`);

          // Poll the interceptedJson array for the target request for up to 45s after loading finishes
          if (capture?.primarySource === 'network' && capture?.network?.urlIncludes) {
            console.log(`[NETWORK CAPTURE] Actively polling for target JSON...`);
            for (let i = 0; i < 45; i++) {
              const matched = interceptedJson.find(ij => ij.url.includes(capture.network.urlIncludes!));
              if (matched) {
                primaryNetworkJson = matched.data;
                primaryNetworkMatchedUrl = matched.url;
                console.log(`[NETWORK CAPTURE] Found target JSON via polling at step ${i}`);
                break;
              }
              // Secondary check for the loading indicators in case they reappear
              const bodyText = await page.evaluate(() => document.body ? document.body.innerText : "");
              if (bodyText.includes("Finding the best fares")) {
                console.log(`[STEALTH] Still seeing "Finding the best fares" text...`);
              }
              await page.waitForTimeout(1000);
            }
          }

          if (!primaryNetworkJson) {
            await page.waitForTimeout(5000); // Final cooldown if still not found
          }
        }

        let content = "";
        let bodyText = "";
        try {
          // Wait for body to at least exist
          await page.waitForSelector('body', { timeout: 10000 }).catch(() => { });
          content = await page.content();
          bodyText = await page.evaluate(() => document.body ? document.body.innerText : "");
        } catch (e: any) {
          pageError = pageError || e.message;
          console.warn(`[STEALTH] Failed to read page.content(): ${e.message}`);
        }

        const title = await page.title().catch(() => "");

        const blockPatterns = [
          "Access to this page has been denied",
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

        let matchedMarkers = blockPatterns.filter(pattern => {
          // If we solved a captcha, ignore "Access to this page has been denied" unless it's the ONLY thing on screen
          if (didSolve && (pattern === "Access to this page has been denied" || pattern === "Access Denied")) {
            // Only count as a block if the body text is REALLY short (just the error message)
            return bodyText.length < 500 && bodyText.includes(pattern);
          }
          return bodyText.includes(pattern) || title.includes(pattern);
        });

        if (pageError && (pageError.includes("ERR_ABORTED") || pageError.includes("403"))) {
          matchedMarkers.push("ERR_ABORTED/403");
        }

        // Only append the HTTP status if the text markers ALSO triggered AND we didn't solve a captcha.
        if (!didSolve && response && (response.status() === 403 || response.status() === 429) && matchedMarkers.length > 0) {
          matchedMarkers.push(`HTTP ${response.status()}`);
        }

        // If there's a network interceptor running, and we think we might be blocked, 
        // give the interceptor a more generous grace period (20s) if we solve a captcha.
        let networkSucceeded = false;
        if (matchedMarkers.length > 0 && interceptedResponsePromise) {
          const graceMs = didSolve ? 20000 : 10000;
          console.log(`[STEALTH] Bot markers detected but network interceptor is active. Giving it ${graceMs / 1000}s grace period...`);
          const gracePeriod = new Promise(resolve => setTimeout(() => resolve(null), graceMs));
          const fastIntercept: any = await Promise.race([interceptedResponsePromise, gracePeriod]);
          if (fastIntercept) {
            console.log(`[STEALTH] Grace period intercept success! Ignoring bot detection.`);
            matchedMarkers = [];
            networkSucceeded = true;
          }
        }

        if (matchedMarkers.length > 0) {
          console.warn(`[BLOCK] Bot detected on attempt ${attempt}. Markers: ${matchedMarkers.join(', ')}`);

          let screenshotBase64 = "";
          try {
            screenshotBase64 = await page.screenshot({ fullPage: true, type: 'png' }).then(b => b.toString('base64'));
          } catch (e) { /* ignore */ }

          const htmlSnippet = content.substring(0, 3000);

          await browser.close();

          return {
            status: 200, body: {
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
            }
          };
        }

        // Final check if not found during didSolve polling
        if (capture?.primarySource === 'network' && !primaryNetworkJson) {
          const matched = interceptedJson.find(ij => ij.url.includes(capture.network.urlIncludes!));
          if (matched) {
            primaryNetworkJson = matched.data;
            primaryNetworkMatchedUrl = matched.url;
          } else {
            // Fallback: If we missed the exact includes string, look for any JSON that looks like flight data
            console.log(`[NETWORK CAPTURE] Exact match not found. Attempting heuristic fallback (excluding trackers)...`);
            const heuristicMatch = interceptedJson.slice().reverse().find(ij => {
              const url = ij.url.toLowerCase();
              const isTracker = url.includes("clicktripz") || url.includes("google-analytics") || url.includes("px-cloud");
              if (isTracker) return false;

              return url.includes("flight") ||
                url.includes("availability") ||
                (ij.data && (ij.data.flights || ij.data.outboundFlights || ij.data.lowFareData));
            });
            if (heuristicMatch) {
              primaryNetworkJson = heuristicMatch.data;
              primaryNetworkMatchedUrl = heuristicMatch.url;
              console.log(`[NETWORK CAPTURE] Heuristic match found: ${heuristicMatch.url}`);
            }
          }
        }

        if (capture?.primarySource === 'network' && !primaryNetworkJson) {
          let screenshotBase64 = "";
          try {
            screenshotBase64 = await page.screenshot({ fullPage: true, type: 'png' }).then(b => b.toString('base64'));
          } catch (e) { /* ignore */ }

          await browser.close();
          return {
            status: 200, body: {
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
                interceptedUrls: interceptedJson.map(i => i.url),
                allUrls: page.frames().flatMap(f => f.url()),
                screenshotBase64,
                htmlSnippet: content.substring(0, 3000)
              }
            }
          };
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
            user_id: args.userId,
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
          return {
            status: 200, body: {
              ok: true,
              success: true,
              url: targetUrl,
              title: finalTitle,
              matchedUrl: primaryNetworkMatchedUrl,
              json: finalJsonPayload
            }
          };
        }

        return {
          status: 200, body: {
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
          }
        };
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
        user_id: args.userId,
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
      return {
        status: 200, body: {
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
        }
      };
    }

    return { status: 500, body: { error: errorMessage } };

  }

  app.post("/api/scrape", async (req, res) => {
    const { url, waitSelector, scrollCount = 0, formats = ["HTML", "JSON"], capture } = req.body;
    const result = await runScrapeInternal({
      url, waitSelector, scrollCount, formats, capture, userId: req.userId
    });
    res.status(result.status || 200).json(result.body);
  });




  // --- Admin API Endpoints for Cache-Backed Data ---
  app.post("/api/v1/admin/endpoints", async (req, res) => {
    try {
      const { env_slug, resource, cache_ttl_seconds = 3600, request_template, response_template = null, enabled = true, require_api_key = true } = req.body;
      const plaintextKey = generateApiKey();
      const api_key_hash = hashApiKey(plaintextKey);

      const { data, error } = await supabase
        .from('api_endpoints')
        .insert([{
          user_id: req.userId,
          env_slug,
          resource,
          cache_ttl_seconds,
          request_template,
          response_template,
          enabled,
          require_api_key,
          api_key_hash
        }])
        .select()
        .single();

      if (error) throw error;
      res.json({ success: true, data, apiKey: plaintextKey });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get("/api/v1/admin/endpoints", async (req, res) => {
    try {
      const { data, error } = await supabase
        .from('api_endpoints')
        .select('*')
        .eq('user_id', req.userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      res.json({ success: true, data });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post("/api/v1/admin/endpoints/:id/rotate_key", async (req, res) => {
    try {
      const plaintextKey = generateApiKey();
      const api_key_hash = hashApiKey(plaintextKey);
      const { data, error } = await supabase
        .from('api_endpoints')
        .update({ api_key_hash })
        .eq('id', req.params.id)
        .eq('user_id', req.userId)
        .select()
        .single();
      if (error) throw error;
      res.json({ success: true, data, apiKey: plaintextKey });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  app.patch("/api/v1/admin/endpoints/:id", async (req, res) => {
    try {
      const { enabled, cache_ttl_seconds, require_api_key, request_template, response_template, resource, env_slug } = req.body;

      const updateData: any = {};
      if (enabled !== undefined) updateData.enabled = enabled;
      if (cache_ttl_seconds !== undefined) updateData.cache_ttl_seconds = cache_ttl_seconds;
      if (require_api_key !== undefined) updateData.require_api_key = require_api_key;
      if (request_template !== undefined) updateData.request_template = request_template;
      if (response_template !== undefined) updateData.response_template = response_template;
      if (resource !== undefined) updateData.resource = resource;
      if (env_slug !== undefined) updateData.env_slug = env_slug;

      const { data, error } = await supabase
        .from('api_endpoints')
        .update(updateData)
        .eq('id', req.params.id)
        .eq('user_id', req.userId)
        .select()
        .single();

      if (error) throw error;
      res.json({ success: true, data });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });


  // --- Consumer Data API ---
  app.get("/api/v1/data/:env_slug/:resource", async (req, res) => {
    try {
      const { env_slug, resource } = req.params;
      const queryParams = req.query as Record<string, any>;
      const providedKey = req.headers['x-api-key'] as string;

      // 1. Lookup endpoint
      const { data: endpoint, error: epError } = await supabase
        .from('api_endpoints')
        .select('*')
        .eq('user_id', req.userId)
        .eq('env_slug', env_slug)
        .eq('resource', resource)
        .eq('enabled', true)
        .single();

      if (epError || !endpoint) {
        return res.status(404).json({ ok: false, env: env_slug, resource, source: "fresh", params: queryParams, error: "Endpoint not found or disabled" });
      }

      // 2. verify API key
      if (endpoint.require_api_key) {
        if (!providedKey || !verifyApiKey(providedKey, endpoint.api_key_hash)) {
          return res.status(401).json({ ok: false, env: env_slug, resource, source: "fresh", params: queryParams, error: "Unauthorized: Invalid or missing X-API-Key" });
        }
      }

      // 3. Normalize & cache key
      const cache_key = generateCacheKey(endpoint.id, queryParams);

      // 5. Cache-aside Check
      const { data: cached, error: cacheErr } = await supabase
        .from('api_endpoint_cache')
        .select('*')
        .eq('cache_key', cache_key)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();

      if (cached && cached.payload) {
        return res.json({
          ok: cached.status === 'success',
          env: env_slug,
          resource,
          source: "cache",
          fetchedAt: cached.fetched_at,
          expiresAt: cached.expires_at,
          params: queryParams,
          data: cached.payload
        });
      }

      // 6. Missing/Stale: Build request and Scrape
      const scrapeArgs = { ...endpoint.request_template, userId: req.userId };
      const { urlTemplate, defaults = {} } = endpoint.request_template || {};

      if (!urlTemplate) {
        return res.status(400).json({ ok: false, env: env_slug, resource, source: "fresh", params: queryParams, error: "Endpoint missing required urlTemplate" });
      }

      // Merge defaults with query params (query params override defaults)
      const mergedParams = { ...defaults, ...queryParams };

      // Normalizations
      if (mergedParams.o) mergedParams.o = String(mergedParams.o).toUpperCase();
      if (mergedParams.d) mergedParams.d = String(mergedParams.d).toUpperCase();
      if (!mergedParams.ftype) mergedParams.ftype = 'GW';
      if (!mergedParams.adt) mergedParams.adt = 1;

      // Extract required tokens from urlTemplate and substitute
      let computedUrl = urlTemplate;
      const missingTokens: string[] = [];
      const tokenRegex = /\{\{([^}]+)\}\}/g;

      let match;
      while ((match = tokenRegex.exec(urlTemplate)) !== null) {
        const key = match[1];
        if (mergedParams[key] === undefined || mergedParams[key] === null || mergedParams[key] === '') {
          missingTokens.push(key);
        } else {
          // Replace ALL instances of this token
          computedUrl = computedUrl.split(`{{${key}}}`).join(encodeURIComponent(String(mergedParams[key])));
        }
      }

      if (missingTokens.length > 0) {
        return res.status(400).json({ ok: false, env: env_slug, resource, source: "fresh", params: queryParams, error: `Missing required token(s) for URL template: ${missingTokens.join(', ')}` });
      }

      scrapeArgs.url = computedUrl;
      console.log(`[API Data] Final computed URL for ${env_slug}/${resource}:`, computedUrl);

      const scrapeResult = await runScrapeInternal(scrapeArgs);

      let finalPayload = scrapeResult.body;
      let isSuccess = scrapeResult.status >= 200 && scrapeResult.status < 300 && finalPayload.ok !== false;

      // Extract from outer payload wrapper
      if (isSuccess && finalPayload.json) {
        finalPayload = finalPayload.json;
      }

      // Response shaping
      if (isSuccess && endpoint.response_template) {
        if (endpoint.response_template.mode === "primary_only") {
          let fp: any = finalPayload;
          let primary = fp.primary || fp;
          if (endpoint.response_template.pick) {
            const pickKey = endpoint.response_template.pick;
            if (pickKey.endsWith('[0]')) {
              const key = pickKey.replace('[0]', '');
              primary = primary[key] && Array.isArray(primary[key]) ? primary[key][0] : primary[key];
            } else {
              primary = primary[pickKey];
            }
          }
          finalPayload = primary;
        }
      }

      // Clean intercepted payload
      if (finalPayload && (finalPayload as any).intercepted) {
        delete (finalPayload as any).intercepted;
      }

      const now = new Date();
      const expires = new Date(now.getTime() + (endpoint.cache_ttl_seconds * 1000));

      const cacheRow = {
        api_endpoint_id: endpoint.id,
        cache_key,
        params: queryParams,
        payload: finalPayload,
        status: isSuccess ? 'success' : 'failed',
        fetched_at: now.toISOString(),
        expires_at: expires.toISOString(),
      };

      try {
        await supabase.from('api_endpoint_cache').upsert(cacheRow, { onConflict: 'cache_key' });
      } catch (upsertErr) {
        console.error("Cache upsert error:", upsertErr);
      }

      if (!isSuccess) {
        return res.status(scrapeResult.status || 500).json({
          ok: false,
          env: env_slug,
          resource,
          source: "fresh",
          params: queryParams,
          error: finalPayload.error || finalPayload.message || "Scrape failed"
        });
      }

      return res.json({
        ok: true,
        env: env_slug,
        resource,
        source: "fresh",
        fetchedAt: now.toISOString(),
        expiresAt: expires.toISOString(),
        params: queryParams,
        data: finalPayload
      });

    } catch (err: any) {
      res.status(500).json({ ok: false, env: req.params.env_slug, resource: req.params.resource, source: "fresh", params: req.query, error: err.message });
    }
  });



  // --- Secrets Endpoints ---
  app.get("/api/secrets", async (req, res) => {
    try {
      // Don't return the actual value for security, just the metadata
      const { data, error } = await supabase
        .from('secrets')
        .select('id, name, created_at, updated_at')
        .eq('user_id', req.userId)
        .order('name');
      if (error) throw error;
      res.json({ success: true, data });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.post("/api/secrets", async (req, res) => {
    try {
      const { name, value } = req.body;
      if (!name || !value) {
        return res.status(400).json({ success: false, error: "Name and Value are required." });
      }

      // Check for uniqueness
      const { data: existing } = await supabase
        .from('secrets')
        .select('id')
        .eq('user_id', req.userId)
        .eq('name', name)
        .maybeSingle();

      if (existing) {
        return res.status(400).json({ success: false, error: "A secret with this name already exists." });
      }

      const { data, error } = await supabase
        .from('secrets')
        .insert([{ user_id: req.userId, name, value }])
        .select('id, name, created_at, updated_at')
        .single();

      if (error) throw error;
      res.json({ success: true, data });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.get("/api/secrets/:id/reveal", async (req, res) => {
    try {
      const { data, error } = await supabase
        .from('secrets')
        .select('value')
        .eq('id', req.params.id)
        .eq('user_id', req.userId)
        .single();
      if (error) throw error;
      res.json({ success: true, value: data.value });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  app.delete("/api/secrets/:id", async (req, res) => {
    try {
      const { error } = await supabase
        .from('secrets')
        .delete()
        .eq('id', req.params.id)
        .eq('user_id', req.userId);

      if (error) throw error;
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
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
