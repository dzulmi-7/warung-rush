// Screenshot the staged scenes into screenshots/ (dev tooling, not part of the game): serves
// game/ the same way serve.ts does, opens each ?shot= page in headless Chromium at the game's
// own 1280x800, waits for the staged paint to signal __shotReady, and saves a JPEG per shot.
//
//   PLAYWRIGHT_PATH=/tmp/pwsetup/node_modules node scripts/screenshot.mjs

import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, statSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
// An absolute path is a package directory outside the repo's node_modules; otherwise resolve normally.
const playwrightPath = process.env.PLAYWRIGHT_PATH;
const pkg = playwrightPath && playwrightPath.startsWith('/')
  ? require(`${playwrightPath}/index.js`)
  : require(playwrightPath ?? 'playwright-core');
const { chromium } = pkg;

const here = fileURLToPath(new URL('..', import.meta.url));
const shots = JSON.parse(readFileSync(join(here, 'shots.json'), 'utf8'));

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
};

const server = createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const path = normalize(decodeURIComponent(url.pathname)).replace(/^\/+/, '');
  const file = resolve(join(here, 'game'), path || 'index.html');
  if (!file.startsWith(join(here, 'game'))) {
    res.writeHead(403);
    res.end();
    return;
  }
  try {
    statSync(file);
    res.writeHead(200, { 'Content-Type': MIME[extname(file)] ?? 'application/octet-stream' });
    res.end(readFileSync(file));
  } catch {
    res.writeHead(404);
    res.end();
  }
});

await new Promise((ready) => server.listen(8123, ready));

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--force-color-profile=srgb'],
});
const page = await browser.newPage({ viewport: { width: 800, height: 584 }, deviceScaleFactor: 1 });

for (const shot of shots) {
  await page.goto(`http://localhost:8123/index.html${shot.query}`);
  await page.waitForFunction('window.__shotReady === true', { timeout: 15000 });
  await page.waitForTimeout(120);
  await page.screenshot({ path: join(here, 'screenshots', shot.name), type: 'jpeg', quality: 88 });
  console.log('shot', shot.name);
}

await browser.close();
server.close();
