/**
 * Regression test: sidebar hidden state must survive a page reload.
 *
 * Bug: setupSidebarToggle() initialised sidebarVisible = true unconditionally,
 * so a reload always showed the sidebar regardless of the user's last toggle.
 */
import { test, expect } from './test-config.js';
import { goto } from './helpers.js';

test.describe('sidebar visibility persistence', () => {
    test('sidebar is visible by default after fresh load', async ({ page }) => {
        await goto(page);
        const toolbar = page.locator('.toolbar');
        await expect(toolbar).toBeVisible();
    });

    test('sidebar hidden state persists across reload', async ({ page }) => {
        await goto(page);

        // Hide the sidebar via the toggle button.
        await page.locator('#btn-toggle-sidebar').click();
        await expect(page.locator('.toolbar')).toBeHidden();

        // Reload — localStorage is preserved.
        await page.reload();
        await page.waitForSelector('#players-layer', { state: 'attached' });
        await page.waitForTimeout(300);

        // Sidebar must still be hidden.
        await expect(page.locator('.toolbar')).toBeHidden();
    });

    test('sidebar visible state persists across reload', async ({ page }) => {
        await goto(page);

        // Hide then show again.
        await page.locator('#btn-toggle-sidebar').click();
        await expect(page.locator('.toolbar')).toBeHidden();
        await page.locator('#btn-toggle-sidebar').click();
        await expect(page.locator('.toolbar')).toBeVisible();

        await page.reload();
        await page.waitForSelector('#players-layer', { state: 'attached' });
        await page.waitForTimeout(300);

        await expect(page.locator('.toolbar')).toBeVisible();
    });

    test('localStorage key sidebarVisible is written on toggle', async ({ page }) => {
        await goto(page);

        await page.locator('#btn-toggle-sidebar').click();
        const stored = await page.evaluate(() => localStorage.getItem('sidebarVisible'));
        expect(stored).toBe('false');

        await page.locator('#btn-toggle-sidebar').click();
        const stored2 = await page.evaluate(() => localStorage.getItem('sidebarVisible'));
        expect(stored2).toBe('true');
    });
});
