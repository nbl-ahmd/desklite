const fs = require('fs');

function findExecutablePath() {
  const candidates = [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    process.env.CHROME_BIN,
    process.env.CHROME_PATH,
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }

  return null;
}

async function getBrowserOptions() {
  const args = ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'];

  const directPath = findExecutablePath();
  if (directPath) {
    return { headless: 'new', executablePath: directPath, args };
  }

  try {
    const chromiumModule = require('@sparticuz/chromium');
    const chromium = chromiumModule.default ?? chromiumModule;

    if (chromium && typeof chromium.executablePath === 'function') {
      const executablePath = await chromium.executablePath();
      if (executablePath) {
        return {
          headless: chromium.headless ?? 'new',
          executablePath,
          args: [...(chromium.args || []), ...args],
        };
      }
    }
  } catch (error) {
    // Fall through to the explicit error below so callers get a clear signal.
  }

  throw new Error('Unable to locate a Chrome executable for PDF export. Set PUPPETEER_EXECUTABLE_PATH or install a Chromium binary.');
}

module.exports = { getBrowserOptions };
