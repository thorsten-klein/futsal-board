/**
 * Four-step flow test for a text shape on a 90°-rotated board.
 *
 * Each step asserts a specific correct behaviour and currently FAILS due to
 * a known bug:
 *
 *  Step 1 – After selecting a text shape, BOTH the transformation dot
 *            (resize handle) and the rotation dot must be within 5 px of
 *            their geometrically correct screen positions.
 *            BUG: transformation dot is placed at the wrong position because
 *            updateHandlesPosition() mixes screen-space getBoundingClientRect
 *            centre with canvas-local pixel offsets.
 *
 *  Step 2 – After moving the text by dragging the element, both dots must
 *            still track the shape correctly (within 5 px of correct).
 *            BUG: the afterMove callback calls updateHandlesPosition(), which
 *            has the same coordinate-space mixing bug → dot jumps.
 *
 *  Step 3 – Dragging the rotation dot by only 1 px must rotate the text by
 *            a tiny amount (< 10°), not by ~90°.
 *            BUG: after a previous drag the shape centre board coordinates may
 *            be inconsistent with where updateHandlesPosition placed the
 *            rotation dot, so the first handleRotationMove fires with a large
 *            angle error → ~90° snap.
 *
 *  Step 4 – After resizing the text by dragging the transformation dot, the
 *            dot must end up within 20 px of the screen position where the
 *            drag ended.
 *            BUG: handleResizeMove calls updateHandlesPosition() at the end of
 *            every step, putting the dot at the wrong position → it jumps.
 */
import { test, expect } from '../test-config.js';
import { goto } from '../helpers.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function rotateBoard90(page) {
    const bb = await page.locator('#board-canvas').boundingBox();
    await page.mouse.click(bb.x + 10, bb.y + 10, { button: 'right' });
    const menu = page.locator('#board-canvas-context-menu');
    await expect(menu).toBeVisible({ timeout: 3000 });
    await menu.locator('[data-action="rotate-right"]').click();
    await page.waitForTimeout(300);
}

async function addText(page) {
    return page.evaluate(() => {
        const shape = {
            id: `shape-${AppState.nextShapeId++}`,
            type: 'text',
            x: 1200,
            y: 800,
            width: 600,
            height: 200,
            rotation: 0,
            text: 'TEST',
            fontSize: 80,
            color: '#ffffff',
            visible: true,
        };
        AppState.shapes.push(shape);
        Shapes.render();
        return shape.id;
    });
}

/**
 * Expected container-relative screen position of the ROTATION handle.
 * Uses Board.boardToScreen (correct for any board rotation) to derive the
 * canvas-local handle position, then converts to screen via
 * Utils.boardToScreenCoords.
 */
async function expectedRotation(page) {
    return page.evaluate(() => {
        const shape = AppState.getShape(AppState.selectedShape);
        if (!shape) return null;
        const c  = Board.boardToScreen(shape.x, shape.y);
        const s  = AppState.referenceScale;
        const r  = (shape.rotation || 0) * Math.PI / 180;
        // Divide by boardRotationScaleFactor → constant screen-space gap.
        const sf = AppState.boardRotationScaleFactor || 1;
        const d  = ((shape.height || 0) / 2 * s + 50) / sf;
        // For text: flip handle by π if net rotation is right-to-left (matches shapes.js).
        const boardRotRad = (AppState.boardRotation || 0) * Math.PI / 180;
        const netRad = r + boardRotRad;
        const textFlip = Math.cos(netRad) < 0 ? Math.PI : 0;
        const angle = (r - Math.PI / 2) + textFlip;
        const hx = c.x + Math.cos(angle) * d;
        const hy = c.y + Math.sin(angle) * d;
        // canvas-local → board → container-relative screen
        const canvas = AppState.canvas;
        const sc = Utils.boardToScreenCoords(
            hx * AppState.boardWidth  / canvas.width,
            hy * AppState.boardHeight / canvas.height
        );
        return sc;   // {x, y}
    });
}

/**
 * Expected container-relative screen position of the TRANSFORMATION
 * (resize) handle for a text shape.
 * Mirrors the createResizeHandles() logic: shape centre + text-bbox offset,
 * rotated by shape rotation, no inverse-board-rotation compensation.
 */
