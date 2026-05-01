/**
 * Sidebar drag-to-board tests.
 *
 * Covers:
 * - Dragging each entity type from the sidebar onto the board creates the entity
 * - The drag image is centered at the mouse cursor (no jump on drop)
 *   → tested by intercepting DataTransfer.prototype.setDragImage and verifying
 *     that the (x, y) offset equals half the image width/height
 * - After drop, the entity center is at the drop coordinate
 */
import { test, expect } from './test-config.js';
import { goto } from './helpers.js';

// ─── helpers ─────────────────────────────────────────────────────────────────

/**
 * Inject a spy into the page that records the last DataTransfer.setDragImage
 * call. Must be called before the drag starts.
 */
async function injectDragImageSpy(page) {
    await page.evaluate(() => {
        window._dragImageSpy = null;
        const orig = DataTransfer.prototype.setDragImage;
        DataTransfer.prototype.setDragImage = function (img, x, y) {
            // getBoundingClientRect works when the element is in the DOM
            const rect = img.getBoundingClientRect();
            const w = rect.width  || parseFloat(img.getAttribute('width')  ?? '0');
            const h = rect.height || parseFloat(img.getAttribute('height') ?? '0');
            // Record whether the drag image still contains a .player-drag-overlay
            // (which is transparent and must be stripped from the ghost, but arms
            // are intentionally kept to show the full player visual).
            const hasOverlayInImage = !!(img.querySelector && img.querySelector('.player-drag-overlay'));
            window._dragImageSpy = { x, y, w, h, hasOverlayInImage };
            return orig.call(this, img, x, y);
        };
    });
}

async function readDragImageSpy(page) {
    return page.evaluate(() => window._dragImageSpy);
}

// ─── Functional: drag from sidebar adds entity to board ───────────────────────

test.describe('Sidebar drag adds entity to board', () => {
    test.beforeEach(async ({ page }) => { await goto(page); });

    test('dragging ball template to board adds a ball', async ({ page }) => {
        const before = await page.locator('[data-ball]').count();
        await page.dragAndDrop('.ball-template:first-child', '.board-container', {
            targetPosition: { x: 400, y: 250 },
        });
        await expect(page.locator('[data-ball]')).toHaveCount(before + 1, { timeout: 3000 });
    });

    test('dragging plate template to board adds a plate', async ({ page }) => {
        const before = await page.locator('[data-plate]').count();
        await page.dragAndDrop('.plate-template:first-child', '.board-container', {
            targetPosition: { x: 400, y: 250 },
        });
        await expect(page.locator('[data-plate]')).toHaveCount(before + 1, { timeout: 3000 });
    });

    test('dragging cone element button to board adds a cone', async ({ page }) => {
        const before = await page.locator('#players-layer [data-element]').count();
        await page.dragAndDrop('.element-btn[data-element="cone"]', '.board-container', {
            targetPosition: { x: 400, y: 250 },
        });
        await expect(page.locator('#players-layer [data-element]')).toHaveCount(before + 1, { timeout: 3000 });
    });

    test('dragging rectangle shape button to board adds a shape', async ({ page }) => {
        const before = await page.locator('[data-shape]').count();
        await page.dragAndDrop('.draw-btn[data-draw="rectangle"]', '.board-container', {
            targetPosition: { x: 400, y: 250 },
        });
        await expect(page.locator('[data-shape]')).toHaveCount(before + 1, { timeout: 3000 });
    });
});

// ─── Placement: dropped entity center ≈ drop coordinate ──────────────────────

test.describe('Dropped entity center matches drop coordinate', () => {
    test.beforeEach(async ({ page }) => { await goto(page); });

    test('ball center matches drop point', async ({ page }) => {
        const boardBox = await page.locator('.board-container').boundingBox();
        const tx = 400, ty = 250;
        await page.dragAndDrop('.ball-template:first-child', '.board-container', {
            targetPosition: { x: tx, y: ty },
        });
        const ball = page.locator('[data-ball]').last();
        const bb = await ball.boundingBox();
        const cx = bb.x + bb.width  / 2;
        const cy = bb.y + bb.height / 2;
        // Entity center in viewport should equal the drop viewport coordinate
        expect(Math.abs(cx - (boardBox.x + tx))).toBeLessThan(10);
        expect(Math.abs(cy - (boardBox.y + ty))).toBeLessThan(10);
    });

    test('plate center matches drop point', async ({ page }) => {
        const boardBox = await page.locator('.board-container').boundingBox();
        const tx = 400, ty = 250;
        await page.dragAndDrop('.plate-template:first-child', '.board-container', {
            targetPosition: { x: tx, y: ty },
        });
        const plate = page.locator('[data-plate]').last();
        const bb = await plate.boundingBox();
        const cx = bb.x + bb.width  / 2;
        const cy = bb.y + bb.height / 2;
        expect(Math.abs(cx - (boardBox.x + tx))).toBeLessThan(10);
        expect(Math.abs(cy - (boardBox.y + ty))).toBeLessThan(10);
    });

    test('player center matches drop point', async ({ page }) => {
        const boardBox = await page.locator('.board-container').boundingBox();
        const tx = 400, ty = 250;
        const before = await page.locator('[data-player-id]').count();
        await page.dragAndDrop('.team-player-template:first-of-type', '.board-container', {
            targetPosition: { x: tx, y: ty },
        });
        await expect(page.locator('[data-player-id]')).toHaveCount(before + 1, { timeout: 3000 });
        const player = page.locator('[data-player-id]').last();
        const bb = await player.boundingBox();
        const cx = bb.x + bb.width  / 2;
        const cy = bb.y + bb.height / 2;
        expect(Math.abs(cx - (boardBox.x + tx))).toBeLessThan(10);
        expect(Math.abs(cy - (boardBox.y + ty))).toBeLessThan(10);
    });

    test('element anchor matches drop point', async ({ page }) => {
        // Elements use a type-specific anchor point (not necessarily center).
        // The stored position is the anchor, so after drop the anchor should be at
        // the cursor — not the bounding-box center.
        const coneAnchor = await page.evaluate(() => Elements.elementAnchors.cone);
        const boardBox = await page.locator('.board-container').boundingBox();
        const tx = 400, ty = 250;
        const before = await page.locator('#players-layer [data-element]').count();
        await page.dragAndDrop('.element-btn[data-element="cone"]', '.board-container', {
            targetPosition: { x: tx, y: ty },
        });
        await expect(page.locator('#players-layer [data-element]')).toHaveCount(before + 1);
        const el = page.locator('#players-layer [data-element]').last();
        const bb = await el.boundingBox();
        // anchor position in viewport
        const ax = bb.x + bb.width  * coneAnchor.x;
        const ay = bb.y + bb.height * coneAnchor.y;
        expect(Math.abs(ax - (boardBox.x + tx))).toBeLessThan(10);
        expect(Math.abs(ay - (boardBox.y + ty))).toBeLessThan(10);
    });
});

