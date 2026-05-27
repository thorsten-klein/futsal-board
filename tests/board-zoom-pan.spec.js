/**
 * Tests for board zoom + pan.
 *
 * Coverage:
 *  - Buttons exist in the top-right of .board-container.
 *  - Clicking +/- changes AppState.boardZoom in 1.5x steps and clamps to [1, 4].
 *  - The CSS scale on the layers reflects the new zoom.
 *  - Ctrl + wheel zooms toward the cursor (the board coord under the cursor
 *    stays roughly the same before and after the zoom).
 *  - Middle-mouse drag pans the board (layer CSS left changes).
 *  - screenToBoardCoords stays correct at zoom != 1 (the entity under a click
 *    is the same one as at zoom = 1).
 */
import { test, expect } from './test-config.js';
import { goto, addPlayer, boardCenter } from './helpers.js';

test.describe('Board zoom + pan', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
    });

    test('zoom buttons render in top-right of board-container', async ({ page }) => {
        const inBtn = page.locator('#btn-zoom-in');
        const outBtn = page.locator('#btn-zoom-out');
        await expect(inBtn).toBeVisible();
        await expect(outBtn).toBeVisible();

        const containerBox = await page.locator('.board-container').boundingBox();
        const inBox = await inBtn.boundingBox();

        // Right-edge of button should be within 24 px of the container's right edge.
        expect(containerBox.x + containerBox.width - (inBox.x + inBox.width)).toBeLessThan(24);
        // Top of button should be within 24 px of the top of the container.
        expect(inBox.y - containerBox.y).toBeLessThan(24);
    });

    test('clicking zoom in increases boardZoom and updates layer scale', async ({ page }) => {
        await page.locator('#btn-zoom-in').click();
        await page.waitForTimeout(80);

        const state = await page.evaluate(() => {
            const layer = document.getElementById('players-layer');
            const t = getComputedStyle(layer).transform;
            const m = new DOMMatrix(t === 'none' ? '' : t);
            return {
                boardZoom: AppState.boardZoom,
                scaleX: Math.hypot(m.a, m.b),
            };
        });

        expect(state.boardZoom).toBeCloseTo(1.5, 5);
        // Default rotation = 0, so scaleFactor = 1, so CSS scale should equal zoom.
        expect(state.scaleX).toBeCloseTo(1.5, 1);
    });

    test('zoom in clamps at boardZoomMax (4)', async ({ page }) => {
        // Each click is gated by the disabled state, so loop until disabled
        // instead of forcing N clicks (which would race the disabled toggle).
        const inBtn = page.locator('#btn-zoom-in');
        for (let i = 0; i < 20; i++) {
            if (await inBtn.isDisabled()) break;
            await inBtn.click();
            await page.waitForTimeout(20);
        }
        const z = await page.evaluate(() => AppState.boardZoom);
        expect(z).toBeCloseTo(4, 5);
        await expect(inBtn).toBeDisabled();
    });

    test('zoom out clamps at boardZoomMin (1)', async ({ page }) => {
        // Use the API to jump to max zoom, then click - until disabled.
        await page.evaluate(() => Zoom.setZoom(4));
        await page.waitForTimeout(50);
        const outBtn = page.locator('#btn-zoom-out');
        for (let i = 0; i < 20; i++) {
            if (await outBtn.isDisabled()) break;
            await outBtn.click();
            await page.waitForTimeout(20);
        }
        const z = await page.evaluate(() => AppState.boardZoom);
        expect(z).toBeCloseTo(1, 5);
        await expect(outBtn).toBeDisabled();
    });

    test('ctrl + wheel zooms toward the cursor (board coord under cursor stays the same)', async ({ page }) => {
        // Pick a target point off-centre so cursor-anchored zoom is measurable.
        const containerBox = await page.locator('.board-container').boundingBox();
        const targetX = containerBox.x + containerBox.width * 0.75;
        const targetY = containerBox.y + containerBox.height * 0.30;

        const boardBefore = await page.evaluate(({ x, y }) =>
            Utils.screenToBoardCoords(x, y), { x: targetX, y: targetY });

        await page.mouse.move(targetX, targetY);
        await page.keyboard.down('Control');
        // Negative deltaY = zoom in. Repeat a few times to make a clearly different zoom.
        await page.mouse.wheel(0, -300);
        await page.mouse.wheel(0, -300);
        await page.keyboard.up('Control');
        await page.waitForTimeout(80);

        const zoomAfter = await page.evaluate(() => AppState.boardZoom);
        expect(zoomAfter).toBeGreaterThan(1.2);

        const boardAfter = await page.evaluate(({ x, y }) =>
            Utils.screenToBoardCoords(x, y), { x: targetX, y: targetY });

        console.log('cursor-anchored zoom:', { boardBefore, boardAfter, zoomAfter });
        // The board point under the cursor should be invariant across the zoom (within a few board pixels of jitter).
        expect(Math.abs(boardAfter.x - boardBefore.x)).toBeLessThan(20);
        expect(Math.abs(boardAfter.y - boardBefore.y)).toBeLessThan(20);
    });

    test('middle-mouse drag pans the board', async ({ page }) => {
        // Zoom in first; pan only makes sense (and is allowed) when zoom > 1.
        await page.locator('#btn-zoom-in').click();
        await page.waitForTimeout(50);

        const start = await boardCenter(page);
        await page.mouse.move(start.x, start.y);
        await page.mouse.down({ button: 'middle' });
        await page.mouse.move(start.x + 80, start.y + 40, { steps: 10 });
        await page.mouse.up({ button: 'middle' });
        await page.waitForTimeout(80);

        const pan = await page.evaluate(() => ({
            panX: AppState.boardPanX,
            panY: AppState.boardPanY,
        }));
        expect(pan.panX).toBeGreaterThan(40);
        expect(pan.panY).toBeGreaterThan(20);
    });

    test('clicking on a player still selects it at zoom = 2', async ({ page }) => {
        // Add a player and zoom in.
        await addPlayer(page);
        const playerId = await page.evaluate(() => AppState.players[0].id);

        await page.evaluate(() => Zoom.setZoom(2));
        await page.waitForTimeout(80);

        // Find the (now zoomed) player's visual centre and click it.
        const box = await page.locator(`#${playerId}`).boundingBox();
        await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
        await page.waitForTimeout(80);

        const selectedId = await page.evaluate(() => AppState.selectedPlayer && AppState.selectedPlayer.id);
        expect(selectedId).toBe(playerId);
    });
});
