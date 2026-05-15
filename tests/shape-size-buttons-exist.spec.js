/**
 * Test to verify shape size dialog has +/- increment buttons
 */
import { test, expect } from './test-config.js';
import { goto } from './helpers.js';

test.describe('Shape Size Dialog Has Increment Buttons', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
    });

    test('Shape size modal exists and has width increment buttons', async ({ page }) => {
        // Check if the modal exists in HTML
        const modal = await page.locator('#shape-size-modal');
        await expect(modal).toHaveCount(1);

        // Check if width increment buttons exist
        const widthIncreaseBtn = await page.locator('#shape-size-modal .position-btn[data-field="width"][data-action="increase"]');
        await expect(widthIncreaseBtn).toHaveCount(1);

        const widthDecreaseBtn = await page.locator('#shape-size-modal .position-btn[data-field="width"][data-action="decrease"]');
        await expect(widthDecreaseBtn).toHaveCount(1);
    });

    test('Shape size modal has height increment buttons', async ({ page }) => {
        const heightIncreaseBtn = await page.locator('#shape-size-modal .position-btn[data-field="height"][data-action="increase"]');
        await expect(heightIncreaseBtn).toHaveCount(1);

        const heightDecreaseBtn = await page.locator('#shape-size-modal .position-btn[data-field="height"][data-action="decrease"]');
        await expect(heightDecreaseBtn).toHaveCount(1);
    });

    test('Buttons are clickable when shape size dialog is open', async ({ page }) => {
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

        // Open size dialog
        const shape = page.locator('.shape-svg').first();
        await shape.click();
        await page.waitForTimeout(300);
        await shape.click({ button: 'right' });
        await page.waitForTimeout(500);
        await page.locator('.context-menu:not(.hidden) .context-menu-item[data-action="size"]').click();
        await page.waitForTimeout(500);

        // Verify modal is open
        await expect(page.locator('#shape-size-modal')).toBeVisible();

        // Verify buttons are visible
        const widthIncBtn = page.locator('#shape-size-modal .position-btn[data-field="width"][data-action="increase"]');
        await expect(widthIncBtn).toBeVisible();

        const widthDecBtn = page.locator('#shape-size-modal .position-btn[data-field="width"][data-action="decrease"]');
        await expect(widthDecBtn).toBeVisible();

        // Get initial width
        const initialWidth = await page.locator('#shape-width').inputValue();

        // Click the increase button
        await widthIncBtn.click();
        await page.waitForTimeout(100);

        // Verify width changed
        const newWidth = await page.locator('#shape-width').inputValue();
        expect(parseInt(newWidth)).not.toBe(parseInt(initialWidth));
    });
});
