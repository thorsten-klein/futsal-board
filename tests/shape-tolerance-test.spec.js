/**
 * Test that all shape types (rectangle, circle, ellipse) have proper
 * tolerance in touch mode for easier clicking.
 */
import { test, expect } from '@playwright/test';
import { goto } from './helpers.js';

test.describe('Shape touch tolerance', () => {
    test.beforeEach(async ({ page }) => {
        await page.setViewportSize({ width: 1600, height: 900 });
        await goto(page);
        await page.evaluate(() => {
            AppState.currentTool = 'select';
            document.body.classList.add('touch-mode');
        });
    });

    test('TOUCH MODE: rectangle should have tolerance padding on touch overlay', async ({ page }) => {
        // Create a rectangle
        await page.evaluate(() => {
            const shape = {
                id: 'test-rect',
                type: 'rectangle',
                x: 1000,
                y: 1000,
                width: 200,
                height: 150,
                rotation: 0,
                color: '#ff6b35',
                fillColor: 'transparent',
                strokeWidth: 3,
                visible: true,
                inherited: false
            };
            AppState.shapes.push(shape);
            Shapes.render();
        });

        await page.waitForTimeout(300);

        // Get dimensions
        const dims = await page.evaluate(() => {
            const shape = AppState.shapes.find(s => s.id === 'test-rect');
            const overlay = document.querySelector('.touch-overlay[data-shape="test-rect"]');
            const svgShape = document.querySelector('[data-shape="test-rect"]');

            return {
                shape: { width: shape.width, height: shape.height },
                overlay: {
                    width: parseFloat(overlay.style.width),
                    height: parseFloat(overlay.style.height)
                },
                svgBBox: {
                    width: svgShape.getBoundingClientRect().width,
                    height: svgShape.getBoundingClientRect().height
                }
            };
        });

        // Overlay should be larger than the visual shape (tolerance padding)
        // The tolerance is 8px plus the effect of SVG margins (5px on each side)
        expect(dims.overlay.width).toBeGreaterThan(dims.svgBBox.width);
        expect(dims.overlay.height).toBeGreaterThan(dims.svgBBox.height);

        // Verify there's significant tolerance for easier clicking
        const toleranceX = dims.overlay.width - dims.svgBBox.width;
        const toleranceY = dims.overlay.height - dims.svgBBox.height;
        expect(toleranceX).toBeGreaterThan(20); // At least 20px total tolerance
        expect(toleranceY).toBeGreaterThan(20);
    });

    test('TOUCH MODE: ellipse should have tolerance padding on touch overlay', async ({ page }) => {
        // Create an ellipse
        await page.evaluate(() => {
            const shape = {
                id: 'test-ellipse',
                type: 'ellipse',
                x: 1000,
                y: 1000,
                width: 200,
                height: 150,
                rotation: 0,
                color: '#4ecdc4',
                fillColor: 'transparent',
                strokeWidth: 3,
                visible: true,
                inherited: false
            };
            AppState.shapes.push(shape);
            Shapes.render();
        });

        await page.waitForTimeout(300);

        // Get dimensions
        const dims = await page.evaluate(() => {
            const shape = AppState.shapes.find(s => s.id === 'test-ellipse');
            const overlay = document.querySelector('.touch-overlay[data-shape="test-ellipse"]');
            const svgShape = document.querySelector('[data-shape="test-ellipse"]');

            return {
                shape: { width: shape.width, height: shape.height },
                overlay: {
                    width: parseFloat(overlay.style.width),
                    height: parseFloat(overlay.style.height)
                },
                svgBBox: {
                    width: svgShape.getBoundingClientRect().width,
                    height: svgShape.getBoundingClientRect().height
                }
            };
        });

        // Overlay should be larger than the visual shape (tolerance padding)
        // The tolerance is 8px plus the effect of SVG margins (5px on each side)
        expect(dims.overlay.width).toBeGreaterThan(dims.svgBBox.width);
        expect(dims.overlay.height).toBeGreaterThan(dims.svgBBox.height);

        // Verify there's significant tolerance for easier clicking
        const toleranceX = dims.overlay.width - dims.svgBBox.width;
        const toleranceY = dims.overlay.height - dims.svgBBox.height;
        expect(toleranceX).toBeGreaterThan(20); // At least 20px total tolerance
        expect(toleranceY).toBeGreaterThan(20);
    });

    test('TOUCH MODE: circle should have tolerance padding on touch overlay', async ({ page }) => {
        // Create a circle (width === height)
        await page.evaluate(() => {
            const shape = {
                id: 'test-circle',
                type: 'circle',
                x: 1000,
                y: 1000,
                width: 200,
                height: 200,
                rotation: 0,
                color: '#f7b731',
                fillColor: 'transparent',
                strokeWidth: 3,
                visible: true,
                inherited: false
            };
            AppState.shapes.push(shape);
            Shapes.render();
        });

        await page.waitForTimeout(300);

        // Get dimensions
        const dims = await page.evaluate(() => {
            const shape = AppState.shapes.find(s => s.id === 'test-circle');
            const overlay = document.querySelector('.touch-overlay[data-shape="test-circle"]');
            const svgShape = document.querySelector('[data-shape="test-circle"]');

            return {
                shape: { width: shape.width, height: shape.height },
                overlay: {
                    width: parseFloat(overlay.style.width),
                    height: parseFloat(overlay.style.height)
                },
                svgBBox: {
                    width: svgShape.getBoundingClientRect().width,
                    height: svgShape.getBoundingClientRect().height
                }
            };
        });

        // Overlay should be larger than the visual shape (tolerance padding)
        // The tolerance is 8px plus the effect of SVG margins (5px on each side)
        expect(dims.overlay.width).toBeGreaterThan(dims.svgBBox.width);
        expect(dims.overlay.height).toBeGreaterThan(dims.svgBBox.height);

        // Verify there's significant tolerance for easier clicking
        const toleranceX = dims.overlay.width - dims.svgBBox.width;
        const toleranceY = dims.overlay.height - dims.svgBBox.height;
        expect(toleranceX).toBeGreaterThan(20); // At least 20px total tolerance
        expect(toleranceY).toBeGreaterThan(20);
    });

    test('TOUCH MODE: clicking near rectangle edge (in tolerance zone) should select it', async ({ page }) => {
        // Create a rectangle at a known position
        await page.evaluate(() => {
            const shape = {
                id: 'test-rect-click',
                type: 'rectangle',
                x: 800,
                y: 600,
                width: 200,
                height: 100,
                rotation: 0,
                color: '#ff6b35',
                fillColor: 'transparent',
                strokeWidth: 3,
                visible: true,
                inherited: false
            };
            AppState.shapes.push(shape);
            Shapes.render();
        });

        await page.waitForTimeout(300);

        // Get the overlay position and size
        const overlayBox = await page.locator('.touch-overlay[data-shape="test-rect-click"]').boundingBox();

        // Click just outside the visual shape but inside the tolerance zone
        // (at the edge of the overlay, which is ~4px beyond the visual shape)
        const clickX = overlayBox.x + 2; // 2px from left edge of overlay
        const clickY = overlayBox.y + overlayBox.height / 2; // Middle vertically

        await page.mouse.click(clickX, clickY);
        await page.waitForTimeout(100);

        // Shape should be selected
        const isSelected = await page.evaluate(() => {
            return AppState.selectedShape === 'test-rect-click';
        });

        expect(isSelected).toBe(true);
    });

    test('TOUCH MODE: clicking near ellipse edge (in tolerance zone) should select it', async ({ page }) => {
        // Create an ellipse at a known position
        await page.evaluate(() => {
            const shape = {
                id: 'test-ellipse-click',
                type: 'ellipse',
                x: 800,
                y: 600,
                width: 200,
                height: 150,
                rotation: 0,
                color: '#4ecdc4',
                fillColor: 'transparent',
                strokeWidth: 3,
                visible: true,
                inherited: false
            };
            AppState.shapes.push(shape);
            Shapes.render();
        });

        await page.waitForTimeout(300);

        // Get the overlay position and size
        const overlayBox = await page.locator('.touch-overlay[data-shape="test-ellipse-click"]').boundingBox();

        // Click just outside the visual shape but inside the tolerance zone
        const clickX = overlayBox.x + 2; // 2px from left edge of overlay
        const clickY = overlayBox.y + overlayBox.height / 2; // Middle vertically

        await page.mouse.click(clickX, clickY);
        await page.waitForTimeout(100);

        // Shape should be selected
        const isSelected = await page.evaluate(() => {
            return AppState.selectedShape === 'test-ellipse-click';
        });

        expect(isSelected).toBe(true);
    });
});
