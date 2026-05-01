import { test, expect } from '@playwright/test';
import { FILE_URL } from './helpers.js';

test.describe('Text Centering During Rotation', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(FILE_URL);
        await page.evaluate(() => { try { localStorage.clear(); } catch (_) {} });
        await page.reload();
        await page.waitForSelector('#players-layer', { state: 'attached' });
        await page.waitForTimeout(300);
    });

    test('TOUCH MODE: text should remain centered in overlay during rotation', async ({ page }) => {
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

        // Get initial alignment
        const textElement = page.locator('.shape-svg[data-shape="shape-1"] text');
        const touchOverlay = page.locator('.touch-overlay[data-shape="shape-1"]');

        await expect(textElement).toBeVisible();
        await expect(touchOverlay).toBeVisible();

        const initialTextBox = await textElement.boundingBox();
        const initialOverlayBox = await touchOverlay.boundingBox();

        const initialTextCenterX = initialTextBox.x + initialTextBox.width / 2;
        const initialTextCenterY = initialTextBox.y + initialTextBox.height / 2;
        const initialOverlayCenterX = initialOverlayBox.x + initialOverlayBox.width / 2;
        const initialOverlayCenterY = initialOverlayBox.y + initialOverlayBox.height / 2;

        const initialDeltaX = Math.abs(initialTextCenterX - initialOverlayCenterX);
        const initialDeltaY = Math.abs(initialTextCenterY - initialOverlayCenterY);


        // Now rotate the shape to 45 degrees
        await page.evaluate(() => {
            const shape = AppState.shapes.find(s => s.id === 'shape-1');
            if (shape) {
                shape.rotation = 45;
            }
            if (typeof Shapes !== 'undefined') {
                Shapes.render();
            }
        });

        await page.waitForTimeout(300);

        const rotatedTextBox = await textElement.boundingBox();
        const rotatedOverlayBox = await touchOverlay.boundingBox();

        const rotatedTextCenterX = rotatedTextBox.x + rotatedTextBox.width / 2;
        const rotatedTextCenterY = rotatedTextBox.y + rotatedTextBox.height / 2;
        const rotatedOverlayCenterX = rotatedOverlayBox.x + rotatedOverlayBox.width / 2;
        const rotatedOverlayCenterY = rotatedOverlayBox.y + rotatedOverlayBox.height / 2;

        const rotatedDeltaX = Math.abs(rotatedTextCenterX - rotatedOverlayCenterX);
        const rotatedDeltaY = Math.abs(rotatedTextCenterY - rotatedOverlayCenterY);


        // The text should remain centered in the overlay after rotation
        // Check if the delta increased significantly (more than 5px difference)
        const deltaChange = Math.sqrt(
            Math.pow(rotatedDeltaX - initialDeltaX, 2) +
            Math.pow(rotatedDeltaY - initialDeltaY, 2)
        );


        if (deltaChange > 5) {
        }

        // Text should stay centered - deltas should be similar before and after rotation
        expect(rotatedDeltaX).toBeLessThanOrEqual(initialDeltaX + 2);
        expect(rotatedDeltaY).toBeLessThanOrEqual(initialDeltaY + 2);
    });

    test('TOUCH MODE: text should remain centered at 90 degree rotation', async ({ page }) => {
        // Enable touch mode
        await page.evaluate(() => {
            document.body.classList.add('touch-mode');

            const shape = {
                id: 'shape-1',
                type: 'text',
                x: 2000,
                y: 1500,
                width: 400,
                height: 100,
                rotation: 0,
                color: '#000000',
                text: 'Test',
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

        const textElement = page.locator('.shape-svg[data-shape="shape-1"] text');
        const touchOverlay = page.locator('.touch-overlay[data-shape="shape-1"]');

        const initialTextBox = await textElement.boundingBox();
        const initialOverlayBox = await touchOverlay.boundingBox();

        const initialDeltaX = Math.abs((initialTextBox.x + initialTextBox.width / 2) - (initialOverlayBox.x + initialOverlayBox.width / 2));
        const initialDeltaY = Math.abs((initialTextBox.y + initialTextBox.height / 2) - (initialOverlayBox.y + initialOverlayBox.height / 2));

        // Rotate to 90 degrees
        await page.evaluate(() => {
            const shape = AppState.shapes.find(s => s.id === 'shape-1');
            if (shape) {
                shape.rotation = 90;
            }
            if (typeof Shapes !== 'undefined') {
                Shapes.render();
            }
        });

        await page.waitForTimeout(300);

        const rotatedTextBox = await textElement.boundingBox();
        const rotatedOverlayBox = await touchOverlay.boundingBox();

        const rotatedTextCenterX = rotatedTextBox.x + rotatedTextBox.width / 2;
        const rotatedTextCenterY = rotatedTextBox.y + rotatedTextBox.height / 2;
        const rotatedOverlayCenterX = rotatedOverlayBox.x + rotatedOverlayBox.width / 2;
        const rotatedOverlayCenterY = rotatedOverlayBox.y + rotatedOverlayBox.height / 2;

        const rotatedDeltaX = Math.abs(rotatedTextCenterX - rotatedOverlayCenterX);
        const rotatedDeltaY = Math.abs(rotatedTextCenterY - rotatedOverlayCenterY);


        // Text should stay centered
        expect(rotatedDeltaX).toBeLessThanOrEqual(initialDeltaX + 2);
        expect(rotatedDeltaY).toBeLessThanOrEqual(initialDeltaY + 2);
    });

    test('TOUCH MODE: overlay rotation point should match text rotation point', async ({ page }) => {
        // Enable touch mode
        await page.evaluate(() => {
            document.body.classList.add('touch-mode');

            const shape = {
                id: 'shape-1',
                type: 'text',
                x: 2000,
                y: 1500,
                width: 400,
                height: 100,
                rotation: 0,
                color: '#000000',
                text: 'Rotation Test',
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

        // Get the SVG's transform origin (rotation point)
        const svgTransformOrigin = await page.evaluate(() => {
            const svg = document.querySelector('.shape-svg[data-shape="shape-1"]');
            const svgBox = svg.getBoundingClientRect();
            const canvasBox = document.getElementById('board-area').getBoundingClientRect();

            return {
                x: svgBox.x - canvasBox.x + svgBox.width / 2,
                y: svgBox.y - canvasBox.y + svgBox.height / 2
            };
        });

        // Get the overlay's transform origin (rotation point)
        const overlayTransformOrigin = await page.evaluate(() => {
            const overlay = document.querySelector('.touch-overlay[data-shape="shape-1"]');
            const overlayBox = overlay.getBoundingClientRect();
            const canvasBox = document.getElementById('board-area').getBoundingClientRect();

            // The overlay rotates around its center
            return {
                x: overlayBox.x - canvasBox.x + overlayBox.width / 2,
                y: overlayBox.y - canvasBox.y + overlayBox.height / 2
            };
        });


        const deltaX = Math.abs(svgTransformOrigin.x - overlayTransformOrigin.x);
        const deltaY = Math.abs(svgTransformOrigin.y - overlayTransformOrigin.y);


        // The rotation points should match
        expect(deltaX).toBeLessThanOrEqual(2);
        expect(deltaY).toBeLessThanOrEqual(2);
    });
});

