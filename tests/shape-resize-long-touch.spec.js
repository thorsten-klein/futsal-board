/**
 * Test resize with very long shapes in touch mode
 */
import { test, expect } from './test-config.js';
import { goto } from './helpers.js';

test.describe('Long Shape Resize Touch Mode', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);

        // Enable touch mode
        await page.evaluate(() => {
            document.body.classList.add('touch-mode');
        });
        await page.waitForTimeout(200);
    });

    test('very long rectangle: vertical handle should only change height', async ({ page }) => {
        // Add rectangle
        await page.locator('.draw-btn[data-draw="rectangle"]').click();
        await page.waitForTimeout(200);

        // Make it very long horizontally
        await page.evaluate(() => {
            const shape = AppState.shapes[AppState.shapes.length - 1];
            shape.width = 2000;  // Very long
            shape.height = 200;
            shape.x = 2500;
            shape.y = 1500;
            shape.rotation = 0;
            Shapes.render();
        });

        const shapeId = await page.evaluate(() => AppState.shapes[AppState.shapes.length - 1].id);
        await page.locator(`.touch-overlay[data-shape="${shapeId}"]`).click();
        await page.waitForTimeout(200);

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


        // Find bottom handle (vertical resize)
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


            if (Math.abs(handleX - shapeCenter.x) < 10 && handleY > shapeCenter.y) {
                bottomHandle = handles.nth(i);
                break;
            }
        }

        expect(bottomHandle).not.toBeNull();

        // Drag vertically
        const box = await bottomHandle.boundingBox();
        const startX = box.x + box.width / 2;
        const startY = box.y + box.height / 2;


        await page.mouse.move(startX, startY);
        await page.mouse.down();
        await page.mouse.move(startX, startY + 150); // Exactly vertical
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


        // Width must be EXACTLY the same
        expect(final.width).toBe(initial.width);

        // Height should have changed
        expect(final.height).not.toBe(initial.height);
    });

    test('very long rectangle: horizontal handle should only change width', async ({ page }) => {
        // Add rectangle
        await page.locator('.draw-btn[data-draw="rectangle"]').click();
        await page.waitForTimeout(200);

        // Make it very long horizontally
        await page.evaluate(() => {
            const shape = AppState.shapes[AppState.shapes.length - 1];
            shape.width = 2500;  // Very long
            shape.height = 300;
            shape.x = 2500;
            shape.y = 1500;
            shape.rotation = 0;
            Shapes.render();
        });

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


        // Find right handle
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

        let rightHandle = null;
        const handleCount = await handles.count();

        for (let i = 0; i < handleCount; i++) {
            const box = await handles.nth(i).boundingBox();
            const handleY = box.y + box.height / 2;
            const handleX = box.x + box.width / 2;


            if (Math.abs(handleY - shapeCenter.y) < 10 && handleX > shapeCenter.x) {
                rightHandle = handles.nth(i);
                break;
            }
        }

        expect(rightHandle).not.toBeNull();

        // Drag horizontally
        const box = await rightHandle.boundingBox();
        const startX = box.x + box.width / 2;
        const startY = box.y + box.height / 2;


        // Track dimensions during drag
        await page.mouse.move(startX, startY);
        await page.mouse.down();

        const log = [];
        for (let i = 0; i <= 10; i++) {
            await page.mouse.move(startX + i * 20, startY);
            await page.waitForTimeout(20);

            const dims = await page.evaluate(() => {
                const shape = AppState.shapes.find(s => s.id === AppState.selectedShape);
                return { width: shape.width, height: shape.height };
            });

            log.push({ step: i, ...dims });
        }

        await page.mouse.up();
        await page.waitForTimeout(300);

        // Print log
        for (const entry of log) {
            const heightChanged = entry.height !== initial.height;
        }

        // Get final dimensions
        const final = await page.evaluate(() => {
            const shape = AppState.shapes.find(s => s.id === AppState.selectedShape);
            return {
                width: shape.width,
                height: shape.height
            };
        });


        // Height must be EXACTLY the same
        expect(final.height).toBe(initial.height);

        // Width should have changed
        expect(final.width).not.toBe(initial.width);
    });

    test('extremely long and thin rectangle: vertical resize', async ({ page }) => {
        // Add rectangle
        await page.locator('.draw-btn[data-draw="rectangle"]').click();
        await page.waitForTimeout(200);

        // Make it extremely long and thin
        await page.evaluate(() => {
            const shape = AppState.shapes[AppState.shapes.length - 1];
            shape.width = 3000;  // Extremely long
            shape.height = 100;  // Very thin
            shape.x = 2500;
            shape.y = 1500;
            shape.rotation = 0;
            Shapes.render();
        });

        const shapeId = await page.evaluate(() => AppState.shapes[AppState.shapes.length - 1].id);
        await page.locator(`.touch-overlay[data-shape="${shapeId}"]`).click();
        await page.waitForTimeout(200);

        // Get initial dimensions
        const initial = await page.evaluate(() => {
            const shape = AppState.shapes.find(s => s.id === AppState.selectedShape);
            return {
                width: shape.width,
                height: shape.height,
                aspectRatio: shape.width / shape.height
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

            if (Math.abs(handleX - shapeCenter.x) < 10 && handleY > shapeCenter.y) {
                bottomHandle = handles.nth(i);
                break;
            }
        }

        expect(bottomHandle).not.toBeNull();

        // Drag vertically
        const box = await bottomHandle.boundingBox();
        const startX = box.x + box.width / 2;
        const startY = box.y + box.height / 2;

        await page.mouse.move(startX, startY);
        await page.mouse.down();
        await page.mouse.move(startX, startY + 100);
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
        expect(final.height).toBeGreaterThan(initial.height);
    });
});
