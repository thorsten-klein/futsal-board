/**
 * Test: text handles at 90° board rotation
 *
 * New behaviour (changed from "always upright"):
 *   Text now ROTATES WITH the board. At 90° board rotation the text SVG has
 *   no extra CSS counter-rotation applied (formula: shape.rotation + 0 at 90°).
 *   The net screen rotation = shape.rotation + boardRotation (from board CSS).
 *
 *   Only at 180° board rotation is an extra 180° added so the text remains
 *   readable (net = shape.rotation + 180° + 180° CSS = shape.rotation).
 *
 * Expected at 90° board rotation (text tilted with board):
 *   - text SVG CSS rotation = shape.rotation (no boardRotation subtracted)
 *   - resize (transformation) handle → visually BELOW the text (canvas-RIGHT → screen-DOWN)
 *   - rotation handle                → visually to the RIGHT of the text (canvas-UP → screen-RIGHT)
 */

import { test, expect } from '@playwright/test';
import { goto } from '../helpers.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function goto_board(page) {
    await goto(page);
}

async function rotateBoard90(page) {
    const bb = await page.locator('#board-canvas').boundingBox();
    await page.mouse.click(bb.x + 10, bb.y + 10, { button: 'right' });
    const menu = page.locator('#board-canvas-context-menu');
    await menu.waitFor({ state: 'visible', timeout: 3000 });
    await menu.locator('[data-action="rotate-right"]').click();
    await page.waitForTimeout(300);
}

/** Add a text shape to the board and return its id. */
async function addText(page) {
    return await page.evaluate(() => {
        const shape = {
            id: `shape-${AppState.nextShapeId++}`,
            type: 'text',
            x: AppState.boardWidth / 2,
            y: AppState.boardHeight / 2,
            width: 600,
            height: 300,
            rotation: 0,
            text: 'Hello',
            fontSize: 48,
            color: '#ffffff',
            visible: true
        };
        AppState.shapes.push(shape);
        Shapes.render();
        return shape.id;
    });
}

/** Select shape and wait for handles to be placed. */
async function selectShape(page, id) {
    await page.evaluate((id) => {
        AppState.selectedShape = id;
        AppState.currentTool = 'select';
        Shapes.updateHandles();
    }, id);
    // Wait for the requestAnimationFrame re-positioning of the text handle
    await page.waitForTimeout(300);
}

/**
 * Returns screen bounding-rect centres of handles and the text SVG element,
 * all relative to the viewport (clientX/Y).
 */
