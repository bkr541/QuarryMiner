/**
 * Vercel Proxy Scraper — v1 (Persistent Context & Stealth)
 *
 * Designed to bypass Vercel's Edge Security JS Challenge
 * by injecting the target API URL into a real browser environment
 * and ripping the resulting JSON payload directly off the DOM.
 */

import { chromium } from "playwright-extra";
import stealth from "puppeteer-extra-plugin-stealth";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

chromium.use(stealth());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use a directory for the persistent profile to avoid incognito flags
const PROFILE_DIR = path.resolve(__dirname, ".browser-profiles", "vercel-persistent");

export interface VercelParams {
    origin: string;
    date: string;
    maxWorkers: number;
    token: string;
}

export async function scrapeVercelEndpoint(params: VercelParams): Promise<any> {
    const { origin, date, maxWorkers, token } = params;

    const TARGET_URL = `https://frontier-gowild-gamma.vercel.app/api/flights/search/stream?origin=${origin}&date=${date}&max_workers=${maxWorkers}&token=${token}`;

    console.log(`\n🚀 Launching Vercel API Interceptor`);
    console.log(`   Target: ${TARGET_URL}\n`);

    // Ensure directory exists
    if (!fs.existsSync(PROFILE_DIR)) fs.mkdirSync(PROFILE_DIR, { recursive: true });

    // Open a completely fresh, physical Google Chrome context
    const context = await chromium.launchPersistentContext(PROFILE_DIR, {
        headless: true, // Run in background
        channel: "chrome",
        args: [
            "--no-sandbox",
            "--disable-blink-features=AutomationControlled",
            "--disable-web-security",
        ],
        ignoreDefaultArgs: ["--enable-automation"],
        viewport: { width: 1280, height: 720 },
    });

    const page = context.pages()[0] || await context.newPage();

    // Mask the webdriver and apply standard stealth tactics
    await page.addInitScript(() => {
        Object.defineProperty(navigator, "webdriver", { get: () => undefined });
        Object.defineProperty(navigator, "languages", { get: () => ["en-US", "en"] });
        Object.defineProperty(navigator, "plugins", { get: () => [1, 2, 3, 4, 5] });
        (window as any).chrome = { runtime: {}, loadTimes() { }, csi() { }, app: {} };
    });

    try {
        console.log(`🌐 Navigating to Vercel Base URL to clear Security Checkpoints...`);
        const BASE_URL = "https://frontier-gowild-gamma.vercel.app/";

        // Navigate to the root site first to pass the JS verification naturally
        await page.goto(BASE_URL, { waitUntil: "domcontentloaded", timeout: 45000 }).catch(() => { });

        console.log(`⏳ Waiting for Vercel Security Checkpoint to execute in DOM...`);
        await page.waitForTimeout(3000);

        console.log(`🌐 Navigating directly to Vercel Streaming API...`);

        // Wait until "commit" meaning the HTTP headers connected, but before the stream completes (which never happens)
        await page.goto(TARGET_URL, { waitUntil: "commit", timeout: 60000 });

        console.log(`⏳ Waiting 8000ms for Vercel Security Checkpoint & Data Stream...`);
        await page.waitForTimeout(8000);

        console.log(`⏳ Extracting streaming JSON chunks directly from the DOM...`);

        // The browser organically renders streaming JSON natively onto the body tag
        const rawContent = await page.evaluate(() => document.body.innerText);

        if (!rawContent || rawContent.length < 10) {
            throw new Error("No payload found on body tag. Security Checkpoint likely blocked execution.");
        }

        let parsedData: any[] = [];
        try {
            // The stream is formatted as Server-Sent Events (SSE)
            // e.g., "event: flights\ndata: {...}\n\n"
            const lines = rawContent.split("\n");

            for (const line of lines) {
                if (line.startsWith("data: ")) {
                    const jsonStr = line.substring(6).trim();
                    if (jsonStr) {
                        try {
                            parsedData.push(JSON.parse(jsonStr));
                        } catch (e) { } // skip malformed mid-stream chunks
                    }
                }
            }

            console.log(`✅ Successfully extracted (${parsedData.length}) streaming JSON segments from Vercel!`);
        } catch (e) {
            console.error(`❌ Failed to parse DOM streaming payload. Length: ${rawContent?.length}`);
            console.log("Raw preview:", rawContent?.substring(0, 500));
            throw new Error("Invalid payload format extracted from DOM stream.");
        }

        await context.close();
        return parsedData;

    } catch (error: any) {
        console.error(`💥 Navigation or Extraction Error: ${error.message}`);
        await context.close();
        throw error;
    }
}
