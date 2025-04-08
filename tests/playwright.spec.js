import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const WORKING_DIR = '/tmp/test_project';
const BACKEND_URL = 'http://127.0.0.1:5000';

test.describe('Flask Backend Health Check', () => {
  test('Backend root returns 200 and expected content', async ({ page }) => {
    const response = await page.goto(`${BACKEND_URL}`);
    expect(response.status()).toBe(200);

    const content = await page.content();
    console.log('🔍 Backend returned HTML:', content.slice(0, 300));

    // Adjust based on what your index returns
    expect(content).toContain('<html');
  });
});

test.describe('POST /save_state API', () => {
  test.beforeAll(() => {
    if (!fs.existsSync(WORKING_DIR)) {
      fs.mkdirSync(WORKING_DIR, { recursive: true });
      console.log(`📁 Created test working directory: ${WORKING_DIR}`);
    }

    const dummyCSVPath = path.join(WORKING_DIR, 'compounds.csv');
    if (!fs.existsSync(dummyCSVPath)) {
      fs.writeFileSync(dummyCSVPath, 'ID,SMILES,Name\n1,CCO,Ethanol\n');
      console.log('🧪 Dummy compounds.csv created');
    }
  });

  test('Should create valid state.json in working directory', async ({ request }) => {
    const payload = {
      working_directory: WORKING_DIR,
      compound_csv: 'compounds.csv',
      mzml_files: [
        {
          file: 'sample.mzML',
          tag: 'SampleTag',
          adduct: '[M+H]+'
        }
      ]
    };

    const response = await request.post(`${BACKEND_URL}/save_state`, { data: payload });
    console.log('📡 Response status:', response.status());
    expect(response.ok()).toBeTruthy();

    const json = await response.json();
    console.log('✅ Response body:', json);
    expect(json.message).toContain('saved');

    const statePath = path.join(WORKING_DIR, 'state.json');
    expect(fs.existsSync(statePath)).toBe(true);

    const savedState = JSON.parse(fs.readFileSync(statePath, 'utf-8'));
    console.log('📄 Parsed state.json:', savedState);

    expect(savedState.working_directory).toBe(WORKING_DIR);
    expect(savedState.mzml_files?.[0]?.adduct).toBe('[M+H]+');
  });
});
