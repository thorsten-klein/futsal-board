/**
 * Test for "Go to Frame Start" position.
 *
 * "Go to Frame Start" goes to the PARENT board position (start of current frame).
 *
 * Test scenarios:
 * 1. Board 1 (root): Add player
 * 2. Child board: Add ball and move player
 * 3. Grandchild board: Move player
 * 4. Click "Go to Frame Start"
 * 5. Verify player is at PARENT (child) position, not root
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

test.describe('Go to Frame Start position', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
    });

    test('player should be at PARENT (child) position after: root(add player), child(add ball + move player), grandchild(move player)', async ({ page }) => {
        // Step 1: Board 1 (root) - Add player and ball at specific positions
        await addPlayer(page);
        await addBall(page);
        const { playerId, rootPlayerX, rootPlayerY, ballId } = await page.evaluate(() => {
            const player = AppState.players[0];
            player.x = 1000;
            player.y = 1000;
            AppState.saveCurrentBoard();
            Players.render();
            const ball = AppState.balls[0];
            return {
                playerId: player.id,
                rootPlayerX: player.x,
                rootPlayerY: player.y,
                ballId: ball.id
            };
        });
        await page.waitForTimeout(200);

        // Step 2: Child board - Move player and ball
        await createAndSwitchToChildBoard(page);
        const { childPlayerX, childPlayerY } = await page.evaluate(({ playerId, ballId }) => {
            const player = AppState.players.find(p => p.id === playerId);
            if (player) {
                player.x = 2000;
                player.y = 1200;
                player._explicitlySet = true;
                AppState.saveCurrentBoard();
                Players.render();
            }
            const ball = AppState.balls.find(b => b.id === ballId);
            if (ball) {
                ball.x = 2500;
                ball.y = 1500;
                ball._explicitlySet = true;
                AppState.saveCurrentBoard();
                Balls.render();
            }
            return {
                childPlayerX: player?.x,
                childPlayerY: player?.y
            };
        }, { playerId, ballId });
        await page.waitForTimeout(200);

        // Step 3: Grandchild board - Move player
        await createAndSwitchToChildBoard(page);
        const { grandchildPlayerX, grandchildPlayerY } = await page.evaluate(({ playerId }) => {
            const player = AppState.players.find(p => p.id === playerId);
            if (player) {
                player.x = 3000;
                player.y = 1600;
                player._explicitlySet = true;
                AppState.saveCurrentBoard();
                Players.render();
            }
            return {
                grandchildPlayerX: player?.x,
                grandchildPlayerY: player?.y
            };
        }, { playerId });
        await page.waitForTimeout(200);

        // Verify we're on grandchild with expected position
        expect(grandchildPlayerX).toBe(3000);
        expect(grandchildPlayerY).toBe(1600);

        // Step 4: Click "Go to Frame Start" button (goes to PARENT = child board)
        // Board hierarchy: [root, child, grandchild]
        // Current: grandchild (index 2)
        // Parent: child (index 1)
        await page.locator('#btn-go-to-start').click();
        await page.waitForTimeout(300);

        // Step 5: Verify player is at PARENT (child) position, NOT root or grandchild
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
                playerChain: animationChainPlayer,
                ballChain: animationChainBall
            };
        }, { playerId, ballId });

        // After go to start on grandchild, pausedProgress shows position in full hierarchy.
        // Root→Child→Grandchild: parent (child) is at index 1 of 2 transitions → 0.5
        expect(frameStartPositions.pausedProgress).toBe(0.5);

        // Player should have 3 positions in the chain (root, child, grandchild)
        expect(frameStartPositions.playerChainLength).toBe(3);

        // Ball should have 3 positions in the chain
        expect(frameStartPositions.ballChainLength).toBe(3);

        // Player should be at PARENT (child) position (2000, 1200), NOT root (1000, 1000) or grandchild (3000, 1600)
        expect(frameStartPositions.playerX).toBe(childPlayerX); // Should be 2000
        expect(frameStartPositions.playerY).toBe(childPlayerY); // Should be 1200

        // Ball should be at parent (child) position where it was added
        expect(frameStartPositions.ballX).toBe(2500);
        expect(frameStartPositions.ballY).toBe(1500);
    });

    test('player should be at PARENT (child) position when player added on root but only modified on grandchild', async ({ page }) => {
        // Step 1: Board 1 (root) - Add player and second player
        await addPlayer(page);
        await addPlayer(page);
        const { player1Id, rootPlayer1X, rootPlayer1Y, player2Id } = await page.evaluate(() => {
            const player1 = AppState.players[0];
            player1.x = 1000;
            player1.y = 1000;
            const player2 = AppState.players[1];
            player2.x = 1500;
            player2.y = 1500;
            AppState.saveCurrentBoard();
            Players.render();
            return {
                player1Id: player1.id,
                rootPlayer1X: player1.x,
                rootPlayer1Y: player1.y,
                player2Id: player2.id
            };
        });
        await page.waitForTimeout(200);

        // Step 2: Child board - Move first player (ball and second player already added on root)
        // First add ball on root before creating child
        await page.evaluate(() => {
            AppState.loadBoard(AppState.boards.find(b => !b.parentId).id);
        });
        await addBall(page);
        await page.evaluate(() => {
            const ball = AppState.balls[0];
            if (ball) {
                ball.x = 2500;
                ball.y = 1500;
                AppState.saveCurrentBoard();
                Balls.render();
            }
        });

        // Now go back to child board
        await page.evaluate(() => {
            const child = AppState.boards.find(b => b.parentId != null && !AppState.boards.some(c => c.parentId === b.id));
            if (child) {
                AppState.loadBoard(child.id);
            }
        });

        const { childPlayer1X, childPlayer1Y } = await page.evaluate(({ player1Id }) => {
            const player = AppState.players.find(p => p.id === player1Id);
            if (player) {
                player.x = 2000;
                player.y = 1200;
                player._explicitlySet = true;
                AppState.saveCurrentBoard();
                Players.render();
            }
            return {
                childPlayer1X: player?.x,
                childPlayer1Y: player?.y
            };
        }, { player1Id });
        await page.waitForTimeout(200);

        // Step 3: Grandchild board - Move second player (which was added on root)
        await createAndSwitchToChildBoard(page);
        const { grandchildPlayer2X, grandchildPlayer2Y } = await page.evaluate(({ player2Id }) => {
            const player2 = AppState.players.find(p => p.id === player2Id);
            if (player2) {
                player2.x = 3500;
                player2.y = 2000;
                player2._explicitlySet = true;
                AppState.saveCurrentBoard();
                Players.render();
            }
            return {
                grandchildPlayer2X: player2?.x,
                grandchildPlayer2Y: player2?.y
            };
        }, { player2Id });
        await page.waitForTimeout(200);

        // Step 4: Click "Go to Frame Start" button (goes to PARENT = child board)
        // Board hierarchy: [root, child, grandchild]
        // Current: grandchild (index 2)
        // Parent: child (index 1)
        await page.locator('#btn-go-to-start').click();
        await page.waitForTimeout(300);

        // Step 5: Verify positions are at PARENT (child) board
        const frameStartPositions = await page.evaluate(({ player1Id, player2Id }) => {
            const player1 = AppState.players.find(p => p.id === player1Id);
            const player2 = AppState.players.find(p => p.id === player2Id);
            const animationChainPlayer1 = Animations.animationChainPlayers[player1Id];
            const animationChainPlayer2 = Animations.animationChainPlayers[player2Id];
            return {
                player1X: player1?.x,
                player1Y: player1?.y,
                player2X: player2?.x,
                player2Y: player2?.y,
                pausedProgress: Animations.pausedProgress,
                player1Chain: animationChainPlayer1,
                player2Chain: animationChainPlayer2
            };
        }, { player1Id, player2Id });

        // This test has a 2-level hierarchy (Root→Child): go to start on child board gives depth=1,
        // progressPosition = (1-1)/1 = 0
        expect(frameStartPositions.pausedProgress).toBe(0);

        // Player 1 should be at PARENT (child) position (2000, 1200), NOT root (1000, 1000)
        expect(frameStartPositions.player1X).toBe(childPlayer1X); // Should be 2000
        expect(frameStartPositions.player1Y).toBe(childPlayer1Y); // Should be 1200

        // Player 2 (added on root, not modified on child, modified on grandchild)
        // Should be at PARENT (child) position = inherited root position (1500, 1500)
        // NOT at grandchild position (3500, 2000)
        expect(frameStartPositions.player2X).toBe(1500);
        expect(frameStartPositions.player2Y).toBe(1500);
    });
});
