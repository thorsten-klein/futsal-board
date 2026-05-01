/**
 * Visual check - take screenshots during resize to verify no visual glitches
 */
import { test, expect } from './test-config.js';
import { goto } from './helpers.js';

test.describe('Shape Resize Visual Check', () => {
    test('touch mode: step-by-step dimension tracking during horizontal resize', async ({ page }) => {
        await goto(page);

        // Enable touch mode
        await page.evaluate(() => {
            document.body.classList.add('touch-mode');
        });

        // Add rectangle with large size for visibility
        await page.locator('.draw-btn[data-draw="rectangle"]').click();
        await page.waitForTimeout(200);

        await page.evaluate(() => {
            const shape = AppState.shapes[AppState.shapes.length - 1];
            shape.width = 600;
            shape.height = 400;
            shape.x = 2000;
            shape.y = 1500;
            shape.rotation = 0;
            Shapes.render();
        });

        const shapeId = await page.evaluate(() => AppState.shapes[AppState.shapes.length - 1].id);
        await page.locator(`.touch-overlay[data-shape="${shapeId}"]`).click();
        await page.waitForTimeout(200);

        // Track dimensions during the entire drag
        const dimensionLog = [];

        // Get initial dimensions
        const initial = await page.evaluate(() => {
            const shape = AppState.shapes.find(s => s.id === AppState.selectedShape);
            return { width: shape.width, height: shape.height };
        });
        dimensionLog.push({ step: 'initial', ...initial });

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

        // Start drag
        const box = await rightHandle.boundingBox();
        const startX = box.x + box.width / 2;
        const startY = box.y + box.height / 2;

        await page.mouse.move(startX, startY);
        await page.mouse.down();

        // Move in small increments and check dimensions at each step
        for (let i = 1; i <= 10; i++) {
            await page.mouse.move(startX + i * 15, startY);
            await page.waitForTimeout(20);

            const dims = await page.evaluate(() => {
                const shape = AppState.shapes.find(s => s.id === AppState.selectedShape);
                return { width: shape.width, height: shape.height };
            });

            dimensionLog.push({ step: `move_${i}`, ...dims });
        }

        await page.mouse.up();
        await page.waitForTimeout(100);

        // Final dimensions
        const final = await page.evaluate(() => {
            const shape = AppState.shapes.find(s => s.id === AppState.selectedShape);
            return { width: shape.width, height: shape.height };
        });
        dimensionLog.push({ step: 'final', ...final });

        // Print the log

        for (let i = 0; i < dimensionLog.length; i++) {
            const log = dimensionLog[i];
            const heightChanged = i > 0 && log.height !== dimensionLog[0].height;
        }

        // Verify height NEVER changed
        for (let i = 1; i < dimensionLog.length; i++) {
            if (dimensionLog[i].height !== initial.height) {
                console.error(`❌ Height changed at step ${dimensionLog[i].step}: ${initial.height} → ${dimensionLog[i].height}`);
                expect(dimensionLog[i].height).toBe(initial.height);
            }
        }

    });
});
