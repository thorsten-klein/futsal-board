/**
 * Comprehensive user-workflow tests.
 *
 * These tests simulate how a coach actually uses the app:
 *   • Create a board, place players / balls / cones / shapes
 *   • Move objects around
 *   • Create child boards (animation frames)
 *   • Add ghost-path intermediates (waypoints)
 *   • Play / pause the animation at various points
 *   • Navigate between boards
 *   • Verify that object positions are NEVER corrupted
 *
 * Key bug being tested:
 *   When play() starts it mutates player.x/y to the ROOT start positions but
 *   leaves `_explicitlySet = true` on any player that was dragged on the child
 *   board.  If the user navigates away (triggering saveCurrentBoard) while the
 *   animation is running or paused, those intermediate positions get written to
 *   the child board's saved data, permanently corrupting the layout.
 */
import { test, expect } from './test-config.js';
import { goto, addPlayer, addBall, addElement, addPlate } from './helpers.js';

// ── Shared helpers ─────────────────────────────────────────────────────────────

/** Switch to a board by ID via the real Storage.switchBoard() so the fix is exercised. */
async function switchBoard(page, boardId) {
    await page.evaluate(id => Storage.switchBoard(id), boardId);
    await page.waitForTimeout(200);
}

/**
 * Create a child board from the current board and switch to it.
 * Returns the new child board ID.
 */
async function createChildBoard(page) {
    const childId = await page.evaluate(() => {
        AppState.saveCurrentBoard();
        const childId = AppState.createChildBoard(AppState.currentBoardId);
        if (childId) {
            AppState.loadBoard(childId);
            Players.render();
            Balls.render();
            Elements.render();
            Plates.render();
            Shapes.render();
            Animations.renderParentPaths();
        }
        return childId;
    });
    await page.waitForTimeout(300);
    return childId;
}

/**
 * Move a player to a new position on the current board.
 * Sets _explicitlySet so saveCurrentBoard() will persist it.
 */
async function movePlayer(page, playerId, x, y) {
    await page.evaluate(({ id, x, y }) => {
        const player = AppState.players.find(p => p.id === id);
        if (!player) throw new Error('Player not found: ' + id);
        player.x = x;
        player.y = y;
        player._explicitlySet = true;
        Players.render();
        Animations.renderParentPaths();
    }, { id: playerId, x, y });
}

/**
 * Move a ball to a new position on the current board.
 */
async function moveBall(page, ballId, x, y) {
    await page.evaluate(({ id, x, y }) => {
        const ball = AppState.balls.find(b => b.id === id);
        if (!ball) throw new Error('Ball not found: ' + id);
        ball.x = x;
        ball.y = y;
        ball._explicitlySet = true;
        Balls.render();
        Animations.renderParentPaths();
    }, { id: ballId, x, y });
}

/** Get current in-memory position of a player. */
async function getPlayerPos(page, playerId) {
    return page.evaluate(id => {
        const p = AppState.players.find(p => p.id === id);
        return p ? { x: p.x, y: p.y } : null;
    }, playerId);
}

/** Get current in-memory position of a ball. */
async function getBallPos(page, ballId) {
    return page.evaluate(id => {
        const b = AppState.balls.find(b => b.id === id);
        return b ? { x: b.x, y: b.y } : null;
    }, ballId);
}

/** Get the SAVED (persistent) position of a player from board data. */
async function getSavedPlayerPos(page, boardId, playerId) {
    return page.evaluate(({ boardId, playerId }) => {
        const board = AppState.boards.find(b => b.id === boardId);
        const player = (board?.players || []).find(p => p.id === playerId);
        return player ? { x: player.x, y: player.y } : null;
    }, { boardId, playerId });
}

/** Get the SAVED (persistent) position of a ball from board data. */
async function getSavedBallPos(page, boardId, ballId) {
    return page.evaluate(({ boardId, ballId }) => {
        const board = AppState.boards.find(b => b.id === boardId);
        const ball = (board?.balls || []).find(b => b.id === ballId);
        return ball ? { x: ball.x, y: ball.y } : null;
    }, { boardId, ballId });
}

/** Click play/pause button. */
async function clickPlayPause(page) {
    await page.click('#btn-play-pause');
    await page.waitForTimeout(100);
}

// ── Tests ──────────────────────────────────────────────────────────────────────

