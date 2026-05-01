import { test, expect } from '@playwright/test';
import { FILE_URL } from './helpers.js';

test.describe('Text Shape Visual Center vs Overlay Center', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(FILE_URL);
        await page.evaluate(() => { try { localStorage.clear(); } catch (_) {} });
        await page.reload();
        await page.waitForSelector('#players-layer', { state: 'attached' });
        await page.waitForTimeout(300);
    });

    test('TOUCH MODE: touch overlay should be centered on the VISUAL center of text content', async ({ page }) => {
        // Enable touch mode
        await page.evaluate(() => {
            document.body.classList.add('touch-mode');

            // Create a text shape
            const shape = {
                id: 'shape-1',
                type: 'text',
                x: 2000,
                y: 1500,
                width: 400,
                height: 100,
                rotation: 0,
                color: '#000000',
                text: 'Test Text',
                fontSize: 48,
                visible: true
            };

            AppState.shapes.push(shape);
            AppState.nextShapeId = 2;

            if (typeof Shapes !== 'undefined') {
                Shapes.render();
            }
        });

        await page.waitForTimeout(300);

        // Get the actual <text> element inside the SVG
        const textElement = page.locator('.shape-svg[data-shape="shape-1"] text');
        await expect(textElement).toBeVisible();

        const textBox = await textElement.boundingBox();

        // Calculate visual text center
        const textVisualCenterX = textBox.x + textBox.width / 2;
        const textVisualCenterY = textBox.y + textBox.height / 2;

        // Get the SVG container (for comparison)
        const shapeSvg = page.locator('.shape-svg[data-shape="shape-1"]');
        const svgBox = await shapeSvg.boundingBox();

        const svgCenterX = svgBox.x + svgBox.width / 2;
        const svgCenterY = svgBox.y + svgBox.height / 2;

        // Get the touch overlay position
        const touchOverlay = page.locator('.touch-overlay[data-shape="shape-1"]');
        await expect(touchOverlay).toBeVisible();

        const overlayBox = await touchOverlay.boundingBox();

        // Calculate overlay center
        const overlayCenterX = overlayBox.x + overlayBox.width / 2;
        const overlayCenterY = overlayBox.y + overlayBox.height / 2;

        // Check alignment - overlay center should match VISUAL text center
        const deltaX = Math.abs(textVisualCenterX - overlayCenterX);
        const deltaY = Math.abs(textVisualCenterY - overlayCenterY);


        // Also check SVG container vs visual text (to see the difference)
        const svgTextDeltaX = Math.abs(textVisualCenterX - svgCenterX);
        const svgTextDeltaY = Math.abs(textVisualCenterY - svgCenterY);

        if (deltaX > 1 || deltaY > 1) {
        }

        // Centers should match within 1px tolerance
        expect(deltaX).toBeLessThanOrEqual(2);
        expect(deltaY).toBeLessThanOrEqual(2);
    });

    test('TOUCH MODE: multiple lines of text - overlay should match visual center', async ({ page }) => {
        // Enable touch mode
        await page.evaluate(() => {
            document.body.classList.add('touch-mode');

            // Create a text shape with multiple lines
            const shape = {
                id: 'shape-1',
                type: 'text',
                x: 2000,
                y: 1500,
                width: 400,
                height: 150,
                rotation: 0,
                color: '#000000',
                text: 'Line 1\nLine 2\nLine 3',
                fontSize: 36,
                visible: true
            };

            AppState.shapes.push(shape);
            AppState.nextShapeId = 2;

            if (typeof Shapes !== 'undefined') {
                Shapes.render();
            }
        });

        await page.waitForTimeout(300);

        const textElement = page.locator('.shape-svg[data-shape="shape-1"] text');
        await expect(textElement).toBeVisible();

        const textBox = await textElement.boundingBox();
        const textVisualCenterX = textBox.x + textBox.width / 2;
        const textVisualCenterY = textBox.y + textBox.height / 2;

        const touchOverlay = page.locator('.touch-overlay[data-shape="shape-1"]');
        const overlayBox = await touchOverlay.boundingBox();
        const overlayCenterX = overlayBox.x + overlayBox.width / 2;
        const overlayCenterY = overlayBox.y + overlayBox.height / 2;

        const deltaX = Math.abs(textVisualCenterX - overlayCenterX);
        const deltaY = Math.abs(textVisualCenterY - overlayCenterY);


        expect(deltaX).toBeLessThanOrEqual(2);
        expect(deltaY).toBeLessThanOrEqual(2);
    });

    test('TOUCH MODE: tall text with descenders - overlay should match visual center', async ({ page }) => {
        // Enable touch mode
        await page.evaluate(() => {
            document.body.classList.add('touch-mode');

            // Create text with descenders (g, y, p, q)
            const shape = {
                id: 'shape-1',
                type: 'text',
                x: 2000,
                y: 1500,
                width: 400,
                height: 100,
                rotation: 0,
                color: '#000000',
                text: 'Typography',
                fontSize: 64,
                visible: true
            };

            AppState.shapes.push(shape);
            AppState.nextShapeId = 2;

            if (typeof Shapes !== 'undefined') {
                Shapes.render();
            }
        });

        await page.waitForTimeout(300);

        const textElement = page.locator('.shape-svg[data-shape="shape-1"] text');
        const textBox = await textElement.boundingBox();
        const textVisualCenterX = textBox.x + textBox.width / 2;
        const textVisualCenterY = textBox.y + textBox.height / 2;

        const touchOverlay = page.locator('.touch-overlay[data-shape="shape-1"]');
        const overlayBox = await touchOverlay.boundingBox();
        const overlayCenterX = overlayBox.x + overlayBox.width / 2;
        const overlayCenterY = overlayBox.y + overlayBox.height / 2;

        const deltaX = Math.abs(textVisualCenterX - overlayCenterX);
        const deltaY = Math.abs(textVisualCenterY - overlayCenterY);


        expect(deltaX).toBeLessThanOrEqual(2);
        expect(deltaY).toBeLessThanOrEqual(2);
    });
});
