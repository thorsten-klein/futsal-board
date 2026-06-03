/**
 * Test configuration with coverage support.
 * Import { test, expect } from this file instead of @playwright/test
 * to automatically collect code coverage.
 */
import { test as base, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import v8toIstanbul from 'v8-to-istanbul';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const coverageDir = path.join(__dirname, '..', '.nyc_output');

// Ensure coverage directory exists
if (!fs.existsSync(coverageDir)) {
    fs.mkdirSync(coverageDir, { recursive: true });
}

// Extend base test with coverage collection.
// Each test gets a fresh BrowserContext from Playwright, so localStorage /
// sessionStorage / cookies / IndexedDB are isolated automatically. We also
// proactively clear context-level storage at the end of each test as a
// safety net for parallel runs.
export const test = base.extend({
    page: async ({ page }, use) => {
        // Start coverage before each test
        await page.coverage.startJSCoverage({
            resetOnNavigation: false,
            reportAnonymousScripts: true,
        });

        await use(page);

        // Collect and save coverage after each test
        try {
            const coverage = await page.coverage.stopJSCoverage();
            await saveCoverage(coverage);
        } catch (e) {
            // Ignore errors during cleanup
        }

        // Safety net: actively clear storage so a worker reusing this context
        // (Playwright recycles contexts within a worker) cannot leak state.
        try {
            await page.context().clearCookies();
            await page.evaluate(() => {
                try { localStorage.clear(); } catch (_) {}
                try { sessionStorage.clear(); } catch (_) {}
            });
        } catch (_) {
            // Page may already be closed; ignore.
        }
    },
});

async function saveCoverage(coverageData) {
    if (!coverageData || coverageData.length === 0) return;

    const istanbulCoverage = {};

    for (const entry of coverageData) {
        // Only process local app files (not external libraries)
        if (entry.url.includes('/js/') || entry.url.includes('/ext/html-to-image.js')) {
            try {
                const filePath = entry.url.replace(/^file:\/\//, '');

                if (fs.existsSync(filePath)) {
                    const converter = v8toIstanbul(filePath);
                    await converter.load();
                    converter.applyCoverage(entry.functions);
                    Object.assign(istanbulCoverage, converter.toIstanbul());
                }
            } catch (e) {
                // Skip files that can't be processed
            }
        }
    }

    // Save coverage data
    if (Object.keys(istanbulCoverage).length > 0) {
        const timestamp = Date.now();
        const random = Math.random().toString(36).slice(2, 8);
        const coverageFile = path.join(coverageDir, `coverage-${timestamp}-${random}.json`);
        fs.writeFileSync(coverageFile, JSON.stringify(istanbulCoverage));
    }
}

export { expect };
