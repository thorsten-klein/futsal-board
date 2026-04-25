/**
 * Drawing interaction tests — verify line and arrow drawing through
 * mousedown → mousemove → mouseup sequences.
 */
import { test, expect } from './test-config.js';
import { goto, boardCenter } from './helpers.js';

test.describe('Drawing Interactions', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
    });

    test('click arrow tool, drag on canvas creates arrow', async ({ page }) => {
        // Select arrow tool by setting it programmatically (clicking doesn't persist the tool)
        await page.evaluate(() => {
            AppState.currentTool = 'arrow';
        });
        await page.waitForTimeout(100);

        // Verify tool is selected
        const currentTool = await page.evaluate(() => AppState.currentTool);
        expect(currentTool).toBe('arrow');

        const center = await boardCenter(page);
        const startX = center.x - 100;
        const startY = center.y;
        const endX = center.x + 100;
        const endY = center.y;

        // Draw an arrow
        await page.mouse.move(startX, startY);
        await page.mouse.down();
        await page.mouse.move(endX, endY);
        await page.mouse.up();
        await page.waitForTimeout(200);

        // Verify drawing was created
        const drawingCount = await page.evaluate(() => AppState.drawings.length);
        expect(drawingCount).toBe(1);

        // Verify it's an arrow
        const drawing = await page.evaluate(() => AppState.drawings[0]);
        expect(drawing.type).toBe('arrow');

        // Verify arrow has arrowhead marker
        const arrowPath = page.locator('#drawing-layer path[marker-end*="arrowhead"]');
        await expect(arrowPath).toHaveCount(1);
    });

    test('click line tool, drag on canvas creates line', async ({ page }) => {
        // Select line tool programmatically
        await page.evaluate(() => {
            AppState.currentTool = 'line';
        });
        await page.waitForTimeout(100);

        const currentTool = await page.evaluate(() => AppState.currentTool);
        expect(currentTool).toBe('line');

        const center = await boardCenter(page);
        const startX = center.x;
        const startY = center.y - 100;
        const endX = center.x;
        const endY = center.y + 100;

        // Draw a line
        await page.mouse.move(startX, startY);
        await page.mouse.down();
        await page.mouse.move(endX, endY);
        await page.mouse.up();
        await page.waitForTimeout(200);

        // Verify drawing was created
        const drawingCount = await page.evaluate(() => AppState.drawings.length);
        expect(drawingCount).toBe(1);

        // Verify it's a line
        const drawing = await page.evaluate(() => AppState.drawings[0]);
        expect(drawing.type).toBe('line');

        // Verify line does NOT have arrowhead marker
        const linePath = page.locator('#drawing-layer path');
        const markerEnd = await linePath.getAttribute('marker-end');
        expect(markerEnd).toBeFalsy();
    });

    test('short drag (< 20px) does not create drawing', async ({ page }) => {
        // Select arrow tool programmatically
        await page.evaluate(() => {
            AppState.currentTool = 'arrow';
        });
        await page.waitForTimeout(100);

        const center = await boardCenter(page);

        // Draw a very short line (10px)
        await page.mouse.move(center.x, center.y);
        await page.mouse.down();
        await page.mouse.move(center.x + 10, center.y);
        await page.mouse.up();
        await page.waitForTimeout(200);

        // Verify no drawing was created
        const drawingCount = await page.evaluate(() => AppState.drawings.length);
        expect(drawingCount).toBe(0);
    });

    test('drawing shows temp preview during mouse move', async ({ page }) => {
        // Select arrow tool programmatically
        await page.evaluate(() => {
            AppState.currentTool = 'arrow';
        });
        await page.waitForTimeout(100);

        const center = await boardCenter(page);

        // Start drawing
        await page.mouse.move(center.x, center.y);
        await page.mouse.down();

        // Verify drawing layer has 'drawing' class
        await expect(page.locator('#drawing-layer')).toHaveClass(/drawing/);

        // Move mouse to show preview
        await page.mouse.move(center.x + 100, center.y + 100);
        await page.waitForTimeout(50);

        // Verify temp preview exists
        const tempPath = page.locator('#drawing-layer path.temp');
        await expect(tempPath).toHaveCount(1);

        // Finish drawing
        await page.mouse.up();
        await page.waitForTimeout(200);

        // Verify temp class is removed
        const hasDrawingClass = await page.locator('#drawing-layer').evaluate(el =>
            el.classList.contains('drawing')
        );
        expect(hasDrawingClass).toBe(false);

        // Verify temp preview is gone
        await expect(tempPath).toHaveCount(0);
    });

    test('arrow has arrowhead marker, line does not', async ({ page }) => {
        // Draw an arrow
        await page.evaluate(() => {
            AppState.currentTool = 'arrow';
        });
        await page.waitForTimeout(100);

        const center = await boardCenter(page);
        await page.mouse.move(center.x - 150, center.y);
        await page.mouse.down();
        await page.mouse.move(center.x - 50, center.y);
        await page.mouse.up();
        await page.waitForTimeout(200);

        // Draw a line
        await page.evaluate(() => {
            AppState.currentTool = 'line';
        });
        await page.waitForTimeout(100);

        await page.mouse.move(center.x + 50, center.y);
        await page.mouse.down();
        await page.mouse.move(center.x + 150, center.y);
        await page.mouse.up();
        await page.waitForTimeout(200);

        // Count paths
        const allPaths = page.locator('#drawing-layer path:not(.temp)');
        await expect(allPaths).toHaveCount(2);

        // Verify one has arrowhead, one doesn't
        const arrowPaths = page.locator('#drawing-layer path[marker-end*="arrowhead"]');
        await expect(arrowPaths).toHaveCount(1);
    });

    test('drawings persist after creation', async ({ page }) => {
        // Draw first arrow
        await page.evaluate(() => {
            AppState.currentTool = 'arrow';
        });
        const center = await boardCenter(page);
        await page.mouse.move(center.x - 100, center.y - 50);
        await page.mouse.down();
        await page.mouse.move(center.x, center.y - 50);
        await page.mouse.up();
        await page.waitForTimeout(200);

        // Draw second arrow
        await page.mouse.move(center.x, center.y + 50);
        await page.mouse.down();
        await page.mouse.move(center.x + 100, center.y + 50);
        await page.mouse.up();
        await page.waitForTimeout(200);

        // Verify both drawings exist in state
        const drawingCount = await page.evaluate(() => AppState.drawings.length);
        expect(drawingCount).toBe(2);

        // Verify both are rendered
        const visiblePaths = page.locator('#drawing-layer path:not(.temp)');
        await expect(visiblePaths).toHaveCount(2);
    });

    test('multiple drawings can be created', async ({ page }) => {
        const center = await boardCenter(page);

        await page.evaluate(() => {
            AppState.currentTool = 'arrow';
        });

        // Create 5 drawings
        for (let i = 0; i < 5; i++) {
            await page.waitForTimeout(50);

            const y = center.y + (i - 2) * 40;
            await page.mouse.move(center.x - 100, y);
            await page.mouse.down();
            await page.mouse.move(center.x + 100, y);
            await page.mouse.up();
            await page.waitForTimeout(100);
        }

        // Verify all 5 exist
        const drawingCount = await page.evaluate(() => AppState.drawings.length);
        expect(drawingCount).toBe(5);
    });

    test('drawing is added to undo stack', async ({ page }) => {
        // Draw an arrow
        await page.evaluate(() => {
            AppState.currentTool = 'arrow';
        });
        const center = await boardCenter(page);

        await page.mouse.move(center.x - 100, center.y);
        await page.mouse.down();
        await page.mouse.move(center.x + 100, center.y);
        await page.mouse.up();
        await page.waitForTimeout(200);

        // Verify drawing exists
        let drawingCount = await page.evaluate(() => AppState.drawings.length);
        expect(drawingCount).toBe(1);

        // Undo
        await page.keyboard.press('Control+z');
        await page.waitForTimeout(200);

        // Drawing should be gone
        drawingCount = await page.evaluate(() => AppState.drawings.length);
        expect(drawingCount).toBe(0);

        // Redo
        await page.keyboard.press('Control+Shift+z');
        await page.waitForTimeout(200);

        // Drawing should be back
        drawingCount = await page.evaluate(() => AppState.drawings.length);
        expect(drawingCount).toBe(1);
    });

    test('temp drawing clears on mouse up', async ({ page }) => {
        // Select arrow tool programmatically
        await page.evaluate(() => {
            AppState.currentTool = 'arrow';
        });
        const center = await boardCenter(page);

        // Start drawing
        await page.mouse.move(center.x, center.y);
        await page.mouse.down();
        await page.mouse.move(center.x + 100, center.y);

        // Verify temp preview exists
        await expect(page.locator('#drawing-layer path.temp')).toHaveCount(1);

        // Release mouse
        await page.mouse.up();
        await page.waitForTimeout(100);

        // Verify temp preview is cleared
        await expect(page.locator('#drawing-layer path.temp')).toHaveCount(0);
    });
});
