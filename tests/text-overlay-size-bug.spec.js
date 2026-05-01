import { test, expect } from '@playwright/test';
import { goto } from './helpers.js';

test.describe('Text Overlay Size Bug', () => {
    test('touch overlay should be sized based on actual text bbox, not shape dimensions', async ({ page }) => {
        await goto(page);

        // Enable touch mode and create text shape
        await page.evaluate(() => {
            document.body.classList.add('touch-mode');

            // Create a text shape
            const shape = {
                id: 'text-1',
                type: 'text',
                x: 1000,
                y: 1000,
                width: 400,
                height: 100,
                rotation: 0,
                text: 'Hello World',
                fontSize: 48,
                color: 'black',
                visible: true,
                inherited: false
            };
            AppState.shapes.push(shape);
            Shapes.render();
        });

        // Wait for text to be rendered
        await page.waitForTimeout(500);

        // Get the text element and its overlay
        const textShape = await page.locator('.shape-svg text').first();
        const textOverlay = await page.locator('.touch-overlay[data-shape]').first();

        // Get bounding boxes
        const textBox = await textShape.boundingBox();
        const overlayBox = await textOverlay.boundingBox();

        // The overlay should be larger than the text (with padding)
        // and should fully contain the text
        expect(overlayBox.width).toBeGreaterThan(textBox.width);
        expect(overlayBox.height).toBeGreaterThan(textBox.height);

        // Check that the text is within the overlay bounds with some tolerance
        const textCenterX = textBox.x + textBox.width / 2;
        const textCenterY = textBox.y + textBox.height / 2;
        const overlayCenterX = overlayBox.x + overlayBox.width / 2;
        const overlayCenterY = overlayBox.y + overlayBox.height / 2;

        // Text center should be close to overlay center
        expect(Math.abs(textCenterX - overlayCenterX)).toBeLessThan(5);
        expect(Math.abs(textCenterY - overlayCenterY)).toBeLessThan(10);

        // The overlay should have reasonable padding around the text
        // Minimum 15px horizontal padding on each side
        const minHorizontalPadding = 15;
        expect(overlayBox.width).toBeGreaterThan(textBox.width + 2 * minHorizontalPadding);

        // Minimum 5px vertical padding total
        const minVerticalPadding = 5;
        expect(overlayBox.height).toBeGreaterThan(textBox.height + minVerticalPadding);

        // Test with longer text to ensure it scales properly
        await page.evaluate(() => {
            const shape = AppState.shapes[0];
            shape.text = 'This is a much longer text that should have a larger overlay';
            Shapes.render();
        });

        await page.waitForTimeout(500);

        // Get updated boxes
        const textBox2 = await textShape.boundingBox();
        const overlayBox2 = await textOverlay.boundingBox();

        // The overlay should still be larger than the text
        expect(overlayBox2.width).toBeGreaterThan(textBox2.width);
        expect(overlayBox2.height).toBeGreaterThan(textBox2.height);

        // And should have grown with the text
        expect(overlayBox2.width).toBeGreaterThan(overlayBox.width);
    });

    test('touch overlay should update when text shape is first created', async ({ page }) => {
        await goto(page);

        // Enable touch mode and create text shape
        await page.evaluate(() => {
            document.body.classList.add('touch-mode');

            // Create a text shape with single character
            const shape = {
                id: 'text-1',
                type: 'text',
                x: 1000,
                y: 1000,
                width: 400,
                height: 100,
                rotation: 0,
                text: 'W',
                fontSize: 48,
                color: 'black',
                visible: true,
                inherited: false
            };
            AppState.shapes.push(shape);
            Shapes.render();
        });

        await page.waitForTimeout(500);

        // Get the overlay immediately after creation
        const textOverlay = await page.locator('.touch-overlay[data-shape]').first();
        const overlayBox = await textOverlay.boundingBox();

        // The overlay should NOT be using the default shape width (400cm)
        // Instead it should be sized to the actual text
        // With default scale, 400cm would be very wide
        // A single "W" character should have an overlay much smaller than that

        // Check that overlay is reasonably sized (not the full 400px width)
        // Since "W" is one character, overlay should be under 150px width with padding
        expect(overlayBox.width).toBeLessThan(150);

        // But should still have some padding
        expect(overlayBox.width).toBeGreaterThan(20);
    });
});
