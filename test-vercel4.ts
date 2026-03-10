import { chromium } from "playwright-extra";
import stealth from "puppeteer-extra-plugin-stealth";
chromium.use(stealth());

async function run() {
    console.log("Starting test-vercel4...");
    const context = await chromium.launchPersistentContext("./.browser-profiles/vercel-persistent", { headless: true, channel: "chrome" });
    const page = context.pages()[0] || await context.newPage();
    
    try {
        console.log("Navigating to ROOT to clear Vercel Challenge...");
        await page.goto("https://frontier-gowild-gamma.vercel.app/", { waitUntil: "domcontentloaded", timeout: 45000 }).catch(() => {});
        await page.waitForTimeout(3000);
        
        const url = "https://frontier-gowild-gamma.vercel.app/api/flights/search/stream?origin=ATL&date=2026-03-10&max_workers=3&token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoyOTQ4LCJlbWFpbCI6ImtvZHlyb2JpbnNvbjAyQGdtYWlsLmNvbSIsImV4cCI6MTc3NDM0ODEwOCwiaWF0IjoxNzcxNzU2MTA4fQ.PfWc26pRP25u9SrX4MINas9BWMzxu8qZtNleqzm8kPY";
        
        console.log("Navigating directly to API stream...");
        await page.goto(url, { waitUntil: "commit" });
        
        console.log("Waiting 8 seconds for stream to populate DOM...");
        await page.waitForTimeout(8000);
        
        const content = await page.evaluate(() => document.body.innerText);
        console.log("Content length:", content.length);
        console.log(content.substring(0, 500));
        
    } catch(e) { console.error("Global Catch", e); }
    finally { await context.close(); }
}
run();
