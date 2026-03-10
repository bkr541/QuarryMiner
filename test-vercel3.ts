import { chromium } from "playwright-extra";
import stealth from "puppeteer-extra-plugin-stealth";
chromium.use(stealth());

async function run() {
    const context = await chromium.launchPersistentContext("./.browser-profiles/vercel-persistent", { headless: false, channel: "chrome" });
    const page = context.pages()[0] || await context.newPage();
    
    // We will navigate DIRECTLY to the streaming endpoint again, but this time we will read the <body> DOM 
    // after 8 seconds and scrape whatever rendering engine wrote to it.
    let content = "";
    try {
        const url = "https://frontier-gowild-gamma.vercel.app/api/flights/search/stream?origin=ATL&date=2026-03-10&max_workers=3&token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoyOTQ4LCJlbWFpbCI6ImtvZHlyb2JpbnNvbjAyQGdtYWlsLmNvbSIsImV4cCI6MTc3NDM0ODEwOCwiaWF0IjoxNzcxNzU2MTA4fQ.PfWc26pRP25u9SrX4MINas9BWMzxu8qZtNleqzm8kPY";
        
        console.log("Navigating directly to API...");
        // Do NOT wait for load/networkidle since it's a stream! Wait for raw DOM construction only.
        await page.goto(url, { waitUntil: "commit" });
        
        console.log("Waiting 8 seconds for stream to populate DOM via browser engine...");
        await page.waitForTimeout(8000);
        
        content = await page.evaluate(() => document.body.innerText);
        console.log("Content length:", content.length);
        console.log(content.substring(0, 500));
        
    } catch(e) { console.error("Global Catch", e); }
    finally { await context.close(); }
}
run();
