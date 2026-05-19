/**
 * Resize-handle cursor must update immediately when the shape is rotated,
 * without requiring a deselect/reselect cycle.
 *
 * During rotation `updateHandlesPosition()` is called to move the handles;
 * the bug was that it moved the DOM elements but never updated their cursor.
 */
import { test, expect } from './test-config.js';
import { goto } from './helpers.js';

/** Add a shape, select it programmatically, trigger handle creation. */
async function addAndSelect(page, type = 'rectangle') {
    await page.evaluate((type) => {
        Shapes.addShapeAtPosition(type, 2000, 1200);
        const shape = AppState.shapes[AppState.shapes.length - 1];
        shape.width = 800;
        shape.height = 400;
        shape.rotation = 0;
        AppState.selectedShape = shape.id;
        AppState.currentTool = 'select';
        Shapes.updateHandles();
    }, type);
    await page.waitForTimeout(50);
}

/** Return the CSS cursor of every .resize-handle currently in the DOM. */
function getHandleCursors(page) {
    return page.evaluate(() =>
        [...document.querySelectorAll('.resize-handle')].map(h => h.style.cursor)
    );
}

test.describe('Resize handle cursor updates live during rotation', () => {

    test('rectangle: cursor updates when shape is rotated to 90° without reselect', async ({ page }) => {
        await goto(page);
        await addAndSelect(page);

        // At 0° rotation: horizontal handles → ew-resize, vertical → ns-resize
        const before = await getHandleCursors(page);
        expect(before.filter(c => c === 'ew-resize')).toHaveLength(2);
        expect(before.filter(c => c === 'ns-resize')).toHaveLength(2);

        // Rotate 90° and call updateHandlesPosition() — as handleRotationMove does —
        // WITHOUT deselecting and reselecting.
        await page.evaluate(() => {
            const shape = AppState.getShape(AppState.selectedShape);
            shape.rotation = 90;
            Shapes.updateHandlesPosition(); // this is what rotation drag calls
        });
        await page.waitForTimeout(50);

        // After 90° rotation handles swap: former horizontal edge is now vertical on screen
        const after = await getHandleCursors(page);
        expect(after.filter(c => c === 'ns-resize'),
            'handles that were ew should now be ns after 90° rotation')
            .toHaveLength(2);
        expect(after.filter(c => c === 'ew-resize'),
            'handles that were ns should now be ew after 90° rotation')
            .toHaveLength(2);
    });

    test('rectangle: cursor updates at 45° rotation → all diagonal without reselect', async ({ page }) => {
        await goto(page);
        await addAndSelect(page);

        await page.evaluate(() => {
            const shape = AppState.getShape(AppState.selectedShape);
            shape.rotation = 45;
            Shapes.updateHandlesPosition();
        });
        await page.waitForTimeout(50);

        const cursors = await getHandleCursors(page);
        const diagonal = cursors.filter(c => c === 'nwse-resize' || c === 'nesw-resize');
        expect(diagonal, 'all 4 handles should be diagonal at 45°').toHaveLength(4);
    });

    test('arrow: cursor updates when arrow is rotated to 90° without reselect', async ({ page }) => {
        await goto(page);
        await page.evaluate(() => {
            Shapes.addShapeAtPosition('arrow', 2000, 1200);
            const shape = AppState.shapes[AppState.shapes.length - 1];
            shape.width = 600;
            shape.rotation = 0;
            AppState.selectedShape = shape.id;
            AppState.currentTool = 'select';
            Shapes.updateHandles();
        });
        await page.waitForTimeout(50);

        const before = await getHandleCursors(page);
        expect(before[0]).toBe('ew-resize');

        await page.evaluate(() => {
            const shape = AppState.getShape(AppState.selectedShape);
            shape.rotation = 90;
            Shapes.updateHandlesPosition();
        });
        await page.waitForTimeout(50);

        const after = await getHandleCursors(page);
        expect(after[0], 'arrow handle should become ns-resize after 90° rotation').toBe('ns-resize');
    });

    test('cursor snaps back to ew-resize when rotated back to 0°', async ({ page }) => {
        await goto(page);
        await addAndSelect(page);

        // Rotate to 90°
        await page.evaluate(() => {
            const shape = AppState.getShape(AppState.selectedShape);
            shape.rotation = 90;
            Shapes.updateHandlesPosition();
        });

        // Rotate back to 0°
        await page.evaluate(() => {
            const shape = AppState.getShape(AppState.selectedShape);
            shape.rotation = 0;
            Shapes.updateHandlesPosition();
        });
        await page.waitForTimeout(50);

        const cursors = await getHandleCursors(page);
        expect(cursors.filter(c => c === 'ew-resize')).toHaveLength(2);
        expect(cursors.filter(c => c === 'ns-resize')).toHaveLength(2);
    });
});
