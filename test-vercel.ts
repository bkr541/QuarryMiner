import { scrapeVercelEndpoint } from "./scrape-vercel.ts";

async function run() {
  try {
    const data = await scrapeVercelEndpoint({
      origin: "ATL",
      date: "2026-03-10",
      maxWorkers: 3,
      token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoyOTQ4LCJlbWFpbCI6ImtvZHlyb2JpbnNvbjAyQGdtYWlsLmNvbSIsImV4cCI6MTc3NDM0ODEwOCwiaWF0IjoxNzcxNzU2MTA4fQ.PfWc26pRP25u9SrX4MINas9BWMzxu8qZtNleqzm8kPY"
    });
    console.log("SUCCESS:", data);
  } catch (e) {
    console.error("FAIL:", e);
  }
}
run();
