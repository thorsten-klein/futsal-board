/**
 * Tests for line/arrow transparent drag-handle overlay.
 *
 * Lines and arrows are very thin (2px stroke). A transparent SVG overlay
 * makes them easy to grab: the SVG bounding box is at least 20px tall so
 * clicks within ±10px of the line centre register as a hit.
 */
import { test, expect } from './test-config.js';
import { goto } from './helpers.js';

/** Add a shape via the draw button and return its SVG locator. */
async function addShape(page, drawType) {
    const before = await page.locator('[data-shape]').count();
    await page.locator(`.draw-btn[data-draw="${drawType}"]`).click();
    await expect(page.locator('[data-shape]')).toHaveCount(before + 1, { timeout: 3000 });
    return page.locator('[data-shape]').last();
}

/** Deselect everything by clicking an empty spot on the board. */
async function deselectAll(page) {
    await page.locator('.board-container').click({ position: { x: 10, y: 10 } });
    await page.waitForTimeout(100);
}

// ─── SVG structure tests ──────────────────────────────────────────────────────

test.describe('Line/arrow transparent drag handle', () => {
    test.beforeEach(async ({ page }) => { await goto(page); });

    test('line SVG contains a transparent drag-handle rect', async ({ page }) => {
        const shape = await addShape(page, 'line');
        const handle = shape.locator('.shape-drag-handle');
        await expect(handle).toHaveCount(1);
        // rect must be transparent (fill="transparent")
        await expect(handle).toHaveAttribute('fill', 'transparent');
    });

    test('arrow SVG contains a transparent drag-handle rect', async ({ page }) => {
        const shape = await addShape(page, 'arrow');
        const handle = shape.locator('.shape-drag-handle');
        await expect(handle).toHaveCount(1);
        await expect(handle).toHaveAttribute('fill', 'transparent');
    });

    test('rectangle SVG does NOT get a drag-handle rect (only for line/arrow)', async ({ page }) => {
        const shape = await addShape(page, 'rectangle');
        await expect(shape.locator('.shape-drag-handle')).toHaveCount(0);
    });

    test('line SVG height is at least 20px for a comfortable hit area', async ({ page }) => {
        const shape = await addShape(page, 'line');
        const bb = await shape.boundingBox();
        expect(bb.height).toBeGreaterThanOrEqual(20);
    });

    test('arrow SVG height is at least 20px for a comfortable hit area', async ({ page }) => {
        const shape = await addShape(page, 'arrow');
        const bb = await shape.boundingBox();
        expect(bb.height).toBeGreaterThanOrEqual(20);
    });
});

// ─── Interaction tests ────────────────────────────────────────────────────────
//
// These verify that clicking near (but not exactly on) a line/arrow selects it.
// Without the overlay the SVG is only ~4px tall, so clicks 8px off-centre miss.

test.describe('Line/arrow can be selected by clicking near (not just on) them', () => {
    test.beforeEach(async ({ page }) => { await goto(page); });

    test('clicking 8px above a line centre selects it', async ({ page }) => {
        const shape = await addShape(page, 'line');
        await deselectAll(page);
        await expect(shape).not.toHaveClass(/shape-selected/);

        const bb = await shape.boundingBox();
        // Click 8px above the vertical centre of the SVG bounding box
        const cx = bb.x + bb.width / 2;
        const cy = bb.y + bb.height / 2 - 8;
        await page.mouse.click(cx, cy);

        await expect(shape).toHaveClass(/shape-selected/, { timeout: 2000 });
    });

    test('clicking 8px below a line centre selects it', async ({ page }) => {
        const shape = await addShape(page, 'line');
        await deselectAll(page);

        const bb = await shape.boundingBox();
        const cx = bb.x + bb.width / 2;
        const cy = bb.y + bb.height / 2 + 8;
        await page.mouse.click(cx, cy);

        await expect(shape).toHaveClass(/shape-selected/, { timeout: 2000 });
    });

    test('clicking 8px above an arrow centre selects it', async ({ page }) => {
        const shape = await addShape(page, 'arrow');
        await deselectAll(page);

        const bb = await shape.boundingBox();
        const cx = bb.x + bb.width / 2;
        const cy = bb.y + bb.height / 2 - 8;
        await page.mouse.click(cx, cy);

        await expect(shape).toHaveClass(/shape-selected/, { timeout: 2000 });
    });

    test('clicking 8px below an arrow centre selects it', async ({ page }) => {
        const shape = await addShape(page, 'arrow');
        await deselectAll(page);

        const bb = await shape.boundingBox();
        const cx = bb.x + bb.width / 2;
        const cy = bb.y + bb.height / 2 + 8;
        await page.mouse.click(cx, cy);

        await expect(shape).toHaveClass(/shape-selected/, { timeout: 2000 });
    });

    test('line can be dragged from a point 8px above its centre', async ({ page }) => {
        const shape = await addShape(page, 'line');
        // Click to select first
        await shape.click();
        await page.waitForTimeout(100);

        const bb = await shape.boundingBox();
        const fromX = bb.x + bb.width / 2;
        const fromY = bb.y + bb.height / 2 - 8; // 8px above the visible line

        await page.mouse.move(fromX, fromY);
        await page.mouse.down();
        await page.mouse.move(fromX + 100, fromY, { steps: 10 });
        await page.mouse.up();
        await page.waitForTimeout(200);

        const after = await shape.boundingBox();
        expect(Math.abs(after.x - bb.x)).toBeGreaterThan(50);
    });
});
