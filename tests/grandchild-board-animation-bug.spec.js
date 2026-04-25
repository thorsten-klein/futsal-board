/**
 * Test for animation bug with 4-level board hierarchy.
 *
 * Bug reproduction:
 * 1. Create root board and add player
 * 2. Create child board and move player
 * 3. Create grandchild board and add a ball
 * 4. Create great-grandchild board and move both player and ball
 * 5. Click play
 * 6. Animation does not work properly anymore
 *
 * Expected: Animation should work correctly across all 4 board levels
 * Actual: Animation fails or behaves incorrectly
 */
import { test, expect } from './test-config.js';
import { goto, addPlayer, addBall } from './helpers.js';

/** Create a child board and switch to it (via JS for speed). */
async function createAndSwitchToChildBoard(page) {
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
        }
        return childId;
    });
    await page.waitForTimeout(200);
    return childId;
}

/** Get the current board info. */
async function getCurrentBoardInfo(page) {
    return page.evaluate(() => {
        const currentBoard = AppState.boards.find(b => b.id === AppState.currentBoardId);
        const parentBoard = currentBoard?.parentId
            ? AppState.boards.find(b => b.id === currentBoard.parentId)
            : null;
        const grandparentBoard = parentBoard?.parentId
            ? AppState.boards.find(b => b.id === parentBoard.parentId)
            : null;
        return {
            currentBoardId: AppState.currentBoardId,
            parentId: currentBoard?.parentId,
            grandparentId: parentBoard?.parentId,
            greatGrandparentId: grandparentBoard?.parentId,
            isChildBoard: AppState.isChildBoard(),
            boardCount: AppState.boards.length,
            playerCount: AppState.players.length,
            ballCount: AppState.balls.length
        };
    });
}

