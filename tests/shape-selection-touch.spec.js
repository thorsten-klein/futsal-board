import { test, expect } from '@playwright/test';
import { FILE_URL } from './helpers.js';

test.describe('Shape Selection Touch Tolerance', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(FILE_URL);
        await page.evaluate(() => { try { localStorage.clear(); } catch (_) {} });
        await page.reload();
        await page.waitForSelector('#players-layer', { state: 'attached' });
        await page.waitForTimeout(300);
    });

    test('TOUCH MODE: line/arrow shape should be selectable with tolerance', async ({ page }) => {
        // Enable TOUCH MODE
        await page.evaluate(() => {
            document.body.classList.add('touch-mode');

            // Create a line (thin, hard to tap)
            const shape = {
                id: 'shape-1',
                type: 'line',
                x: 2000,
                y: 1000,
                width: 400,
                height: 0,
                rotation: 0,
                color: '#000000',
                fillOpacity: 1,
                strokeWidth: 3,
                visible: true
            };

            AppState.shapes.push(shape);
            AppState.nextShapeId = 2;

            if (typeof Shapes !== 'undefined') {
                Shapes.render();
            }
        });

        await page.waitForTimeout(300);

        const shapeEl = page.locator('.shape-svg').first();
        await expect(shapeEl).toBeVisible();

        const shapeBox = await shapeEl.boundingBox();

        // Click near the line (15px above it)
        // Lines are especially hard to tap - only 3px stroke width
        const nearClickX = shapeBox.x + shapeBox.width / 2;
        const nearClickY = shapeBox.y + shapeBox.height / 2 - 15;  // 15px above line


        await page.mouse.click(nearClickX, nearClickY);
        await page.waitForTimeout(200);

        const isSelected = await page.evaluate(() => {
            return AppState.selectedShape !== null;
        });


        if (!isSelected) {
        }

        // Lines should be selectable with tolerance
        expect(isSelected).toBe(true);
    });

    test('DESKTOP MODE: shape selection should NOT have tolerance (precise clicks only)', async ({ page }) => {
        // Desktop mode (no touch-mode class)

        await page.evaluate(() => {
            // Create a rectangle shape
            const shape = {
                id: 'shape-1',
                type: 'rectangle',
                x: 2000,
                y: 1000,
                width: 200,
                height: 150,
                rotation: 0,
                color: '#3498db',
                fillOpacity: 0.3,
                strokeWidth: 3,
                visible: true
            };

            AppState.shapes.push(shape);
            AppState.nextShapeId = 2;

            if (typeof Shapes !== 'undefined') {
                Shapes.render();
            }
        });

        await page.waitForTimeout(300);

        const shapeEl = page.locator('.shape-svg').first();
        const shapeBox = await shapeEl.boundingBox();

        // Click outside the shape (20px to the right)
        const outsideClickX = shapeBox.x + shapeBox.width + 20;
        const outsideClickY = shapeBox.y + shapeBox.height / 2;


        await page.mouse.click(outsideClickX, outsideClickY);
        await page.waitForTimeout(200);

        const isSelected = await page.evaluate(() => {
            return AppState.selectedShape !== null;
        });


        // In desktop mode, precise clicks are expected - no tolerance
        expect(isSelected).toBe(false);
    });
});
