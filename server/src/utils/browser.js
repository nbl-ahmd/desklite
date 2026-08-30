async function getBrowserOptions() {
  const args = ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'];

  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    return { headless: 'new', executablePath: process.env.PUPPETEER_EXECUTABLE_PATH, args };
  }

  try {
    const chromium = require('@sparticuz/chromium');
    const executablePath = await chromium.executablePath();
    return {
      headless: chromium.headless ?? 'new',
      executablePath,
      args: [...(chromium.args || []), ...args],
    };
  } catch (error) {
    return { headless: 'new', args };
  }
}

module.exports = { getBrowserOptions };
