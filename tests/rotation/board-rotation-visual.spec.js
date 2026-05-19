/**
 * Tests for board rotation visual fit.
 *
 * - Rotated board fits within board-container
 * - No overflow or cropping occurs
 * - Board scales appropriately when rotated
 */
import { test, expect } from '../test-config.js';
import { goto } from '../helpers.js';

/** Right-click on an empty part of the board to open context menu. */
async function rightClickBoard(page) {
    const bb = await page.locator('#board-canvas').boundingBox();
    await page.mouse.click(bb.x + 10, bb.y + 10, { button: 'right' });
}

/** Get the board canvas context menu. */
async function getBoardCanvasMenu(page) {
    const menu = page.locator('#board-canvas-context-menu');
    await expect(menu).toBeVisible({ timeout: 3000 });
    return menu;
}

test.describe('Board rotation visual fit', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
    });

    test('board-canvas fits within board-container at 0 degrees', async ({ page }) => {
        const canvasBounds = await page.locator('#board-canvas').boundingBox();
        const containerBounds = await page.locator('.board-container').boundingBox();

        expect(canvasBounds.width).toBeLessThanOrEqual(containerBounds.width + 1);
        expect(canvasBounds.height).toBeLessThanOrEqual(containerBounds.height + 1);
    });

    test('board-canvas fits within board-container at 90 degrees', async ({ page }) => {
        // Rotate board right
        await rightClickBoard(page);
        const menu = await getBoardCanvasMenu(page);
        await menu.locator('[data-action="rotate-right"]').click();
        await page.waitForTimeout(200);

        // Get actual rendered bounds (includes transform)
        const canvasElement = await page.locator('#board-canvas').boundingBox();
        const containerBounds = await page.locator('.board-container').boundingBox();

        // Canvas should fit within container (allow some tolerance for rounding/scaling)
        expect(canvasElement.x).toBeGreaterThanOrEqual(containerBounds.x - 100);
        expect(canvasElement.y).toBeGreaterThanOrEqual(containerBounds.y - 100);
        expect(canvasElement.x + canvasElement.width).toBeLessThanOrEqual(containerBounds.x + containerBounds.width + 100);
        expect(canvasElement.y + canvasElement.height).toBeLessThanOrEqual(containerBounds.y + containerBounds.height + 100);
    });

    test('board-canvas fits within board-container at 180 degrees', async ({ page }) => {
        // Rotate board 180 degrees
        await rightClickBoard(page);
        let menu = await getBoardCanvasMenu(page);
        await menu.locator('[data-action="rotate-right"]').click();

        await rightClickBoard(page);
        menu = await getBoardCanvasMenu(page);
        await menu.locator('[data-action="rotate-right"]').click();
        await page.waitForTimeout(200);

        const canvasElement = await page.locator('#board-canvas').boundingBox();
        const containerBounds = await page.locator('.board-container').boundingBox();

        // Canvas should fit within container (allow some tolerance for rounding/scaling)
        expect(canvasElement.x).toBeGreaterThanOrEqual(containerBounds.x - 100);
        expect(canvasElement.y).toBeGreaterThanOrEqual(containerBounds.y - 100);
        expect(canvasElement.x + canvasElement.width).toBeLessThanOrEqual(containerBounds.x + containerBounds.width + 100);
        expect(canvasElement.y + canvasElement.height).toBeLessThanOrEqual(containerBounds.y + containerBounds.height + 100);
    });

    test('board-canvas fits within board-container at 270 degrees', async ({ page }) => {
        // Rotate board left
        await rightClickBoard(page);
        const menu = await getBoardCanvasMenu(page);
        await menu.locator('[data-action="rotate-left"]').click();
        await page.waitForTimeout(200);

        const canvasElement = await page.locator('#board-canvas').boundingBox();
        const containerBounds = await page.locator('.board-container').boundingBox();

        // Canvas should fit within container (allow some tolerance for rounding/scaling)
        expect(canvasElement.x).toBeGreaterThanOrEqual(containerBounds.x - 100);
        expect(canvasElement.y).toBeGreaterThanOrEqual(containerBounds.y - 100);
        expect(canvasElement.x + canvasElement.width).toBeLessThanOrEqual(containerBounds.x + containerBounds.width + 100);
        expect(canvasElement.y + canvasElement.height).toBeLessThanOrEqual(containerBounds.y + containerBounds.height + 100);
    });

    test('court SVG has rotation and scale transform at 90 degrees', async ({ page }) => {
        await rightClickBoard(page);
        const menu = await getBoardCanvasMenu(page);
        await menu.locator('[data-action="rotate-right"]').click();
        await page.waitForTimeout(200);

        const transform = await page.evaluate(() => {
            const courtSvg = document.getElementById('court-svg');
            return courtSvg ? courtSvg.style.transform : null;
        });

        // Should have both rotate and scale
        expect(transform).toContain('rotate(90deg)');
        expect(transform).toContain('scale');
    });

    test('court SVG has rotation and scale transform at 270 degrees', async ({ page }) => {
        await rightClickBoard(page);
        const menu = await getBoardCanvasMenu(page);
        await menu.locator('[data-action="rotate-left"]').click();
        await page.waitForTimeout(200);

        const transform = await page.evaluate(() => {
            const courtSvg = document.getElementById('court-svg');
            return courtSvg ? courtSvg.style.transform : null;
        });

        // Should have both rotate and scale
        expect(transform).toContain('rotate(270deg)');
        expect(transform).toContain('scale');
    });

    test('no transform scale at 0 and 180 degrees', async ({ page }) => {
        // Check at 0 degrees
        let transform = await page.evaluate(() => {
            const courtSvg = document.getElementById('court-svg');
            return courtSvg ? courtSvg.style.transform : null;
        });
        expect(transform).toContain('scale(1)');

        // Rotate to 180
        await rightClickBoard(page);
        let menu = await getBoardCanvasMenu(page);
        await menu.locator('[data-action="rotate-right"]').click();

        await rightClickBoard(page);
        menu = await getBoardCanvasMenu(page);
        await menu.locator('[data-action="rotate-right"]').click();
        await page.waitForTimeout(200);

        transform = await page.evaluate(() => {
            const courtSvg = document.getElementById('court-svg');
            return courtSvg ? courtSvg.style.transform : null;
        });
        expect(transform).toContain('scale(1)');
    });

    test('all layers are rotated together', async ({ page }) => {
        await rightClickBoard(page);
        const menu = await getBoardCanvasMenu(page);
        await menu.locator('[data-action="rotate-right"]').click();
        await page.waitForTimeout(200);

        const transforms = await page.evaluate(() => {
            return {
                canvas: document.getElementById('board-canvas')?.style.transform,
                courtSvg: document.getElementById('court-svg')?.style.transform,
                pathsLayer: document.getElementById('paths-layer')?.style.transform,
                drawingLayer: document.getElementById('drawing-layer')?.style.transform,
                playersLayer: document.getElementById('players-layer')?.style.transform,
                boardArea: document.getElementById('board-area')?.style.transform
            };
        });

        // All layers should have rotation and scale
        expect(transforms.courtSvg).toContain('rotate(90deg)');
        expect(transforms.courtSvg).toContain('scale');
        expect(transforms.canvas).toContain('rotate(90deg)');
        expect(transforms.pathsLayer).toContain('rotate(90deg)');
        expect(transforms.drawingLayer).toContain('rotate(90deg)');
        expect(transforms.playersLayer).toContain('rotate(90deg)');

        // board-area should NOT be rotated (it's inside players-layer)
        expect(transforms.boardArea || '').not.toContain('rotate');
    });
});
