# QuarryMiner

An autonomous web scraping engine with AI-powered extraction and stealth capabilities.

## Architecture

### Rendering Engine
- **Node.js + Playwright**: Handles heavy JavaScript, infinite scrolls, and pop-up handling.
- **Stealth Layer**: Integrated `playwright-extra` with the `stealth` plugin.
- **Fingerprint Rotation**: Automatic User-Agent rotation for each request.

### AI Extraction
- **Gemini 3.1 Pro/Flash**: Uses AI to take raw HTML/DOM and convert it into structured JSON based on a user-provided schema.
- **Smart Wait**: Detects when the data is actually visible before scraping.

### Resilience
- **Retry Logic**: Detects Cloudflare/Bot-block screens and automatically switches IP/Fingerprint (basic implementation).

## Getting Started

1.  Enter a URL to scrape.
2.  Provide a JSON schema for extraction.
3.  Optionally provide a CSS selector to wait for.
4.  Click "Scrape & Extract" to get structured data.

## Test URL
Verify JS rendering by testing against: `https://quotes.toscrape.com/js/`
