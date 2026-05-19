/**
 * Tests for board-canvas placement at different browser zoom levels.
 * Ensures the board stays centered in the board-container when zooming in/out.
 */
import { test, expect } from './test-config.js';
import { goto } from './helpers.js';

test.describe('Board canvas placement at different zoom levels', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
    });

    test('board stays centered in container when zooming in and out', async ({ page }) => {
        // Helper to get board canvas placement relative to container
        const getPlacement = async () => {
            return await page.evaluate(() => {
                const container = document.querySelector('.board-container');
                const canvas = document.getElementById('board-canvas');
                const containerRect = container.getBoundingClientRect();
                const canvasRect = canvas.getBoundingClientRect();

                // Calculate how centered the canvas is
                const leftMargin = canvasRect.left - containerRect.left;
                const rightMargin = containerRect.right - canvasRect.right;
                const topMargin = canvasRect.top - containerRect.top;
                const bottomMargin = containerRect.bottom - canvasRect.bottom;

                // Calculate center offset (should be 0 if perfectly centered)
                const horizontalCenterOffset = leftMargin - rightMargin;
                const verticalCenterOffset = topMargin - bottomMargin;

                return {
                    containerWidth: containerRect.width,
                    containerHeight: containerRect.height,
                    canvasWidth: canvasRect.width,
                    canvasHeight: canvasRect.height,
                    leftMargin,
                    rightMargin,
                    topMargin,
                    bottomMargin,
                    horizontalCenterOffset,
                    verticalCenterOffset,
                    // Canvas position in CSS
                    canvasLeft: parseFloat(canvas.style.left) || 0,
                    canvasTop: parseFloat(canvas.style.top) || 0
                };
            });
        };

        // Get placement at 100% zoom
        const at100 = await getPlacement();
        console.log('Placement at 100% zoom:', at100);

        // Canvas should be centered (offsets near 0)
        expect(Math.abs(at100.horizontalCenterOffset)).toBeLessThan(2);
        expect(Math.abs(at100.verticalCenterOffset)).toBeLessThan(2);

        // Create CDP session for zoom control
        const client = await page.context().newCDPSession(page);

        // Zoom in to 150%
        await client.send('Emulation.setPageScaleFactor', { pageScaleFactor: 1.5 });
        await page.waitForTimeout(300);

        const at150 = await getPlacement();
        console.log('Placement at 150% zoom:', at150);

        // Canvas should still be centered at 150% zoom
        expect(Math.abs(at150.horizontalCenterOffset)).toBeLessThan(2);
        expect(Math.abs(at150.verticalCenterOffset)).toBeLessThan(2);

        // Zoom out to 75%
        await client.send('Emulation.setPageScaleFactor', { pageScaleFactor: 0.75 });
        await page.waitForTimeout(300);

        const at75 = await getPlacement();
        console.log('Placement at 75% zoom:', at75);

        // Canvas should still be centered at 75% zoom
        expect(Math.abs(at75.horizontalCenterOffset)).toBeLessThan(2);
        expect(Math.abs(at75.verticalCenterOffset)).toBeLessThan(2);

        // Zoom to 200%
        await client.send('Emulation.setPageScaleFactor', { pageScaleFactor: 2.0 });
        await page.waitForTimeout(300);

        const at200 = await getPlacement();
        console.log('Placement at 200% zoom:', at200);

        // Canvas should still be centered at 200% zoom
        expect(Math.abs(at200.horizontalCenterOffset)).toBeLessThan(2);
        expect(Math.abs(at200.verticalCenterOffset)).toBeLessThan(2);

        // Reset zoom
        await client.send('Emulation.setPageScaleFactor', { pageScaleFactor: 1.0 });
    });

    test('board stays centered at 90° rotation when zooming', async ({ page }) => {
        // Rotate board to 90°
        await page.click('button[data-tab="settings"]');
        await page.waitForTimeout(200);
        await page.click('#btn-rotate-right');
        await page.waitForTimeout(300);

        const getPlacement = async () => {
            return await page.evaluate(() => {
                const container = document.querySelector('.board-container');
                const canvas = document.getElementById('board-canvas');
                const containerRect = container.getBoundingClientRect();
                const canvasRect = canvas.getBoundingClientRect();

                const leftMargin = canvasRect.left - containerRect.left;
                const rightMargin = containerRect.right - canvasRect.right;
                const topMargin = canvasRect.top - containerRect.top;
                const bottomMargin = containerRect.bottom - canvasRect.bottom;

                const horizontalCenterOffset = leftMargin - rightMargin;
                const verticalCenterOffset = topMargin - bottomMargin;

                return {
                    containerWidth: containerRect.width,
                    containerHeight: containerRect.height,
                    canvasWidth: canvasRect.width,
                    canvasHeight: canvasRect.height,
                    horizontalCenterOffset,
                    verticalCenterOffset,
                    rotation: AppState.boardRotation
                };
            });
        };

        // Check at 100%
        const at100 = await getPlacement();
        console.log('90° rotation at 100% zoom:', at100);
        expect(at100.rotation).toBe(90);
        expect(Math.abs(at100.horizontalCenterOffset)).toBeLessThan(2);
        expect(Math.abs(at100.verticalCenterOffset)).toBeLessThan(2);

        // Create CDP session
        const client = await page.context().newCDPSession(page);

        // Zoom in to 150%
        await client.send('Emulation.setPageScaleFactor', { pageScaleFactor: 1.5 });
        await page.waitForTimeout(300);

        const at150 = await getPlacement();
        console.log('90° rotation at 150% zoom:', at150);
        expect(Math.abs(at150.horizontalCenterOffset)).toBeLessThan(2);
        expect(Math.abs(at150.verticalCenterOffset)).toBeLessThan(2);

        // Zoom out to 75%
        await client.send('Emulation.setPageScaleFactor', { pageScaleFactor: 0.75 });
        await page.waitForTimeout(300);

        const at75 = await getPlacement();
        console.log('90° rotation at 75% zoom:', at75);
        expect(Math.abs(at75.horizontalCenterOffset)).toBeLessThan(2);
        expect(Math.abs(at75.verticalCenterOffset)).toBeLessThan(2);

        // Reset zoom
        await client.send('Emulation.setPageScaleFactor', { pageScaleFactor: 1.0 });
    });
});
