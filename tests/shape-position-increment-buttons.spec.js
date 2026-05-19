/**
 * Tests for shape position +/- increment buttons
 */
import { test, expect } from './test-config.js';
import { goto } from './helpers.js';

test.describe('Shape Position Increment Buttons', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
    });

    test('Shape position dialog has +/- buttons for X and Y', async ({ page }) => {
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

        // Open position dialog
        const shape = page.locator('.shape-svg').first();
        await shape.click();
        await page.waitForTimeout(300);
        await shape.click({ button: 'right' });
        await page.waitForTimeout(500);
        await page.locator('.context-menu:not(.hidden) .context-menu-item[data-action="position"]').click();
        await page.waitForTimeout(500);

        // Verify position modal is open
        await expect(page.locator('#position-modal')).toBeVisible();

        // Verify X increment buttons exist and are visible
        const xIncBtn = page.locator('#position-modal .position-btn[data-field="shape-x"][data-action="increase"]');
        await expect(xIncBtn).toBeVisible();

        const xDecBtn = page.locator('#position-modal .position-btn[data-field="shape-x"][data-action="decrease"]');
        await expect(xDecBtn).toBeVisible();

        // Verify Y increment buttons exist and are visible
        const yIncBtn = page.locator('#position-modal .position-btn[data-field="shape-y"][data-action="increase"]');
        await expect(yIncBtn).toBeVisible();

        const yDecBtn = page.locator('#position-modal .position-btn[data-field="shape-y"][data-action="decrease"]');
        await expect(yDecBtn).toBeVisible();
    });

    test('Shape position X increase button rounds then increments by 50', async ({ page }) => {
        // Add a rectangle shape
        await page.locator('.draw-btn[data-draw="rectangle"]').click();
        await page.waitForTimeout(300);

        const board = page.locator('#board-canvas');
        const boardBox = await board.boundingBox();
        await page.mouse.move(boardBox.x + 123, boardBox.y + 100);
        await page.mouse.down();
        await page.mouse.move(boardBox.x + 223, boardBox.y + 200);
        await page.mouse.up();
        await page.waitForTimeout(500);

        // Open position dialog
        const shape = page.locator('.shape-svg').first();
        await shape.click();
        await page.waitForTimeout(300);
        await shape.click({ button: 'right' });
        await page.waitForTimeout(500);
        await page.locator('.context-menu:not(.hidden) .context-menu-item[data-action="position"]').click();
        await page.waitForTimeout(500);

        // Get initial X value
        const initialX = await page.locator('#position-modal-x').inputValue();
        const initialXNum = parseInt(initialX);

        // Click increase button
        await page.locator('.position-btn[data-field="shape-x"][data-action="increase"]').click();
        await page.waitForTimeout(100);

        const firstClickX = await page.locator('#position-modal-x').inputValue();
        const firstClickXNum = parseInt(firstClickX);

        // First click should always increment to the next multiple of 50,
        // even if the current value is already on a 50 boundary.
        const expectedFirstClick = Math.ceil((initialXNum + 1) / 50) * 50;
        expect(firstClickXNum).toBe(expectedFirstClick);

        // Click increase again
        await page.locator('.position-btn[data-field="shape-x"][data-action="increase"]').click();
        await page.waitForTimeout(100);

        const secondClickX = await page.locator('#position-modal-x').inputValue();
        const secondClickXNum = parseInt(secondClickX);

        // Second click should add 50
        expect(secondClickXNum).toBe(firstClickXNum + 50);
    });

    test('Shape position Y decrease button rounds down then decrements by 50', async ({ page }) => {
        // Add a rectangle shape
        await page.locator('.draw-btn[data-draw="rectangle"]').click();
        await page.waitForTimeout(300);

        const board = page.locator('#board-canvas');
        const boardBox = await board.boundingBox();
        await page.mouse.move(boardBox.x + 100, boardBox.y + 100);
        await page.mouse.down();
        await page.mouse.move(boardBox.x + 200, boardBox.y + 200);
        await page.mouse.up();
        await page.waitForTimeout(500);

        // Open position dialog
        const shape = page.locator('.shape-svg').first();
        await shape.click();
        await page.waitForTimeout(300);
        await shape.click({ button: 'right' });
        await page.waitForTimeout(500);
        await page.locator('.context-menu:not(.hidden) .context-menu-item[data-action="position"]').click();
        await page.waitForTimeout(500);

        // Set a non-round Y value
        await page.locator('#position-modal-y').fill('1237');
        await page.waitForTimeout(100);

        // Click decrease button
        await page.locator('.position-btn[data-field="shape-y"][data-action="decrease"]').click();
        await page.waitForTimeout(100);

        const firstClickY = await page.locator('#position-modal-y').inputValue();
        const firstClickYNum = parseInt(firstClickY);

        // First click should round down to nearest 50
        expect(firstClickYNum).toBe(1200);

        // Click decrease again
        await page.locator('.position-btn[data-field="shape-y"][data-action="decrease"]').click();
        await page.waitForTimeout(100);

        const secondClickY = await page.locator('#position-modal-y').inputValue();
        const secondClickYNum = parseInt(secondClickY);

        // Second click should subtract 50
        expect(secondClickYNum).toBe(1150);
    });

    test('Shape position dialog has rotation field with +/- buttons', async ({ page }) => {
        // Add a rectangle shape
        await page.locator('.draw-btn[data-draw="rectangle"]').click();
        await page.waitForTimeout(300);

        const board = page.locator('#board-canvas');
        const boardBox = await board.boundingBox();
        await page.mouse.move(boardBox.x + 100, boardBox.y + 100);
        await page.mouse.down();
        await page.mouse.move(boardBox.x + 200, boardBox.y + 200);
        await page.mouse.up();
        await page.waitForTimeout(500);

        // Open position dialog
        const shape = page.locator('.shape-svg').first();
        await shape.click();
        await page.waitForTimeout(300);
        await shape.click({ button: 'right' });
        await page.waitForTimeout(500);
        await page.locator('.context-menu:not(.hidden) .context-menu-item[data-action="position"]').click();
        await page.waitForTimeout(500);

        // Verify rotation field exists
        await expect(page.locator('#position-modal-rotation')).toBeVisible();

        // Verify rotation increment buttons exist
        const rotIncBtn = page.locator('.position-btn[data-field="shape-rotation"][data-action="increase"]');
        await expect(rotIncBtn).toBeVisible();

        const rotDecBtn = page.locator('.position-btn[data-field="shape-rotation"][data-action="decrease"]');
        await expect(rotDecBtn).toBeVisible();
    });

    test('Shape rotation increment button rounds then increments by 15 degrees', async ({ page }) => {
        // Add a rectangle shape
        await page.locator('.draw-btn[data-draw="rectangle"]').click();
        await page.waitForTimeout(300);

        const board = page.locator('#board-canvas');
        const boardBox = await board.boundingBox();
        await page.mouse.move(boardBox.x + 100, boardBox.y + 100);
        await page.mouse.down();
        await page.mouse.move(boardBox.x + 200, boardBox.y + 200);
        await page.mouse.up();
        await page.waitForTimeout(500);

        // Open position dialog
        const shape = page.locator('.shape-svg').first();
        await shape.click();
        await page.waitForTimeout(300);
        await shape.click({ button: 'right' });
        await page.waitForTimeout(500);
        await page.locator('.context-menu:not(.hidden) .context-menu-item[data-action="position"]').click();
        await page.waitForTimeout(500);

        // Set a non-round rotation value
        await page.locator('#position-modal-rotation').fill('23');
        await page.waitForTimeout(100);

        // Click increase button
        await page.locator('.position-btn[data-field="shape-rotation"][data-action="increase"]').click();
        await page.waitForTimeout(100);

        const firstClickRot = await page.locator('#position-modal-rotation').inputValue();
        const firstClickRotNum = parseInt(firstClickRot);

        // First click should round up to nearest 15
        expect(firstClickRotNum).toBe(30);

        // Click increase again
        await page.locator('.position-btn[data-field="shape-rotation"][data-action="increase"]').click();
        await page.waitForTimeout(100);

        const secondClickRot = await page.locator('#position-modal-rotation').inputValue();
        const secondClickRotNum = parseInt(secondClickRot);

        // Second click should add 15
        expect(secondClickRotNum).toBe(45);
    });
});
