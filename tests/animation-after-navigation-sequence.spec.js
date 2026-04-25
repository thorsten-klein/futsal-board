/**
 * Test that animation plays all frames correctly after navigating between boards
 * Bug: After go to start on grandchild, navigate to child, back to grandchild,
 * then play - the last frame is not played
 */
import { test, expect } from './test-config.js';
import { goto, addPlayer } from './helpers.js';

test.describe('Animation After Navigation Sequence', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
    });

    test('last frame plays correctly after go to start, navigate away and back, then play', async ({ page }) => {
        await addPlayer(page);
        const playerId = await page.evaluate(() => AppState.players[0].id);

        // Record root position and save root board
        const rootPos = await page.evaluate(({ playerId }) => {
            const player = AppState.players.find(p => p.id === playerId);
            AppState.saveCurrentBoard(); // Ensure root is saved
            return { x: player.x, y: player.y };
        }, { playerId });

        const rootBoardId = await page.evaluate(() => AppState.currentBoardId);

        // Create Child
        await page.evaluate(() => {
            AppState.saveCurrentBoard();
            const childId = AppState.createChildBoard(AppState.currentBoardId);
            AppState.loadBoard(childId);
            Players.render();
        });

        const childPos = await page.evaluate(({ playerId }) => {
            const player = AppState.players.find(p => p.id === playerId);
            player.x = 2000;
            player.y = 1000;
            player._explicitlySet = true; // Mark as modified on this board
            AppState.saveCurrentBoard();
            return { x: player.x, y: player.y };
        }, { playerId });

        const childBoardId = await page.evaluate(() => AppState.currentBoardId);

        // Create Grandchild
        await page.evaluate(() => {
            AppState.saveCurrentBoard();
            const grandchildId = AppState.createChildBoard(AppState.currentBoardId);
            AppState.loadBoard(grandchildId);
            Players.render();
        });

        const grandchildPos = await page.evaluate(({ playerId }) => {
            const player = AppState.players.find(p => p.id === playerId);
            player.x = 3000;
            player.y = 1500;
            player._explicitlySet = true; // Mark as modified on this board
            AppState.saveCurrentBoard();
            Players.render();
            Animations.renderParentPaths();
            return { x: player.x, y: player.y };
        }, { playerId });

        const grandchildBoardId = await page.evaluate(() => AppState.currentBoardId);

        await page.waitForTimeout(200);


        // Debug: Check what's stored on each board
        const boardStates = await page.evaluate(({ playerId, rootBoardId }) => {
            const boards = AppState.boards;
            const result = {};
            boards.forEach(board => {
                const player = (board.players || []).find(p => p.id === playerId);
                result[board.id] = {
                    id: board.id,
                    parentId: board.parentId,
                    playerPos: player ? { x: player.x, y: player.y } : null
                };
            });
            return result;
        }, { playerId, rootBoardId });


        // Step 1: On Grandchild, click "go to frame start"
        await page.locator('#btn-go-to-start').click();
        await page.waitForTimeout(200);

        const afterGoToStart = await page.evaluate(({ playerId }) => {
            const chain = Animations.animationChainPlayers[playerId];
            return {
                playerPos: AppState.players.find(p => p.id === playerId),
                pausedProgress: Animations.pausedProgress,
                animationChainLength: Object.keys(Animations.animationChainPlayers).length,
                animationChain: chain,
                boardChainLength: AppState.getBoardAncestryChain().length
            };
        }, { playerId });


        // Should be at child position (frame start)
        expect(afterGoToStart.boardChainLength).toBe(3);
        expect(afterGoToStart.animationChain.length).toBe(3);
        expect(afterGoToStart.playerPos.x).toBe(childPos.x);
        expect(afterGoToStart.playerPos.y).toBe(childPos.y);

        // Step 2: Navigate to Child board
        await page.evaluate(({ childBoardId }) => {
            AppState.loadBoard(childBoardId);
            Players.render();
            Balls.render();
            Elements.render();
            Plates.render();
            Shapes.render();
            Animations.renderParentPaths();
        }, { childBoardId });

        await page.waitForTimeout(300);

        const onChild = await page.evaluate(() => ({
            pausedProgress: Animations.pausedProgress,
            animationChainLength: Object.keys(Animations.animationChainPlayers || {}).length
        }));


        // Step 3: Navigate back to Grandchild
        await page.evaluate(({ grandchildBoardId }) => {
            AppState.loadBoard(grandchildBoardId);
            Players.render();
            Balls.render();
            Elements.render();
            Plates.render();
            Shapes.render();
            Animations.renderParentPaths();
        }, { grandchildBoardId });

        await page.waitForTimeout(300);

        const backOnGrandchild = await page.evaluate(({ playerId }) => ({
            playerPos: AppState.players.find(p => p.id === playerId),
            pausedProgress: Animations.pausedProgress,
            animationChainLength: Object.keys(Animations.animationChainPlayers || {}).length,
            chainLength: AppState.getBoardAncestryChain().length
        }), { playerId });


        // Should be at grandchild position
        expect(backOnGrandchild.playerPos.x).toBe(grandchildPos.x);
        expect(backOnGrandchild.playerPos.y).toBe(grandchildPos.y);
        expect(backOnGrandchild.chainLength).toBe(3); // Root + Child + Grandchild

        // Step 4: Click Play
        await page.locator('#btn-play-pause').click();

        // Let animation complete (should play Root→Child→Grandchild)
        // With 2 transitions and default speed, this might take 4+ seconds
        await page.waitForTimeout(5000);

        const afterAnimation = await page.evaluate(({ playerId, grandchildPos }) => {
            const player = AppState.players.find(p => p.id === playerId);
            return {
                playerPos: { x: player.x, y: player.y },
                isAnimating: AppState.isAnimating,
                pausedProgress: Animations.pausedProgress,
                expectedPos: grandchildPos,
                animationChainPlayers: Animations.animationChainPlayers ?
                    Animations.animationChainPlayers[playerId] : null
            };
        }, { playerId, grandchildPos });


        // BUG CHECK: Player should be at grandchild position (final frame)
        // If bug exists, player might be stuck at child position
        if (Math.abs(afterAnimation.playerPos.x - grandchildPos.x) > 10 ||
            Math.abs(afterAnimation.playerPos.y - grandchildPos.y) > 10) {
        } else {
        }

        // Player should end at grandchild position
        expect(afterAnimation.playerPos.x).toBeCloseTo(grandchildPos.x, 0);
        expect(afterAnimation.playerPos.y).toBeCloseTo(grandchildPos.y, 0);
    });

    test('animation chain is built correctly after navigation back to grandchild', async ({ page }) => {
        await addPlayer(page);
        const playerId = await page.evaluate(() => AppState.players[0].id);

        // Create Child
        await page.evaluate(() => {
            AppState.saveCurrentBoard();
            const childId = AppState.createChildBoard(AppState.currentBoardId);
            AppState.loadBoard(childId);
            Players.render();
        });

        await page.evaluate(({ playerId }) => {
            const player = AppState.players.find(p => p.id === playerId);
            player.x = 2000;
            player.y = 1000;
            AppState.saveCurrentBoard();
        }, { playerId });

        const childBoardId = await page.evaluate(() => AppState.currentBoardId);

        // Create Grandchild
        await page.evaluate(() => {
            AppState.saveCurrentBoard();
            const grandchildId = AppState.createChildBoard(AppState.currentBoardId);
            AppState.loadBoard(grandchildId);
            Players.render();
        });

        await page.evaluate(({ playerId }) => {
            const player = AppState.players.find(p => p.id === playerId);
            player.x = 3000;
            player.y = 1500;
            AppState.saveCurrentBoard();
            Players.render();
            Animations.renderParentPaths();
        }, { playerId });

        const grandchildBoardId = await page.evaluate(() => AppState.currentBoardId);

        await page.waitForTimeout(200);

        // Go to frame start on Grandchild
        await page.locator('#btn-go-to-start').click();
        await page.waitForTimeout(200);

        // Navigate to Child
        await page.evaluate(({ childBoardId }) => {
            AppState.loadBoard(childBoardId);
            Players.render();
            Balls.render();
            Elements.render();
            Plates.render();
            Shapes.render();
            Animations.renderParentPaths();
        }, { childBoardId });

        await page.waitForTimeout(300);

        // Navigate back to Grandchild
        await page.evaluate(({ grandchildBoardId }) => {
            AppState.loadBoard(grandchildBoardId);
            Players.render();
            Balls.render();
            Elements.render();
            Plates.render();
            Shapes.render();
            Animations.renderParentPaths();
        }, { grandchildBoardId });

        await page.waitForTimeout(300);

        // Check animation chain before playing
        const beforePlay = await page.evaluate(({ playerId }) => {
            const chain = Animations.animationChainPlayers?.[playerId];
            return {
                hasChain: !!chain,
                chainLength: chain?.length || 0,
                chain: chain,
                boardChainLength: AppState.getBoardAncestryChain().length
            };
        }, { playerId });


        // Animation chain should have 3 positions (Root, Child, Grandchild)
        expect(beforePlay.boardChainLength).toBe(3);

        // Start animation to build the chain
        await page.locator('#btn-play-pause').click();
        await page.waitForTimeout(100); // Just start it

        const duringPlay = await page.evaluate(({ playerId }) => {
            const chain = Animations.animationChainPlayers?.[playerId];
            return {
                hasChain: !!chain,
                chainLength: chain?.length || 0,
                chain: chain,
                phaseCount: Animations.animationPhaseCount
            };
        }, { playerId });


        // Chain should have all 3 frames
        expect(duringPlay.chainLength).toBe(3);
        expect(duringPlay.phaseCount).toBe(2); // 2 transitions (Root→Child, Child→Grandchild)

        // Stop
        await page.locator('#btn-play-pause').click();
    });
});
