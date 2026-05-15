/**
 * Ball Box element tests.
 */
import { test, expect } from './test-config.js';
import { goto } from './helpers.js';

test.describe('Ball Box Element', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
    });

    test('Ball Box button is present in the elements section', async ({ page }) => {
        const ballBoxBtn = page.locator('.element-btn[data-element="ball-box"]');
        await expect(ballBoxBtn).toBeVisible();
        await expect(ballBoxBtn).toContainText('Ball Box');
    });

    test('Can add Ball Box by clicking button', async ({ page }) => {
        // Click ball-box button
        await page.locator('.element-btn[data-element="ball-box"]').click();

        // Wait for element to appear
        await page.waitForTimeout(500);

        // Verify ball-box element was added
        const ballBox = page.locator('.element-svg[data-element^="element-"]').filter({ hasText: /.*/ }).first();
        await expect(ballBox).toBeVisible();
    });

    test('Ball Box has correct dimensions (150x150)', async ({ page }) => {
        // Add ball-box
        await page.locator('.element-btn[data-element="ball-box"]').click();
        await page.waitForTimeout(500);

        // Check dimensions in state
        const dimensions = await page.evaluate(() => {
            const element = AppState.elements.find(e => e.type === 'ball-box');
            if (!element) return null;
            return Elements.getElementDimensions(element.type);
        });

        expect(dimensions).toEqual({ width: 150, height: 150 });
    });

    test('Ball Box contains 6 balls', async ({ page }) => {
        // Add ball-box
        await page.locator('.element-btn[data-element="ball-box"]').click();
        await page.waitForTimeout(500);

        // Count circles (balls) in the ball-box SVG - each ball has 1 circle element
        const ballCount = await page.evaluate(() => {
            const ballBoxSvgs = document.querySelectorAll('.element-svg');
            for (const svg of ballBoxSvgs) {
                if (svg.id && svg.id.startsWith('element-')) {
                    const element = AppState.elements.find(e => e.id === svg.id);
                    if (element && element.type === 'ball-box') {
                        const circles = svg.querySelectorAll('circle');
                        return circles.length;
                    }
                }
            }
            return 0;
        });

        // Should have 6 balls (6 circles)
        expect(ballCount).toBe(6);
    });

    test('Ball Box balls are white by default', async ({ page }) => {
        // Add ball-box
        await page.locator('.element-btn[data-element="ball-box"]').click();
        await page.waitForTimeout(500);

        // Check ball color in SVG - should be white
        const ballColor = await page.evaluate(() => {
            const ballBoxSvgs = document.querySelectorAll('.element-svg');
            for (const svg of ballBoxSvgs) {
                if (svg.id && svg.id.startsWith('element-')) {
                    const element = AppState.elements.find(e => e.id === svg.id);
                    if (element && element.type === 'ball-box') {
                        const firstCircle = svg.querySelector('circle');
                        return firstCircle ? firstCircle.getAttribute('fill') : null;
                    }
                }
            }
            return null;
        });

        // Default color should be white (or undefined which defaults to white)
        expect(ballColor).toBe('#ffffff');
    });

    test('Ball Box color can be changed', async ({ page }) => {
        // Add ball-box
        await page.locator('.element-btn[data-element="ball-box"]').click();
        await page.waitForTimeout(500);

        // Click to select first
        const ballBoxSvg = page.locator('.element-svg').filter({ has: page.locator('circle') }).first();
        await ballBoxSvg.click();
        await page.waitForTimeout(300);

        // Right-click to open context menu
        await ballBoxSvg.click({ button: 'right' });
        await page.waitForTimeout(500);

        // Click color menu item
        await page.locator('#element-context-menu .context-menu-item[data-action="color"]').click();
        await page.waitForTimeout(500);

        // Set color to red
        await page.locator('#element-color-picker').fill('#ff0000');
        await page.locator('#btn-confirm-color').click();
        await page.waitForTimeout(500);

        // Check that color was applied in the SVG
        const newColor = await page.evaluate(() => {
            const ballBoxSvgs = document.querySelectorAll('.element-svg');
            for (const svg of ballBoxSvgs) {
                if (svg.id && svg.id.startsWith('element-')) {
                    const element = AppState.elements.find(e => e.id === svg.id);
                    if (element && element.type === 'ball-box') {
                        return element.color;
                    }
                }
            }
            return null;
        });

        expect(newColor).toBe('#ff0000');
    });

    test('Ball Box can be dragged from toolbar', async ({ page }) => {
        const ballBoxBtn = page.locator('.element-btn[data-element="ball-box"]');
        const board = page.locator('#board-canvas');

        // Get board position
        const boardBox = await board.boundingBox();

        // Drag ball-box button to board
        await ballBoxBtn.hover();
        await page.mouse.down();
        await page.mouse.move(boardBox.x + boardBox.width / 2, boardBox.y + boardBox.height / 2);
        await page.mouse.up();

        // Wait for element to be created
        await page.waitForTimeout(500);

        // Verify element exists
        const elementCount = await page.evaluate(() => {
            return AppState.elements.filter(e => e.type === 'ball-box').length;
        });

        expect(elementCount).toBe(1);
    });

    test('Ball Box can be selected', async ({ page }) => {
        // Add ball-box
        await page.locator('.element-btn[data-element="ball-box"]').click();
        await page.waitForTimeout(500);

        // Click on the ball-box to select it - find by circle element
        const ballBoxSvg = page.locator('.element-svg').filter({ has: page.locator('circle') }).first();
        await ballBoxSvg.click();
        await page.waitForTimeout(500);

        // Check if selected
        const isSelected = await page.evaluate(() => {
            return AppState.selectedElement && AppState.selectedElement.type === 'ball-box';
        });

        expect(isSelected).toBe(true);
    });

    test('Ball Box can be removed', async ({ page }) => {
        // Add ball-box
        await page.locator('.element-btn[data-element="ball-box"]').click();
        await page.waitForTimeout(500);

        // Click to select first
        const ballBoxSvg = page.locator('.element-svg').filter({ has: page.locator('circle') }).first();
        await ballBoxSvg.click();
        await page.waitForTimeout(300);

        // Right-click to open context menu
        await ballBoxSvg.click({ button: 'right' });
        await page.waitForTimeout(500);

        // Click remove
        await page.locator('#element-context-menu .context-menu-item[data-action="remove"]').click();
        await page.waitForTimeout(500);

        // Verify ball-box was removed
        const elementCount = await page.evaluate(() => {
            return AppState.elements.filter(e => e.type === 'ball-box').length;
        });

        expect(elementCount).toBe(0);
    });
});
