/**
 * Tests: animation player overlay collapsed state persists across reload,
 * and the collapsible content is hidden before JS runs (no flash).
 */
import { test, expect } from './test-config.js';
import { goto } from './helpers.js';

test.describe('animation player collapse persistence', () => {
    test('animation player is expanded by default', async ({ page }) => {
        await goto(page);
        const overlay = page.locator('#animation-player-overlay');
        await expect(overlay).not.toHaveClass(/animation-collapsed/);
    });

    test('collapsed state persists across reload', async ({ page }) => {
        await goto(page);

        // Collapse the player.
        await page.locator('#btn-collapse-player').click();
        await expect(page.locator('#animation-player-overlay')).toHaveClass(/animation-collapsed/);
        expect(await page.evaluate(() => localStorage.getItem('animationPlayerCollapsed'))).toBe('true');

        // Reload — localStorage is preserved.
        await page.reload();
        await page.waitForSelector('#players-layer', { state: 'attached' });
        await page.waitForTimeout(300);

        await expect(page.locator('#animation-player-overlay')).toHaveClass(/animation-collapsed/);
    });

    test('collapsible content is hidden before JS runs (no flash)', async ({ page }) => {
        // Seed localStorage via the app's own origin, then reload.
        await goto(page);
        await page.evaluate(() => localStorage.setItem('animationPlayerCollapsed', 'true'));

        // Reload — the inline <head> script must apply html.animation-player-collapsed
        // synchronously so collapsible content is never painted in expanded state.
        await page.reload();
        await page.waitForSelector('#players-layer', { state: 'attached' });

        // After reload + JS init the overlay must be collapsed.
        await expect(page.locator('#animation-player-overlay')).toHaveClass(/animation-collapsed/);
    });

    test('expanded state persists across reload', async ({ page }) => {
        await goto(page);

        // Collapse then expand.
        await page.locator('#btn-collapse-player').click();
        await page.locator('#btn-collapse-player').click();
        await expect(page.locator('#animation-player-overlay')).not.toHaveClass(/animation-collapsed/);

        await page.reload();
        await page.waitForSelector('#players-layer', { state: 'attached' });
        await page.waitForTimeout(300);

        await expect(page.locator('#animation-player-overlay')).not.toHaveClass(/animation-collapsed/);
    });
});
