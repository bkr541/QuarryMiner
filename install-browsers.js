import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

const browsersPath = path.resolve(process.cwd(), '.playwright-browsers');
process.env.PLAYWRIGHT_BROWSERS_PATH = browsersPath;

console.log(`Installing Playwright browsers to ${browsersPath}...`);

// Ensure directory exists
if (!fs.existsSync(browsersPath)) {
  fs.mkdirSync(browsersPath, { recursive: true });
}

try {
  // Explicitly set the environment variable for the command
  execSync(`PLAYWRIGHT_BROWSERS_PATH="${browsersPath}" npx playwright install chromium`, { 
    stdio: 'inherit',
    env: { ...process.env, PLAYWRIGHT_BROWSERS_PATH: browsersPath }
  });
  console.log('Playwright browsers installed successfully.');
  
  // Verify installation
  const dirs = fs.readdirSync(browsersPath);
  console.log('Installed browsers:', dirs);
} catch (error) {
  console.error('Failed to install Playwright browsers:', error);
  process.exit(1);
}
