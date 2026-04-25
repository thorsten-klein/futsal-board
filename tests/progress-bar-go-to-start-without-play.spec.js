/**
 * Test clicking "go to start" WITHOUT playing the animation first
 * This might be the scenario where the progress bar doesn't go to 0
 */
import { test, expect } from './test-config.js';
import { goto, addPlayer } from './helpers.js';

test.describe('Go to Start Without Playing First', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
    });

    test('clicking go to start without playing first on child board', async ({ page }) => {
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

        // Check initial state
        const initialState = await page.evaluate(() => ({
            pausedProgress: Animations.pausedProgress,
            fillWidth: parseFloat(document.querySelector('.animation-progress-fill')?.style.width || '0'),
            dotLeft: parseFloat(document.querySelector('.animation-progress-dot')?.style.left || '0'),
            hasAnimationChain: Object.keys(Animations.animationChainPlayers || {}).length > 0
        }));


        // Click go to start WITHOUT playing first
        await page.locator('#btn-go-to-start').click();
        await page.waitForTimeout(200);

        const afterGoToStart = await page.evaluate(() => ({
            pausedProgress: Animations.pausedProgress,
            fillWidth: parseFloat(document.querySelector('.animation-progress-fill')?.style.width || '0'),
            dotLeft: parseFloat(document.querySelector('.animation-progress-dot')?.style.left || '0'),
            hasAnimationChain: Object.keys(Animations.animationChainPlayers || {}).length > 0
        }));


        if (afterGoToStart.pausedProgress !== 0) {
        } else {
        }

        if (afterGoToStart.fillWidth !== 0) {
        } else {
        }

        if (afterGoToStart.dotLeft !== 0) {
        } else {
        }

        // Should all be 0
        expect(afterGoToStart.pausedProgress).toBe(0);
        expect(afterGoToStart.fillWidth).toBe(0);
        expect(afterGoToStart.dotLeft).toBe(0);
    });

    test('clicking go to start WITHOUT playing on grandchild board', async ({ page }) => {
        // Add player
        await addPlayer(page);
        const playerId = await page.evaluate(() => AppState.players[0].id);

        // Create child
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

        // Create grandchild
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

        await page.waitForTimeout(200);

        const boardInfo = await page.evaluate(() => ({
            boardChainLength: AppState.getBoardAncestryChain().length
        }));

        expect(boardInfo.boardChainLength).toBe(3);

        // Click go to start WITHOUT playing
        await page.locator('#btn-go-to-start').click();
        await page.waitForTimeout(200);

        const afterGoToStart = await page.evaluate(() => ({
            pausedProgress: Animations.pausedProgress,
            fillWidth: parseFloat(document.querySelector('.animation-progress-fill')?.style.width || '0'),
            dotLeft: parseFloat(document.querySelector('.animation-progress-dot')?.style.left || '0')
        }));


        // When on Child board with Grandchild descendant, go to start shows 50%
        // (Child's position in full hierarchy: Root→Child→Grandchild)
        if (afterGoToStart.fillWidth !== 50 || afterGoToStart.dotLeft !== 50) {
        } else {
        }

        expect(afterGoToStart.pausedProgress).toBe(0.5);
        expect(afterGoToStart.fillWidth).toBe(50);
        expect(afterGoToStart.dotLeft).toBe(50);
    });
});
