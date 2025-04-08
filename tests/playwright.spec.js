import { test, expect } from '@playwright/test'
import fs from 'fs'
import path from 'path'

const WORKING_DIR = '/tmp/test_project'
const BACKEND_URL = 'http://127.0.0.1:5000'

//
// Test: Check Backend is alive
//

test.describe('Backend live check', () => {
  test('should respond with status 200 at root', async ({ page }) => {
    const response = await page.goto(BACKEND_URL)
    expect(response.status()).toBe(200)

    // Optional: log some HTML content
    const content = await page.content()
    console.log(' Root HTML content:', content.slice(0, 200))
  })
})

//
// Test: Full UI flow - Click Save State and expect success message
//
test.describe('Frontend Save State UI', () => {
  test('should show success after clicking Save State button', async ({ page }) => {
    await page.goto(BACKEND_URL)

    // Click the actual button
    await page.getByRole('button', { name: 'Save State' }).click()

    // Expect success message to appear in UI
    await expect(page.locator('body')).toContainText('State updated and saved successfully!')
  })
})

//
// ⃣ Test: API-level save_state endpoint + verify state.json file
//
test.describe('State Management API', () => {
  test.beforeAll(() => {
    if (!fs.existsSync(WORKING_DIR)) {
      fs.mkdirSync(WORKING_DIR, { recursive: true })
      console.log(`Created test working directory at: ${WORKING_DIR}`)
    }

    const dummyCSVPath = path.join(WORKING_DIR, 'compounds.csv')
    if (!fs.existsSync(dummyCSVPath)) {
      fs.writeFileSync(dummyCSVPath, 'ID,SMILES,Name\n1,CCO,Ethanol\n')
    }
  })

  test('should save state.json correctly via API', async ({ request }) => {
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
    })

    console.log('Response status: ', response.status())
    expect(response.ok()).toBeTruthy()

    const body = await response.json()
    console.log('Response body: ', body)
    expect(body.message).toContain('State saved')

    const statePath = path.join(WORKING_DIR, 'state.json')
    expect(fs.existsSync(statePath)).toBeTruthy()

    const contents = fs.readFileSync(statePath, 'utf-8')
    const state = JSON.parse(contents)

    console.log('State JSON:', state)
    expect(state.working_directory).toBe(WORKING_DIR)
    expect(state.mzml_files[0].adduct).toBe('[M+H]+')
  })
})
