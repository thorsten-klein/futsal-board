/**
 * Test for bug: Object sizes change when sidebar width changes
 * (both at 0° and 90° rotation)
 *
 * Objects should maintain their size relative to the board dimensions,
 * not change based on container/sidebar width.
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

/** Rotate the board 90° clockwise. */
async function rotateBoard90(page) {
    await rightClickBoard(page);
    const menu = await getBoardCanvasMenu(page);
    await menu.locator('[data-action="rotate-right"]').click();
    await page.waitForTimeout(300);
}

/** Get player visual size in pixels. */
async function getPlayerSize(page, playerId) {
    return await page.evaluate((id) => {
        const playerElement = document.getElementById(id);
        if (!playerElement) return null;

        const rect = playerElement.getBoundingClientRect();
        return {
            width: rect.width,
            height: rect.height
        };
    }, playerId);
}

/** Resize the sidebar to a specific width. */
async function resizeSidebar(page, newWidth) {
    await page.evaluate((width) => {
        const toolbar = document.querySelector('.toolbar');
        toolbar.style.width = width + 'px';
        localStorage.setItem('sidebarWidth', width);

        // Trigger the same resize logic as in the app
        requestAnimationFrame(() => {
            Board.resize();
            Players.render();
        });
    }, newWidth);

    await page.waitForTimeout(100);
}

test.describe('Object size stability when sidebar resizes', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
    });

    test('player size should scale proportionally with canvas at 0° rotation', async ({ page }) => {
        console.log('\n=== TEST: Player size at 0° rotation ===');

        // Create a player at center
        const playerId = await page.evaluate(() => {
            const player = {
                id: `player-${AppState.nextPlayerId++}`,
                teamId: AppState.teams[0].id,
                x: AppState.boardWidth / 2,
                y: AppState.boardHeight / 2,
                number: 1,
                rotation: 0,
                visible: true
            };
            AppState.players.push(player);
            Players.render();
            return player.id;
        });

        // Get player size and canvas size before sidebar resize
        const beforeData = await page.evaluate((id) => {
            const playerElement = document.getElementById(id);
            const canvas = document.getElementById('board-canvas');
            const playerRect = playerElement.getBoundingClientRect();
            return {
                playerWidth: playerRect.width,
                playerHeight: playerRect.height,
                canvasWidth: canvas.width,
                canvasHeight: canvas.height
            };
        }, playerId);

        console.log(`Before: player=${beforeData.playerWidth.toFixed(2)}x${beforeData.playerHeight.toFixed(2)}, canvas=${beforeData.canvasWidth}x${beforeData.canvasHeight}`);

        // Change sidebar width from 280px to 400px
        await resizeSidebar(page, 400);

        // Get player size and canvas size after sidebar resize
        const afterData = await page.evaluate((id) => {
            const playerElement = document.getElementById(id);
            const canvas = document.getElementById('board-canvas');
            const playerRect = playerElement.getBoundingClientRect();
            return {
                playerWidth: playerRect.width,
                playerHeight: playerRect.height,
                canvasWidth: canvas.width,
                canvasHeight: canvas.height
            };
        }, playerId);

        console.log(`After: player=${afterData.playerWidth.toFixed(2)}x${afterData.playerHeight.toFixed(2)}, canvas=${afterData.canvasWidth}x${afterData.canvasHeight}`);

        // At 0° rotation, player size SHOULD change proportionally with canvas size
        // This is expected and correct behavior
        const canvasScaleRatio = afterData.canvasWidth / beforeData.canvasWidth;
        const playerScaleRatio = afterData.playerWidth / beforeData.playerWidth;

        console.log(`Canvas scale ratio: ${canvasScaleRatio.toFixed(4)}`);
        console.log(`Player scale ratio: ${playerScaleRatio.toFixed(4)}`);
        console.log(`Scale ratio difference: ${Math.abs(playerScaleRatio - canvasScaleRatio).toFixed(6)}`);

        // Player should scale proportionally with canvas (within 1% tolerance)
        expect(Math.abs(playerScaleRatio - canvasScaleRatio)).toBeLessThan(0.01);
    });

    test('player size should not change when sidebar width changes at 90° rotation', async ({ page }) => {
        console.log('\n=== TEST: Player size at 90° rotation ===');

        // Create a player at center
        const playerId = await page.evaluate(() => {
            const player = {
                id: `player-${AppState.nextPlayerId++}`,
                teamId: AppState.teams[0].id,
                x: AppState.boardWidth / 2,
                y: AppState.boardHeight / 2,
                number: 1,
                rotation: 0,
                visible: true
            };
            AppState.players.push(player);
            Players.render();
            return player.id;
        });

        // Rotate board 90°
        await rotateBoard90(page);

        // Get player size before sidebar resize
        const sizeBefore = await getPlayerSize(page, playerId);
        console.log(`Player size before resize (at 90°): ${sizeBefore.width.toFixed(2)} x ${sizeBefore.height.toFixed(2)}`);

        // Change sidebar width from 280px to 400px
        await resizeSidebar(page, 400);

        // Get player size after sidebar resize
        const sizeAfter = await getPlayerSize(page, playerId);
        console.log(`Player size after resize (at 90°): ${sizeAfter.width.toFixed(2)} x ${sizeAfter.height.toFixed(2)}`);

        const widthChange = sizeAfter.width - sizeBefore.width;
        const heightChange = sizeAfter.height - sizeBefore.height;
        console.log(`Size change: width=${widthChange.toFixed(2)}px, height=${heightChange.toFixed(2)}px`);

        // This is the bug: player size SHOULD NOT change when sidebar width changes
        expect(Math.abs(widthChange)).toBeLessThan(1);
        expect(Math.abs(heightChange)).toBeLessThan(1);
    });

    test('effective on-screen scale stays constant when sidebar width changes at 90° rotation', async ({ page }) => {
        console.log('\n=== TEST: effective scale stability at 90° rotation ===');

        // Rotate board 90°
        await rotateBoard90(page);

        // Get scales before sidebar resize
        const statesBefore = await page.evaluate(() => ({
            referenceScale: AppState.referenceScale,
            scaleFactor: AppState.boardRotationScaleFactor
        }));
        console.log(`referenceScale before: ${statesBefore.referenceScale}`);
        console.log(`scaleFactor before:    ${statesBefore.scaleFactor}`);

        // Change sidebar width
        await resizeSidebar(page, 400);

        // Get scales after sidebar resize
        const statesAfter = await page.evaluate(() => ({
            referenceScale: AppState.referenceScale,
            scaleFactor: AppState.boardRotationScaleFactor
        }));
        console.log(`referenceScale after:  ${statesAfter.referenceScale}`);
        console.log(`scaleFactor after:     ${statesAfter.scaleFactor}`);

        // When the sidebar changes container width (not height), the CSS scale factor
        // is updated by Board.resize() → updateBoardVisualRotation().  referenceScale
        // (= scaleAt0) changes with container width, but scaleFactor compensates so
        // their product — the effective on-screen pixels per board unit — stays constant.
        const effectiveBefore = statesBefore.referenceScale * statesBefore.scaleFactor;
        const effectiveAfter  = statesAfter.referenceScale  * statesAfter.scaleFactor;
        console.log(`effective scale before: ${effectiveBefore.toFixed(6)}`);
        console.log(`effective scale after:  ${effectiveAfter.toFixed(6)}`);

        expect(Math.abs(effectiveAfter - effectiveBefore)).toBeLessThan(0.001);
    });
});
