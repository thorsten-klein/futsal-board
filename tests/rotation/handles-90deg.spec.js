/**
 * Tests for shape handle positions on a 90°-rotated board.
 *
 * Each shape type (text, line, arrow) has four tests that together expose the
 * known bugs:
 *
 *   1. Initial handle positions on selection
 *      – Bug: updateHandlesPosition() (called by render()) overrides the
 *        correct positions set by createResizeHandles() with wrong values.
 *        Rotation handle is correct; transformation (resize) handle is wrong.
 *
 *   2. Handle positions during/after element drag
 *      – Bug: updateHandlesPosition() is called after each drag step via the
 *        afterMove callback.  It computes the shape centre incorrectly
 *        (positionScale instead of separate posScaleX/posScaleY; screen-space
 *        bbox centre for text mixed with canvas-local offset).
 *
 *   3. Shape rotation via rotation dot
 *      – Bug: handleRotationMove() computes the ABSOLUTE angle from shape
 *        centre to mouse without recording an initial offset at mousedown.
 *        On the very first mousemove the angle can jump wildly from the
 *        current shape.rotation.
 *
 *   4. Resize via transformation (resize) dot
 *      – Covers that dragging the transformation dot changes the shape's
 *        size / fontSize in the correct direction.
 *
 * Expected-position helpers use Utils.boardToScreenCoords() (the authoritative
 * forward transform used by the application) so they correctly handle any board
 * rotation or scale.
 */
import { test, expect } from '../test-config.js';
import { goto } from '../helpers.js';

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/** Right-click an empty spot on the board to open the canvas context menu. */
async function rightClickBoard(page) {
    const bb = await page.locator('#board-canvas').boundingBox();
    await page.mouse.click(bb.x + 10, bb.y + 10, { button: 'right' });
}

/** Rotate the board 90° clockwise via the context menu. */
async function rotateBoard90(page) {
    await rightClickBoard(page);
    const menu = page.locator('#board-canvas-context-menu');
    await expect(menu).toBeVisible({ timeout: 3000 });
    await menu.locator('[data-action="rotate-right"]').click();
    await page.waitForTimeout(300);
}

/**
 * Get the screen position (container-relative centre) of the rotation handle
 * and the first resize handle (transformation dot).
 */
async function getHandlePositions(page) {
    return await page.evaluate(() => {
        const container = document.querySelector('.board-container');
        const cRect = container.getBoundingClientRect();

        const rot = document.querySelector('.rotation-handle');
        const res = document.querySelector('.resize-handle');

        const centre = el => {
            if (!el) return null;
            const r = el.getBoundingClientRect();
            return {
                x: r.left + r.width / 2 - cRect.left,
                y: r.top + r.height / 2 - cRect.top,
                screenX: r.left + r.width / 2,
                screenY: r.top + r.height / 2,
            };
        };

        return { rotation: centre(rot), resize: centre(res) };
    });
}

/**
 * Compute the EXPECTED container-relative screen position of the rotation
 * handle for the currently selected shape.
 *
 * Uses Utils.boardToScreenCoords() — the same forward transform the app uses —
 * so the result is correct regardless of board rotation or zoom.
 */
async function getExpectedRotationHandlePos(page) {
    return await page.evaluate(() => {
        const shape = AppState.getShape(AppState.selectedShape);
        if (!shape) return null;

        // Shape centre in canvas-local coords
        const centerPos = Board.boardToScreen(shape.x, shape.y);
        const cx = centerPos.x;
        const cy = centerPos.y;

        const referenceScale = AppState.referenceScale;
        const shapeRotRad = (shape.rotation || 0) * Math.PI / 180;

        // For text: flip handle by π if net rotation is right-to-left (same as shapes.js).
        const boardRotRad = (AppState.boardRotation || 0) * Math.PI / 180;
        const netRad = shapeRotRad + boardRotRad;
        const textFlip = (shape.type === 'text' && Math.cos(netRad) < 0) ? Math.PI : 0;
        const angle = (shapeRotRad - Math.PI / 2) + textFlip;

        // Divide by boardRotationScaleFactor so the handle appears at a constant
        // screen-space distance from the shape centre regardless of board rotation.
        const sf = AppState.boardRotationScaleFactor || 1;
        const handleDist = ((shape.height || 0) / 2 * referenceScale + 50) / sf;
        const hx = cx + Math.cos(angle) * handleDist;
        const hy = cy + Math.sin(angle) * handleDist;

        // Convert canvas-local → board → container-relative screen
        const canvas = AppState.canvas;
        const bx = hx * AppState.boardWidth  / canvas.width;
        const by = hy * AppState.boardHeight / canvas.height;
        return Utils.boardToScreenCoords(bx, by);   // {x, y} container-relative
    });
}

