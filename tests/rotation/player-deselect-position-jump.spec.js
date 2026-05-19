/**
 * Test for player position jump bug at 90° rotation.
 *
 * Bug: When board is rotated 90°, dragging a player by 1px (not from exact center)
 * causes the player to jump to a different position when deselected.
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

/** Add a player at a specific board position. */
async function addPlayerAt(page, x, y) {
    const playerId = await page.evaluate(({ x, y }) => {
        const player = {
            id: `player-${AppState.nextPlayerId++}`,
            teamId: AppState.teams[0].id,
            x: x,
            y: y,
            number: 1,
            rotation: 0,
            visible: true
        };
        AppState.players.push(player);
        Players.render();
        return player.id;
    }, { x, y });
    return playerId;
}

/** Get player position from AppState. */
async function getPlayerPosition(page, playerId) {
    return await page.evaluate((id) => {
        const player = AppState.players.find(p => p.id === id);
        if (!player) return null;
        return { x: player.x, y: player.y, rotation: player.rotation };
    }, playerId);
}

/** Get player screen position. */
async function getPlayerScreenPosition(page, playerId) {
    return await page.evaluate((id) => {
        const playerEl = document.getElementById(id);
        if (!playerEl) return null;
        const rect = playerEl.getBoundingClientRect();
        return {
            left: rect.left,
            top: rect.top,
            centerX: rect.left + rect.width / 2,
            centerY: rect.top + rect.height / 2
        };
    }, playerId);
}

