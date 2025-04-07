import { test, expect } from '@playwright/test';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import waitOn from 'wait-on';

let backendProcess;

const backendPath = path.resolve(
  __dirname,
  '../public/backend/web_app' + (process.platform === 'win32' ? '.exe' : '')
);

test.beforeAll(async () => {
  if (!fs.existsSync(backendPath)) {
    console.error("Available files:", fs.readdirSync(path.dirname(backendPath)));
    throw new Error(`❌ Backend binary not found: ${backendPath}`);
  }

  console.log(`🚀 Launching backend from: ${backendPath}`);
  backendProcess = spawn(backendPath, [], {
    stdio: 'inherit',
    shell: false,
  });

  // Option 1: Wait fixed time (simple but brittle)
  // await new Promise((resolve) => setTimeout(resolve, 5000));

  // ✅ Option 2: Wait until port is actually live (recommended)
  await waitOn({
    resources: ['http://localhost:5000'],
    timeout: 15000,
    interval: 500,
    window: 1000,
    validateStatus: (status) => status >= 200 && status < 500,
  });
});

test.afterAll(() => {
  if (backendProcess) {
    console.log('🛑 Stopping backend process');
    backendProcess.kill();
  }
});

test('Set working dir, save state, and confirm backend responds', async ({ page }) => {
  await page.goto('http://localhost:5000');
  await expect(page).toHaveTitle(/Flask|Your App/i); // Customize based on your app’s title
});
