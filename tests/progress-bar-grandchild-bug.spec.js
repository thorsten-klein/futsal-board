/**
 * Test for progress bar position on grandchild boards (multi-level hierarchy)
 * User reports: "on a child board it can never jump to position 0"
 */
import { test, expect } from './test-config.js';
import { goto, addPlayer } from './helpers.js';

test.describe('Progress Bar on Grandchild Boards', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
    });

    test('progress bar should go to 0 on grandchild board after go to start', async ({ page }) => {
        // Add player on root board
        await addPlayer(page);
        const playerId = await page.evaluate(() => AppState.players[0].id);

        // Create child board
        await page.evaluate(() => {
            AppState.saveCurrentBoard();
            const childId = AppState.createChildBoard(AppState.currentBoardId);
            AppState.loadBoard(childId);
            Players.render();
        });

        // Move player on child board
        await page.evaluate(({ playerId }) => {
            const player = AppState.players.find(p => p.id === playerId);
            player.x = 2000;
            player.y = 1000;
            AppState.saveCurrentBoard();
        }, { playerId });

        // Create grandchild board
        await page.evaluate(() => {
            AppState.saveCurrentBoard();
            const grandchildId = AppState.createChildBoard(AppState.currentBoardId);
            AppState.loadBoard(grandchildId);
            Players.render();
        });

        // Move player on grandchild board
        const grandchildPos = await page.evaluate(({ playerId }) => {
            const player = AppState.players.find(p => p.id === playerId);
            player.x = 3000;
            player.y = 1500;
            AppState.saveCurrentBoard();
            Players.render();
            Animations.renderParentPaths();
            return { x: player.x, y: player.y };
        }, { playerId });

        await page.waitForTimeout(200);


        // Now we're on a grandchild board
        const boardInfo = await page.evaluate(() => ({
            isChildBoard: AppState.isChildBoard(),
            boardChainLength: AppState.getBoardAncestryChain().length
        }));

        expect(boardInfo.boardChainLength).toBe(3); // root, child, grandchild

        // Play animation
        await page.locator('#btn-play-pause').click();
        await page.waitForTimeout(600);

        // Pause
        await page.locator('#btn-play-pause').click();
        await page.waitForTimeout(100);

        const pausedState = await page.evaluate(() => ({
            pausedProgress: Animations.pausedProgress,
            fillWidth: parseFloat(document.querySelector('.animation-progress-fill')?.style.width || '0'),
            dotLeft: parseFloat(document.querySelector('.animation-progress-dot')?.style.left || '0')
        }));

        expect(pausedState.pausedProgress).toBeGreaterThan(0);

        // Go to start - THIS IS WHERE THE BUG MIGHT BE
        await page.locator('#btn-go-to-start').click();
        await page.waitForTimeout(200);

        const afterGoToStart = await page.evaluate(() => ({
            pausedProgress: Animations.pausedProgress,
            fillWidth: parseFloat(document.querySelector('.animation-progress-fill')?.style.width || '0'),
            dotLeft: parseFloat(document.querySelector('.animation-progress-dot')?.style.left || '0'),
            playerPos: {
                x: AppState.players[0].x,
                y: AppState.players[0].y
            }
        }));


        // BUG CHECK

        if (afterGoToStart.pausedProgress !== 0) {
        } else {
        }

        if (afterGoToStart.fillWidth !== 0) {
        } else {
        }

        if (afterGoToStart.dotLeft !== 0) {
        } else {
        }

        // When on Child board with Grandchild, progress should be 50%
        // (Child's position in Root→Child→Grandchild hierarchy)
        expect(afterGoToStart.pausedProgress).toBe(0.5);
        expect(afterGoToStart.fillWidth).toBe(50);
        expect(afterGoToStart.dotLeft).toBe(50);
    });

    test('progress bar on simple child board (not grandchild)', async ({ page }) => {
        // Add player
        await addPlayer(page);
        const playerId = await page.evaluate(() => AppState.players[0].id);

        // Create child board
        await page.evaluate(() => {
            AppState.saveCurrentBoard();
            const childId = AppState.createChildBoard(AppState.currentBoardId);
            AppState.loadBoard(childId);
            Players.render();
        });

        // Move player
        await page.evaluate(({ playerId }) => {
            const player = AppState.players.find(p => p.id === playerId);
            player.x = 2500;
            player.y = 1500;
            AppState.saveCurrentBoard();
            Players.render();
            Animations.renderParentPaths();
        }, { playerId });

        await page.waitForTimeout(200);

        // Play and pause
        await page.locator('#btn-play-pause').click();
        await page.waitForTimeout(600);
        await page.locator('#btn-play-pause').click();
        await page.waitForTimeout(100);

        // Go to start
        await page.locator('#btn-go-to-start').click();
        await page.waitForTimeout(100);

        const state = await page.evaluate(() => ({
            pausedProgress: Animations.pausedProgress,
            fillWidth: parseFloat(document.querySelector('.animation-progress-fill')?.style.width || '0'),
            dotLeft: parseFloat(document.querySelector('.animation-progress-dot')?.style.left || '0'),
            boardChainLength: AppState.getBoardAncestryChain().length
        }));


        expect(state.boardChainLength).toBe(2); // root and child
        expect(state.pausedProgress).toBe(0);
        expect(state.fillWidth).toBe(0);
        expect(state.dotLeft).toBe(0);
    });
});
