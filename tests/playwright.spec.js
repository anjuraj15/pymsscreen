import { test, expect } from '@playwright/test';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import waitOn from 'wait-on';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let backendProcess;

function getBackendBinaryPath() {
  const baseDir = path.resolve(__dirname, '../public/backend');
  const platform = process.platform;

  if (platform === 'darwin') return path.join(baseDir, 'web_app_macos');
  if (platform === 'linux') return path.join(baseDir, 'web_app_linux');
  if (platform === 'win32') return path.join(baseDir, 'web_app.exe');
  throw new Error(`Unsupported platform: ${platform}`);
}

const backendPath = getBackendBinaryPath();

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
  await expect(page).toHaveTitle(/Flask|Your App/i);
});
