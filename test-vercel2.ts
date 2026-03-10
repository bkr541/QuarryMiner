import { chromium } from "playwright-extra";
import stealth from "puppeteer-extra-plugin-stealth";
chromium.use(stealth());

async function run() {
    const context = await chromium.launchPersistentContext("./.browser-profiles/vercel-persistent", { headless: true, channel: "chrome" });
    const page = context.pages()[0] || await context.newPage();
    try {
        await page.goto("https://frontier-gowild-gamma.vercel.app/", { waitUntil: "domcontentloaded" });
        await page.waitForTimeout(3000);
        console.log("Fetching stream...");
        const result = await page.evaluate(async () => {
             const url = "https://frontier-gowild-gamma.vercel.app/api/flights/search/stream?origin=ATL&date=2026-03-10&max_workers=3&token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoyOTQ4LCJlbWFpbCI6ImtvZHlyb2JpbnNvbjAyQGdtYWlsLmNvbSIsImV4cCI6MTc3NDM0ODEwOCwiaWF0IjoxNzcxNzU2MTA4fQ.PfWc26pRP25u9SrX4MINas9BWMzxu8qZtNleqzm8kPY";
             const controller = new AbortController();
             setTimeout(() => controller.abort(), 8000); // 8 second hard kill
             
             let text = "";
             try {
                const res = await fetch(url, { signal: controller.signal });
                if (!res.body) return "No body";
                
                const reader = res.body.getReader();
                const decoder = new TextDecoder();
                
                while(true) {
                    const { value, done } = await reader.read();
                    if (done) break;
                    text += decoder.decode(value, { stream: true });
                }
                text += decoder.decode();
                return text;
             } catch(e: any) {
                 if (e.name === 'AbortError') {
                     return text;
                 }
                 return "ERROR";
             }
        });
        console.log("STREAM RESULT LENGTH:", result.length);
        
        // Emulate Server parsing logic
        const cleanedContent = result.trim();
        let parsedData;
        if (cleanedContent.startsWith("[")) {
            parsedData = JSON.parse(cleanedContent);
        } else if (cleanedContent.includes("}\n{")) {
            const lines = cleanedContent.split("\n").filter((l: string) => l.trim().length > 0);
            parsedData = lines.map((l: string) => JSON.parse(l));
        } else {
            parsedData = JSON.parse(`[${cleanedContent.replace(/}\s*{/g, "},{")}]`);
        }
        
        console.log("SUCCESS. First object:", JSON.stringify(parsedData[0], null, 2));

    } catch(e) { console.error("Global Catch", e); }
    finally { await context.close(); }
}
run();