test.describe('User workflow', () => {
    test.setTimeout(60000);

    // ── Test 1: Basic workflow ─────────────────────────────────────────────────
    test('full basic workflow: add objects, create child boards, navigate, verify positions', async ({ page }) => {
        await goto(page);

        // ── Root board: add players, ball, cone, plate ─────────────────────────
        await addPlayer(page, 0);  // team-1 player
        await addPlayer(page, 1);  // team-2 player
        await addBall(page);
        await addElement(page, 'cone');
        await addPlate(page);

        const rootBoardId = await page.evaluate(() => AppState.currentBoardId);

        // Place objects at known positions
        const p1Id = await page.evaluate(() => {
            const p = AppState.players[0];
            p.x = 800; p.y = 1000; p._explicitlySet = true;
            Players.render();
            return p.id;
        });
        const p2Id = await page.evaluate(() => {
            const p = AppState.players[1];
            p.x = 3700; p.y = 1500; p._explicitlySet = true;
            Players.render();
            return p.id;
        });
        const ballId = await page.evaluate(() => {
            const b = AppState.balls[0];
            b.x = 2250; b.y = 1250; b._explicitlySet = true;
            Balls.render();
            return b.id;
        });

        // Save root board
        await page.evaluate(() => AppState.saveCurrentBoard());

        // ── Child board 1: move players ────────────────────────────────────────
        const child1Id = await createChildBoard(page);

        await movePlayer(page, p1Id, 1500, 800);
        await movePlayer(page, p2Id, 2800, 1800);
        await moveBall(page, ballId, 1500, 1200);

        await page.evaluate(() => AppState.saveCurrentBoard());

        // ── Child board 2 (grandchild): move players again ─────────────────────
        const child2Id = await createChildBoard(page);

        await movePlayer(page, p1Id, 2500, 600);
        await movePlayer(page, p2Id, 1200, 1900);
        await moveBall(page, ballId, 2200, 1100);

        await page.evaluate(() => AppState.saveCurrentBoard());

        // ── Navigate: grandchild → root → child1 → grandchild ─────────────────
        await switchBoard(page, rootBoardId);
        let pos = await getPlayerPos(page, p1Id);
        expect(pos.x).toBeCloseTo(800, 0);
        expect(pos.y).toBeCloseTo(1000, 0);

        let bpos = await getBallPos(page, ballId);
        expect(bpos.x).toBeCloseTo(2250, 0);

        await switchBoard(page, child1Id);
        pos = await getPlayerPos(page, p1Id);
        expect(pos.x).toBeCloseTo(1500, 0);
        expect(pos.y).toBeCloseTo(800, 0);
        bpos = await getBallPos(page, ballId);
        expect(bpos.x).toBeCloseTo(1500, 0);

        await switchBoard(page, child2Id);
        pos = await getPlayerPos(page, p1Id);
        expect(pos.x).toBeCloseTo(2500, 0);
        expect(pos.y).toBeCloseTo(600, 0);
        bpos = await getBallPos(page, ballId);
        expect(bpos.x).toBeCloseTo(2200, 0);

        // Root board positions must not have changed
        const savedRoot = await getSavedPlayerPos(page, rootBoardId, p1Id);
        expect(savedRoot.x).toBeCloseTo(800, 0);
    });

    // ── Test 2: Ghost-path intermediates ──────────────────────────────────────
    test('ghost path intermediates persist through navigation', async ({ page }) => {
        await goto(page);

        await addPlayer(page);
        const rootBoardId = await page.evaluate(() => AppState.currentBoardId);
        const p1Id = await page.evaluate(() => {
            const p = AppState.players[0];
            p.x = 500; p.y = 1250; p._explicitlySet = true;
            Players.render();
            AppState.saveCurrentBoard();
            return p.id;
        });

        const child1Id = await createChildBoard(page);

        await page.evaluate(({ pId }) => {
            const player = AppState.players.find(p => p.id === pId);
            player.x = 4000;
            player.y = 1250;
            player._explicitlySet = true;

            // Add two ghost-path intermediate waypoints (simulate user dragging the path)
            AppState.pathIntermediates[`player-${pId}`] = [
                { x: 1500, y: 500,  rotation: 0 },
                { x: 3000, y: 2000, rotation: 0 },
            ];

            Players.render();
            Animations.renderParentPaths();
            AppState.saveCurrentBoard();
        }, { pId: p1Id });

        // Navigate away and back
        await switchBoard(page, rootBoardId);
        await switchBoard(page, child1Id);

        // Intermediates must still be present
        const intermediates = await page.evaluate(({ pId }) => {
            return AppState.pathIntermediates[`player-${pId}`];
        }, { pId: p1Id });

        expect(intermediates).toHaveLength(2);
        expect(intermediates[0].x).toBeCloseTo(1500, 0);
        expect(intermediates[1].x).toBeCloseTo(3000, 0);

        // Ghost path SVG elements should be visible
        const ghostCount = await page.locator('.ghost-player').count();
        expect(ghostCount).toBeGreaterThan(0);
    });

    // ── Test 3: Positions NOT corrupted by play + navigate ────────────────────
    /**
     * BUG: play() starts by mutating player.x to the root board position but
     * does NOT clear _explicitlySet.  If the user navigates away while the
     * animation is running (or paused mid-way), saveCurrentBoard() saves the
     * intermediate positions, permanently corrupting the child board layout.
     */
    test('player positions are NOT corrupted when navigating away while animation is playing', async ({ page }) => {
        await goto(page);

        // Root board: place player on the left
        const rootBoardId = await page.evaluate(() => AppState.currentBoardId);
        const p1Id = await page.evaluate(() => {
            AppState.addPlayer('team-1', 500, 1250);
            const p = AppState.players[0];
            AppState.saveCurrentBoard();
            return p.id;
        });

        // Child board: move player to the right – this is the position we want to preserve
        const childBoardId = await createChildBoard(page);
        const childExpectedX = 4000;
        const childExpectedY = 1250;

        await page.evaluate(({ pId, cx, cy }) => {
            const player = AppState.players.find(p => p.id === pId);
            player.x = cx;
            player.y = cy;
            player._explicitlySet = true;
            Players.render();
            Animations.renderParentPaths();
            AppState.saveCurrentBoard();
        }, { pId: p1Id, cx: childExpectedX, cy: childExpectedY });

        // Start the animation (play) – this mutates player.x back to root position
        // but (due to the bug) keeps _explicitlySet = true
        await clickPlayPause(page);

        // Verify animation is running
        const isAnimating = await page.evaluate(() => AppState.isAnimating);
        expect(isAnimating, 'Animation should be running after clicking play').toBe(true);

        // Wait a moment so the player has moved to an intermediate position
        await page.waitForTimeout(400);

        // Navigate to the root board while animation is still running.
        // This triggers saveCurrentBoard() which should NOT save the intermediate position.
        await switchBoard(page, rootBoardId);

        // Navigate back to the child board
        await switchBoard(page, childBoardId);

        // The player must be at the child board's original position, not an intermediate one
        const pos = await getPlayerPos(page, p1Id);
        expect(
            pos?.x,
            `Player X must be at child board position (${childExpectedX}), not at an intermediate animation position`
        ).toBeCloseTo(childExpectedX, -1); // within ±5 px

        expect(
            pos?.y,
            `Player Y must be at child board position (${childExpectedY})`
        ).toBeCloseTo(childExpectedY, -1);

        // The SAVED board data must also be correct
        const savedPos = await getSavedPlayerPos(page, childBoardId, p1Id);
        expect(
            savedPos?.x,
            'Saved child board position must not be corrupted by animation intermediate'
        ).toBeCloseTo(childExpectedX, -1);
    });

    // ── Test 4: Positions NOT corrupted by play + pause + navigate ────────────
    test('player positions are NOT corrupted when navigating away after pausing mid-animation', async ({ page }) => {
        await goto(page);

        const rootBoardId = await page.evaluate(() => AppState.currentBoardId);
        const p1Id = await page.evaluate(() => {
            AppState.addPlayer('team-1', 600, 1250);
            const p = AppState.players[0];
            AppState.saveCurrentBoard();
            return p.id;
        });
        const ballId = await page.evaluate(() => {
            AppState.addBall('#FF6B35', 2250, 500);
            const b = AppState.balls[0];
            AppState.saveCurrentBoard();
            return b.id;
        });

        const childBoardId = await createChildBoard(page);
        const childPlayerX = 3800, childPlayerY = 800;
        const childBallX = 2250, childBallY = 2000;

        await page.evaluate(({ pId, bId, px, py, bx, by }) => {
            const player = AppState.players.find(p => p.id === pId);
            player.x = px; player.y = py; player._explicitlySet = true;

            const ball = AppState.balls.find(b => b.id === bId);
            ball.x = bx; ball.y = by; ball._explicitlySet = true;

            Players.render();
            Balls.render();
            Animations.renderParentPaths();
            AppState.saveCurrentBoard();
        }, { pId: p1Id, bId: ballId, px: childPlayerX, py: childPlayerY, bx: childBallX, by: childBallY });

        // Play, wait, pause
        await clickPlayPause(page);
        await page.waitForTimeout(400);  // mid-animation
        await clickPlayPause(page);      // pause
        await page.waitForTimeout(100);

        const isPaused = await page.evaluate(() => !AppState.isAnimating);
        expect(isPaused, 'Animation should be paused').toBe(true);

        // Navigate away while paused (player is at an intermediate position in memory)
        await switchBoard(page, rootBoardId);
        await switchBoard(page, childBoardId);

        // Positions must be restored to the child board values
        const playerPos = await getPlayerPos(page, p1Id);
        expect(playerPos?.x).toBeCloseTo(childPlayerX, -1);
        expect(playerPos?.y).toBeCloseTo(childPlayerY, -1);

        const ballPos = await getBallPos(page, ballId);
        expect(ballPos?.x).toBeCloseTo(childBallX, -1);
        expect(ballPos?.y).toBeCloseTo(childBallY, -1);

        // Saved data must also be intact
        const savedPlayerPos = await getSavedPlayerPos(page, childBoardId, p1Id);
        expect(savedPlayerPos?.x).toBeCloseTo(childPlayerX, -1);
        const savedBallPos = await getSavedBallPos(page, childBoardId, ballId);
        expect(savedBallPos?.x).toBeCloseTo(childBallX, -1);
    });

    // ── Test 5: Multi-child workflow with play/pause across boards ─────────────
    test('play/pause on grandchild does not corrupt child board positions', async ({ page }) => {
        await goto(page);

        // Root
        const rootBoardId = await page.evaluate(() => AppState.currentBoardId);
        const p1Id = await page.evaluate(() => {
            AppState.addPlayer('team-1', 500, 1250);
            const p = AppState.players[0];
            AppState.saveCurrentBoard();
            return p.id;
        });

        // Child: player moves to middle
        const child1Id = await createChildBoard(page);
        await page.evaluate(({ pId }) => {
            const player = AppState.players.find(p => p.id === pId);
            player.x = 2250; player.y = 1250; player._explicitlySet = true;
            Players.render();
            AppState.saveCurrentBoard();
        }, { pId: p1Id });

        // Grandchild: player moves to right
        const child2Id = await createChildBoard(page);
        await page.evaluate(({ pId }) => {
            const player = AppState.players.find(p => p.id === pId);
            player.x = 4000; player.y = 1250; player._explicitlySet = true;
            Players.render();
            Animations.renderParentPaths();
            AppState.saveCurrentBoard();
        }, { pId: p1Id });

        // Play animation on grandchild (animates from root → child → grandchild positions)
        await clickPlayPause(page);
        await page.waitForTimeout(500);
        await clickPlayPause(page);  // pause mid-way

        // Navigate to child board while paused
        await switchBoard(page, child1Id);

        // Child board player should be at its own position (2250)
        const childPos = await getPlayerPos(page, p1Id);
        expect(childPos?.x).toBeCloseTo(2250, -1);

        // Child board saved data should be intact
        const savedChildPos = await getSavedPlayerPos(page, child1Id, p1Id);
        expect(savedChildPos?.x).toBeCloseTo(2250, -1);

        // Navigate to root and verify
        await switchBoard(page, rootBoardId);
        const rootPos = await getPlayerPos(page, p1Id);
        expect(rootPos?.x).toBeCloseTo(500, -1);

        // Navigate back to grandchild
        await switchBoard(page, child2Id);
        const grandchildPos = await getPlayerPos(page, p1Id);
        expect(grandchildPos?.x).toBeCloseTo(4000, -1);
    });

    // ── Test 6: Play to completion, then navigate ──────────────────────────────
    test('positions are correct after animation completes and user navigates', async ({ page }) => {
        await goto(page);

        const rootBoardId = await page.evaluate(() => AppState.currentBoardId);
        const p1Id = await page.evaluate(() => {
            AppState.addPlayer('team-1', 300, 1250);
            const p = AppState.players[0];
            AppState.saveCurrentBoard();
            return p.id;
        });

        const childBoardId = await createChildBoard(page);
        const targetX = 4200, targetY = 900;
        await page.evaluate(({ pId, x, y }) => {
            const player = AppState.players.find(p => p.id === pId);
            player.x = x; player.y = y; player._explicitlySet = true;
            Players.render();
            AppState.saveCurrentBoard();
        }, { pId: p1Id, x: targetX, y: targetY });

        // Set a very short animation duration so it finishes quickly
        await page.evaluate(() => { AppState.animationDuration = 100; });

        // Play — should complete in ~100 ms
        await clickPlayPause(page);
        await page.waitForTimeout(600); // wait for completion

        // Navigate to root, then back
        await switchBoard(page, rootBoardId);
        await switchBoard(page, childBoardId);

        const pos = await getPlayerPos(page, p1Id);
        expect(pos?.x).toBeCloseTo(targetX, -1);
        expect(pos?.y).toBeCloseTo(targetY, -1);
    });

    // ── Test 7: Objects on root board are never affected by child animation ────
    test('root board objects are unchanged after child board animation', async ({ page }) => {
        await goto(page);

        const rootBoardId = await page.evaluate(() => AppState.currentBoardId);

        // Place several objects on root
        const ids = await page.evaluate(() => {
            AppState.addPlayer('team-1', 1000, 800);
            AppState.addPlayer('team-2', 3500, 1700);
            AppState.addBall('#FF6B35', 2250, 1250);

            AppState.players[0].x = 1000; AppState.players[0].y = 800;
            AppState.players[1].x = 3500; AppState.players[1].y = 1700;
            AppState.balls[0].x = 2250; AppState.balls[0].y = 1250;

            AppState.saveCurrentBoard();
            return {
                p1: AppState.players[0].id,
                p2: AppState.players[1].id,
                ball: AppState.balls[0].id,
            };
        });

        // Create child and move objects
        const childBoardId = await createChildBoard(page);
        await page.evaluate(({ ids }) => {
            AppState.players.find(p => p.id === ids.p1).x = 500;
            AppState.players.find(p => p.id === ids.p1).y = 1250;
            AppState.players.find(p => p.id === ids.p1)._explicitlySet = true;

            AppState.players.find(p => p.id === ids.p2).x = 4000;
            AppState.players.find(p => p.id === ids.p2).y = 1250;
            AppState.players.find(p => p.id === ids.p2)._explicitlySet = true;

            AppState.balls.find(b => b.id === ids.ball).x = 2250;
            AppState.balls.find(b => b.id === ids.ball).y = 200;
            AppState.balls.find(b => b.id === ids.ball)._explicitlySet = true;

            Players.render(); Balls.render();
            AppState.saveCurrentBoard();
        }, { ids });

        // Play and pause several times
        await clickPlayPause(page);
        await page.waitForTimeout(200);
        await clickPlayPause(page);
        await page.waitForTimeout(100);
        await clickPlayPause(page);
        await page.waitForTimeout(300);
        await clickPlayPause(page);

        // Navigate to root
        await switchBoard(page, rootBoardId);

        // Root objects must not have changed
        const p1Pos = await getPlayerPos(page, ids.p1);
        expect(p1Pos?.x).toBeCloseTo(1000, -1);
        expect(p1Pos?.y).toBeCloseTo(800, -1);

        const p2Pos = await getPlayerPos(page, ids.p2);
        expect(p2Pos?.x).toBeCloseTo(3500, -1);
        expect(p2Pos?.y).toBeCloseTo(1700, -1);

        const ballPos = await getBallPos(page, ids.ball);
        expect(ballPos?.x).toBeCloseTo(2250, -1);
        expect(ballPos?.y).toBeCloseTo(1250, -1);

        // Saved root data also intact
        const savedP1 = await getSavedPlayerPos(page, rootBoardId, ids.p1);
        expect(savedP1?.x).toBeCloseTo(1000, -1);
    });
});
