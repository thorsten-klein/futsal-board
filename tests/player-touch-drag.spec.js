import { test, expect } from '@playwright/test';
import { FILE_URL } from './helpers.js';

test.describe('Player Touch Mode Drag Bug', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(FILE_URL);
        await page.evaluate(() => { try { localStorage.clear(); } catch (_) {} });
        await page.reload();
        await page.waitForSelector('#players-layer', { state: 'attached' });
        await page.waitForTimeout(300);
    });

    test('TOUCH MODE: player should be selectable and draggable with single tap-and-drag', async ({ page }) => {
        // Enable TOUCH MODE
        await page.evaluate(() => {
            document.body.classList.add('touch-mode');
        });

        // Add a player to the board
        await page.locator('.team-player-template').first().click();
        await page.waitForTimeout(300);

        // Get the player element
        const playerEl = page.locator('.player').first();
        await expect(playerEl).toBeVisible();

        const beforeBox = await playerEl.boundingBox();

        // In TOUCH MODE: Single tap should select AND start dragging immediately
        const clickX = beforeBox.x + beforeBox.width / 2;
        const clickY = beforeBox.y + beforeBox.height / 2;


        // Start drag
        await page.mouse.move(clickX, clickY);
        await page.mouse.down();
        await page.waitForTimeout(50);

        // Check if player is selected
        const isSelected = await page.evaluate(() => {
            return AppState.selectedPlayer !== null;
        });
        expect(isSelected).toBe(true);

        // Move mouse 30px
        await page.mouse.move(clickX + 30, clickY + 30, { steps: 5 });
        await page.waitForTimeout(100);

        const afterDragBox = await playerEl.boundingBox();

        // Player should have moved
        const movedX = afterDragBox.x - beforeBox.x;
        const movedY = afterDragBox.y - beforeBox.y;


        // BUG: If player didn't move, the touch drag isn't working
        // Player should move approximately 30px in both directions
        expect(Math.abs(movedX - 30)).toBeLessThan(10);
        expect(Math.abs(movedY - 30)).toBeLessThan(10);

        await page.mouse.up();
    });

    test('DESKTOP MODE: player requires two taps (select then drag)', async ({ page }) => {
        // Desktop mode is default (no touch-mode class)

        // Add a player
        await page.locator('.team-player-template').first().click();
        await page.waitForTimeout(300);

        const playerEl = page.locator('.player').first();
        const initialBox = await playerEl.boundingBox();

        // FIRST TAP: Select the player
        await playerEl.click();
        await page.waitForTimeout(100);

        const isSelected = await page.evaluate(() => {
            return AppState.selectedPlayer !== null;
        });
        expect(isSelected).toBe(true);

        // SECOND TAP-AND-DRAG: Now drag the selected player
        const clickX = initialBox.x + initialBox.width / 2;
        const clickY = initialBox.y + initialBox.height / 2;

        await page.mouse.move(clickX, clickY);
        await page.mouse.down();
        await page.waitForTimeout(10);

        await page.mouse.move(clickX + 30, clickY + 30, { steps: 5 });
        await page.waitForTimeout(50);

        const afterDragBox = await playerEl.boundingBox();

        const movedX = afterDragBox.x - initialBox.x;
        const movedY = afterDragBox.y - initialBox.y;


        // Should move approximately 30px
        expect(Math.abs(movedX - 30)).toBeLessThan(10);
        expect(Math.abs(movedY - 30)).toBeLessThan(10);

        await page.mouse.up();
    });
});
