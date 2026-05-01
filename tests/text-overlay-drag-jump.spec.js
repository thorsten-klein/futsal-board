import { test, expect } from '@playwright/test';
import { FILE_URL } from './helpers.js';

test.describe('Text Overlay Drag Jump Bug', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(FILE_URL);
        await page.evaluate(() => { try { localStorage.clear(); } catch (_) {} });
        await page.reload();
        await page.waitForSelector('#board-area', { state: 'attached' });
        await page.waitForTimeout(300);

        // Enable select tool and touch mode
        await page.evaluate(() => {
            AppState.currentTool = 'select';
            document.body.classList.add('touch-mode');
        });
    });

    test('TOUCH MODE: text overlay should not jump when dragging starts', async ({ page }) => {
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
                text: 'Test Text',
                fontSize: 48,
                color: 'black',
                visible: true,
                inherited: false
            };
            AppState.shapes.push(shape);
            Shapes.render();
        });

        await page.waitForTimeout(300);

        // Get initial overlay position
        const overlay = page.locator('.touch-overlay[data-shape="text-1"]').first();
        await expect(overlay).toBeVisible();

        const initialOverlayBox = await overlay.boundingBox();
        const initialOverlayCenterX = initialOverlayBox.x + initialOverlayBox.width / 2;
        const initialOverlayCenterY = initialOverlayBox.y + initialOverlayBox.height / 2;


        // Click on the overlay to select
        await page.mouse.click(initialOverlayCenterX, initialOverlayCenterY);
        await page.waitForTimeout(100);

        // Get overlay position after selection (before drag)
        const afterSelectOverlayBox = await overlay.boundingBox();
        const afterSelectOverlayCenterX = afterSelectOverlayBox.x + afterSelectOverlayBox.width / 2;
        const afterSelectOverlayCenterY = afterSelectOverlayBox.y + afterSelectOverlayBox.height / 2;


        // The overlay should not have moved after selection
        const jumpOnSelect = Math.sqrt(
            Math.pow(afterSelectOverlayCenterX - initialOverlayCenterX, 2) +
            Math.pow(afterSelectOverlayCenterY - initialOverlayCenterY, 2)
        );

        expect(jumpOnSelect).toBeLessThan(5); // Should be very small (< 5px)

        // Start dragging
        await page.mouse.move(afterSelectOverlayCenterX, afterSelectOverlayCenterY);
        await page.mouse.down();
        await page.waitForTimeout(50);

        // Get overlay position right after mousedown (drag starts)
        const afterMouseDownOverlayBox = await overlay.boundingBox();
        const afterMouseDownOverlayCenterX = afterMouseDownOverlayBox.x + afterMouseDownOverlayBox.width / 2;
        const afterMouseDownOverlayCenterY = afterMouseDownOverlayBox.y + afterMouseDownOverlayBox.height / 2;


        // The overlay should not jump when drag starts
        const jumpOnDragStart = Math.sqrt(
            Math.pow(afterMouseDownOverlayCenterX - afterSelectOverlayCenterX, 2) +
            Math.pow(afterMouseDownOverlayCenterY - afterSelectOverlayCenterY, 2)
        );

        expect(jumpOnDragStart).toBeLessThan(5); // Should be very small (< 5px)

        // Move slightly
        await page.mouse.move(afterSelectOverlayCenterX + 10, afterSelectOverlayCenterY + 10, { steps: 2 });
        await page.waitForTimeout(50);

        // Get overlay position after small movement
        const afterMoveOverlayBox = await overlay.boundingBox();
        const afterMoveCenterX = afterMoveOverlayBox.x + afterMoveOverlayBox.width / 2;
        const afterMoveCenterY = afterMoveOverlayBox.y + afterMoveOverlayBox.height / 2;


        // The overlay should have moved approximately 10px in each direction
        const deltaX = afterMoveCenterX - afterMouseDownOverlayCenterX;
        const deltaY = afterMoveCenterY - afterMouseDownOverlayCenterY;


        // Should move about 10px in each direction (with some tolerance)
        expect(Math.abs(deltaX - 10)).toBeLessThan(3);
        expect(Math.abs(deltaY - 10)).toBeLessThan(3);

        await page.mouse.up();
    });

    test('TOUCH MODE: text overlay is properly centered (no offset needed)', async ({ page }) => {
        const result = await page.evaluate(() => {
            const shape = {
                id: 'text-2',
                type: 'text',
                x: 1500,
                y: 800,
                width: 400,
                height: 100,
                rotation: 0,
                text: 'Centered Text',
                fontSize: 48,
                color: 'black',
                visible: true,
                inherited: false
            };
            AppState.shapes.push(shape);
            Shapes.render();

            const overlay = document.querySelector('.touch-overlay[data-shape="text-2"]');
            const svg = document.querySelector('.shape-svg[data-shape="text-2"]');
            const textElement = svg ? svg.querySelector('text') : null;

            if (!overlay || !textElement) {
                return { overlayExists: false };
            }

            const overlayRect = overlay.getBoundingClientRect();
            const textRect = textElement.getBoundingClientRect();
            const svgRect = svg.getBoundingClientRect();

            return {
                overlayExists: true,
                overlayCenterY: overlayRect.y + overlayRect.height / 2,
                textCenterY: textRect.y + textRect.height / 2,
                svgCenterY: svgRect.y + svgRect.height / 2
            };
        });


        // Overlay should exist and be centered on SVG center
        expect(result.overlayExists).toBe(true);
        // Overlay center should match SVG center (text is centered in SVG with dominant-baseline="central")
        const deltaY = Math.abs(result.overlayCenterY - result.svgCenterY);
        expect(deltaY).toBeLessThan(1);
    });
});
