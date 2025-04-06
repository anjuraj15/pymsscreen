const { _electron: electron } = require('playwright');
const { test, expect } = require('@playwright/test');
const axios = require('axios');

test('Set working dir, save state, and confirm backend responds', async () => {
  const electronApp = await electron.launch({ args: ['.'] });
  const window = await electronApp.firstWindow();

  await window.waitForLoadState('domcontentloaded');

  // ✅ Set fake working dir using localStorage
  await window.evaluate(() => {
    localStorage.setItem('workingDir', 'C:/fake/test-folder');
  });

  // Optional: click Save if needed
  try {
    await window.click('text=Save');
    console.log('Clicked Save button');
  } catch (e) {
    console.warn('No Save button found. Adjust selector if needed.');
  }

  // ✅ Confirm backend is working
  const response = await axios.post('http://localhost:5000/save_state', {
    dummy: 'data'
  });

  expect(response.status).toBe(200);
  console.log('✅ Backend responded to /save_state');

  await electronApp.close();
});
