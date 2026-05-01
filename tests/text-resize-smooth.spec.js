import { test, expect } from '@playwright/test';
import { goto } from './helpers.js';

test.describe('Text Resize Smoothness', () => {
    test('text resize should be smooth without jumps', async ({ page }) => {
        await goto(page);

        // Create a text shape and select it
        await page.evaluate(() => {
            const shape = {
                id: 'text-1',
                type: 'text',
                x: 1000,
                y: 1000,
                width: 400,
                height: 100,
                rotation: 0,
                text: 'Test Text',
                fontSize: 48,
                color: 'black',
                visible: true,
                inherited: false
            };
            AppState.shapes.push(shape);
            AppState.selectedShape = shape.id;
            AppState.currentTool = 'select';
            Shapes.render();
        });

        // Simulate gradual resize by moving mouse in small increments
        const fontSizes = await page.evaluate(() => {
            const handle = document.querySelector('.resize-handle');
            const handleRect = handle.getBoundingClientRect();
            const startX = handleRect.left + handleRect.width / 2;
            const startY = handleRect.top + handleRect.height / 2;

            // Start resize
            const mouseDownEvent = new MouseEvent('mousedown', {
                clientX: startX,
                clientY: startY,
                bubbles: true
            });
            handle.dispatchEvent(mouseDownEvent);

            const sizes = [];
            const steps = 10;

            // Move in small increments
            for (let i = 1; i <= steps; i++) {
                const mouseMoveEvent = new MouseEvent('mousemove', {
                    clientX: startX + (i * 10),
                    clientY: startY + (i * 10),
                    bubbles: true
                });
                document.dispatchEvent(mouseMoveEvent);
                sizes.push(AppState.shapes[0].fontSize);
            }

            // End resize
            const mouseUpEvent = new MouseEvent('mouseup', { bubbles: true });
            document.dispatchEvent(mouseUpEvent);

            return sizes;
        });

        // Font sizes should increase monotonically (no jumps backwards)
        for (let i = 1; i < fontSizes.length; i++) {
            expect(fontSizes[i]).toBeGreaterThanOrEqual(fontSizes[i - 1]);
        }

        // Changes between steps should be relatively smooth (not huge jumps)
        for (let i = 1; i < fontSizes.length; i++) {
            const change = fontSizes[i] - fontSizes[i - 1];
            // No single step should change by more than 50% of previous size
            expect(change).toBeLessThan(fontSizes[i - 1] * 0.5);
        }
    });

    test('resize handle should stay at text corner when text is rotated', async ({ page }) => {
        await goto(page);

        // Create a rotated text shape
        await page.evaluate(() => {
            const shape = {
                id: 'text-1',
                type: 'text',
                x: 1000,
                y: 1000,
                width: 400,
                height: 100,
                rotation: 45, // Rotated 45 degrees
                text: 'Rotated',
                fontSize: 48,
                color: 'black',
                visible: true,
                inherited: false
            };
            AppState.shapes.push(shape);
            AppState.selectedShape = shape.id;
            AppState.currentTool = 'select';
            Shapes.render();
        });

        const positions = await page.evaluate(() => {
            const textElement = document.querySelector('.shape-svg text');
            const textRect = textElement.getBoundingClientRect();
            const handle = document.querySelector('.resize-handle');
            const handleRect = handle.getBoundingClientRect();

            return {
                textBottomRight: {
                    x: textRect.right,
                    y: textRect.bottom
                },
                handleCenter: {
                    x: handleRect.left + handleRect.width / 2,
                    y: handleRect.top + handleRect.height / 2
                },
                rotation: 45
            };
        });

        // Even when rotated, handle should be near the text bottom-right
        const tolerance = 25; // More tolerance for rotated text
        expect(Math.abs(positions.handleCenter.x - positions.textBottomRight.x)).toBeLessThan(tolerance);
        expect(Math.abs(positions.handleCenter.y - positions.textBottomRight.y)).toBeLessThan(tolerance);
    });
});
