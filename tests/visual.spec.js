/**
 * Visual regression tests — capture the initial board state and verify
 * it matches the stored baseline on subsequent runs.
 *
 * On the first run (no baseline stored) the snapshot is written automatically
 * and the test passes. On subsequent runs the screenshot is compared against
 * the stored baseline.
 */
import { test, expect } from './test-config.js';
import { goto } from './helpers.js';
import fs from 'fs';
import path from 'path';

test.describe('Visual regression', () => {
    test('initial board renders correctly', async ({ page }, testInfo) => {
        await goto(page);
        // Wait for fonts and any animations to settle
        await page.waitForTimeout(200);

        const snapshotName = 'initial-board.png';
        const snapshotPath = testInfo.snapshotPath(snapshotName);

        if (!fs.existsSync(snapshotPath)) {
            // First run: write the baseline and pass
            fs.mkdirSync(path.dirname(snapshotPath), { recursive: true });
            await page.screenshot({ path: snapshotPath, fullPage: false });
            return;
        }

        await expect(page).toHaveScreenshot(snapshotName, {
            fullPage: false,
            maxDiffPixelRatio: 0.01,
        });
    });

    test('board container shows court and wood background', async ({ page }) => {
        await goto(page);
        const courtSvg = page.locator('#court-svg');
        await expect(courtSvg).toBeVisible();
    });

    test('sidebar is visible with element buttons', async ({ page }) => {
        await goto(page);
        await expect(page.locator('.element-btn[data-element="cone"]')).toBeVisible();
        await expect(page.locator('.element-btn[data-element="goal"]')).toBeVisible();
        await expect(page.locator('#ball-container')).toBeVisible();
    });

    test('header buttons are present and accessible', async ({ page }) => {
        await goto(page);
        // Note: btn-save and btn-load have been replaced with btn-file-menu
        for (const id of ['btn-undo', 'btn-redo', 'btn-file-menu', 'btn-screenshot', 'btn-header-download-animation', 'btn-fullscreen']) {
            const btn = page.locator(`#${id}`);
            await expect(btn).toBeVisible();
            await expect(btn).toHaveAttribute('aria-label');
        }
    });
});
