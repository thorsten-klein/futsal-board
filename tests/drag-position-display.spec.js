/**
 * Tests that the position display (bottom-right) is shown while dragging
 * objects from the sidebar onto the board, and hidden when the drag leaves.
 */
import { test, expect } from './test-config.js';
import { goto } from './helpers.js';

/** Helper: get the centre of the board container in viewport coords. */
async function boardCenter(page) {
    const bb = await page.locator('.board-container').boundingBox();
    return { x: bb.x + bb.width / 2, y: bb.y + bb.height / 2 };
}

/** Dispatch a synthetic DragEvent on an element with optional clientX/Y. */
async function dispatchDrag(page, selector, type, { clientX, clientY, dataTransfer = {} } = {}) {
    await page.evaluate(({ selector, type, clientX, clientY, dataTransfer }) => {
        const el = document.querySelector(selector);
        const dt = new DataTransfer();
        Object.entries(dataTransfer).forEach(([key, val]) => dt.setData(key, val));
        el.dispatchEvent(new DragEvent(type, {
            bubbles: true, cancelable: true,
            clientX, clientY,
            dataTransfer: dt,
        }));
    }, { selector, type, clientX, clientY, dataTransfer });
}

test.describe('Position display during sidebar drag', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
    });

    test('position display appears when dragging a player template over the board', async ({ page }) => {
        const display = page.locator('#position-display');
        // Initially hidden
        await expect(display).toHaveClass(/hidden/);

        // Simulate dragstart by setting Teams.draggedTemplate
        await page.evaluate(() => { Teams.draggedTemplate = AppState.teams[0].id; });

        // Dispatch dragover on the board at a specific position
        const { x, y } = await boardCenter(page);
        await dispatchDrag(page, '.board-container', 'dragover', { clientX: x, clientY: y });

        // Position display should now be visible with coordinates
        await expect(display).not.toHaveClass(/hidden/);
        await expect(display).toContainText('X:');
    });

    test('position display appears when dragging a ball template over the board', async ({ page }) => {
        const display = page.locator('#position-display');
        await expect(display).toHaveClass(/hidden/);

        const { x, y } = await boardCenter(page);
        // Ball dragover handler checks for 'ballcolor' in dataTransfer.types
        await dispatchDrag(page, '.board-container', 'dragover', {
            clientX: x, clientY: y,
            dataTransfer: { ballcolor: 'white' },
        });

        await expect(display).not.toHaveClass(/hidden/);
        await expect(display).toContainText('X:');
    });

    test('position display appears when dragging a plate template over the board', async ({ page }) => {
        const display = page.locator('#position-display');
        await expect(display).toHaveClass(/hidden/);

        const { x, y } = await boardCenter(page);
        // Plate dragover handler checks for 'platecolor' in dataTransfer.types
        await dispatchDrag(page, '.board-container', 'dragover', {
            clientX: x, clientY: y,
            dataTransfer: { platecolor: '#FFFFFF' },
        });

        await expect(display).not.toHaveClass(/hidden/);
        await expect(display).toContainText('X:');
    });

    test('position display appears when dragging an element over the board', async ({ page }) => {
        const display = page.locator('#position-display');
        await expect(display).toHaveClass(/hidden/);

        const { x, y } = await boardCenter(page);
        // Elements dragover accepts any drag (no type check)
        await dispatchDrag(page, '.board-container', 'dragover', {
            clientX: x, clientY: y,
            dataTransfer: { elementType: 'cone' },
        });

        await expect(display).not.toHaveClass(/hidden/);
        await expect(display).toContainText('X:');
    });

    test('position display appears when dragging a shape over the board', async ({ page }) => {
        const display = page.locator('#position-display');
        await expect(display).toHaveClass(/hidden/);

        const { x, y } = await boardCenter(page);
        // Shape dragover checks for 'shapetype' in dataTransfer.types
        await page.evaluate(() => { window._testCurrentDragType = 'rectangle'; });
        await dispatchDrag(page, '.board-container', 'dragover', {
            clientX: x, clientY: y,
            dataTransfer: { shapetype: 'rectangle' },
        });

        await expect(display).not.toHaveClass(/hidden/);
        await expect(display).toContainText('X:');
    });

    test('position display updates with board coordinates as drag moves', async ({ page }) => {
        await page.evaluate(() => { Teams.draggedTemplate = AppState.teams[0].id; });

        const bb = await page.locator('.board-container').boundingBox();
        // Drag over left part of board
        await dispatchDrag(page, '.board-container', 'dragover', {
            clientX: bb.x + 100, clientY: bb.y + 100,
        });
        const text1 = await page.locator('#position-display').textContent();

        // Drag over right part of board
        await dispatchDrag(page, '.board-container', 'dragover', {
            clientX: bb.x + bb.width - 100, clientY: bb.y + bb.height - 100,
        });
        const text2 = await page.locator('#position-display').textContent();

        // Coordinates should differ
        expect(text1).not.toBe(text2);
    });

    test('position display hides when drag leaves the board (player drag)', async ({ page }) => {
        await page.evaluate(() => { Teams.draggedTemplate = AppState.teams[0].id; });

        const { x, y } = await boardCenter(page);
        await dispatchDrag(page, '.board-container', 'dragover', { clientX: x, clientY: y });

        const display = page.locator('#position-display');
        await expect(display).not.toHaveClass(/hidden/);

        // Dispatch dragleave
        await dispatchDrag(page, '.board-container', 'dragleave', { clientX: 0, clientY: 0 });

        await expect(display).toHaveClass(/hidden/);
    });
});
