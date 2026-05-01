/**
 * Test that horizontal edge handles only change width, not height
 */
import { test, expect } from './test-config.js';
import { goto } from './helpers.js';

test.describe('Shape Transform Width Only Bug', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
    });

    test('dragging right handle should only change width, height must stay constant', async ({ page }) => {
        // Add rectangle
        await page.locator('.draw-btn[data-draw="rectangle"]').click();
        await page.waitForTimeout(200);

        // Get shape ID
        const shapeId = await page.evaluate(() => AppState.shapes[AppState.shapes.length - 1].id);

        // Select the shape
        await page.locator(`[data-shape="${shapeId}"]`).click();
        await page.waitForTimeout(100);

        // Get initial dimensions
        const initialDimensions = await page.evaluate(() => {
            const shape = AppState.shapes.find(s => s.id === AppState.selectedShape);
            return { width: shape.width, height: shape.height };
        });


        // Find the right handle (on the horizontal edge)
        const handles = page.locator('.resize-handle');
        const shapeCenter = await page.evaluate(() => {
            const shape = AppState.shapes.find(s => s.id === AppState.selectedShape);
            const canvasRect = AppState.canvas.getBoundingClientRect();
            const scaleX = canvasRect.width / AppState.boardWidth;
            const scaleY = canvasRect.height / AppState.boardHeight;
            return {
                x: canvasRect.left + shape.x * scaleX,
                y: canvasRect.top + shape.y * scaleY
            };
        });

        // Find the right handle (Y near center, X to the right)
        let rightHandle = null;
        const handleCount = await handles.count();

        for (let i = 0; i < handleCount; i++) {
            const handle = handles.nth(i);
            const box = await handle.boundingBox();
            const handleCenter = {
                x: box.x + box.width / 2,
                y: box.y + box.height / 2
            };

            // Right handle: Y near center, X greater than center
            if (Math.abs(handleCenter.y - shapeCenter.y) < 10 && handleCenter.x > shapeCenter.x) {
                rightHandle = handle;
                break;
            }
        }

        expect(rightHandle).not.toBeNull();

        // Drag the right handle horizontally (to the right)
        const handleBox = await rightHandle.boundingBox();
        const startX = handleBox.x + handleBox.width / 2;
        const startY = handleBox.y + handleBox.height / 2;


        await page.mouse.move(startX, startY);
        await page.mouse.down();
        await page.mouse.move(startX + 100, startY); // Move 100px to the right, same Y
        await page.mouse.up();
        await page.waitForTimeout(200);

        // Get new dimensions
        const newDimensions = await page.evaluate(() => {
            const shape = AppState.shapes.find(s => s.id === AppState.selectedShape);
            return { width: shape.width, height: shape.height };
        });


        // Width should have increased
        expect(newDimensions.width).toBeGreaterThan(initialDimensions.width);

        // Height MUST NOT change
        expect(newDimensions.height).toBe(initialDimensions.height);
    });

    test('dragging left handle should only change width, height must stay constant', async ({ page }) => {
        // Add rectangle
        await page.locator('.draw-btn[data-draw="rectangle"]').click();
        await page.waitForTimeout(200);

        // Get shape ID
        const shapeId = await page.evaluate(() => AppState.shapes[AppState.shapes.length - 1].id);

        // Select the shape
        await page.locator(`[data-shape="${shapeId}"]`).click();
        await page.waitForTimeout(100);

        // Get initial dimensions
        const initialDimensions = await page.evaluate(() => {
            const shape = AppState.shapes.find(s => s.id === AppState.selectedShape);
            return { width: shape.width, height: shape.height };
        });

        // Find the left handle
        const handles = page.locator('.resize-handle');
        const shapeCenter = await page.evaluate(() => {
            const shape = AppState.shapes.find(s => s.id === AppState.selectedShape);
            const canvasRect = AppState.canvas.getBoundingClientRect();
            const scaleX = canvasRect.width / AppState.boardWidth;
            const scaleY = canvasRect.height / AppState.boardHeight;
            return {
                x: canvasRect.left + shape.x * scaleX,
                y: canvasRect.top + shape.y * scaleY
            };
        });

        let leftHandle = null;
        const handleCount = await handles.count();

        for (let i = 0; i < handleCount; i++) {
            const handle = handles.nth(i);
            const box = await handle.boundingBox();
            const handleCenter = {
                x: box.x + box.width / 2,
                y: box.y + box.height / 2
            };

            // Left handle: Y near center, X less than center
            if (Math.abs(handleCenter.y - shapeCenter.y) < 10 && handleCenter.x < shapeCenter.x) {
                leftHandle = handle;
                break;
            }
        }

        expect(leftHandle).not.toBeNull();

        // Drag the left handle horizontally (to the left)
        const handleBox = await leftHandle.boundingBox();
        const startX = handleBox.x + handleBox.width / 2;
        const startY = handleBox.y + handleBox.height / 2;

        await page.mouse.move(startX, startY);
        await page.mouse.down();
        await page.mouse.move(startX - 80, startY); // Move 80px to the left, same Y
        await page.mouse.up();
        await page.waitForTimeout(200);

        // Get new dimensions
        const newDimensions = await page.evaluate(() => {
            const shape = AppState.shapes.find(s => s.id === AppState.selectedShape);
            return { width: shape.width, height: shape.height };
        });

        // Width should have increased
        expect(newDimensions.width).toBeGreaterThan(initialDimensions.width);

        // Height MUST NOT change
        expect(newDimensions.height).toBe(initialDimensions.height);
    });

    test('dragging top handle should only change height, width must stay constant', async ({ page }) => {
        // Add rectangle
        await page.locator('.draw-btn[data-draw="rectangle"]').click();
        await page.waitForTimeout(200);

        // Get shape ID
        const shapeId = await page.evaluate(() => AppState.shapes[AppState.shapes.length - 1].id);

        // Select the shape
        await page.locator(`[data-shape="${shapeId}"]`).click();
        await page.waitForTimeout(100);

        // Get initial dimensions
        const initialDimensions = await page.evaluate(() => {
            const shape = AppState.shapes.find(s => s.id === AppState.selectedShape);
            return { width: shape.width, height: shape.height };
        });

        // Find the top handle
        const handles = page.locator('.resize-handle');
        const shapeCenter = await page.evaluate(() => {
            const shape = AppState.shapes.find(s => s.id === AppState.selectedShape);
            const canvasRect = AppState.canvas.getBoundingClientRect();
            const scaleX = canvasRect.width / AppState.boardWidth;
            const scaleY = canvasRect.height / AppState.boardHeight;
            return {
                x: canvasRect.left + shape.x * scaleX,
                y: canvasRect.top + shape.y * scaleY
            };
        });

        let topHandle = null;
        const handleCount = await handles.count();

        for (let i = 0; i < handleCount; i++) {
            const handle = handles.nth(i);
            const box = await handle.boundingBox();
            const handleCenter = {
                x: box.x + box.width / 2,
                y: box.y + box.height / 2
            };

            // Top handle: X near center, Y less than center
            if (Math.abs(handleCenter.x - shapeCenter.x) < 10 && handleCenter.y < shapeCenter.y) {
                topHandle = handle;
                break;
            }
        }

        expect(topHandle).not.toBeNull();

        // Drag the top handle vertically (upward)
        const handleBox = await topHandle.boundingBox();
        const startX = handleBox.x + handleBox.width / 2;
        const startY = handleBox.y + handleBox.height / 2;

        await page.mouse.move(startX, startY);
        await page.mouse.down();
        await page.mouse.move(startX, startY - 60); // Move 60px up, same X
        await page.mouse.up();
        await page.waitForTimeout(200);

        // Get new dimensions
        const newDimensions = await page.evaluate(() => {
            const shape = AppState.shapes.find(s => s.id === AppState.selectedShape);
            return { width: shape.width, height: shape.height };
        });

        // Height should have increased
        expect(newDimensions.height).toBeGreaterThan(initialDimensions.height);

        // Width MUST NOT change
        expect(newDimensions.width).toBe(initialDimensions.width);
    });
});
