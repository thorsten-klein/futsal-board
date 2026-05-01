import { test, expect } from '@playwright/test';
import { FILE_URL } from './helpers.js';

test.describe('Text Resize Handle Test', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(FILE_URL);
        await page.evaluate(() => { try { localStorage.clear(); } catch (_) {} });
        await page.reload();
        await page.waitForSelector('#board-area', { state: 'attached' });
        await page.waitForTimeout(300);

        // Enable select tool
        await page.evaluate(() => {
            AppState.currentTool = 'select';
        });
    });

    test('resize handle should be at bottom right of actual text', async ({ page }) => {
        const x = 1000;
        const y = 1000;

        // Create a text shape
        await page.evaluate(({ x, y }) => {
            AppState.shapes = [];

            AppState.shapes.push({
                id: 'text-1',
                type: 'text',
                x, y,
                width: 400,
                height: 100,
                rotation: 0,
                color: 'black',
                text: 'Short',
                fontSize: 24,
                visible: true,
                inherited: false
            });

            Shapes.render();
        }, { x, y });

        await page.waitForTimeout(500);

        // Select the text to show resize handle
        const screenCoords = await page.evaluate(({ x, y }) => {
            const rect = AppState.canvas.getBoundingClientRect();
            return {
                x: rect.left + (x * rect.width / AppState.boardWidth),
                y: rect.top + (y * rect.height / AppState.boardHeight)
            };
        }, { x, y });

        await page.mouse.click(screenCoords.x, screenCoords.y);
        await page.waitForTimeout(200);

        // Get the actual text bounds and resize handle position
        const bounds = await page.evaluate(() => {
            const svg = document.querySelector('.shape-svg[data-shape="text-1"]');
            const textElement = svg?.querySelector('text');
            const resizeHandle = document.querySelector('.resize-handle');

            if (!svg || !textElement || !resizeHandle) {
                return { error: 'SVG, text element, or resize handle not found' };
            }

            const textRect = textElement.getBoundingClientRect();
            const handleRect = resizeHandle.getBoundingClientRect();

            return {
                text: {
                    left: textRect.left,
                    top: textRect.top,
                    right: textRect.right,
                    bottom: textRect.bottom,
                    width: textRect.width,
                    height: textRect.height
                },
                handle: {
                    centerX: handleRect.left + handleRect.width / 2,
                    centerY: handleRect.top + handleRect.height / 2,
                    left: handleRect.left,
                    top: handleRect.top,
                    right: handleRect.right,
                    bottom: handleRect.bottom
                }
            };
        });


        // Calculate expected handle position (bottom right of text)
        const expectedHandleX = bounds.text.right;
        const expectedHandleY = bounds.text.bottom;


        const xDiff = Math.abs(bounds.handle.centerX - expectedHandleX);
        const yDiff = Math.abs(bounds.handle.centerY - expectedHandleY);


        // The resize handle center should be at the bottom right corner of the actual text
        // Allow small tolerance for rounding
        expect(xDiff).toBeLessThan(5);
        expect(yDiff).toBeLessThan(5);
    });
});
