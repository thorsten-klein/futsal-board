/**
 * Test that rotation handles are hidden when ANY modal is open
 */
import { test, expect } from './test-config.js';
import { goto } from './helpers.js';

test.describe('Rotation Handle Modal Visibility', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
    });

    test('Shape rotation handle hidden when size modal is open', async ({ page }) => {
        // Add a rectangle shape
        await page.locator('.draw-btn[data-draw="rectangle"]').click();
        await page.waitForTimeout(300);

        // Draw a rectangle
        const board = page.locator('#board-canvas');
        const boardBox = await board.boundingBox();
        await page.mouse.move(boardBox.x + 100, boardBox.y + 100);
        await page.mouse.down();
        await page.mouse.move(boardBox.x + 200, boardBox.y + 200);
        await page.mouse.up();
        await page.waitForTimeout(500);

        const shape = page.locator('.shape-svg').first();

        // Select the shape
        await shape.click();
        await page.waitForTimeout(500);

        // Verify rotation handle is visible
        const rotationHandle = page.locator('.rotation-handle');
        await expect(rotationHandle).toBeVisible({ timeout: 10000 });

        // Open size modal via context menu
        await shape.click({ button: 'right' });
        await page.waitForTimeout(500);
        await page.locator('.context-menu:not(.hidden) .context-menu-item[data-action="size"]').click();
        await page.waitForTimeout(300);

        // Verify size modal is open
        await expect(page.locator('#shape-size-modal')).toBeVisible();

        // Verify rotation handle is now hidden
        await expect(rotationHandle).toBeHidden();

        // Close the modal
        await page.locator('#btn-cancel-shape-size').click();
        await page.waitForTimeout(300);

        // Verify rotation handle is visible again
        await expect(rotationHandle).toBeVisible();
    });

    test('Shape rotation handle hidden when shape position modal is open', async ({ page }) => {
        // Add a rectangle shape
        await page.locator('.draw-btn[data-draw="rectangle"]').click();
        await page.waitForTimeout(300);

        // Draw a rectangle
        const board = page.locator('#board-canvas');
        const boardBox = await board.boundingBox();
        await page.mouse.move(boardBox.x + 100, boardBox.y + 100);
        await page.mouse.down();
        await page.mouse.move(boardBox.x + 200, boardBox.y + 200);
        await page.mouse.up();
        await page.waitForTimeout(500);

        const shape = page.locator('.shape-svg').first();

        // Select the shape
        await shape.click();
        await page.waitForTimeout(500);

        // Verify rotation handle is visible
        const rotationHandle = page.locator('.rotation-handle');
        await expect(rotationHandle).toBeVisible({ timeout: 10000 });

        // Open position modal via context menu
        await shape.click({ button: 'right' });
        await page.waitForTimeout(500);
        await page.locator('.context-menu:not(.hidden) .context-menu-item[data-action="position"]').click();
        await page.waitForTimeout(300);

        // Verify position modal is open
        await expect(page.locator('#position-modal')).toBeVisible();

        // Verify rotation handle is now hidden
        await expect(rotationHandle).toBeHidden();

        // Close the modal
        await page.locator('#btn-position-modal-cancel').click();
        await page.waitForTimeout(300);

        // Verify rotation handle is visible again
        await expect(rotationHandle).toBeVisible();
    });
});
