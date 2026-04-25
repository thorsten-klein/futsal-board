/**
 * Tests that player number text color updates correctly when team color changes.
 * The number should be black on bright colors and white on dark colors.
 */
import { test, expect } from './test-config.js';
import { goto } from './helpers.js';

async function addPlayer(page) {
    const before = await page.locator('[data-player-id]').count();
    await page.locator('.team-player-template').first().click();
    await expect(page.locator('[data-player-id]')).toHaveCount(before + 1, { timeout: 3000 });
    return page.locator('[data-player-id]').nth(before);
}

test.describe('Player number color', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
    });

    test('sidebar template shows black number on bright team color', async ({ page }) => {
        // Default blue (#3498db) is bright → number should be black
        const numberSpan = page.locator('.team-player-template').first().locator('.player-number');
        const color = await numberSpan.evaluate(el => el.style.color);
        expect(color).toBe('rgb(0, 0, 0)');
    });

    test('sidebar template number color updates after changing team color via context menu', async ({ page }) => {
        // Add a player so we can right-click it
        const player = await addPlayer(page);

        // Default blue (#3498db) is bright → sidebar number should be black initially
        const numberSpan = page.locator('.team-player-template').first().locator('.player-number');
        const initialColor = await numberSpan.evaluate(el => el.style.color);
        expect(initialColor).toBe('rgb(0, 0, 0)');

        // Right-click the player to open its context menu
        await player.click({ button: 'right' });
        const colorItem = page.locator('.context-menu-item[data-action="color"]').first();
        await expect(colorItem).toBeVisible();
        await colorItem.click();

        // Color modal should open
        await expect(page.locator('#element-color-modal')).toBeVisible();

        // Set color to black (#000000 — dark, so number should become white)
        await page.evaluate(() => {
            document.getElementById('element-color-picker').value = '#000000';
        });
        await page.locator('#btn-confirm-color').click();

        // After changing to a dark color, the sidebar template number must be white
        await expect(numberSpan).toHaveCSS('color', 'rgb(255, 255, 255)');
    });

    test('board player number color is correct after team color change via context menu', async ({ page }) => {
        const player = await addPlayer(page);

        // Right-click player and change color to black
        await player.click({ button: 'right' });
        await page.locator('.context-menu-item[data-action="color"]').first().click();
        await expect(page.locator('#element-color-modal')).toBeVisible();
        await page.evaluate(() => {
            document.getElementById('element-color-picker').value = '#000000';
        });
        await page.locator('#btn-confirm-color').click();

        // The player on the board should have a white number (dark background)
        const boardNumberSpan = player.locator('.player-number');
        await expect(boardNumberSpan).toHaveCSS('color', 'rgb(255, 255, 255)');
    });

    test('sidebar template number color updates after changing team color via sidebar color picker', async ({ page }) => {
        // Change team color via the sidebar color picker to white (#ffffff — bright → black number)
        await page.evaluate(() => {
            const picker = document.querySelector('.team-color-picker');
            picker.value = '#ffffff';
            picker.dispatchEvent(new Event('change', { bubbles: true }));
        });
        await page.waitForTimeout(100);

        const numberSpan = page.locator('.team-player-template').first().locator('.player-number');
        await expect(numberSpan).toHaveCSS('color', 'rgb(0, 0, 0)');

        // Change to black (#000000 — dark → white number)
        await page.evaluate(() => {
            const picker = document.querySelector('.team-color-picker');
            picker.value = '#000000';
            picker.dispatchEvent(new Event('change', { bubbles: true }));
        });
        await page.waitForTimeout(100);

        await expect(numberSpan).toHaveCSS('color', 'rgb(255, 255, 255)');
    });
});
