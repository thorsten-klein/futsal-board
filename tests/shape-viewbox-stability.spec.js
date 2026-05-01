/**
 * Verify viewBox dimensions stay constant in non-resizing direction
 */
import { test, expect } from './test-config.js';
import { goto } from './helpers.js';

test.describe('ViewBox Stability', () => {
    test('horizontal resize: viewBox HEIGHT must stay constant', async ({ page }) => {
        await goto(page);

        await page.evaluate(() => {
            document.body.classList.add('touch-mode');
        });

        await page.locator('.draw-btn[data-draw="rectangle"]').click();
        await page.waitForTimeout(200);

        await page.evaluate(() => {
            const shape = AppState.shapes[AppState.shapes.length - 1];
            shape.width = 2000;
            shape.height = 200;
            shape.x = 2500;
            shape.y = 1500;
            Shapes.render();
        });

        const shapeId = await page.evaluate(() => AppState.shapes[AppState.shapes.length - 1].id);
        await page.locator(`.touch-overlay[data-shape="${shapeId}"]`).click();
        await page.waitForTimeout(100);

        // Get initial viewBox
        const initialVB = await page.evaluate(() => {
            const shape = AppState.shapes.find(s => s.id === AppState.selectedShape);
            const svg = document.getElementById(shape.id);
            return svg.getAttribute('viewBox').split(' ').map(parseFloat);
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
        for (let i = 0; i < await handles.count(); i++) {
            const box = await handles.nth(i).boundingBox();
            const handleY = box.y + box.height / 2;
            const handleX = box.x + box.width / 2;

            if (Math.abs(handleY - shapeCenter.y) < 10 && handleX > shapeCenter.x) {
                rightHandle = handles.nth(i);
                break;
            }
        }

        // Drag horizontally
        const box = await rightHandle.boundingBox();
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down();
        await page.mouse.move(box.x + 200, box.y + box.height / 2);
        await page.mouse.up();
        await page.waitForTimeout(100);

        // Get final viewBox
        const finalVB = await page.evaluate(() => {
            const shape = AppState.shapes.find(s => s.id === AppState.selectedShape);
            const svg = document.getElementById(shape.id);
            return svg.getAttribute('viewBox').split(' ').map(parseFloat);
        });


        // ViewBox HEIGHT must be constant during horizontal resize
        expect(finalVB[3]).toBe(initialVB[3]);

        // ViewBox WIDTH should have changed
        expect(finalVB[2]).not.toBe(initialVB[2]);
    });

    test('vertical resize: viewBox WIDTH must stay constant', async ({ page }) => {
        await goto(page);

        await page.evaluate(() => {
            document.body.classList.add('touch-mode');
        });

        await page.locator('.draw-btn[data-draw="rectangle"]').click();
        await page.waitForTimeout(200);

        await page.evaluate(() => {
            const shape = AppState.shapes[AppState.shapes.length - 1];
            shape.width = 2000;
            shape.height = 200;
            shape.x = 2500;
            shape.y = 1500;
            Shapes.render();
        });

        const shapeId = await page.evaluate(() => AppState.shapes[AppState.shapes.length - 1].id);
        await page.locator(`.touch-overlay[data-shape="${shapeId}"]`).click();
        await page.waitForTimeout(100);

        // Get initial viewBox
        const initialVB = await page.evaluate(() => {
            const shape = AppState.shapes.find(s => s.id === AppState.selectedShape);
            const svg = document.getElementById(shape.id);
            return svg.getAttribute('viewBox').split(' ').map(parseFloat);
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
        for (let i = 0; i < await handles.count(); i++) {
            const box = await handles.nth(i).boundingBox();
            const handleY = box.y + box.height / 2;
            const handleX = box.x + box.width / 2;

            if (Math.abs(handleX - shapeCenter.x) < 10 && handleY > shapeCenter.y) {
                bottomHandle = handles.nth(i);
                break;
            }
        }

        // Drag vertically
        const box = await bottomHandle.boundingBox();
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.down();
        await page.mouse.move(box.x + box.width / 2, box.y + 150);
        await page.mouse.up();
        await page.waitForTimeout(100);

        // Get final viewBox
        const finalVB = await page.evaluate(() => {
            const shape = AppState.shapes.find(s => s.id === AppState.selectedShape);
            const svg = document.getElementById(shape.id);
            return svg.getAttribute('viewBox').split(' ').map(parseFloat);
        });


        // ViewBox WIDTH must be constant during vertical resize
        expect(finalVB[2]).toBe(initialVB[2]);

        // ViewBox HEIGHT should have changed
        expect(finalVB[3]).not.toBe(initialVB[3]);
    });
});