test.describe('Player position jump on deselect at 90° rotation', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
    });

    test('player jumps position when deselected after small drag at 90°', async ({ page }) => {
        // Rotate board 90°
        await rightClickBoard(page);
        const menu = await getBoardCanvasMenu(page);
        await menu.locator('[data-action="rotate-right"]').click();
        await page.waitForTimeout(500);

        // Add a player at a known position
        const playerId = await addPlayerAt(page, 2000, 1000);
        await page.waitForTimeout(200);

        const initialPos = await getPlayerPosition(page, playerId);
        console.log('Initial player position:', initialPos);

        // Get player element before drag
        const playerBox = await page.locator(`#${playerId}`).boundingBox();
        const screenPosBeforeDrag = {
            left: playerBox.x,
            top: playerBox.y,
            centerX: playerBox.x + playerBox.width / 2,
            centerY: playerBox.y + playerBox.height / 2
        };
        console.log('Player bounding box before drag:', playerBox);

        // Drag from an offset position (NOT center) - offset by 5px from center
        // This is KEY to reproducing the bug - dragging from offset causes jump on deselect
        const dragStartX = screenPosBeforeDrag.centerX + 5;
        const dragStartY = screenPosBeforeDrag.centerY + 5;
        const dragEndX = dragStartX + 1;  // Drag only 1px as per bug description
        const dragEndY = dragStartY + 1;

        console.log(`Dragging player from (${dragStartX.toFixed(1)}, ${dragStartY.toFixed(1)}) to (${dragEndX.toFixed(1)}, ${dragEndY.toFixed(1)})`);

        // Trigger drag manually by calling the handlers
        await page.evaluate(({ id, startX, startY, endX, endY }) => {
            const playerEl = document.getElementById(id);
            if (!playerEl) {
                console.error('Player element not found!');
                return;
            }

            // Enable debug logging
            AppState.debugCoords = true;

            // Simulate mousedown event on player
            const mousedownEvent = new MouseEvent('mousedown', {
                bubbles: true,
                cancelable: true,
                clientX: startX,
                clientY: startY,
                button: 0
            });
            playerEl.dispatchEvent(mousedownEvent);

            // Call Players.handleMouseDown directly
            if (typeof Players !== 'undefined' && Players.handleMouseDown) {
                Players.handleMouseDown(mousedownEvent);
            }

            // Disable debug logging
            AppState.debugCoords = false;
        }, { id: playerId, startX: dragStartX, startY: dragStartY, endX: dragEndX, endY: dragEndY });

        await page.waitForTimeout(100);

        // Verify player is being dragged
        const dragStateAfterMouseDown = await page.evaluate((id) => {
            return {
                draggedPlayer: AppState.draggedPlayer ? AppState.draggedPlayer.id : null,
                selectedPlayerId: AppState.selectedPlayerId,
                dragOffset: AppState.dragOffset
            };
        }, playerId);
        console.log('After mousedown:', dragStateAfterMouseDown);

        // Simulate mouse move
        await page.evaluate(({ endX, endY }) => {
            const mousemoveEvent = new MouseEvent('mousemove', {
                bubbles: true,
                cancelable: true,
                clientX: endX,
                clientY: endY
            });
            if (typeof Players !== 'undefined' && Players.handleMouseMove) {
                Players.handleMouseMove(mousemoveEvent);
            }
        }, { endX: dragEndX, endY: dragEndY });

        await page.waitForTimeout(100);

        // Get position WHILE DRAGGING (mouse still down)
        const posWhileDragging = await getPlayerPosition(page, playerId);
        const screenWhileDragging = await getPlayerScreenPosition(page, playerId);
        console.log('Position WHILE DRAGGING:', posWhileDragging);
        console.log('Screen WHILE DRAGGING:', screenWhileDragging);

        // Simulate mouse up
        await page.evaluate(() => {
            const mouseupEvent = new MouseEvent('mouseup', {
                bubbles: true,
                cancelable: true
            });
            if (typeof Players !== 'undefined' && Players.handleMouseUp) {
                Players.handleMouseUp(mouseupEvent);
            }
        });

        await page.waitForTimeout(300);

        // Get position AFTER MOUSEUP (still selected, drag ended)
        const posWhileSelected = await getPlayerPosition(page, playerId);
        const screenPosWhileSelected = await getPlayerScreenPosition(page, playerId);
        console.log('Position AFTER MOUSEUP (still selected):', posWhileSelected);
        console.log('Screen AFTER MOUSEUP:', screenPosWhileSelected);

        // Check for jump when releasing mouse
        const jumpOnRelease_X = Math.abs(screenPosWhileSelected.left - screenWhileDragging.left);
        const jumpOnRelease_Y = Math.abs(screenPosWhileSelected.top - screenWhileDragging.top);
        console.log('Jump when releasing mouse:', { x: jumpOnRelease_X, y: jumpOnRelease_Y });

        // Calculate actual screen movement from the 1px drag
        const actualScreenMovement_X = Math.abs(screenWhileDragging.left - screenPosBeforeDrag.left);
        const actualScreenMovement_Y = Math.abs(screenWhileDragging.top - screenPosBeforeDrag.top);
        const totalScreenMovement = Math.sqrt(actualScreenMovement_X ** 2 + actualScreenMovement_Y ** 2);

        console.log('\n=== BUG DETECTION: DRAG AMPLIFICATION ===');
        console.log(`Drag input: 1px diagonal`);
        console.log(`Actual screen movement: X=${actualScreenMovement_X.toFixed(2)}px, Y=${actualScreenMovement_Y.toFixed(2)}px`);
        console.log(`Total movement: ${totalScreenMovement.toFixed(2)}px`);
        console.log(`Amplification factor: ${totalScreenMovement.toFixed(1)}x`);

        if (totalScreenMovement > 2) {
            console.log(`⚠️  BUG DETECTED: 1px drag caused ${totalScreenMovement.toFixed(1)}px movement (${totalScreenMovement.toFixed(0)}x amplification)!`);
        }

        // Click on empty board to deselect
        const canvasRect = await page.locator('#board-canvas').boundingBox();
        await page.mouse.click(canvasRect.x + 50, canvasRect.y + 50);
        await page.waitForTimeout(200);

        // Get position after deselecting
        const posAfterDeselect = await getPlayerPosition(page, playerId);
        const screenPosAfterDeselect = await getPlayerScreenPosition(page, playerId);
        console.log('Position after deselect:', posAfterDeselect);
        console.log('Screen position after deselect:', screenPosAfterDeselect);

        // Calculate the jump (compare to INITIAL position, not selected position)
        const boardJumpX = Math.abs(posAfterDeselect.x - initialPos.x);
        const boardJumpY = Math.abs(posAfterDeselect.y - initialPos.y);

        // For screen position, compare selected vs after deselect to detect visual jump
        const screenJumpFromSelected_X = Math.abs(screenPosAfterDeselect.left - screenPosWhileSelected.left);
        const screenJumpFromSelected_Y = Math.abs(screenPosAfterDeselect.top - screenPosWhileSelected.top);

        // Also compare screen position before drag vs after deselect
        const screenJumpTotal_X = Math.abs(screenPosAfterDeselect.left - screenPosBeforeDrag.left);
        const screenJumpTotal_Y = Math.abs(screenPosAfterDeselect.top - screenPosBeforeDrag.top);

        console.log('\n=== POSITION JUMP ===');
        console.log('Board coordinates change from initial:', { x: boardJumpX, y: boardJumpY });
        console.log('Screen position while selected vs before drag:', {
            left: screenPosWhileSelected.left - screenPosBeforeDrag.left,
            top: screenPosWhileSelected.top - screenPosBeforeDrag.top
        });
        console.log('Visual jump on deselect:', { x: screenJumpFromSelected_X, y: screenJumpFromSelected_Y });
        console.log('Total screen position change (before drag -> after deselect):', { x: screenJumpTotal_X, y: screenJumpTotal_Y });

        // THE BUG: Drag amplification at 90° rotation
        // A 1px drag input should result in approximately 1px of screen movement
        // But due to incorrect drag offset calculation at 90°, it gets amplified significantly

        // Assertion: 1px drag should NOT cause more than 2px of screen movement
        // (totalScreenMovement was calculated earlier from actualScreenMovement_X and actualScreenMovement_Y)
        expect(totalScreenMovement).toBeLessThan(2);

        if (screenJumpFromSelected_X > 0.5 || screenJumpFromSelected_Y > 0.5) {
            console.log('\n⚠️  SECONDARY BUG: Player position jumps on deselect!');
            console.log(`Visual jump: ${screenJumpFromSelected_X.toFixed(2)}px horizontal, ${screenJumpFromSelected_Y.toFixed(2)}px vertical`);
        }

        // Also expect no visual jump when deselecting
        expect(screenJumpFromSelected_X).toBeLessThan(0.5);  // Visual jump should be < 0.5px
        expect(screenJumpFromSelected_Y).toBeLessThan(0.5);  // Visual jump should be < 0.5px
    });

    test('player position stable when deselected without drag at 90°', async ({ page }) => {
        // Control test: verify no jump happens if we don't drag

        // Rotate board 90°
        await rightClickBoard(page);
        const menu = await getBoardCanvasMenu(page);
        await menu.locator('[data-action="rotate-right"]').click();
        await page.waitForTimeout(500);

        // Add a player
        const playerId = await addPlayerAt(page, 2000, 1000);
        await page.waitForTimeout(200);

        const initialPos = await getPlayerPosition(page, playerId);

        // Select the player (just click, no drag)
        const screenPos = await getPlayerScreenPosition(page, playerId);
        await page.mouse.click(screenPos.centerX, screenPos.centerY);
        await page.waitForTimeout(100);

        const posWhileSelected = await getPlayerPosition(page, playerId);

        // Deselect
        const canvasRect = await page.locator('#board-canvas').boundingBox();
        await page.mouse.click(canvasRect.x + 50, canvasRect.y + 50);
        await page.waitForTimeout(200);

        const posAfterDeselect = await getPlayerPosition(page, playerId);

        console.log('Initial:', initialPos);
        console.log('While selected:', posWhileSelected);
        console.log('After deselect:', posAfterDeselect);

        // Position should remain stable
        expect(Math.abs(posAfterDeselect.x - initialPos.x)).toBeLessThan(0.1);
        expect(Math.abs(posAfterDeselect.y - initialPos.y)).toBeLessThan(0.1);
    });
});