// ─── Bug: drag image is centered at cursor (setDragImage offset == img center) ─
//
// The HTML5 DataTransfer.setDragImage(img, x, y) call controls where the
// cursor appears within the drag image.  To make the visual center of the drag
// image track the cursor — so the entity does not "jump" when dropped (which
// always places the center at the cursor) — x must equal img.width/2 and
// y must equal img.height/2.
//
// These tests intercept DataTransfer.prototype.setDragImage, trigger a drag,
// and assert that the recorded offset equals half the image dimensions.

test.describe('Drag image is centered at cursor (no jump on drop)', () => {
    test('ball drag image: offset equals half image size', async ({ page }) => {
        await goto(page);
        await injectDragImageSpy(page);

        await page.dragAndDrop('.ball-template:first-child', '.board-container', {
            targetPosition: { x: 400, y: 250 },
        });

        const spy = await readDragImageSpy(page);
        expect(spy).not.toBeNull();
        // x and y offsets must equal half the image width/height (±1px tolerance)
        expect(Math.abs(spy.x - spy.w / 2)).toBeLessThanOrEqual(1);
        expect(Math.abs(spy.y - spy.h / 2)).toBeLessThanOrEqual(1);
    });

    test('plate drag image: offset equals half image size', async ({ page }) => {
        await goto(page);
        await injectDragImageSpy(page);

        await page.dragAndDrop('.plate-template:first-child', '.board-container', {
            targetPosition: { x: 400, y: 250 },
        });

        const spy = await readDragImageSpy(page);
        expect(spy).not.toBeNull();
        expect(Math.abs(spy.x - spy.w / 2)).toBeLessThanOrEqual(2);
        expect(Math.abs(spy.y - spy.h / 2)).toBeLessThanOrEqual(2);
    });

    test('player drag image: offset equals half image size', async ({ page }) => {
        await goto(page);
        await injectDragImageSpy(page);

        await page.dragAndDrop('.team-player-template:first-of-type', '.board-container', {
            targetPosition: { x: 400, y: 250 },
        });

        const spy = await readDragImageSpy(page);
        expect(spy, 'setDragImage must be called during player drag').not.toBeNull();
        // x and y offsets must equal half the image width/height (±1px tolerance)
        expect(Math.abs(spy.x - spy.w / 2)).toBeLessThanOrEqual(1);
        expect(Math.abs(spy.y - spy.h / 2)).toBeLessThanOrEqual(1);
        // The drag image must not contain the transparent overlay (it shifts the
        // ghost wider than intended). Arms are kept intentionally for visuals.
        expect(spy.hasOverlayInImage, 'drag image must not contain .player-drag-overlay').toBe(false);
    });

    test('element (cone) drag image: offset equals anchor position in image', async ({ page }) => {
        await goto(page);
        // The drag image offset for an element should align the cursor with the
        // element's type-specific anchor (e.g. cone anchor = { x:0.5, y:0.9 }).
        const coneAnchor = await page.evaluate(() => Elements.elementAnchors.cone);
        await injectDragImageSpy(page);

        await page.dragAndDrop('.element-btn[data-element="cone"]', '.board-container', {
            targetPosition: { x: 400, y: 250 },
        });

        const spy = await readDragImageSpy(page);
        expect(spy).not.toBeNull();
        expect(Math.abs(spy.x - spy.w * coneAnchor.x)).toBeLessThanOrEqual(1);
        expect(Math.abs(spy.y - spy.h * coneAnchor.y)).toBeLessThanOrEqual(1);
    });
});