async function expectedResize(page) {
    return page.evaluate(() => {
        const shape = AppState.getShape(AppState.selectedShape);
        if (!shape) return null;
        const c     = Board.boardToScreen(shape.x, shape.y);
        const s     = AppState.referenceScale;

        // Handle follows text. Flip 180° if net rotation is right-to-left (matches shapes.js).
        const netDeg = (shape.rotation || 0) + (AppState.boardRotation || 0);
        const shouldFlip = Math.cos(netDeg * Math.PI / 180) < 0;
        const totalRotDeg = (shape.rotation || 0) + (shouldFlip ? 180 : 0);
        const r     = totalRotDeg * Math.PI / 180;
        let rawOffX = shape.width / 2 * s;
        let rawOffY = 0;

        const svg = document.querySelector(`[data-shape="${shape.id}"]`);
        if (svg) {
            const textEl = svg.querySelector('text');
            if (textEl) {
                try {
                    const bbox  = textEl.getBBox();
                    const vb    = svg.getAttribute('viewBox').split(' ');
                    const vbW   = parseFloat(vb[2]);
                    const vbH   = parseFloat(vb[3]);
                    const w     = shape.width  * s;
                    const h     = shape.height * s;
                    if (bbox.width > 0) {
                        rawOffX = (bbox.x + bbox.width  - vbW / 2) * w / vbW;
                        rawOffY = (bbox.y + bbox.height / 2 - vbH / 2) * h / vbH;
                    }
                } catch (_) { /* keep fallback */ }
            }
        }

        const offX = rawOffX * Math.cos(r) - rawOffY * Math.sin(r);
        const offY = rawOffX * Math.sin(r) + rawOffY * Math.cos(r);

        const hx = c.x + offX;
        const hy = c.y + offY;
        const canvas = AppState.canvas;
        return Utils.boardToScreenCoords(
            hx * AppState.boardWidth  / canvas.width,
            hy * AppState.boardHeight / canvas.height
        );
    });
}

