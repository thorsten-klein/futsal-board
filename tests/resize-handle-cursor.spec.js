/**
 * Resize-handle cursor direction test.
 *
 * The cursor shown on a resize handle must match the visual drag direction
 * of that handle, not always be the diagonal "nwse-resize".
 *
 * Rules:
 *   horizontal board-space handle (left/right edge) → ew-resize  (at 0°/180° board)
 *   vertical   board-space handle (top/bottom edge) → ns-resize  (at 0°/180° board)
 *   board rotated 90°: the board-space horizontal edge is visually vertical → ns-resize
 *   board rotated 90°: the board-space vertical edge is visually horizontal → ew-resize
 *   shape rotated 45°: all edge handles are diagonal → nwse-resize / nesw-resize
 *   line/arrow handle is along the line direction (ew at 0°, ns at 90°, nwse at 45°)
 */
import { test, expect } from './test-config.js';
import { goto } from './helpers.js';

/** Add a shape, position it, select it programmatically, return its id. */
async function addAndSelect(page, { type = 'rectangle', x = 2000, y = 1200, width = 800, height = 400, rotation = 0 } = {}) {
    await page.evaluate(({ type, x, y, width, height, rotation }) => {
        Shapes.addShapeAtPosition(type, x, y);
        const shape = AppState.shapes[AppState.shapes.length - 1];
        shape.width = width;
        shape.height = height;
        shape.rotation = rotation;
        AppState.selectedShape = shape.id;
        AppState.currentTool = 'select';
        Shapes.updateHandles();
        return shape.id;
    }, { type, x, y, width, height, rotation });
    await page.waitForTimeout(50);
    return page.evaluate(() => AppState.shapes[AppState.shapes.length - 1].id);
}

/** Return the CSS cursor of every .resize-handle currently in the DOM. */
function getHandleCursors(page) {
    return page.evaluate(() =>
        [...document.querySelectorAll('.resize-handle')].map(h => h.style.cursor)
    );
}

test.describe('Resize handle cursor direction', () => {

    test('rectangle at 0° board: left/right handles → ew-resize, top/bottom → ns-resize', async ({ page }) => {
        await goto(page);
        await addAndSelect(page, { type: 'rectangle' });

        const cursors = await getHandleCursors(page);
        expect(cursors).toHaveLength(4);

        const ew = cursors.filter(c => c === 'ew-resize');
        const ns = cursors.filter(c => c === 'ns-resize');
        expect(ew, 'should have 2 ew-resize handles').toHaveLength(2);
        expect(ns, 'should have 2 ns-resize handles').toHaveLength(2);
    });

    test('rectangle at 0° board: no handle has the old diagonal nwse-resize', async ({ page }) => {
        await goto(page);
        await addAndSelect(page, { type: 'rectangle' });

        const cursors = await getHandleCursors(page);
        expect(cursors.some(c => c === 'nwse-resize'), 'nwse-resize should not appear on axis-aligned rect').toBe(false);
    });

    test('rectangle at 0° board: ellipse gives same cursor layout', async ({ page }) => {
        await goto(page);
        await addAndSelect(page, { type: 'ellipse' });

        const cursors = await getHandleCursors(page);
        expect(cursors).toHaveLength(4);
        const ew = cursors.filter(c => c === 'ew-resize');
        const ns = cursors.filter(c => c === 'ns-resize');
        expect(ew).toHaveLength(2);
        expect(ns).toHaveLength(2);
    });

    test('rectangle at 45° shape rotation: all 4 handles are diagonal', async ({ page }) => {
        await goto(page);
        await addAndSelect(page, { type: 'rectangle', rotation: 45 });

        const cursors = await getHandleCursors(page);
        expect(cursors).toHaveLength(4);
        const diagonal = cursors.filter(c => c === 'nwse-resize' || c === 'nesw-resize');
        expect(diagonal, 'all handles at 45° should be diagonal').toHaveLength(4);
    });

    test('rectangle at 90° shape rotation: handles swap back to ew/ns', async ({ page }) => {
        await goto(page);
        await addAndSelect(page, { type: 'rectangle', rotation: 90 });

        const cursors = await getHandleCursors(page);
        expect(cursors).toHaveLength(4);
        const ew = cursors.filter(c => c === 'ew-resize');
        const ns = cursors.filter(c => c === 'ns-resize');
        expect(ew).toHaveLength(2);
        expect(ns).toHaveLength(2);
    });

    test('board at 90°: board-horizontal edge is visually vertical → ns-resize', async ({ page }) => {
        await goto(page);
        await page.evaluate(() => {
            AppState.boardRotation = 90;
            App.updateBoardVisualRotation();
        });
        await addAndSelect(page, { type: 'rectangle' });

        const cursors = await getHandleCursors(page);
        expect(cursors).toHaveLength(4);
        // At 90° board rotation the 2 board-horizontal handles appear visually vertical
        const ns = cursors.filter(c => c === 'ns-resize');
        const ew = cursors.filter(c => c === 'ew-resize');
        expect(ns, '2 ns-resize at 90° board').toHaveLength(2);
        expect(ew, '2 ew-resize at 90° board').toHaveLength(2);
    });

    test('board at 180°: handles still ew/ns (not diagonal)', async ({ page }) => {
        await goto(page);
        await page.evaluate(() => {
            AppState.boardRotation = 180;
            App.updateBoardVisualRotation();
        });
        await addAndSelect(page, { type: 'rectangle' });

        const cursors = await getHandleCursors(page);
        expect(cursors).toHaveLength(4);
        const ew = cursors.filter(c => c === 'ew-resize');
        const ns = cursors.filter(c => c === 'ns-resize');
        expect(ew).toHaveLength(2);
        expect(ns).toHaveLength(2);
    });

    test('horizontal arrow (rotation 0°): handle → ew-resize', async ({ page }) => {
        await goto(page);
        await addAndSelect(page, { type: 'arrow', rotation: 0, width: 600, height: 0 });

        const cursors = await getHandleCursors(page);
        expect(cursors).toHaveLength(1);
        expect(cursors[0]).toBe('ew-resize');
    });

    test('vertical arrow (rotation 90°): handle → ns-resize', async ({ page }) => {
        await goto(page);
        await addAndSelect(page, { type: 'arrow', rotation: 90, width: 600, height: 0 });

        const cursors = await getHandleCursors(page);
        expect(cursors).toHaveLength(1);
        expect(cursors[0]).toBe('ns-resize');
    });

    test('diagonal arrow (rotation 45°): handle → nwse-resize', async ({ page }) => {
        await goto(page);
        await addAndSelect(page, { type: 'arrow', rotation: 45, width: 600, height: 0 });

        const cursors = await getHandleCursors(page);
        expect(cursors).toHaveLength(1);
        expect(cursors[0]).toBe('nwse-resize');
    });

    test('horizontal line (rotation 0°): handle → ew-resize', async ({ page }) => {
        await goto(page);
        await addAndSelect(page, { type: 'line', rotation: 0, width: 600, height: 0 });

        const cursors = await getHandleCursors(page);
        expect(cursors).toHaveLength(1);
        expect(cursors[0]).toBe('ew-resize');
    });
});