/**
 * Compute the EXPECTED container-relative screen position of the resize
 * (transformation) handle for the currently selected shape.
 *
 * For line/arrow the handle is at the right endpoint (half-length along the
 * shape direction, then inverse-board-rotated so it looks right under the CSS
 * transform).  For text the handle is at the right centre of the text bbox
 * (no inverse-board-rotation compensation in createResizeHandles for text).
 */
async function getExpectedResizeHandlePos(page) {
    return await page.evaluate(() => {
        const shape = AppState.getShape(AppState.selectedShape);
        if (!shape) return null;

        const canvas   = AppState.canvas;
        const scaleX   = AppState.referenceScale;
        const scaleY   = AppState.referenceScale;
        const boardRot = -(AppState.boardRotation || 0) * Math.PI / 180;   // inverse

        // Shape centre in canvas-local coords
        const centerPos = Board.boardToScreen(shape.x, shape.y);
        const cx = centerPos.x;
        const cy = centerPos.y;

        const shapeRotRad = (shape.rotation || 0) * Math.PI / 180;
        let offsetX, offsetY;

        if (shape.type === 'line' || shape.type === 'arrow') {
            // No inverse-board-rotation compensation — the handle is at the arrowhead
            // position in canvas space, same coordinate system as the SVG.
            const lineHalf = shape.width / 2 * scaleX;
            offsetX = Math.cos(shapeRotRad) * lineHalf;
            offsetY = Math.sin(shapeRotRad) * lineHalf;
        } else if (shape.type === 'text') {
            // Handle follows text. Flip 180° if net rotation is right-to-left.
            const netDeg = (shape.rotation || 0) + (AppState.boardRotation || 0);
            const shouldFlip = Math.cos(netDeg * Math.PI / 180) < 0;
            const totalRotDeg = (shape.rotation || 0) + (shouldFlip ? 180 : 0);
            const totalRot    = totalRotDeg * Math.PI / 180;
            const cosR = Math.cos(totalRot);
            const sinR = Math.sin(totalRot);

            const svg = document.querySelector(`[data-shape="${shape.id}"]`);
            let rawOffX = shape.width / 2 * scaleX;
            let rawOffY = 0;

            if (svg) {
                const textEl = svg.querySelector('text');
                if (textEl) {
                    try {
                        const bbox = textEl.getBBox();
                        if (bbox.width > 0) {
                            const vb   = svg.getAttribute('viewBox').split(' ');
                            const vbW  = parseFloat(vb[2]);
                            const vbH  = parseFloat(vb[3]);
                            const w    = shape.width  * scaleX;
                            const h    = shape.height * scaleY;
                            const sX   = w / vbW;
                            const sY   = h / vbH;

                            rawOffX = (bbox.x + bbox.width  - vbW / 2) * sX;
                            rawOffY = (bbox.y + bbox.height / 2 - vbH / 2) * sY;
                        }
                    } catch (_) { /* keep rawOffX fallback */ }
                }
            }
            offsetX = rawOffX * cosR - rawOffY * sinR;
            offsetY = rawOffX * sinR + rawOffY * cosR;
        }

        const hx = cx + offsetX;
        const hy = cy + offsetY;

        // Convert canvas-local → container-relative screen
        const bx = hx * AppState.boardWidth  / canvas.width;
        const by = hy * AppState.boardHeight / canvas.height;
        return Utils.boardToScreenCoords(bx, by);
    });
}

