// electron-app/playwright.config.js

/** @type {import('@playwright/test').PlaywrightTestConfig} */
const config = {
  testDir: './tests',
  timeout: 60000,
  retries: 0,
  use: {
    headless: true,
  },
};

export default config;
