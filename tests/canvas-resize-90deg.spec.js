/**
 * Test that board-canvas stays visually within the board-container after a viewport
 * resize (simulating browser zoom) at 90°/270° board rotation.
 *
 * Two bugs were fixed:
 *  1. rotatedContainerRef cache: stale ref skewed scaleFactor so canvas.width
 *     didn't adapt to the new container size (canvas attribute too large/small).
 *  2. Stale CSS transform: AppState.boardRotationScaleFactor was updated by
 *     resize() but updateBoardVisualRotation() was never called on window resize,
 *     so the CSS scale() stayed at the old value — the visual canvas (after CSS
 *     rotate+scale) was the wrong size.
 *
 * At 0°/180° no CSS scaling is applied so neither bug occurs there.
 */
import { test, expect } from './test-config.js';
import { goto } from './helpers.js';

async function rotateBoard(page, action = 'rotate-right') {
    const bb = await page.locator('#board-canvas').boundingBox();
    await page.mouse.click(bb.x + 20, bb.y + 20, { button: 'right' });
    const menu = page.locator('#board-canvas-context-menu');
    await expect(menu).toBeVisible({ timeout: 3000 });
    await menu.locator(`[data-action="${action}"]`).click();
    await page.waitForTimeout(400);
}

/**
 * Returns the visual (post-CSS-transform) bounding box of each board layer
 * and the container bounds, plus diagnostics.
 */
async function measureVisualBounds(page) {
    return page.evaluate(() => {
        function r(el) {
            if (!el) return null;
            const rect = el.getBoundingClientRect();
            return { x: rect.x, y: rect.y, width: rect.width, height: rect.height,
                     right: rect.right, bottom: rect.bottom };
        }
        const canvas = document.getElementById('board-canvas');
        const container = document.querySelector('.board-container');
        const playersLayer = document.getElementById('players-layer');
        return {
            container: r(container),
            canvas: r(canvas),
            playersLayer: r(playersLayer),
            canvasAttr: { w: canvas.width, h: canvas.height },
            sf: AppState.boardRotationScaleFactor,
            transform: canvas.style.transform,
        };
    });
}

test.describe('Canvas resize at 90° rotation', () => {
    test('canvas fills container visually after viewport shrink at 90°', async ({ page }) => {
        await goto(page);
        await rotateBoard(page, 'rotate-right');

        const before = await measureVisualBounds(page);
        console.log('Before viewport change (90°):', before);

        // Before zoom: canvas visual bounds should match the container
        expect(Math.abs(before.canvas.height - before.container.height)).toBeLessThan(5);
        // canvas attribute width = container width (for typical widescreen landscape viewport)
        expect(Math.abs(before.canvasAttr.w - before.container.width)).toBeLessThan(5);

        // Simulate browser zoom-in by shrinking the CSS-pixel viewport
        const shrunkWidth  = Math.round(page.viewportSize().width  * 0.7);
        const shrunkHeight = Math.round(page.viewportSize().height * 0.7);
        await page.setViewportSize({ width: shrunkWidth, height: shrunkHeight });
        await page.evaluate(() => window.dispatchEvent(new Event('resize')));
        await page.waitForTimeout(400);

        const after = await measureVisualBounds(page);
        console.log('After viewport shrink (90°):', after);

        // Bug 1: canvas attribute width must track new container width
        expect(Math.abs(after.canvasAttr.w - after.container.width)).toBeLessThan(5);

        // Bug 2: CSS transform must be updated — visual height should match container height
        // (not the old, pre-zoom container height).
        expect(Math.abs(after.canvas.height - after.container.height)).toBeLessThan(5);

        // The visual canvas must not overflow the container bounds (no cropping)
        expect(after.canvas.x).toBeGreaterThanOrEqual(after.container.x - 1);
        expect(after.canvas.y).toBeGreaterThanOrEqual(after.container.y - 1);
        expect(after.canvas.right).toBeLessThanOrEqual(after.container.right + 1);
        expect(after.canvas.bottom).toBeLessThanOrEqual(after.container.bottom + 1);

        // Board must be smaller than before the zoom
        expect(after.canvas.height).toBeLessThan(before.canvas.height - 20);
    });

    test('canvas fills container visually after viewport shrink at 270°', async ({ page }) => {
        await goto(page);

        // Rotate to 270° (three right-rotations)
        await rotateBoard(page, 'rotate-right');
        await rotateBoard(page, 'rotate-right');
        await rotateBoard(page, 'rotate-right');

        const before = await measureVisualBounds(page);
        console.log('Before viewport change (270°):', before);
        expect(Math.abs(before.canvas.height - before.container.height)).toBeLessThan(5);
        expect(Math.abs(before.canvasAttr.w - before.container.width)).toBeLessThan(5);

        const shrunkWidth  = Math.round(page.viewportSize().width  * 0.7);
        const shrunkHeight = Math.round(page.viewportSize().height * 0.7);
        await page.setViewportSize({ width: shrunkWidth, height: shrunkHeight });
        await page.evaluate(() => window.dispatchEvent(new Event('resize')));
        await page.waitForTimeout(400);

        const after = await measureVisualBounds(page);
        console.log('After viewport shrink (270°):', after);

        expect(Math.abs(after.canvasAttr.w - after.container.width)).toBeLessThan(5);
        expect(Math.abs(after.canvas.height - after.container.height)).toBeLessThan(5);
        expect(after.canvas.x).toBeGreaterThanOrEqual(after.container.x - 1);
        expect(after.canvas.y).toBeGreaterThanOrEqual(after.container.y - 1);
        expect(after.canvas.right).toBeLessThanOrEqual(after.container.right + 1);
        expect(after.canvas.bottom).toBeLessThanOrEqual(after.container.bottom + 1);
        expect(after.canvas.height).toBeLessThan(before.canvas.height - 20);
    });

    test('canvas fills container visually at 0° (control — no rotation transform)', async ({ page }) => {
        await goto(page);

        const before = await measureVisualBounds(page);
        const shrunkWidth  = Math.round(page.viewportSize().width  * 0.7);
        const shrunkHeight = Math.round(page.viewportSize().height * 0.7);
        await page.setViewportSize({ width: shrunkWidth, height: shrunkHeight });
        await page.evaluate(() => window.dispatchEvent(new Event('resize')));
        await page.waitForTimeout(400);

        const after = await measureVisualBounds(page);
        console.log('0° before visual height:', before.canvas.height, 'after:', after.canvas.height);

        // At 0° the board fills the container in the wider dimension
        expect(Math.abs(after.canvasAttr.w - after.container.width)).toBeLessThan(5);
        expect(after.canvas.height).toBeLessThan(before.canvas.height - 20);
    });
});
