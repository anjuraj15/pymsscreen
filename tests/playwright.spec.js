import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// You can change this if your backend is using a different working path
const WORKING_DIR = '/tmp/test_project';
const BACKEND_URL = 'http://localhost:5000';

test('backend is live', async ({ page }) => {
  await page.goto('http://127.0.0.1:5000')
  await expect(page).toHaveTitle(/your app title/i)
})


test.describe('State Management API', () => {
  test.beforeAll(() => {
    if (!fs.existsSync(WORKING_DIR)) {
      fs.mkdirSync(WORKING_DIR, { recursive: true });
      console.log(`📁 Created test working directory at: ${WORKING_DIR}`);
    }

    // Optional: create a dummy compound CSV if your backend depends on it
    const dummyCSVPath = path.join(WORKING_DIR, 'compounds.csv');
    if (!fs.existsSync(dummyCSVPath)) {
      fs.writeFileSync(dummyCSVPath, 'ID,SMILES,Name\n1,CCO,Ethanol\n');
    }
  });

  test('should save state.json correctly', async ({ request }) => {
    const response = await request.post(`${BACKEND_URL}/save_state`, {
      data: {
        working_directory: WORKING_DIR,
        compound_csv: 'compounds.csv',
        mzml_files: [
          {
            file: 'sample.mzML',
            tag: 'SampleTag',
            adduct: '[M+H]+'
          }
        ]
      }
    });

  console.log("Response status: ", response.status()); // Log the response status
  expect(response.ok()).toBeTruthy();

  const body = await response.json();
  console.log("Response body: ", body); // Log the response body
  expect(body.message).toContain('State saved');

  const statePath = path.join(WORKING_DIR, 'state.json');
  expect(fs.existsSync(statePath)).toBeTruthy();

  const contents = fs.readFileSync(statePath, 'utf-8');
  const state = JSON.parse(contents);

  console.log("State JSON: ", state); // Log the content of state.json
  expect(state.working_directory).toBe(WORKING_DIR);
  expect(state.mzml_files[0].adduct).toBe('[M+H]+');
  });
});