/** Actual container-relative screen positions of both handles from the DOM. */
async function actualHandles(page) {
    return page.evaluate(() => {
        const cRect = document.querySelector('.board-container').getBoundingClientRect();
        const c = el => {
            if (!el) return null;
            const r = el.getBoundingClientRect();
            return {
                x:       r.left + r.width  / 2 - cRect.left,
                y:       r.top  + r.height / 2 - cRect.top,
                screenX: r.left + r.width  / 2,
                screenY: r.top  + r.height / 2,
            };
        };
        return {
            rotation: c(document.querySelector('.rotation-handle')),
            resize:   c(document.querySelector('.resize-handle')),
        };
    });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe('Text on 90° board: selection → drag → rotate → resize', () => {

    test.beforeEach(async ({ page }) => {
        await goto(page);
        await rotateBoard90(page);
    });

    // ── Step 1 ──────────────────────────────────────────────────────────────
    test('step 1: transformation dot and rotation dot at correct positions after selection', async ({ page }) => {
        const shapeId = await addText(page);

        // Click to select (triggers render() → updateHandles() → correct positions)
        await page.click(`[data-shape="${shapeId}"]`);
        await page.waitForTimeout(200);

        // Trigger updateHandlesPosition() explicitly – same path as afterMove/resize/rotate.
        // This is what actually runs in the app after any interaction while selected.
        await page.evaluate(() => Shapes.updateHandlesPosition());
        await page.waitForTimeout(50);

        const actual = await actualHandles(page);
        const expRot = await expectedRotation(page);
        const expRes = await expectedResize(page);

        console.log('rotation dot  – actual:', actual.rotation, '  expected:', expRot);
        console.log('transform dot – actual:', actual.resize,   '  expected:', expRes);

        // Rotation dot: must be within 5 px of correct position
        expect(Math.abs(actual.rotation.x - expRot.x), 'rotation dot X').toBeLessThan(5);
        expect(Math.abs(actual.rotation.y - expRot.y), 'rotation dot Y').toBeLessThan(5);

        // Transformation dot: BUG – currently placed at wrong position
        expect(Math.abs(actual.resize.x - expRes.x), 'transformation dot X').toBeLessThan(5);
        expect(Math.abs(actual.resize.y - expRes.y), 'transformation dot Y').toBeLessThan(5);
    });

    // ── Step 2 ──────────────────────────────────────────────────────────────
    test('step 2: transformation dot tracks shape after element drag', async ({ page }) => {
        const shapeId = await addText(page);

        await page.click(`[data-shape="${shapeId}"]`);
        await page.waitForTimeout(200);

        // Find the shape's screen centre for the drag start
        const shapeSc = await page.evaluate((id) => {
            const el = document.querySelector(`[data-shape="${id}"]`);
            const r  = el.getBoundingClientRect();
            return { screenX: r.left + r.width / 2, screenY: r.top + r.height / 2 };
        }, shapeId);

        // Drag the text 60 px to the right on screen
        await page.mouse.move(shapeSc.screenX, shapeSc.screenY);
        await page.mouse.down();
        await page.mouse.move(shapeSc.screenX + 60, shapeSc.screenY);
        await page.mouse.up();
        await page.waitForTimeout(200);

        const actual = await actualHandles(page);
        const expRot = await expectedRotation(page);
        const expRes = await expectedResize(page);

        console.log('After drag:');
        console.log('rotation dot  – actual:', actual.rotation, '  expected:', expRot);
        console.log('transform dot – actual:', actual.resize,   '  expected:', expRes);

        // Rotation dot must track shape (within 5 px)
        expect(Math.abs(actual.rotation.x - expRot.x), 'rotation dot X after drag').toBeLessThan(5);
        expect(Math.abs(actual.rotation.y - expRot.y), 'rotation dot Y after drag').toBeLessThan(5);

        // Transformation dot BUG: jumps to wrong place after drag
        expect(Math.abs(actual.resize.x - expRes.x), 'transformation dot X after drag').toBeLessThan(5);
        expect(Math.abs(actual.resize.y - expRes.y), 'transformation dot Y after drag').toBeLessThan(5);
    });

    // ── Step 3 ──────────────────────────────────────────────────────────────
    test('step 3: dragging rotation dot 1 px causes only a tiny rotation (< 10°)', async ({ page }) => {
        const shapeId = await addText(page);

        await page.click(`[data-shape="${shapeId}"]`);
        await page.waitForTimeout(200);

        // First move the text (same as step 2) so we test the bug in its real context
        const shapeSc = await page.evaluate((id) => {
            const el = document.querySelector(`[data-shape="${id}"]`);
            const r  = el.getBoundingClientRect();
            return { screenX: r.left + r.width / 2, screenY: r.top + r.height / 2 };
        }, shapeId);
        await page.mouse.move(shapeSc.screenX, shapeSc.screenY);
        await page.mouse.down();
        await page.mouse.move(shapeSc.screenX + 60, shapeSc.screenY);
        await page.mouse.up();
        await page.waitForTimeout(200);

        // Get the rotation handle's current screen position from the DOM
        const handles = await actualHandles(page);
        const rh = handles.rotation;
        console.log('Rotation dot at screen:', rh);

        // Drag only 1 px downward on screen
        await page.mouse.move(rh.screenX, rh.screenY);
        await page.mouse.down();
        await page.mouse.move(rh.screenX, rh.screenY + 1);
        await page.mouse.up();
        await page.waitForTimeout(200);

        const rotation = await page.evaluate(
            (id) => AppState.getShape(id)?.rotation ?? null,
            shapeId
        );
        // With the correct delta implementation, 1 px drag should produce
        // a nearly-zero rotation.  Normalize to [-180, 180] so values like
        // 359.98° (= -0.02°) are treated as nearly zero.
        const rotNorm = rotation > 180 ? rotation - 360 : rotation;
        console.log(`Shape rotation (normalised): ${rotNorm?.toFixed(2)}°`);

        // BUG: shape snaps to ~90° instead of rotating by ~1°
        expect(rotation, 'rotation after 1 px drag').not.toBeNull();
        expect(Math.abs(rotNorm), 'rotation after 1 px drag must be < 10°').toBeLessThan(10);
    });

    // ── Step 4 ──────────────────────────────────────────────────────────────
    test('step 4: transformation dot stays near cursor after resize drag', async ({ page }) => {
        const shapeId = await addText(page);

        await page.click(`[data-shape="${shapeId}"]`);
        await page.waitForTimeout(200);

        const handles = await actualHandles(page);
        const th = handles.resize;
        console.log('Transformation dot initially at screen:', th);

        // Drag the transformation dot 50 px downward on screen.
        // At 90° board rotation the text resize handle is below the text centre;
        // dragging further down grows the font size.
        const endY = th.screenY + 50;
        await page.mouse.move(th.screenX, th.screenY);
        await page.mouse.down();
        await page.mouse.move(th.screenX, endY);
        await page.mouse.up();
        await page.waitForTimeout(200);

        const after    = await actualHandles(page);
        const expRes   = await expectedResize(page);   // recomputed at new font size
        console.log('Transformation dot after resize drag:', after.resize);
        console.log('Correct expected position after resize:', expRes);

        // The dot must end up at the geometrically correct position for the
        // new (larger) text size (within 5 px).
        // BUG: updateHandlesPosition() repositions it far from the correct place.
        expect(
            Math.abs(after.resize.x - expRes.x),
            'transformation dot X vs correct position after resize'
        ).toBeLessThan(5);
        expect(
            Math.abs(after.resize.y - expRes.y),
            'transformation dot Y vs correct position after resize'
        ).toBeLessThan(5);
    });

});
