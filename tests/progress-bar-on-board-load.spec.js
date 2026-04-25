/**
 * Test that progress bar shows correct position when loading/opening a board
 */
import { test, expect } from './test-config.js';
import { goto, addPlayer } from './helpers.js';

test.describe('Progress Bar Position on Board Load', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
    });

    test('progress bar shows 0% when opening root board', async ({ page }) => {
        await addPlayer(page);

        const state = await page.evaluate(() => ({
            fillWidth: parseFloat(document.querySelector('.animation-progress-fill')?.style.width || '0'),
            dotLeft: parseFloat(document.querySelector('.animation-progress-dot')?.style.left || '0'),
            pausedProgress: Animations.pausedProgress
        }));


        expect(state.fillWidth).toBe(0);
        expect(state.dotLeft).toBe(0);
        expect(state.pausedProgress).toBe(0);
    });

    test('progress bar shows 100% when opening child board (2-level hierarchy)', async ({ page }) => {
        await addPlayer(page);
        const playerId = await page.evaluate(() => AppState.players[0].id);

        // Create child
        await page.evaluate(() => {
            AppState.saveCurrentBoard();
            const childId = AppState.createChildBoard(AppState.currentBoardId);
            AppState.loadBoard(childId);
            Players.render();
            Balls.render();
            Elements.render();
            Plates.render();
            Shapes.render();
        });

        await page.evaluate(({ playerId }) => {
            const player = AppState.players.find(p => p.id === playerId);
            player.x = 2500;
            player.y = 1500;
            AppState.saveCurrentBoard();
            Players.render();
            Animations.renderParentPaths();
        }, { playerId });

        await page.waitForTimeout(200);

        const state = await page.evaluate(() => ({
            fillWidth: parseFloat(document.querySelector('.animation-progress-fill')?.style.width || '0'),
            dotLeft: parseFloat(document.querySelector('.animation-progress-dot')?.style.left || '0'),
            pausedProgress: Animations.pausedProgress,
            chainLength: AppState.getBoardAncestryChain().length
        }));


        // Child is at end of hierarchy: 1/1 = 100%
        expect(state.chainLength).toBe(2);
        expect(state.fillWidth).toBe(100);
        expect(state.dotLeft).toBe(100);
        expect(state.pausedProgress).toBe(1);
    });

    test('progress bar shows 100% when opening child board even with grandchild existing', async ({ page }) => {
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

        const childBoardId = await page.evaluate(() => AppState.currentBoardId);

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

        // Now navigate back to child board
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

        const state = await page.evaluate(() => ({
            fillWidth: parseFloat(document.querySelector('.animation-progress-fill')?.style.width || '0'),
            dotLeft: parseFloat(document.querySelector('.animation-progress-dot')?.style.left || '0'),
            pausedProgress: Animations.pausedProgress,
            chainLength: AppState.getBoardAncestryChain().length
        }));


        // When navigating to Child, show it at end of visible hierarchy (Root→Child)
        // Even though Grandchild exists, it's not part of the visible animation path
        expect(state.chainLength).toBe(2); // Root + Child
        expect(state.fillWidth).toBe(100); // At end of visible hierarchy
        expect(state.dotLeft).toBe(100);
        expect(state.pausedProgress).toBe(1);
    });

    test('progress bar shows 100% when opening grandchild board', async ({ page }) => {
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

        const state = await page.evaluate(() => ({
            fillWidth: parseFloat(document.querySelector('.animation-progress-fill')?.style.width || '0'),
            dotLeft: parseFloat(document.querySelector('.animation-progress-dot')?.style.left || '0'),
            pausedProgress: Animations.pausedProgress,
            chainLength: AppState.getBoardAncestryChain().length
        }));


        // Grandchild is at end: 2/2 = 100%
        expect(state.chainLength).toBe(3); // Root + Child + Grandchild
        expect(state.fillWidth).toBe(100);
        expect(state.dotLeft).toBe(100);
        expect(state.pausedProgress).toBe(1);
    });
});
