/**
 * Test shape resize in touch mode - horizontal handle should only change width
 */
import { test, expect } from './test-config.js';
import { goto } from './helpers.js';

test.describe('Shape Resize Touch Mode Bug', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);

        // Enable touch mode
        await page.evaluate(() => {
            document.body.classList.add('touch-mode');
        });
        await page.waitForTimeout(200);
    });

    test('touch mode: horizontal handle should only change width, not height', async ({ page }) => {
        // Add rectangle
        await page.locator('.draw-btn[data-draw="rectangle"]').click();
        await page.waitForTimeout(200);

        // Set exact dimensions
        await page.evaluate(() => {
            const shape = AppState.shapes[AppState.shapes.length - 1];
            shape.width = 400;
            shape.height = 300;
            shape.x = 2000;
            shape.y = 1500;
            shape.rotation = 0;
            Shapes.render();
        });

        // Get shape ID and select (click the touch overlay in touch mode)
        const shapeId = await page.evaluate(() => AppState.shapes[AppState.shapes.length - 1].id);
        await page.locator(`.touch-overlay[data-shape="${shapeId}"]`).click();
        await page.waitForTimeout(200);

        // Verify touch mode is active
        const isTouchMode = await page.evaluate(() => document.body.classList.contains('touch-mode'));
        expect(isTouchMode).toBe(true);

        // Get initial dimensions
        const initial = await page.evaluate(() => {
            const shape = AppState.shapes.find(s => s.id === AppState.selectedShape);
            return {
                width: shape.width,
                height: shape.height,
                x: shape.x,
                y: shape.y
            };
        });


        // Find right handle
        const handles = page.locator('.resize-handle');
        const handleCount = await handles.count();

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

        let rightHandle = null;
        for (let i = 0; i < handleCount; i++) {
            const box = await handles.nth(i).boundingBox();
            const handleY = box.y + box.height / 2;
            const handleX = box.x + box.width / 2;


            if (Math.abs(handleY - shapeCenter.y) < 5 && handleX > shapeCenter.x) {
                rightHandle = handles.nth(i);
                break;
            }
        }

        expect(rightHandle).not.toBeNull();

        // Perform resize with touch/mouse
        const box = await rightHandle.boundingBox();
        const startX = box.x + box.width / 2;
        const startY = box.y + box.height / 2;


        await page.mouse.move(startX, startY);
        await page.mouse.down();
        await page.mouse.move(startX + 120, startY); // Exactly horizontal
        await page.mouse.up();
        await page.waitForTimeout(300);

        // Get final dimensions
        const final = await page.evaluate(() => {
            const shape = AppState.shapes.find(s => s.id === AppState.selectedShape);
            return {
                width: shape.width,
                height: shape.height,
                x: shape.x,
                y: shape.y
            };
        });


        // Height must be EXACTLY the same
        expect(final.height).toBe(initial.height);

        // Width should have changed
        expect(final.width).not.toBe(initial.width);
    });

    test('touch mode: vertical handle should only change height, not width', async ({ page }) => {
        // Add rectangle
        await page.locator('.draw-btn[data-draw="rectangle"]').click();
        await page.waitForTimeout(200);

        // Set exact dimensions
        await page.evaluate(() => {
            const shape = AppState.shapes[AppState.shapes.length - 1];
            shape.width = 400;
            shape.height = 300;
            shape.x = 2000;
            shape.y = 1500;
            shape.rotation = 0;
            Shapes.render();
        });

        // Get shape ID and select (click the touch overlay in touch mode)
        const shapeId = await page.evaluate(() => AppState.shapes[AppState.shapes.length - 1].id);
        await page.locator(`.touch-overlay[data-shape="${shapeId}"]`).click();
        await page.waitForTimeout(200);

        // Get initial dimensions
        const initial = await page.evaluate(() => {
            const shape = AppState.shapes.find(s => s.id === AppState.selectedShape);
            return {
                width: shape.width,
                height: shape.height
            };
        });


        // Find bottom handle
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

        let bottomHandle = null;
        const handleCount = await handles.count();

        for (let i = 0; i < handleCount; i++) {
            const box = await handles.nth(i).boundingBox();
            const handleY = box.y + box.height / 2;
            const handleX = box.x + box.width / 2;

            if (Math.abs(handleX - shapeCenter.x) < 5 && handleY > shapeCenter.y) {
                bottomHandle = handles.nth(i);
                break;
            }
        }

        expect(bottomHandle).not.toBeNull();

        // Perform resize
        const box = await bottomHandle.boundingBox();
        const startX = box.x + box.width / 2;
        const startY = box.y + box.height / 2;


        await page.mouse.move(startX, startY);
        await page.mouse.down();
        await page.mouse.move(startX, startY + 100); // Exactly vertical
        await page.mouse.up();
        await page.waitForTimeout(300);

        // Get final dimensions
        const final = await page.evaluate(() => {
            const shape = AppState.shapes.find(s => s.id === AppState.selectedShape);
            return {
                width: shape.width,
                height: shape.height
            };
        });


        // Width must be EXACTLY the same
        expect(final.width).toBe(initial.width);

        // Height should have changed
        expect(final.height).not.toBe(initial.height);
    });
});
