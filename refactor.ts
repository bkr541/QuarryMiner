import fs from 'fs';
import path from 'path';

const file = path.resolve('server.ts');
let code = fs.readFileSync(file, 'utf8');

// Insert crypto import if needed
if (!code.includes('import crypto from "crypto";')) {
    code = code.replace('import dotenv from "dotenv";', 'import dotenv from "dotenv";\nimport crypto from "crypto";');
}

// 1. Locate the scrape block
const startMarker = '  app.post("/api/scrape", async (req, res) => {\n';
const startIndex = code.indexOf(startMarker);
if (startIndex === -1) throw new Error("Could not find start marker");

// Find the matching closing bracket for app.post
let openBrackets = 0;
let endIndex = -1;
let index = code.indexOf('{', startIndex);
if (index !== -1) {
    openBrackets = 1;
    index++;
    while (index < code.length) {
        if (code[index] === '{') openBrackets++;
        else if (code[index] === '}') openBrackets--;

        if (openBrackets === 0) {
            endIndex = index + 3; // `  });\n`
            break;
        }
        index++;
    }
}

if (endIndex === -1) throw new Error("Could not find end of scrape block");

const oldEndpointCode = code.substring(startIndex, endIndex);

// 2. Rewrite oldEndpointCode's body
let body = oldEndpointCode.substring(oldEndpointCode.indexOf('{\n') + 2, oldEndpointCode.lastIndexOf('  });'));

// Replaces in body:
// req.body -> args
// req.userId -> args.userId
body = body.replace(/req\.body/g, 'args');
body = body.replace(/req\.userId/g, 'args.userId');
body = body.replace(/return res\.status\((\d+)\)\.json\(([\s\S]*?)\);/g, 'return { status: $1, body: $2 };');
body = body.replace(/res\.status\((\d+)\)\.json\(([\s\S]*?)\);/g, 'return { status: $1, body: $2 };');
body = body.replace(/return res\.json\(([\s\S]*?)\);/g, 'return { status: 200, body: $1 };');

const helperFunctions = `
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
${body}
}
`;

const newEndpointCode = `  app.post("/api/scrape", async (req, res) => {
    const { url, waitSelector, scrollCount = 0, formats = ["HTML", "JSON"], capture } = req.body;
    const result = await runScrapeInternal({
      url, waitSelector, scrollCount, formats, capture, userId: req.userId
    });
    res.status(result.status || 200).json(result.body);
  });
`;

code = code.substring(0, startIndex) + helperFunctions + '\n' + newEndpointCode + code.substring(endIndex);

fs.writeFileSync(file, code);
console.log("Transformation completed successfully.");