async function getHandleInfo(page, shapeId) {
    return await page.evaluate((id) => {
        function centre(el) {
            if (!el) return null;
            const r = el.getBoundingClientRect();
            return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
        }
        const svg       = document.querySelector(`[data-shape="${id}"]`);
        const resize    = document.querySelector('.resize-handle');
        const rotation  = document.querySelector('.rotation-handle');
        return {
            text:     centre(svg),
            resize:   centre(resize),
            rotation: centre(rotation)
        };
    }, shapeId);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe('Text handles on 90° rotated board', () => {
    test.beforeEach(async ({ page }) => {
        await goto_board(page);
        await rotateBoard90(page);
    });

    /**
     * Primary test: text rotates WITH the board at 90° rotation.
     * The SVG CSS must NOT counter-rotate — it should have rotate(0deg)
     * (when shape.rotation=0) so the net on-screen rotation is 0+90=90°.
     */
    test('text SVG rotates with the board (no counter-rotation at 90° board)', async ({ page }) => {
        const id = await addText(page);

        const svgTransform = await page.evaluate((id) => {
            const svg = document.querySelector(`[data-shape="${id}"]`);
            return svg ? svg.style.transform : null;
        }, id);

        console.log('Text SVG transform:', svgTransform);

        // At 90° board with shape.rotation=0 the SVG CSS rotation must be 0°
        // (no correction — text tilts with the board).
        // Buggy old code produced rotate(-90deg) or rotate(90deg) → unintended orientation.
        expect(svgTransform, 'SVG must use rotate(0deg) — text rotates with board at 90°')
            .toContain('rotate(0deg)');
    });

    /**
     * Resize-drag flip bug: while dragging the resize handle the text must NOT
     * flip 180°. Previously handleResizeMove used a different formula than
     * createShapeSvg, causing a 180° jump the moment dragging started.
     */
    test('text SVG does not flip 180° when resize-handle is dragged', async ({ page }) => {
        const id = await addText(page);
        await selectShape(page, id);

        // Record SVG rotation at rest
        const initialTransform = await page.evaluate((id) => {
            const svg = document.querySelector(`[data-shape="${id}"]`);
            return svg ? svg.style.transform : null;
        }, id);

        // Get resize handle screen position
        const handlePos = await page.evaluate(() => {
            const handle = document.querySelector('.resize-handle');
            if (!handle) return null;
            const r = handle.getBoundingClientRect();
            return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
        });
        expect(handlePos, 'resize handle must exist').not.toBeNull();

        // Drag the resize handle a small amount
        await page.mouse.move(handlePos.x, handlePos.y);
        await page.mouse.down();
        await page.mouse.move(handlePos.x + 15, handlePos.y);
        await page.waitForTimeout(50);

        const duringDragTransform = await page.evaluate((id) => {
            const svg = document.querySelector(`[data-shape="${id}"]`);
            return svg ? svg.style.transform : null;
        }, id);

        await page.mouse.up();

        console.log('Transform at rest   :', initialTransform);
        console.log('Transform during drag:', duringDragTransform);

        const getAngle = (t) => {
            const m = t && t.match(/rotate\(([-\d.]+)deg\)/);
            return m ? parseFloat(m[1]) : 0;
        };
        const restAngle = getAngle(initialTransform);
        const dragAngle = getAngle(duringDragTransform);

        // Normalised absolute difference — must be much less than 180°
        const diff = Math.abs(((dragAngle - restAngle + 180) % 360) - 180);
        expect(diff, 'SVG must not flip 180° when resize handle is dragged').toBeLessThan(90);
    });

    test('resize handle is BELOW the text (canvas-RIGHT rotated 90° → screen-DOWN)', async ({ page }) => {
        const id = await addText(page);
        await selectShape(page, id);

        const info = await getHandleInfo(page, id);
        console.log('Text centre :', info.text);
        console.log('Resize handle:', info.resize);

        expect(info.resize,   'resize handle must exist').not.toBeNull();
        expect(info.text,     'text SVG must exist').not.toBeNull();

        // At 90° board: text's local RIGHT maps to screen-DOWN after board CSS rotation.
        expect(info.resize.y, 'resize handle Y > text centre Y (screen-DOWN)').toBeGreaterThan(info.text.y);

        // And roughly horizontally aligned (within 30 px)
        expect(Math.abs(info.resize.x - info.text.x), 'resize handle X ≈ text centre X')
            .toBeLessThan(30);
    });

    test('rotation handle is to the RIGHT of the text (canvas-UP rotated 90° → screen-RIGHT)', async ({ page }) => {
        const id = await addText(page);
        await selectShape(page, id);

        const info = await getHandleInfo(page, id);
        console.log('Text centre   :', info.text);
        console.log('Rotation handle:', info.rotation);

        expect(info.rotation, 'rotation handle must exist').not.toBeNull();
        expect(info.text,     'text SVG must exist').not.toBeNull();

        // At 90° board: text's local UP maps to screen-RIGHT after board CSS rotation.
        expect(info.rotation.x, 'rotation handle X > text centre X (screen-RIGHT)').toBeGreaterThan(info.text.x);

        // And roughly vertically aligned (within 30 px)
        expect(Math.abs(info.rotation.y - info.text.y), 'rotation handle Y ≈ text centre Y')
            .toBeLessThan(30);
    });

    test('resize handle stays BELOW after text is dragged', async ({ page }) => {
        const id = await addText(page);
        await selectShape(page, id);

        // Drag the text 80 px to the right on screen
        const shapeSc = await page.evaluate((id) => {
            const el = document.querySelector(`[data-shape="${id}"]`);
            const r  = el.getBoundingClientRect();
            return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
        }, id);

        await page.mouse.move(shapeSc.x, shapeSc.y);
        await page.mouse.down();
        await page.mouse.move(shapeSc.x + 80, shapeSc.y);
        await page.mouse.up();
        await page.waitForTimeout(200);

        const info = await getHandleInfo(page, id);
        console.log('After drag – text centre :', info.text);
        console.log('After drag – resize handle:', info.resize);

        expect(info.resize.y).toBeGreaterThan(info.text.y);
        expect(Math.abs(info.resize.x - info.text.x)).toBeLessThan(30);
    });

    test('rotation handle stays RIGHT after text is dragged', async ({ page }) => {
        const id = await addText(page);
        await selectShape(page, id);

        const shapeSc = await page.evaluate((id) => {
            const el = document.querySelector(`[data-shape="${id}"]`);
            const r  = el.getBoundingClientRect();
            return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
        }, id);

        await page.mouse.move(shapeSc.x, shapeSc.y);
        await page.mouse.down();
        await page.mouse.move(shapeSc.x + 80, shapeSc.y);
        await page.mouse.up();
        await page.waitForTimeout(200);

        const info = await getHandleInfo(page, id);
        console.log('After drag – text centre   :', info.text);
        console.log('After drag – rotation handle:', info.rotation);

        expect(info.rotation.x).toBeGreaterThan(info.text.x);
        expect(Math.abs(info.rotation.y - info.text.y)).toBeLessThan(30);
    });
});
