import { _electron as electron } from 'playwright';
import { test, expect } from '@playwright/test';
import axios from 'axios';
import { spawn } from 'child_process';
import path from 'path';

test('Set working dir, save state, and confirm backend responds', async () => {
  const backendPath = path.resolve('public/backend/web_app_linux');
  const flask = spawn(backendPath, [], {
    cwd: path.dirname(backendPath),
    detached: true,
    stdio: 'ignore',
  });

  console.log('Flask backend started');
  await new Promise((res) => setTimeout(res, 4000)); // give it time to start

  let app;
  try {
    app = await electron.launch({ args: ['electron/main.cjs'] });
  } catch (err) {
    console.error('❌ Electron failed to launch:', err);
    process.kill(-flask.pid); // kill flask before throwing
    throw err;
  }

  const window = await app.firstWindow();
  await window.evaluate(() => {
    localStorage.setItem('workingDir', 'C:/fake/test-folder');
  });

  await window.waitForLoadState('domcontentloaded');
  const title = await window.title();
  expect(title).toMatch(/PyMS/i);

  // ✅ Try calling backend
  try {
    const response = await axios.post('http://localhost:5000/save_state', {
      dummy: 'data',
    });
    expect(response.status).toBe(200);
  } catch (err) {
    console.error('Axios failed:', err);
    throw err;
  }

  await app.close();
  process.kill(-flask.pid); // cleanup Flask
});
