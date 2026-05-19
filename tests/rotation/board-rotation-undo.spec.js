/**
 * Tests for board rotation undo/redo functionality.
 *
 * - Undoing a rotation restores the previous board rotation angle
 * - Redoing a rotation reapplies the rotation
 * - Visual rotation updates correctly on undo/redo
 * - Multiple rotations can be undone/redone
 */
import { test, expect } from '../test-config.js';
import { goto } from '../helpers.js';

/** Right-click on an empty part of the board to open context menu. */
async function rightClickBoard(page) {
    const bb = await page.locator('#board-canvas').boundingBox();
    await page.mouse.click(bb.x + 10, bb.y + 10, { button: 'right' });
}

/** Get the board canvas context menu. */
async function getBoardCanvasMenu(page) {
    const menu = page.locator('#board-canvas-context-menu');
    await expect(menu).toBeVisible({ timeout: 3000 });
    return menu;
}

test.describe('Board rotation undo/redo', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
    });

    test('undo restores previous board rotation', async ({ page }) => {
        // Initial rotation is 0
        let rotation = await page.evaluate(() => AppState.boardRotation);
        expect(rotation).toBe(0);

        // Rotate board right
        await rightClickBoard(page);
        const menu = await getBoardCanvasMenu(page);
        await menu.locator('[data-action="rotate-right"]').click();

        rotation = await page.evaluate(() => AppState.boardRotation);
        expect(rotation).toBe(90);

        // Undo
        await page.keyboard.press('Control+z');
        await page.waitForTimeout(100);

        rotation = await page.evaluate(() => AppState.boardRotation);
        expect(rotation).toBe(0);
    });

    test('redo reapplies board rotation', async ({ page }) => {
        // Rotate board right
        await rightClickBoard(page);
        const menu = await getBoardCanvasMenu(page);
        await menu.locator('[data-action="rotate-right"]').click();

        let rotation = await page.evaluate(() => AppState.boardRotation);
        expect(rotation).toBe(90);

        // Undo
        await page.keyboard.press('Control+z');
        rotation = await page.evaluate(() => AppState.boardRotation);
        expect(rotation).toBe(0);

        // Redo
        await page.keyboard.press('Control+Shift+z');
        await page.waitForTimeout(100);

        rotation = await page.evaluate(() => AppState.boardRotation);
        expect(rotation).toBe(90);
    });

    test('multiple rotations can be undone', async ({ page }) => {
        // Rotate right twice
        await rightClickBoard(page);
        let menu = await getBoardCanvasMenu(page);
        await menu.locator('[data-action="rotate-right"]').click();

        await rightClickBoard(page);
        menu = await getBoardCanvasMenu(page);
        await menu.locator('[data-action="rotate-right"]').click();

        let rotation = await page.evaluate(() => AppState.boardRotation);
        expect(rotation).toBe(180);

        // Undo once
        await page.keyboard.press('Control+z');
        await page.waitForTimeout(100);
        rotation = await page.evaluate(() => AppState.boardRotation);
        expect(rotation).toBe(90);

        // Undo again
        await page.keyboard.press('Control+z');
        await page.waitForTimeout(100);
        rotation = await page.evaluate(() => AppState.boardRotation);
        expect(rotation).toBe(0);
    });

    test('undo/redo with mixed left/right rotations', async ({ page }) => {
        // Rotate right
        await rightClickBoard(page);
        let menu = await getBoardCanvasMenu(page);
        await menu.locator('[data-action="rotate-right"]').click();

        // Rotate left
        await rightClickBoard(page);
        menu = await getBoardCanvasMenu(page);
        await menu.locator('[data-action="rotate-left"]').click();

        let rotation = await page.evaluate(() => AppState.boardRotation);
        expect(rotation).toBe(0);

        // Undo left rotation
        await page.keyboard.press('Control+z');
        await page.waitForTimeout(100);
        rotation = await page.evaluate(() => AppState.boardRotation);
        expect(rotation).toBe(90);

        // Undo right rotation
        await page.keyboard.press('Control+z');
        await page.waitForTimeout(100);
        rotation = await page.evaluate(() => AppState.boardRotation);
        expect(rotation).toBe(0);

        // Redo right rotation
        await page.keyboard.press('Control+Shift+z');
        await page.waitForTimeout(100);
        rotation = await page.evaluate(() => AppState.boardRotation);
        expect(rotation).toBe(90);

        // Redo left rotation
        await page.keyboard.press('Control+Shift+z');
        await page.waitForTimeout(100);
        rotation = await page.evaluate(() => AppState.boardRotation);
        expect(rotation).toBe(0);
    });

    test('undo button restores board rotation', async ({ page }) => {
        // Rotate board right
        await rightClickBoard(page);
        const menu = await getBoardCanvasMenu(page);
        await menu.locator('[data-action="rotate-right"]').click();

        let rotation = await page.evaluate(() => AppState.boardRotation);
        expect(rotation).toBe(90);

        // Click undo button
        await page.click('#btn-undo');
        await page.waitForTimeout(100);

        rotation = await page.evaluate(() => AppState.boardRotation);
        expect(rotation).toBe(0);
    });

    test('redo button reapplies board rotation', async ({ page }) => {
        // Rotate board right
        await rightClickBoard(page);
        const menu = await getBoardCanvasMenu(page);
        await menu.locator('[data-action="rotate-right"]').click();

        // Undo
        await page.keyboard.press('Control+z');
        await page.waitForTimeout(100);

        // Click redo button
        await page.click('#btn-redo');
        await page.waitForTimeout(100);

        const rotation = await page.evaluate(() => AppState.boardRotation);
        expect(rotation).toBe(90);
    });

    test('undo restores element positions after rotation', async ({ page }) => {
        // Add a player at a known position
        await page.evaluate(() => {
            const player = {
                id: `player-${AppState.nextPlayerId++}`,
                x: 2500,
                y: 1250,
                teamId: 'team-1',
                number: 1,
                rotation: 0
            };
            AppState.players.push(player);
            Players.render();
            AppState.saveToLocalStorage(); // Ensure history entry is created
        });

        // Wait a bit to ensure history entry is separate
        await page.waitForTimeout(100);

        const beforePos = await page.evaluate(() => {
            const player = AppState.players[0];
            return player ? { x: player.x, y: player.y, rotation: player.rotation } : null;
        });

        expect(beforePos).not.toBeNull();

        // Rotate board right
        await rightClickBoard(page);
        const menu = await getBoardCanvasMenu(page);
        await menu.locator('[data-action="rotate-right"]').click();

        // Verify rotation changed (coordinates stay same with CSS transform)
        const afterRotation = await page.evaluate(() => {
            const player = AppState.players[0];
            return { x: player.x, y: player.y, rotation: player.rotation };
        });
        // Coordinates don't change (CSS transform handles visual rotation)
        expect(afterRotation.x).toBe(beforePos.x);
        expect(afterRotation.y).toBe(beforePos.y);
        // Player rotation value stays the same (board layer transform handles visual rotation)
        expect(afterRotation.rotation).toBe(0);

        // Undo
        await page.keyboard.press('Control+z');
        await page.waitForTimeout(100);

        // Verify position restored
        const afterUndo = await page.evaluate(() => {
            const player = AppState.players[0];
            return player ? { x: player.x, y: player.y, rotation: player.rotation } : null;
        });

        expect(afterUndo).not.toBeNull();
        expect(Math.abs(afterUndo.x - beforePos.x)).toBeLessThan(1);
        expect(Math.abs(afterUndo.y - beforePos.y)).toBeLessThan(1);
        expect(afterUndo.rotation).toBe(beforePos.rotation);
    });

    test('visual rotation updates on undo', async ({ page }) => {
        // Rotate board right
        await rightClickBoard(page);
        const menu = await getBoardCanvasMenu(page);
        await menu.locator('[data-action="rotate-right"]').click();
        await page.waitForTimeout(200);

        // Check SVG has rotation transform
        const rotatedTransform = await page.evaluate(() => {
            const courtSvg = document.getElementById('court-svg');
            return courtSvg ? courtSvg.style.transform : null;
        });
        expect(rotatedTransform).toContain('rotate(90deg)');

        // Undo
        await page.keyboard.press('Control+z');
        await page.waitForTimeout(200);

        // Check SVG rotation is back to 0
        const undoneTransform = await page.evaluate(() => {
            const courtSvg = document.getElementById('court-svg');
            return courtSvg ? courtSvg.style.transform : null;
        });
        // Should be rotate(0deg) with scale(1), or just contain rotate(0deg)
        expect(undoneTransform).toContain('rotate(0deg)');
    });

    test('context menu shows correct angle after undo', async ({ page }) => {
        // Rotate board right
        await rightClickBoard(page);
        let menu = await getBoardCanvasMenu(page);
        await menu.locator('[data-action="rotate-right"]').click();

        // Undo
        await page.keyboard.press('Control+z');
        await page.waitForTimeout(300);

        // Open context menu again
        await rightClickBoard(page);
        await page.waitForTimeout(200);
        menu = await getBoardCanvasMenu(page);

        // Check angle display
        const angleText = await menu.locator('#board-angle-display').textContent();
        expect(angleText).toBe('Current Rotation: 0°');
    });

    test('undo does not affect other board state', async ({ page }) => {
        // Add a ball
        await page.evaluate(() => {
            const ball = {
                id: `ball-${AppState.nextBallId++}`,
                x: 2500,
                y: 1250,
                color: '#ffffff'
            };
            AppState.balls.push(ball);
            Balls.render();
            AppState.saveToLocalStorage(); // Ensure history entry is created
        });

        // Wait to ensure history entry is separate
        await page.waitForTimeout(100);

        const ballCountBefore = await page.evaluate(() => AppState.balls.length);
        expect(ballCountBefore).toBe(1);

        // Rotate board
        await rightClickBoard(page);
        const menu = await getBoardCanvasMenu(page);
        await menu.locator('[data-action="rotate-right"]').click();

        // Undo rotation
        await page.keyboard.press('Control+z');
        await page.waitForTimeout(100);

        // Ball should still exist
        const ballCount = await page.evaluate(() => AppState.balls.length);
        expect(ballCount).toBe(1);
    });
});
