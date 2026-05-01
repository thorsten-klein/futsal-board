/**
 * Test that text resize handle is positioned on the right side, vertically centered
 */
import { test, expect } from './test-config.js';
import { goto } from './helpers.js';

test.describe('Text Resize Handle Position', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
    });

    test('text resize handle is on right side, vertically centered', async ({ page }) => {
        // Add text
        await page.locator('.draw-btn[data-draw="text"]').click();
        await page.waitForTimeout(200);

        // Fill in text
        await page.locator('#text-modal input[type="text"]').fill('Test');
        await page.locator('#btn-text-modal-ok').click();
        await page.waitForTimeout(200);

        // Get shape ID
        const shapeId = await page.evaluate(() => AppState.shapes[AppState.shapes.length - 1].id);

        // Select the text
        await page.locator(`[data-shape="${shapeId}"]`).click();
        await page.waitForTimeout(100);

        // Get text bounding rect and expected handle position
        const expected = await page.evaluate(() => {
            const shape = AppState.shapes.find(s => s.id === AppState.selectedShape);
            const svg = document.getElementById(shape.id);
            const textElement = svg.querySelector('text');
            const textRect = textElement.getBoundingClientRect();

            return {
                x: textRect.right,
                y: (textRect.top + textRect.bottom) / 2
            };
        });

        // Get actual handle position
        const handle = page.locator('.resize-handle').first();
        await expect(handle).toBeVisible();

        const handleBox = await handle.boundingBox();
        const actual = {
            x: handleBox.x + handleBox.width / 2,
            y: handleBox.y + handleBox.height / 2
        };

        // Verify handle is positioned correctly (within 5px tolerance)
        expect(Math.abs(actual.x - expected.x)).toBeLessThan(5);
        expect(Math.abs(actual.y - expected.y)).toBeLessThan(5);
    });

    test('text resize handle moves with text rotation', async ({ page }) => {
        // Add text
        await page.locator('.draw-btn[data-draw="text"]').click();
        await page.waitForTimeout(200);

        await page.locator('#text-modal input[type="text"]').fill('Rotated');
        await page.locator('#btn-text-modal-ok').click();
        await page.waitForTimeout(200);

        // Get shape ID
        const shapeId = await page.evaluate(() => AppState.shapes[AppState.shapes.length - 1].id);

        // Select and rotate the text
        await page.locator(`[data-shape="${shapeId}"]`).click();
        await page.waitForTimeout(100);

        await page.evaluate(() => {
            const shape = AppState.shapes.find(s => s.id === AppState.selectedShape);
            shape.rotation = 45;
            Shapes.render();
            Shapes.updateHandles();
        });
        await page.waitForTimeout(200);

        // Get expected handle position (accounting for rotation)
        const expected = await page.evaluate(() => {
            const shape = AppState.shapes.find(s => s.id === AppState.selectedShape);
            const canvasRect = AppState.canvas.getBoundingClientRect();
            const scaleX = canvasRect.width / AppState.boardWidth;
            const scaleY = canvasRect.height / AppState.boardHeight;

            const svg = document.getElementById(shape.id);
            const textElement = svg.querySelector('text');
            const bbox = textElement.getBBox();

            // Get SVG viewBox dimensions
            const svgViewBox = svg.getAttribute('viewBox').split(' ');
            const svgViewBoxWidth = parseFloat(svgViewBox[2]);
            const svgViewBoxHeight = parseFloat(svgViewBox[3]);

            // Scale factor from viewBox to canvas
            const width = shape.width * scaleX;
            const height = shape.height * scaleY;
            const svgScaleX = width / svgViewBoxWidth;
            const svgScaleY = height / svgViewBoxHeight;

            // Right-center point in SVG coordinates
            const svgRightX = bbox.x + bbox.width;
            const svgCenterY = bbox.y + bbox.height / 2;

            // Center of SVG in viewBox coords
            const svgCenterInViewBoxX = svgViewBoxWidth / 2;
            const svgCenterInViewBoxY = svgViewBoxHeight / 2;

            // Offset from SVG center to right-center point (in viewBox coords)
            const offsetInViewBoxX = svgRightX - svgCenterInViewBoxX;
            const offsetInViewBoxY = svgCenterY - svgCenterInViewBoxY;

            // Convert to canvas pixels
            const offsetX = offsetInViewBoxX * svgScaleX;
            const offsetY = offsetInViewBoxY * svgScaleY;

            // Rotate the offset by the shape's rotation
            const rotation = (shape.rotation || 0) * Math.PI / 180;
            const cos = Math.cos(rotation);
            const sin = Math.sin(rotation);

            const rotatedOffsetX = offsetX * cos - offsetY * sin;
            const rotatedOffsetY = offsetX * sin + offsetY * cos;

            // Shape center in screen coordinates
            const shapeCenterX = canvasRect.left + shape.x * scaleX;
            const shapeCenterY = canvasRect.top + shape.y * scaleY;

            return {
                x: shapeCenterX + rotatedOffsetX,
                y: shapeCenterY + rotatedOffsetY
            };
        });

        // Get actual handle position
        const handle = page.locator('.resize-handle').first();
        const handleBox = await handle.boundingBox();
        const actual = {
            x: handleBox.x + handleBox.width / 2,
            y: handleBox.y + handleBox.height / 2
        };

        // Verify handle is still positioned correctly after rotation
        expect(Math.abs(actual.x - expected.x)).toBeLessThan(5);
        expect(Math.abs(actual.y - expected.y)).toBeLessThan(5);
    });

});
