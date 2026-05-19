/**
 * Tests for SVG border positioning when board-canvas and board-container sizes don't match,
 * particularly during board rotation.
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

/** Add a shape using evaluate (simpler than drag and drop). */
async function addShape(page, type) {
    await page.evaluate((shapeType) => {
        // Use the Shapes module to add a shape at the center of the board
        const centerX = AppState.boardWidth / 2;
        const centerY = AppState.boardHeight / 2;
        Shapes.addShapeAtPosition(shapeType, centerX, centerY);
    }, type);
    await page.waitForTimeout(200);
}

test.describe('SVG border position during board rotation', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
    });

    test('SVG layer dimensions match canvas dimensions', async ({ page }) => {
        const canvasRect = await page.locator('#board-canvas').boundingBox();
        const drawingLayerRect = await page.locator('#drawing-layer').boundingBox();
        const pathsLayerRect = await page.locator('#paths-layer').boundingBox();

        console.log('Canvas at 0°:', canvasRect);
        console.log('Drawing layer at 0°:', drawingLayerRect);
        console.log('Paths layer at 0°:', pathsLayerRect);

        // All layers should have the same dimensions and position as canvas
        expect(Math.abs(canvasRect.width - drawingLayerRect.width)).toBeLessThan(1);
        expect(Math.abs(canvasRect.height - drawingLayerRect.height)).toBeLessThan(1);
        expect(Math.abs(canvasRect.x - drawingLayerRect.x)).toBeLessThan(1);
        expect(Math.abs(canvasRect.y - drawingLayerRect.y)).toBeLessThan(1);

        expect(Math.abs(canvasRect.width - pathsLayerRect.width)).toBeLessThan(1);
        expect(Math.abs(canvasRect.height - pathsLayerRect.height)).toBeLessThan(1);
        expect(Math.abs(canvasRect.x - pathsLayerRect.x)).toBeLessThan(1);
        expect(Math.abs(canvasRect.y - pathsLayerRect.y)).toBeLessThan(1);

        // Rotate and check again
        await rightClickBoard(page);
        const menu = await getBoardCanvasMenu(page);
        await menu.locator('[data-action="rotate-right"]').click();
        await page.waitForTimeout(500);

        const canvasRect90 = await page.locator('#board-canvas').boundingBox();
        const drawingLayerRect90 = await page.locator('#drawing-layer').boundingBox();
        const pathsLayerRect90 = await page.locator('#paths-layer').boundingBox();

        console.log('Canvas at 90°:', canvasRect90);
        console.log('Drawing layer at 90°:', drawingLayerRect90);
        console.log('Paths layer at 90°:', pathsLayerRect90);

        // Layers should still match canvas
        expect(Math.abs(canvasRect90.width - drawingLayerRect90.width)).toBeLessThan(1);
        expect(Math.abs(canvasRect90.height - drawingLayerRect90.height)).toBeLessThan(1);
        expect(Math.abs(canvasRect90.x - drawingLayerRect90.x)).toBeLessThan(1);
        expect(Math.abs(canvasRect90.y - drawingLayerRect90.y)).toBeLessThan(1);

        expect(Math.abs(canvasRect90.width - pathsLayerRect90.width)).toBeLessThan(1);
        expect(Math.abs(canvasRect90.height - pathsLayerRect90.height)).toBeLessThan(1);
        expect(Math.abs(canvasRect90.x - pathsLayerRect90.x)).toBeLessThan(1);
        expect(Math.abs(canvasRect90.y - pathsLayerRect90.y)).toBeLessThan(1);
    });

    test('SVG shape stroke width adjusts for rotation scale factor', async ({ page }) => {
        // Add a rectangle shape
        await addShape(page, 'rectangle');

        // Get the shape SVG element
        const shapeSvg = page.locator('.shape-svg').first();
        await shapeSvg.waitFor();

        // Get stroke-width at 0°
        const strokeWidth0 = await shapeSvg.locator('rect[stroke-width]').getAttribute('stroke-width');
        console.log('Rectangle stroke-width at 0°:', strokeWidth0);

        // Get scale factor at 0°
        const scaleFactor0 = await page.evaluate(() => {
            return (window.AppState && window.AppState.boardRotationScaleFactor) || 1;
        });
        console.log('Scale factor at 0°:', scaleFactor0);

        // Rotate 90°
        await rightClickBoard(page);
        let menu = await getBoardCanvasMenu(page);
        await menu.locator('[data-action="rotate-right"]').click();
        await page.waitForTimeout(500);

        // Get stroke-width at 90°
        const strokeWidth90 = await shapeSvg.locator('rect[stroke-width]').getAttribute('stroke-width');
        console.log('Rectangle stroke-width at 90°:', strokeWidth90);

        const strokeWidth0Float = parseFloat(strokeWidth0);
        const strokeWidth90Float = parseFloat(strokeWidth90);

        // Stroke width should increase when board is rotated 90°
        // This compensates for the CSS scale transform on the board layer
        // At 90°, the board is scaled down, so stroke width is increased to maintain visual thickness
        console.log('Stroke width change:', strokeWidth90Float - strokeWidth0Float);

        // Verify stroke width increased (should be roughly 1.5x to 1.7x larger)
        expect(strokeWidth90Float).toBeGreaterThan(strokeWidth0Float);
        expect(strokeWidth90Float).toBeLessThan(strokeWidth0Float * 2);  // Reasonable upper bound

        // Rotate back to 0°
        await rightClickBoard(page);
        menu = await getBoardCanvasMenu(page);
        await menu.locator('[data-action="rotate-left"]').click();
        await page.waitForTimeout(500);

        const strokeWidthBack = await shapeSvg.locator('rect[stroke-width]').getAttribute('stroke-width');
        console.log('Rectangle stroke-width back at 0°:', strokeWidthBack);

        // Should be back to original (or very close)
        expect(Math.abs(parseFloat(strokeWidthBack) - parseFloat(strokeWidth0))).toBeLessThan(0.01);
    });
});