test.describe('4-level board hierarchy animation bug', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
    });

    test('animation fails with player on root, ball on grandchild, both moved on great-grandchild', async ({ page }) => {
        // Step 1: Create root board and add player
        await addPlayer(page);
        const playerId = await page.evaluate(() => {
            const player = AppState.players[0];
            player.x = 1000;
            player.y = 1000;
            AppState.saveCurrentBoard();
            Players.render();
            return player.id;
        });
        await page.waitForTimeout(200);

        const rootInfo = await getCurrentBoardInfo(page);
        expect(rootInfo.playerCount).toBe(1);
        expect(rootInfo.ballCount).toBe(0);
        expect(rootInfo.isChildBoard).toBe(false);

        // Step 2: Create child board and move player
        await createAndSwitchToChildBoard(page);
        await page.evaluate(({ playerId }) => {
            const player = AppState.players.find(p => p.id === playerId);
            if (player) {
                player.x = 2000;
                player.y = 1200;
                player._explicitlySet = true;
                AppState.saveCurrentBoard();
                Players.render();
            }
        }, { playerId });
        await page.waitForTimeout(200);

        const childInfo = await getCurrentBoardInfo(page);
        expect(childInfo.isChildBoard).toBe(true);
        expect(childInfo.playerCount).toBe(1);

        // Add ball on root before creating grandchild
        await page.evaluate(() => {
            const rootBoard = AppState.boards.find(b => !b.parentId);
            AppState.saveCurrentBoard();
            AppState.loadBoard(rootBoard.id);
        });
        await addBall(page);
        const ballId = await page.evaluate(() => {
            const ball = AppState.balls[0];
            ball.x = 2500;
            ball.y = 1500;
            AppState.saveCurrentBoard();
            Balls.render();
            return ball.id;
        });

        // Go back to child
        await page.evaluate(() => {
            const childBoard = AppState.boards.find(b => b.parentId != null && !AppState.boards.some(c => c.parentId === b.id));
            AppState.loadBoard(childBoard.id);
        });

        // Step 3: Create grandchild board
        await createAndSwitchToChildBoard(page);
        await page.waitForTimeout(200);

        const grandchildInfo = await getCurrentBoardInfo(page);
        expect(grandchildInfo.ballCount).toBe(1);
        expect(grandchildInfo.boardCount).toBe(3);

        // Step 4: Create great-grandchild board and move both player and ball
        await createAndSwitchToChildBoard(page);
        await page.evaluate(({ playerId, ballId }) => {
            const player = AppState.players.find(p => p.id === playerId);
            if (player) {
                player.x = 3500;
                player.y = 1800;
                player._explicitlySet = true;
                AppState.saveCurrentBoard();
                Players.render();
            }

            const ball = AppState.balls.find(b => b.id === ballId);
            if (ball) {
                ball.x = 3600;
                ball.y = 1900;
                ball._explicitlySet = true;
                AppState.saveCurrentBoard();
                Balls.render();
            }
        }, { playerId, ballId });
        await page.waitForTimeout(200);

        const greatGrandchildInfo = await getCurrentBoardInfo(page);
        expect(greatGrandchildInfo.boardCount).toBe(4);
        expect(greatGrandchildInfo.playerCount).toBe(1);
        expect(greatGrandchildInfo.ballCount).toBe(1);

        // Step 5: Click play to trigger animation
        await page.locator('#btn-play-pause').click();
        await page.waitForTimeout(500);

        // Step 6: Check if animation is working correctly
        const animationState = await page.evaluate(() => {
            return {
                isAnimating: AppState.isAnimating,
                animationPhaseCount: Animations.animationPhaseCount,
                playerChainCount: Object.keys(Animations.animationChainPlayers).length,
                ballChainCount: Object.keys(Animations.animationChainBalls).length,
                animationFrame: AppState.animationFrame !== null,
                boardChainLength: AppState.getBoardAncestryChain().length
            };
        });

        // Animation should be running
        expect(animationState.isAnimating).toBe(true);

        // Should have 4 boards in the chain (root, child, grandchild, great-grandchild)
        expect(animationState.boardChainLength).toBe(4);

        // Should have 3 animation phases (3 transitions between 4 boards)
        expect(animationState.animationPhaseCount).toBe(3);

        // Should have animation chains for both player and ball
        expect(animationState.playerChainCount).toBeGreaterThan(0);
        expect(animationState.ballChainCount).toBeGreaterThan(0);

        // Animation frame should be active
        expect(animationState.animationFrame).toBe(true);

        // Check detailed animation chain positions
        const chainDetails = await page.evaluate(({ playerId, ballId }) => {
            const playerChain = Animations.animationChainPlayers[playerId];
            const ballChain = Animations.animationChainBalls[ballId];

            return {
                playerChain: playerChain,
                ballChain: ballChain,
                playerPositions: playerChain ? playerChain.length : 0,
                ballPositions: ballChain ? ballChain.length : 0
            };
        }, { playerId, ballId });

        // Player should have 4 positions (one for each board level)
        expect(chainDetails.playerPositions).toBe(4);
        expect(chainDetails.playerChain[0].x).toBe(1000); // Root position
        expect(chainDetails.playerChain[1].x).toBe(2000); // Child position
        expect(chainDetails.playerChain[3].x).toBe(3500); // Great-grandchild position

        // Ball should have 4 positions (even though it was added on grandchild)
        expect(chainDetails.ballPositions).toBe(4);
        expect(chainDetails.ballChain[2].x).toBe(2500); // Grandchild position (where ball was added)
        expect(chainDetails.ballChain[3].x).toBe(3600); // Great-grandchild position

        // Pause the animation to clean up
        await page.locator('#btn-play-pause').click();
        await page.waitForTimeout(200);

        const pausedState = await page.evaluate(() => ({
            isAnimating: AppState.isAnimating
        }));

        expect(pausedState.isAnimating).toBe(false);
    });

    test('go to frame start button works correctly with 4-level hierarchy', async ({ page }) => {
        // Step 1: Set up root board and add player at specific position
        await addPlayer(page);
        const { playerId, rootPlayerX, rootPlayerY } = await page.evaluate(() => {
            const player = AppState.players[0];
            player.x = 1000;
            player.y = 1000;
            AppState.saveCurrentBoard();
            Players.render();
            return {
                playerId: player.id,
                rootPlayerX: player.x,
                rootPlayerY: player.y
            };
        });
        await page.waitForTimeout(200);

        // Step 2: Create child board and move player
        await createAndSwitchToChildBoard(page);
        await page.evaluate(({ playerId }) => {
            const player = AppState.players.find(p => p.id === playerId);
            if (player) {
                player.x = 2000;
                player.y = 1200;
                player._explicitlySet = true;
                AppState.saveCurrentBoard();
                Players.render();
            }
        }, { playerId });
        await page.waitForTimeout(200);

        // Add ball on root before creating grandchild
        await page.evaluate(() => {
            const rootBoard = AppState.boards.find(b => !b.parentId);
            AppState.saveCurrentBoard();
            AppState.loadBoard(rootBoard.id);
        });
        await addBall(page);
        const { ballId, grandchildBallX, grandchildBallY } = await page.evaluate(() => {
            const ball = AppState.balls[0];
            ball.x = 2500;
            ball.y = 1500;
            AppState.saveCurrentBoard();
            Balls.render();
            return {
                ballId: ball.id,
                grandchildBallX: ball.x,
                grandchildBallY: ball.y
            };
        });

        // Go back to child
        await page.evaluate(() => {
            const childBoard = AppState.boards.find(b => b.parentId != null && !AppState.boards.some(c => c.parentId === b.id));
            AppState.loadBoard(childBoard.id);
        });

        // Step 3: Create grandchild board
        await createAndSwitchToChildBoard(page);
        await page.waitForTimeout(200);

        // Step 4: Create great-grandchild board and move both
        await createAndSwitchToChildBoard(page);
        const { greatGrandchildPlayerX, greatGrandchildBallX } = await page.evaluate(({ playerId, ballId }) => {
            const player = AppState.players.find(p => p.id === playerId);
            if (player) {
                player.x = 3500;
                player.y = 1800;
                player._explicitlySet = true;
                AppState.saveCurrentBoard();
                Players.render();
            }
            const ball = AppState.balls.find(b => b.id === ballId);
            if (ball) {
                ball.x = 3600;
                ball.y = 1900;
                ball._explicitlySet = true;
                AppState.saveCurrentBoard();
                Balls.render();
            }
            return {
                greatGrandchildPlayerX: player?.x,
                greatGrandchildBallX: ball?.x
            };
        }, { playerId, ballId });
        await page.waitForTimeout(200);

        // Verify we're on great-grandchild with expected positions
        expect(greatGrandchildPlayerX).toBe(3500);
        expect(greatGrandchildBallX).toBe(3600);

        // Step 5: Click "Go to frame start" button (goes to PARENT board = grandchild)
        await page.locator('#btn-go-to-start').click();
        await page.waitForTimeout(300);

        // Step 6: Verify entities are at PARENT (grandchild) positions
        // Board hierarchy: [root, child, grandchild, great-grandchild]
        // Current: great-grandchild (index 3)
        // Parent: grandchild (index 2)
        const frameStartPositions = await page.evaluate(({ playerId, ballId }) => {
            const player = AppState.players.find(p => p.id === playerId);
            const ball = AppState.balls.find(b => b.id === ballId);
            const animationChainPlayer = Animations.animationChainPlayers[playerId];
            const animationChainBall = Animations.animationChainBalls[ballId];
            return {
                playerX: player?.x,
                playerY: player?.y,
                ballX: ball?.x,
                ballY: ball?.y,
                pausedProgress: Animations.pausedProgress,
                playerChainLength: animationChainPlayer?.length,
                ballChainLength: animationChainBall?.length,
                playerChainParentPos: animationChainPlayer?.[2], // Parent = index 2 (grandchild)
                ballChainParentPos: animationChainBall?.[2]
            };
        }, { playerId, ballId });

        // After go to start on great-grandchild, pausedProgress shows position in full hierarchy.
        // Root→Child→Grandchild→Great-Grandchild: parent (grandchild) is at index 2 of 3 transitions → 2/3
        expect(frameStartPositions.pausedProgress).toBe(2/3);

        // Player should be at PARENT (grandchild) position, which inherited from child (2000, 1200)
        // Chain: [root: 1000, child: 2000, grandchild: 2000 (inherited), great-grandchild: 3500]
        expect(frameStartPositions.playerX).toBe(2000); // Grandchild inherited child position
        expect(frameStartPositions.playerY).toBe(1200);
        expect(frameStartPositions.playerX).not.toBe(3500); // NOT at great-grandchild
        expect(frameStartPositions.playerX).not.toBe(1000); // NOT at root

        // Ball should be at PARENT (grandchild) position (2500, 1500)
        expect(frameStartPositions.ballX).toBe(grandchildBallX); // Should be 2500
        expect(frameStartPositions.ballY).toBe(grandchildBallY); // Should be 1500
        expect(frameStartPositions.ballX).not.toBe(3600); // Should NOT be at great-grandchild position
    });
});