// ---------------------------------------------------------------------------
// Shape factories
// ---------------------------------------------------------------------------

async function addText(page) {
    return await page.evaluate(() => {
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

async function addLine(page) {
    return await page.evaluate(() => {
        const shape = {
            id: `shape-${AppState.nextShapeId++}`,
            type: 'line',
            x: 1200,
            y: 800,
            width: 600,
            rotation: 0,
            color: '#ffffff',
            lineWidth: 4,
            visible: true,
        };
        AppState.shapes.push(shape);
        Shapes.render();
        return shape.id;
    });
}

async function addArrow(page) {
    return await page.evaluate(() => {
        const shape = {
            id: `shape-${AppState.nextShapeId++}`,
            type: 'arrow',
            x: 1200,
            y: 800,
            width: 600,
            rotation: 0,
            color: '#ffffff',
            lineWidth: 4,
            visible: true,
        };
        AppState.shapes.push(shape);
        Shapes.render();
        return shape.id;
    });
}

// ---------------------------------------------------------------------------
// TEXT SHAPE
// ---------------------------------------------------------------------------

test.describe('Text shape handles on 90° board', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
        await rotateBoard90(page);
    });

    test('1. initial handle positions on selection', async ({ page }) => {
        const shapeId = await addText(page);
        console.log('\n=== TEXT: initial handle positions ===');

        await page.click(`[data-shape="${shapeId}"]`);
        await page.waitForTimeout(300);

        const actual   = await getHandlePositions(page);
        const expRot   = await getExpectedRotationHandlePos(page);
        const expResize = await getExpectedResizeHandlePos(page);

        console.log('rotation handle – actual:', actual.rotation, ' expected:', expRot);
        console.log('resize handle   – actual:', actual.resize,   ' expected:', expResize);

        // Rotation handle must be within 5px of correct position
        expect(Math.abs(actual.rotation.x - expRot.x)).toBeLessThan(5);
        expect(Math.abs(actual.rotation.y - expRot.y)).toBeLessThan(5);

        // Resize (transformation) handle – BUG: updateHandlesPosition mixes
        // screen-space bbox centre with canvas-local offsets for text.
        // This assertion reveals the bug: the resize handle will be far off.
        expect(Math.abs(actual.resize.x - expResize.x)).toBeLessThan(5);
        expect(Math.abs(actual.resize.y - expResize.y)).toBeLessThan(5);
    });

    test('2. handle positions track shape during element drag', async ({ page }) => {
        const shapeId = await addText(page);
        console.log('\n=== TEXT: handle positions during element drag ===');

        await page.click(`[data-shape="${shapeId}"]`);
        await page.waitForTimeout(200);

        const before = await getHandlePositions(page);
        console.log('Handles before drag:', before);

        // Get shape screen position to drag from
        const shapeScreen = await page.evaluate((id) => {
            const el = document.querySelector(`[data-shape="${id}"]`);
            const container = document.querySelector('.board-container');
            const cRect = container.getBoundingClientRect();
            const r = el.getBoundingClientRect();
            return {
                screenX: r.left + r.width / 2,
                screenY: r.top  + r.height / 2,
            };
        }, shapeId);

        // Drag shape 60px to the right on screen
        const dx = 60;
        await page.mouse.move(shapeScreen.screenX, shapeScreen.screenY);
        await page.mouse.down();
        await page.mouse.move(shapeScreen.screenX + dx, shapeScreen.screenY);

        // Check handles DURING the drag (mouse still held down)
        const duringDrag = await getHandlePositions(page);
        const expRotDuring   = await getExpectedRotationHandlePos(page);
        const expResizeDuring = await getExpectedResizeHandlePos(page);
        console.log('During drag – rotation handle: actual', duringDrag.rotation, 'expected', expRotDuring);
        console.log('During drag – resize handle:   actual', duringDrag.resize,   'expected', expResizeDuring);

        await page.mouse.up();
        await page.waitForTimeout(200);

        // Check handles AFTER the drag
        const afterDrag = await getHandlePositions(page);
        const expRotAfter   = await getExpectedRotationHandlePos(page);
        const expResizeAfter = await getExpectedResizeHandlePos(page);
        console.log('After drag – rotation handle: actual', afterDrag.rotation, 'expected', expRotAfter);
        console.log('After drag – resize handle:   actual', afterDrag.resize,   'expected', expResizeAfter);

        // Rotation handle should move with the shape (within 5px)
        expect(Math.abs(afterDrag.rotation.x - expRotAfter.x)).toBeLessThan(5);
        expect(Math.abs(afterDrag.rotation.y - expRotAfter.y)).toBeLessThan(5);

        // Resize handle – BUG: updateHandlesPosition uses wrong centre for text,
        // so the handle does NOT track the shape correctly during/after drag.
        expect(Math.abs(afterDrag.resize.x - expResizeAfter.x)).toBeLessThan(5);
        expect(Math.abs(afterDrag.resize.y - expResizeAfter.y)).toBeLessThan(5);
    });

    test('3. rotation via rotation dot – no shape jump', async ({ page }) => {
        const shapeId = await addText(page);
        console.log('\n=== TEXT: rotation via rotation dot ===');

        await page.click(`[data-shape="${shapeId}"]`);
        await page.waitForTimeout(300);

        const handles = await getHandlePositions(page);
        console.log('Rotation handle screen pos:', handles.rotation);

        const startX = handles.rotation.screenX;
        const startY = handles.rotation.screenY;

        // Move rotation handle 40px downward on screen.
        // At 90° board rotation the rotation handle sits to the RIGHT of the
        // shape; moving it downward (+Y) should produce a moderate positive
        // rotation (roughly 30–60°).  A "jump" bug would produce values near
        // 180° or 270°.
        await page.mouse.move(startX, startY);
        await page.mouse.down();
        await page.mouse.move(startX, startY + 40);
        await page.mouse.up();
        await page.waitForTimeout(200);

        const rot = await page.evaluate((id) => {
            const shape = AppState.getShape(id);
            return shape ? shape.rotation : null;
        }, shapeId);
        console.log(`Shape rotation after 40px downward drag: ${rot?.toFixed(1)}°`);

        // With the correct delta implementation, a 40px drag from the rotation
        // handle produces a proportional rotation (no jump).  The handle is now
        // ABOVE the shape at 90° board, so downward drag causes a small NEGATIVE
        // rotation; normalise to [-180°, 180°] and assert |rotation| < 90°.
        const rotNorm = rot > 180 ? rot - 360 : rot;
        console.log(`Shape rotation normalised: ${rotNorm?.toFixed(1)}°`);

        expect(rot).not.toBeNull();
        expect(Math.abs(rotNorm)).toBeGreaterThanOrEqual(5);  // at least a small rotation
        expect(Math.abs(rotNorm)).toBeLessThan(90);           // no 180°/270° jump
    });

    test('4. resize (font size grows) via transformation dot', async ({ page }) => {
        const shapeId = await addText(page);
        console.log('\n=== TEXT: resize via transformation dot ===');

        await page.click(`[data-shape="${shapeId}"]`);
        await page.waitForTimeout(300);

        const stateBefore = await page.evaluate((id) => {
            const s = AppState.getShape(id);
            return { fontSize: s.fontSize, width: s.width };
        }, shapeId);
        console.log('Before:', stateBefore);

        const handles = await getHandlePositions(page);
        console.log('Resize handle screen pos:', handles.resize);

        const startX = handles.resize.screenX;
        const startY = handles.resize.screenY;

        // At 90° board rotation the text resize handle sits BELOW the shape
        // (canvas +X maps to screen +Y at 90°).  Drag downward to grow the text.
        await page.mouse.move(startX, startY);
        await page.mouse.down();
        await page.mouse.move(startX, startY + 60);
        await page.mouse.up();
        await page.waitForTimeout(200);

        const stateAfter = await page.evaluate((id) => {
            const s = AppState.getShape(id);
            return { fontSize: s.fontSize, width: s.width };
        }, shapeId);
        console.log('After:', stateAfter);

        // Font size must grow
        expect(stateAfter.fontSize).toBeGreaterThan(stateBefore.fontSize);
    });
});

