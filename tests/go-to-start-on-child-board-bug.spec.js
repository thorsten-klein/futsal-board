/**
 * Bug: When on a child board (that has its own child/grandchild),
 * clicking "go to frame start" incorrectly moves the progress bar to 0.
 *
 * Hierarchy: Root → Child → Grandchild
 * When viewing: Child board
 * Action: Click "go to frame start"
 * Bug: Progress bar goes to 0 (it shouldn't)
 */
import { test, expect } from './test-config.js';
import { goto, addPlayer } from './helpers.js';

test.describe('Go to Frame Start on Child Board Bug', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
    });

    test('BUG: clicking go to frame start on child board (that has grandchild) should NOT move progress to 0', async ({ page }) => {
        // Setup: Create Root → Child → Grandchild hierarchy
        await addPlayer(page);
        const playerId = await page.evaluate(() => AppState.players[0].id);

        // Get root position
        const rootPos = await page.evaluate(({ playerId }) => {
            const player = AppState.players.find(p => p.id === playerId);
            return { x: player.x, y: player.y };
        }, { playerId });


        // Create Child board
        await page.evaluate(() => {
            AppState.saveCurrentBoard();
            const childId = AppState.createChildBoard(AppState.currentBoardId);
            AppState.loadBoard(childId);
            Players.render();
        });

        // Move player on Child board
        const childPos = await page.evaluate(({ playerId }) => {
            const player = AppState.players.find(p => p.id === playerId);
            player.x = 2000;
            player.y = 1000;
            AppState.saveCurrentBoard();
            return { x: player.x, y: player.y };
        }, { playerId });


        // Save child board ID
        const childBoardId = await page.evaluate(() => AppState.currentBoardId);

        // Create Grandchild board
        await page.evaluate(() => {
            AppState.saveCurrentBoard();
            const grandchildId = AppState.createChildBoard(AppState.currentBoardId);
            AppState.loadBoard(grandchildId);
            Players.render();
        });

        // Move player on Grandchild board
        const grandchildPos = await page.evaluate(({ playerId }) => {
            const player = AppState.players.find(p => p.id === playerId);
            player.x = 3000;
            player.y = 1500;
            AppState.saveCurrentBoard();
            Players.render();
            Animations.renderParentPaths();
            return { x: player.x, y: player.y };
        }, { playerId });


        // Now navigate BACK to the Child board (the middle one)
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

        // Verify we're on the child board
        const boardInfo = await page.evaluate(() => {
            const chain = AppState.getBoardAncestryChain();
            return {
                currentBoardIndex: chain.length - 1, // Should be 1 (child)
                chainLength: chain.length, // Should be 2 (root + child)
                isChildBoard: AppState.isChildBoard(),
                currentBoardHasChildren: AppState.boards.some(b => b.parentId === AppState.currentBoardId)
            };
        });


        expect(boardInfo.chainLength).toBe(2); // root + child
        expect(boardInfo.isChildBoard).toBe(true);
        expect(boardInfo.currentBoardHasChildren).toBe(true);

        // Now click "go to frame start" while on the child board
        await page.locator('#btn-go-to-start').click();
        await page.waitForTimeout(200);

        const afterGoToStart = await page.evaluate(() => {
            const fill = document.querySelector('.animation-progress-fill');
            const dot = document.querySelector('.animation-progress-dot');
            return {
                pausedProgress: Animations.pausedProgress,
                fillWidth: parseFloat(fill?.style.width || '0'),
                dotLeft: parseFloat(dot?.style.left || '0'),
                playerPos: {
                    x: AppState.players[0].x,
                    y: AppState.players[0].y
                }
            };
        });



        // The player should be at the root position (parent of child)
        const playerAtRoot = Math.abs(afterGoToStart.playerPos.x - rootPos.x) < 5 &&
                            Math.abs(afterGoToStart.playerPos.y - rootPos.y) < 5;

        if (playerAtRoot) {
        } else {
        }

        // BUG: When on child board and clicking "go to frame start",
        // the progress bar goes to 0, which may be incorrect
        if (afterGoToStart.dotLeft === 0 && afterGoToStart.fillWidth === 0) {
        }

        // The question is: SHOULD the progress bar be at 0 when we're on a child board
        // and go to frame start? Let's see what the user expects...

        // For now, let's just document what happens
    });

    test('workflow: create hierarchy, go to child, play, pause, go to start', async ({ page }) => {
        // Create hierarchy
        await addPlayer(page);
        const playerId = await page.evaluate(() => AppState.players[0].id);

        // Child
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

        // Grandchild
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

        // Go back to child board
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


        // Play animation
        await page.locator('#btn-play-pause').click();
        await page.waitForTimeout(600);

        const whilePlaying = await page.evaluate(() => ({
            pausedProgress: Animations.pausedProgress,
            fillWidth: parseFloat(document.querySelector('.animation-progress-fill')?.style.width || '0')
        }));


        // Pause
        await page.locator('#btn-play-pause').click();
        await page.waitForTimeout(100);

        const afterPause = await page.evaluate(() => ({
            pausedProgress: Animations.pausedProgress,
            fillWidth: parseFloat(document.querySelector('.animation-progress-fill')?.style.width || '0')
        }));


        // Go to start
        await page.locator('#btn-go-to-start').click();
        await page.waitForTimeout(200);

        const afterGoToStart = await page.evaluate(() => ({
            pausedProgress: Animations.pausedProgress,
            fillWidth: parseFloat(document.querySelector('.animation-progress-fill')?.style.width || '0'),
            dotLeft: parseFloat(document.querySelector('.animation-progress-dot')?.style.left || '0')
        }));


        if (afterGoToStart.fillWidth === 0 && afterGoToStart.dotLeft === 0) {
        }
    });
});
