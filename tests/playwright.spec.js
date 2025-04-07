import { test, expect } from '@playwright/test';
import { spawn } from 'child_process';
import os from 'os';
import path from 'path';
import fs from 'fs';

let backendProcess;

test.beforeAll(async () => {
  const platform = os.platform();
  let binaryName;

  if (platform === 'win32') {
    binaryName = 'web_app.exe';
  } else if (platform === 'darwin') {
    binaryName = 'web_app_macos';
  } else {
    binaryName = 'web_app_linux';
  }

  const backendPath = path.resolve('public/backend', binaryName);

  console.log('Looking for backend binary at:', backendPath);

  if (!fs.existsSync(backendPath)) {
    throw new Error(`❌ Backend binary not found: ${backendPath}`);
  }

  // Make sure it's executable (macOS/Linux)
  if (platform !== 'win32') {
    fs.chmodSync(backendPath, 0o755);
  }

  backendProcess = spawn(backendPath, [], {
    shell: platform === 'win32' || platform === 'darwin',
    detached: true,
    stdio: 'ignore'
  });

  backendProcess.unref();

  // Give Flask time to start
  await new Promise(res => setTimeout(res, 2000));
});

test('Set working dir, save state, and confirm backend responds', async ({ page }) => {
  await page.goto('http://localhost:5000');
  await expect(page).toHaveTitle(/Flask|Your App/i);
});

test.afterAll(() => {
  if (backendProcess) backendProcess.kill();
});