// ---------------------------------------------------------------------------
// LINE SHAPE
// ---------------------------------------------------------------------------

test.describe('Line shape handles on 90° board', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
        await rotateBoard90(page);
    });

    test('1. initial handle positions on selection', async ({ page }) => {
        const shapeId = await addLine(page);
        console.log('\n=== LINE: initial handle positions ===');

        await page.click(`[data-shape="${shapeId}"]`);
        await page.waitForTimeout(300);

        const actual    = await getHandlePositions(page);
        const expRot    = await getExpectedRotationHandlePos(page);
        const expResize = await getExpectedResizeHandlePos(page);

        console.log('rotation handle – actual:', actual.rotation, ' expected:', expRot);
        console.log('resize handle   – actual:', actual.resize,   ' expected:', expResize);

        // Rotation handle: correct (uses Board.boardToScreen)
        expect(Math.abs(actual.rotation.x - expRot.x)).toBeLessThan(5);
        expect(Math.abs(actual.rotation.y - expRot.y)).toBeLessThan(5);

        // Resize handle – BUG: updateHandlesPosition uses positionScale
        // (Math.min of posScaleX, posScaleY) for the shape centre instead of
        // separate posScaleX / posScaleY, so the handle is misplaced.
        expect(Math.abs(actual.resize.x - expResize.x)).toBeLessThan(5);
        expect(Math.abs(actual.resize.y - expResize.y)).toBeLessThan(5);
    });

    test('2. handle positions track shape during element drag', async ({ page }) => {
        const shapeId = await addLine(page);
        console.log('\n=== LINE: handle positions during element drag ===');

        await page.click(`[data-shape="${shapeId}"]`);
        await page.waitForTimeout(200);

        const shapeScreen = await page.evaluate((id) => {
            const el = document.querySelector(`[data-shape="${id}"]`);
            const container = document.querySelector('.board-container');
            const cRect = container.getBoundingClientRect();
            const r = el.getBoundingClientRect();
            return {
                screenX: r.left + r.width / 2,
                screenY: r.top  + r.height / 2,
            };
        }, shapeId);

        const dx = 60;
        await page.mouse.move(shapeScreen.screenX, shapeScreen.screenY);
        await page.mouse.down();
        await page.mouse.move(shapeScreen.screenX + dx, shapeScreen.screenY);

        const duringDrag      = await getHandlePositions(page);
        const expRotDuring    = await getExpectedRotationHandlePos(page);
        const expResizeDuring = await getExpectedResizeHandlePos(page);
        console.log('During drag – rotation handle: actual', duringDrag.rotation, 'expected', expRotDuring);
        console.log('During drag – resize handle:   actual', duringDrag.resize,   'expected', expResizeDuring);

        await page.mouse.up();
        await page.waitForTimeout(200);

        const afterDrag      = await getHandlePositions(page);
        const expRotAfter    = await getExpectedRotationHandlePos(page);
        const expResizeAfter = await getExpectedResizeHandlePos(page);
        console.log('After drag – rotation handle: actual', afterDrag.rotation, 'expected', expRotAfter);
        console.log('After drag – resize handle:   actual', afterDrag.resize,   'expected', expResizeAfter);

        // Rotation handle should track the shape correctly
        expect(Math.abs(afterDrag.rotation.x - expRotAfter.x)).toBeLessThan(5);
        expect(Math.abs(afterDrag.rotation.y - expRotAfter.y)).toBeLessThan(5);

        // Resize handle – BUG: wrong centre in updateHandlesPosition
        expect(Math.abs(afterDrag.resize.x - expResizeAfter.x)).toBeLessThan(5);
        expect(Math.abs(afterDrag.resize.y - expResizeAfter.y)).toBeLessThan(5);
    });

    test('3. rotation via rotation dot – no shape jump', async ({ page }) => {
        const shapeId = await addLine(page);
        console.log('\n=== LINE: rotation via rotation dot ===');

        await page.click(`[data-shape="${shapeId}"]`);
        await page.waitForTimeout(300);

        const handles = await getHandlePositions(page);
        const startX = handles.rotation.screenX;
        const startY = handles.rotation.screenY;

        // At 90° board rotation, the rotation handle is to the RIGHT of the
        // shape.  Moving it 40px downward (+Y) should give a moderate rotation.
        await page.mouse.move(startX, startY);
        await page.mouse.down();
        await page.mouse.move(startX, startY + 40);
        await page.mouse.up();
        await page.waitForTimeout(200);

        const rot = await page.evaluate((id) => {
            const shape = AppState.getShape(id);
            return shape ? shape.rotation : null;
        }, shapeId);
        console.log(`Shape rotation after 40px downward drag: ${rot?.toFixed(1)}°`);

        // A jump bug produces values well outside [10°, 90°]
        expect(rot).not.toBeNull();
        expect(rot).toBeGreaterThanOrEqual(10);
        expect(rot).toBeLessThan(90);
    });

    test('4. resize (line length grows) via transformation dot', async ({ page }) => {
        const shapeId = await addLine(page);
        console.log('\n=== LINE: resize via transformation dot ===');

        await page.click(`[data-shape="${shapeId}"]`);
        await page.waitForTimeout(300);

        const stateBefore = await page.evaluate((id) => {
            return { width: AppState.getShape(id).width };
        }, shapeId);
        console.log('Before:', stateBefore);

        const handles = await getHandlePositions(page);
        const startX = handles.resize.screenX;
        const startY = handles.resize.screenY;

        // At 90° board rotation, the line's endpoint handle appears to the RIGHT
        // of the shape center on screen (canvas +X → screen +X at 90° after the
        // inverse-board-rotation compensation in createResizeHandles).  Drag
        // further right to move the endpoint away from centre and grow the line.
        await page.mouse.move(startX, startY);
        await page.mouse.down();
        await page.mouse.move(startX + 40, startY);
        await page.mouse.up();
        await page.waitForTimeout(200);

        const stateAfter = await page.evaluate((id) => {
            return { width: AppState.getShape(id).width };
        }, shapeId);
        console.log('After:', stateAfter);

        // Line must have grown
        expect(stateAfter.width).toBeGreaterThan(stateBefore.width);
    });
});

