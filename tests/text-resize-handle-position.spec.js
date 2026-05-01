import { test, expect } from '@playwright/test';
import { goto } from './helpers.js';

test.describe('Text Resize Handle Position', () => {
    test('resize handle should stay at right-center of text during resize', async ({ page }) => {
        await goto(page);

        // Create a text shape and select it
        const initialData = await page.evaluate(() => {
            const shape = {
                id: 'text-1',
                type: 'text',
                x: 1000,
                y: 1000,
                width: 400,
                height: 100,
                rotation: 0,
                text: 'Test',
                fontSize: 48,
                color: 'black',
                visible: true,
                inherited: false
            };
            AppState.shapes.push(shape);
            AppState.selectedShape = shape.id;
            AppState.currentTool = 'select';
            Shapes.render();

            // Get initial text bounding box and handle position
            const textElement = document.querySelector('.shape-svg text');
            const textRect = textElement.getBoundingClientRect();
            const handle = document.querySelector('.resize-handle');
            const handleRect = handle.getBoundingClientRect();

            return {
                textBottomRight: {
                    x: textRect.right,
                    y: textRect.top + textRect.height / 2  // Right-center, not bottom-right
                },
                handleCenter: {
                    x: handleRect.left + handleRect.width / 2,
                    y: handleRect.top + handleRect.height / 2
                },
                fontSize: shape.fontSize
            };
        });

        // Handle should be at or near the right-center of the text
        // Increased tolerance to 30px to account for font baseline variations
        const tolerance = 30; // pixels
        expect(Math.abs(initialData.handleCenter.x - initialData.textBottomRight.x)).toBeLessThan(tolerance);
        expect(Math.abs(initialData.handleCenter.y - initialData.textBottomRight.y)).toBeLessThan(tolerance);

        // Simulate resizing by dragging the handle
        await page.evaluate(() => {
            const handle = document.querySelector('.resize-handle');
            const handleRect = handle.getBoundingClientRect();

            // Start resize
            const mouseDownEvent = new MouseEvent('mousedown', {
                clientX: handleRect.left + handleRect.width / 2,
                clientY: handleRect.top + handleRect.height / 2,
                bubbles: true
            });
            handle.dispatchEvent(mouseDownEvent);

            // Move mouse to increase size (move right and down)
            const mouseMoveEvent = new MouseEvent('mousemove', {
                clientX: handleRect.left + handleRect.width / 2 + 100,
                clientY: handleRect.top + handleRect.height / 2 + 50,
                bubbles: true
            });
            document.dispatchEvent(mouseMoveEvent);
        });

        await page.waitForTimeout(100);

        // Check handle position after resize
        const afterResizeData = await page.evaluate(() => {
            const textElement = document.querySelector('.shape-svg text');
            const textRect = textElement.getBoundingClientRect();
            const handle = document.querySelector('.resize-handle');
            const handleRect = handle.getBoundingClientRect();

            return {
                textBottomRight: {
                    x: textRect.right,
                    y: textRect.top + textRect.height / 2  // Right-center, not bottom-right
                },
                handleCenter: {
                    x: handleRect.left + handleRect.width / 2,
                    y: handleRect.top + handleRect.height / 2
                },
                fontSize: AppState.shapes[0].fontSize
            };
        });

        // After resize, handle should still be at right-center of text
        expect(Math.abs(afterResizeData.handleCenter.x - afterResizeData.textBottomRight.x)).toBeLessThan(tolerance);
        expect(Math.abs(afterResizeData.handleCenter.y - afterResizeData.textBottomRight.y)).toBeLessThan(tolerance);

        // Font size should have increased
        expect(afterResizeData.fontSize).toBeGreaterThan(initialData.fontSize);

        // End resize
        await page.evaluate(() => {
            const mouseUpEvent = new MouseEvent('mouseup', {
                bubbles: true
            });
            document.dispatchEvent(mouseUpEvent);
        });
    });

    test('handle should update position when text content changes', async ({ page }) => {
        await goto(page);

        // Create a text shape
        await page.evaluate(() => {
            const shape = {
                id: 'text-1',
                type: 'text',
                x: 1000,
                y: 1000,
                width: 400,
                height: 100,
                rotation: 0,
                text: 'Short',
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

        const shortTextData = await page.evaluate(() => {
            const textElement = document.querySelector('.shape-svg text');
            const textRect = textElement.getBoundingClientRect();
            const handle = document.querySelector('.resize-handle');
            const handleRect = handle.getBoundingClientRect();

            return {
                textWidth: textRect.width,
                textBottomRight: {
                    x: textRect.right,
                    y: textRect.top + textRect.height / 2  // Right-center, not bottom-right
                },
                handleCenter: {
                    x: handleRect.left + handleRect.width / 2,
                    y: handleRect.top + handleRect.height / 2
                }
            };
        });

        // Change text to be much longer
        await page.evaluate(() => {
            AppState.shapes[0].text = 'This is a much longer text string';
            Shapes.render();
        });

        const longTextData = await page.evaluate(() => {
            const textElement = document.querySelector('.shape-svg text');
            const textRect = textElement.getBoundingClientRect();
            const handle = document.querySelector('.resize-handle');
            const handleRect = handle.getBoundingClientRect();

            return {
                textWidth: textRect.width,
                textBottomRight: {
                    x: textRect.right,
                    y: textRect.top + textRect.height / 2  // Right-center, not bottom-right
                },
                handleCenter: {
                    x: handleRect.left + handleRect.width / 2,
                    y: handleRect.top + handleRect.height / 2
                }
            };
        });

        // Text should be wider
        expect(longTextData.textWidth).toBeGreaterThan(shortTextData.textWidth);

        // Handle should have moved to the right (following the text)
        expect(longTextData.handleCenter.x).toBeGreaterThan(shortTextData.handleCenter.x);

        // Handle should still be at right-center of the new text
        const tolerance = 30; // Increased to account for font baseline variations
        expect(Math.abs(longTextData.handleCenter.x - longTextData.textBottomRight.x)).toBeLessThan(tolerance);
        expect(Math.abs(longTextData.handleCenter.y - longTextData.textBottomRight.y)).toBeLessThan(tolerance);
    });
});
