/**
 * Test that shapes stay selected when clicking near them (both touch and non-touch mode).
 * This ensures rectangles behave like ellipses.
 */
import { test, expect } from '@playwright/test';
import { goto } from './helpers.js';

test.describe('Shape stays selected on near-click', () => {
    test.beforeEach(async ({ page }) => {
        await page.setViewportSize({ width: 1600, height: 900 });
        await goto(page);
        await page.evaluate(() => {
            AppState.currentTool = 'select';
        });
    });

    test('NON-TOUCH MODE: rectangle should stay selected when clicking near it', async ({ page }) => {
        // Ensure non-touch mode
        await page.evaluate(() => {
            document.body.classList.remove('touch-mode');
        });

        // Create a rectangle
        await page.evaluate(() => {
            const shape = {
                id: 'test-rect',
                type: 'rectangle',
                x: 800,
                y: 600,
                width: 200,
                height: 150,
                rotation: 0,
                color: '#ff6b35',
                fillColor: 'rgba(255, 107, 53, 0.3)',
                strokeWidth: 3,
                visible: true,
                inherited: false
            };
            AppState.shapes.push(shape);
            Shapes.render();
        });

        await page.waitForTimeout(300);

        // Click on the rectangle to select it
        const svgShape = page.locator('[data-shape="test-rect"]');
        await svgShape.click();
        await page.waitForTimeout(100);

        // Verify it's selected
        let isSelected = await page.evaluate(() => AppState.selectedShape === 'test-rect');
        expect(isSelected).toBe(true);

        // Get the bounding box
        const bbox = await svgShape.boundingBox();

        // Click near the rectangle (5px to the right of edge, within 8px tolerance)
        const nearClickX = bbox.x + bbox.width + 5;
        const nearClickY = bbox.y + bbox.height / 2;

        await page.mouse.click(nearClickX, nearClickY);
        await page.waitForTimeout(100);

        // Rectangle should stay selected (click within 8px tolerance)
        isSelected = await page.evaluate(() => AppState.selectedShape === 'test-rect');
        expect(isSelected).toBe(true);

        // Now click outside the tolerance (should deselect)
        const outsideClickX = bbox.x + bbox.width + 15; // Beyond 8px tolerance
        const outsideClickY = bbox.y + bbox.height / 2;

        await page.mouse.click(outsideClickX, outsideClickY);
        await page.waitForTimeout(100);

        // Rectangle should be deselected
        isSelected = await page.evaluate(() => AppState.selectedShape);
        expect(isSelected).toBe(null);
    });

    test('NON-TOUCH MODE: ellipse should stay selected when clicking near it', async ({ page }) => {
        // Ensure non-touch mode
        await page.evaluate(() => {
            document.body.classList.remove('touch-mode');
        });

        // Create an ellipse
        await page.evaluate(() => {
            const shape = {
                id: 'test-ellipse',
                type: 'ellipse',
                x: 800,
                y: 600,
                width: 200,
                height: 150,
                rotation: 0,
                color: '#4ecdc4',
                fillColor: 'rgba(78, 205, 196, 0.3)',
                strokeWidth: 3,
                visible: true,
                inherited: false
            };
            AppState.shapes.push(shape);
            Shapes.render();
        });

        await page.waitForTimeout(300);

        // Click on the ellipse to select it
        const svgShape = page.locator('[data-shape="test-ellipse"]');
        await svgShape.click();
        await page.waitForTimeout(100);

        // Verify it's selected
        let isSelected = await page.evaluate(() => AppState.selectedShape === 'test-ellipse');
        expect(isSelected).toBe(true);

        // Get the bounding box
        const bbox = await svgShape.boundingBox();

        // Click near the ellipse (5px to the right of edge, within 8px tolerance)
        const nearClickX = bbox.x + bbox.width + 5;
        const nearClickY = bbox.y + bbox.height / 2;

        await page.mouse.click(nearClickX, nearClickY);
        await page.waitForTimeout(100);

        // Ellipse should stay selected (click within 8px tolerance)
        isSelected = await page.evaluate(() => AppState.selectedShape === 'test-ellipse');
        expect(isSelected).toBe(true);

        // Now click outside the tolerance (should deselect)
        const outsideClickX = bbox.x + bbox.width + 15; // Beyond 8px tolerance
        const outsideClickY = bbox.y + bbox.height / 2;

        await page.mouse.click(outsideClickX, outsideClickY);
        await page.waitForTimeout(100);

        // Ellipse should be deselected
        isSelected = await page.evaluate(() => AppState.selectedShape);
        expect(isSelected).toBe(null);
    });

    test('TOUCH MODE: rectangle should stay selected when clicking near it', async ({ page }) => {
        // Enable touch mode
        await page.evaluate(() => {
            document.body.classList.add('touch-mode');
        });

        // Create a rectangle
        await page.evaluate(() => {
            const shape = {
                id: 'test-rect-touch',
                type: 'rectangle',
                x: 800,
                y: 600,
                width: 200,
                height: 150,
                rotation: 0,
                color: '#ff6b35',
                fillColor: 'rgba(255, 107, 53, 0.3)',
                strokeWidth: 3,
                visible: true,
                inherited: false
            };
            AppState.shapes.push(shape);
            Shapes.render();
        });

        await page.waitForTimeout(300);

        // Click on the rectangle to select it (click on overlay)
        const overlay = page.locator('.touch-overlay[data-shape="test-rect-touch"]');
        await overlay.click();
        await page.waitForTimeout(100);

        // Verify it's selected
        let isSelected = await page.evaluate(() => AppState.selectedShape === 'test-rect-touch');
        expect(isSelected).toBe(true);

        // Get the bounding box
        const bbox = await overlay.boundingBox();

        // Click just inside the overlay edge (2px from right edge)
        const nearClickX = bbox.x + bbox.width - 2;
        const nearClickY = bbox.y + bbox.height / 2;

        await page.mouse.click(nearClickX, nearClickY);
        await page.waitForTimeout(100);

        // Rectangle should stay selected (click is inside overlay)
        isSelected = await page.evaluate(() => AppState.selectedShape === 'test-rect-touch');
        expect(isSelected).toBe(true);

        // Now click outside the overlay (should deselect)
        const outsideClickX = bbox.x + bbox.width + 10;
        const outsideClickY = bbox.y + bbox.height / 2;

        await page.mouse.click(outsideClickX, outsideClickY);
        await page.waitForTimeout(100);

        // Rectangle should be deselected (click is outside overlay)
        isSelected = await page.evaluate(() => AppState.selectedShape);
        expect(isSelected).toBe(null);
    });

    test('NON-TOUCH MODE: clicking far from rectangle should deselect it', async ({ page }) => {
        // Ensure non-touch mode
        await page.evaluate(() => {
            document.body.classList.remove('touch-mode');
        });

        // Create a rectangle
        await page.evaluate(() => {
            const shape = {
                id: 'test-rect-far',
                type: 'rectangle',
                x: 800,
                y: 600,
                width: 200,
                height: 150,
                rotation: 0,
                color: '#ff6b35',
                fillColor: 'rgba(255, 107, 53, 0.3)',
                strokeWidth: 3,
                visible: true,
                inherited: false
            };
            AppState.shapes.push(shape);
            Shapes.render();
        });

        await page.waitForTimeout(300);

        // Click on the rectangle to select it
        const svgShape = page.locator('[data-shape="test-rect-far"]');
        await svgShape.click();
        await page.waitForTimeout(100);

        // Verify it's selected
        let isSelected = await page.evaluate(() => AppState.selectedShape === 'test-rect-far');
        expect(isSelected).toBe(true);

        // Click far from the rectangle (should deselect)
        // Click on the board area but far from the shape
        const boardArea = await page.locator('#board-area').boundingBox();
        await page.mouse.click(boardArea.x + 50, boardArea.y + 50);
        await page.waitForTimeout(100);

        // Should be deselected
        isSelected = await page.evaluate(() => AppState.selectedShape);
        expect(isSelected).toBe(null);
    });
});