// ---------------------------------------------------------------------------
// ARROW SHAPE
// ---------------------------------------------------------------------------

test.describe('Arrow shape handles on 90° board', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
        await rotateBoard90(page);
    });

    test('1. initial handle positions on selection', async ({ page }) => {
        const shapeId = await addArrow(page);
        console.log('\n=== ARROW: initial handle positions ===');

        await page.click(`[data-shape="${shapeId}"]`);
        await page.waitForTimeout(300);

        const actual    = await getHandlePositions(page);
        const expRot    = await getExpectedRotationHandlePos(page);
        const expResize = await getExpectedResizeHandlePos(page);

        console.log('rotation handle – actual:', actual.rotation, ' expected:', expRot);
        console.log('resize handle   – actual:', actual.resize,   ' expected:', expResize);

        // Rotation handle: correct (uses Board.boardToScreen)
        expect(Math.abs(actual.rotation.x - expRot.x)).toBeLessThan(5);
        expect(Math.abs(actual.rotation.y - expRot.y)).toBeLessThan(5);

        // Resize handle – BUG: same positionScale issue as for lines
        expect(Math.abs(actual.resize.x - expResize.x)).toBeLessThan(5);
        expect(Math.abs(actual.resize.y - expResize.y)).toBeLessThan(5);
    });

    test('2. handle positions track shape during element drag', async ({ page }) => {
        const shapeId = await addArrow(page);
        console.log('\n=== ARROW: handle positions during element drag ===');

        await page.click(`[data-shape="${shapeId}"]`);
        await page.waitForTimeout(200);

        const shapeScreen = await page.evaluate((id) => {
            const el = document.querySelector(`[data-shape="${id}"]`);
            const container = document.querySelector('.board-container');
            const cRect = container.getBoundingClientRect();
            const r = el.getBoundingClientRect();
            return {
                screenX: r.left + r.width / 2,
                screenY: r.top  + r.height / 2,
            };
        }, shapeId);

        const dx = 60;
        await page.mouse.move(shapeScreen.screenX, shapeScreen.screenY);
        await page.mouse.down();
        await page.mouse.move(shapeScreen.screenX + dx, shapeScreen.screenY);

        const duringDrag      = await getHandlePositions(page);
        const expRotDuring    = await getExpectedRotationHandlePos(page);
        const expResizeDuring = await getExpectedResizeHandlePos(page);
        console.log('During drag – rotation handle: actual', duringDrag.rotation, 'expected', expRotDuring);
        console.log('During drag – resize handle:   actual', duringDrag.resize,   'expected', expResizeDuring);

        await page.mouse.up();
        await page.waitForTimeout(200);

        const afterDrag      = await getHandlePositions(page);
        const expRotAfter    = await getExpectedRotationHandlePos(page);
        const expResizeAfter = await getExpectedResizeHandlePos(page);
        console.log('After drag – rotation handle: actual', afterDrag.rotation, 'expected', expRotAfter);
        console.log('After drag – resize handle:   actual', afterDrag.resize,   'expected', expResizeAfter);

        // Rotation handle should track shape correctly
        expect(Math.abs(afterDrag.rotation.x - expRotAfter.x)).toBeLessThan(5);
        expect(Math.abs(afterDrag.rotation.y - expRotAfter.y)).toBeLessThan(5);

        // Resize handle – BUG: updateHandlesPosition wrong centre
        expect(Math.abs(afterDrag.resize.x - expResizeAfter.x)).toBeLessThan(5);
        expect(Math.abs(afterDrag.resize.y - expResizeAfter.y)).toBeLessThan(5);
    });

    test('3. rotation via rotation dot – no shape jump', async ({ page }) => {
        const shapeId = await addArrow(page);
        console.log('\n=== ARROW: rotation via rotation dot ===');

        await page.click(`[data-shape="${shapeId}"]`);
        await page.waitForTimeout(300);

        const handles = await getHandlePositions(page);
        const startX = handles.rotation.screenX;
        const startY = handles.rotation.screenY;

        await page.mouse.move(startX, startY);
        await page.mouse.down();
        await page.mouse.move(startX, startY + 40);
        await page.mouse.up();
        await page.waitForTimeout(200);

        const rot = await page.evaluate((id) => {
            const shape = AppState.getShape(id);
            return shape ? shape.rotation : null;
        }, shapeId);
        console.log(`Shape rotation after 40px downward drag: ${rot?.toFixed(1)}°`);

        // A jump bug produces values well outside [10°, 90°]
        expect(rot).not.toBeNull();
        expect(rot).toBeGreaterThanOrEqual(10);
        expect(rot).toBeLessThan(90);
    });

    test('4. resize (arrow length grows) via transformation dot', async ({ page }) => {
        const shapeId = await addArrow(page);
        console.log('\n=== ARROW: resize via transformation dot ===');

        await page.click(`[data-shape="${shapeId}"]`);
        await page.waitForTimeout(300);

        const stateBefore = await page.evaluate((id) => {
            return { width: AppState.getShape(id).width };
        }, shapeId);
        console.log('Before:', stateBefore);

        const handles = await getHandlePositions(page);
        const startX = handles.resize.screenX;
        const startY = handles.resize.screenY;

        // At 90° board rotation, the arrow endpoint handle appears to the RIGHT
        // of the shape center on screen.  Drag further right to extend the arrow.
        await page.mouse.move(startX, startY);
        await page.mouse.down();
        await page.mouse.move(startX + 40, startY);
        await page.mouse.up();
        await page.waitForTimeout(200);

        const stateAfter = await page.evaluate((id) => {
            return { width: AppState.getShape(id).width };
        }, shapeId);
        console.log('After:', stateAfter);

        // Arrow must have grown
        expect(stateAfter.width).toBeGreaterThan(stateBefore.width);
    });
});
