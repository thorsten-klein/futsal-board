/**
 * Test specifically: dragging RIGHT handle should NOT change height
 * Especially with very long shapes in touch mode
 */
import { test, expect } from './test-config.js';
import { goto } from './helpers.js';

test.describe('Drag Right Handle Height Bug', () => {
    test('touch mode: very long shape - RIGHT handle must not change height', async ({ page }) => {
        await goto(page);

        await page.evaluate(() => {
            document.body.classList.add('touch-mode');
        });

        // Create a very long, thin rectangle
        await page.locator('.draw-btn[data-draw="rectangle"]').click();
        await page.waitForTimeout(200);

        await page.evaluate(() => {
            const shape = AppState.shapes[AppState.shapes.length - 1];
            shape.width = 2500;  // Very long
            shape.height = 150;  // Thin
            shape.x = 2500;
            shape.y = 1500;
            shape.rotation = 0;
            Shapes.render();
        });

        const shapeId = await page.evaluate(() => AppState.shapes[AppState.shapes.length - 1].id);
        await page.locator(`.touch-overlay[data-shape="${shapeId}"]`).click();
        await page.waitForTimeout(200);

        // Get initial state
        const initial = await page.evaluate(() => {
            const shape = AppState.shapes.find(s => s.id === AppState.selectedShape);
            return {
                width: shape.width,
                height: shape.height,
                x: shape.x,
                y: shape.y
            };
        });


        // Find the RIGHT handle specifically
        const handles = page.locator('.resize-handle');
        const shapeData = await page.evaluate(() => {
            const shape = AppState.shapes.find(s => s.id === AppState.selectedShape);
            const canvasRect = AppState.canvas.getBoundingClientRect();
            const scaleX = canvasRect.width / AppState.boardWidth;
            const scaleY = canvasRect.height / AppState.boardHeight;

            const centerX = canvasRect.left + shape.x * scaleX;
            const centerY = canvasRect.top + shape.y * scaleY;

            // Calculate where the right handle SHOULD be
            const rotation = (shape.rotation || 0) * Math.PI / 180;
            const widthHalf = (shape.width / 2) * scaleX;

            const expectedRightX = centerX + Math.cos(rotation) * widthHalf;
            const expectedRightY = centerY + Math.sin(rotation) * widthHalf;

            return {
                centerX,
                centerY,
                expectedRightHandle: { x: expectedRightX, y: expectedRightY }
            };
        });

        // Find the handle closest to the expected right position
        let rightHandle = null;
        let minDistance = Infinity;
        const handleCount = await handles.count();


        for (let i = 0; i < handleCount; i++) {
            const box = await handles.nth(i).boundingBox();
            const handleX = box.x + box.width / 2;
            const handleY = box.y + box.height / 2;

            const distance = Math.sqrt(
                Math.pow(handleX - shapeData.expectedRightHandle.x, 2) +
                Math.pow(handleY - shapeData.expectedRightHandle.y, 2)
            );


            if (distance < minDistance) {
                minDistance = distance;
                rightHandle = handles.nth(i);
            }
        }

        expect(rightHandle).not.toBeNull();

        // Start drag
        const box = await rightHandle.boundingBox();
        const startX = box.x + box.width / 2;
        const startY = box.y + box.height / 2;

        await page.mouse.move(startX, startY);
        await page.mouse.down();


        // Track every step
        const log = [];
        for (let i = 0; i <= 10; i++) {
            const x = startX + i * 25;
            await page.mouse.move(x, startY);  // EXACTLY horizontal - same Y
            await page.waitForTimeout(20);

            const state = await page.evaluate(() => {
                const shape = AppState.shapes.find(s => s.id === AppState.selectedShape);
                const svg = document.getElementById(shape.id);
                const viewBox = svg.getAttribute('viewBox');

                return {
                    width: shape.width,
                    height: shape.height,
                    viewBox: viewBox,
                    svgWidth: parseFloat(svg.getAttribute('width')),
                    svgHeight: parseFloat(svg.getAttribute('height'))
                };
            });

            log.push({ step: i, mouseX: x.toFixed(1), ...state });
        }

        await page.mouse.up();
        await page.waitForTimeout(200);

        // Print detailed log

        for (const entry of log) {
            const heightChanged = Math.abs(entry.height - initial.height) > 0.0001;
            const marker = heightChanged ? ' ❌ BUG!' : ' ✓';

            // Fail immediately if height changed
            if (heightChanged) {
                console.error(`\n❌ HEIGHT CHANGED at step ${entry.step}: ${initial.height} → ${entry.height}`);
                console.error(`   Difference: ${(entry.height - initial.height).toFixed(4)}`);
            }
        }

        // Get final state
        const final = await page.evaluate(() => {
            const shape = AppState.shapes.find(s => s.id === AppState.selectedShape);
            return {
                width: shape.width,
                height: shape.height,
                x: shape.x,
                y: shape.y
            };
        });


        // CRITICAL: Height must be EXACTLY the same
        expect(final.height).toBe(initial.height);

        // Width should have changed
        expect(final.width).not.toBe(initial.width);
    });
});
