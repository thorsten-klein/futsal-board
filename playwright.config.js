// @ts-check
import { defineConfig, devices } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    testDir: './tests',
    timeout: 15_000,
    expect: { timeout: 5_000 },
    // Tests are isolated by Playwright: each gets its own BrowserContext, so
    // localStorage / sessionStorage / cookies are not shared. No test file uses
    // beforeAll or describe.serial, so file-internal ordering is irrelevant too.
    fullyParallel: true,
    workers: process.env.CI ? 2 : undefined,  // locally Playwright auto-picks ~50% of cores
    retries: 0,
    reporter: 'list',
    use: {
        // Open the local HTML file directly — no server needed
        baseURL: 'file://' + path.resolve(__dirname, 'index.html'),
        headless: true,
        viewport: { width: 1400, height: 900 },
        // Give the app 2s to finish initialising after page load
        actionTimeout: 8_000,
    },
    projects: [
        {
            name: 'chromium',
            // Use system Chrome locally if available, fall back to Playwright's bundled Chromium on CI.
            use: { ...devices['Desktop Chrome'], channel: process.env.CI ? undefined : 'chrome' }
        },
        // {
        //     name: 'firefox',
        //     use: { ...devices['Desktop Firefox'] }
        // },
        // {
        //     name: 'webkit',
        //     use: { ...devices['Desktop Safari'] }
        // },
    ],
    // Snapshot dir for visual regression baselines
    snapshotDir: './tests/snapshots',
});
