/**
 * Test that progress bar is recalculated when navigating to parent boards
 * When going from Grandchild to Child, the animation is one frame less,
 * so the progress bar must be recalculated.
 */
import { test, expect } from './test-config.js';
import { goto, addPlayer } from './helpers.js';

test.describe('Progress Bar Recalculation on Parent Navigation', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
    });

    test('navigating from grandchild to child recalculates progress bar', async ({ page }) => {
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

        await page.waitForTimeout(200);

        // On Grandchild: progress should be 100% (end of 3-level hierarchy)
        const onGrandchild = await page.evaluate(() => ({
            fillWidth: parseFloat(document.querySelector('.animation-progress-fill')?.style.width || '0'),
            dotLeft: parseFloat(document.querySelector('.animation-progress-dot')?.style.left || '0'),
            pausedProgress: Animations.pausedProgress,
            chainLength: AppState.getBoardAncestryChain().length
        }));


        expect(onGrandchild.chainLength).toBe(3);
        expect(onGrandchild.fillWidth).toBe(100);
        expect(onGrandchild.pausedProgress).toBe(1);

        // Navigate to Child (parent)
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

        // On Child: Now the hierarchy is Root→Child (2 levels)
        // Child should show 100% (at end of 2-level hierarchy)
        // NOT 50% (which would be Child's position in 3-level hierarchy)
        const onChild = await page.evaluate(() => ({
            fillWidth: parseFloat(document.querySelector('.animation-progress-fill')?.style.width || '0'),
            dotLeft: parseFloat(document.querySelector('.animation-progress-dot')?.style.left || '0'),
            pausedProgress: Animations.pausedProgress,
            chainLength: AppState.getBoardAncestryChain().length
        }));


        // Child board is at end of its own hierarchy (no descendants visible)
        expect(onChild.chainLength).toBe(2); // Root + Child
        expect(onChild.fillWidth).toBe(100); // At end
        expect(onChild.pausedProgress).toBe(1);
    });

    test('navigating from child to root recalculates progress bar', async ({ page }) => {
        await addPlayer(page);
        const playerId = await page.evaluate(() => AppState.players[0].id);

        const rootBoardId = await page.evaluate(() => AppState.currentBoardId);

        // Create Child
        await page.evaluate(() => {
            AppState.saveCurrentBoard();
            const childId = AppState.createChildBoard(AppState.currentBoardId);
            AppState.loadBoard(childId);
            Players.render();
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

        // On Child: progress should be 100%
        const onChild = await page.evaluate(() => ({
            fillWidth: parseFloat(document.querySelector('.animation-progress-fill')?.style.width || '0'),
            pausedProgress: Animations.pausedProgress
        }));

        expect(onChild.fillWidth).toBe(100);
        expect(onChild.pausedProgress).toBe(1);

        // Navigate to Root
        await page.evaluate(({ rootBoardId }) => {
            AppState.loadBoard(rootBoardId);
            Players.render();
            Balls.render();
            Elements.render();
            Plates.render();
            Shapes.render();
            Animations.renderParentPaths();
        }, { rootBoardId });

        await page.waitForTimeout(300);

        // On Root: progress should be 0%
        const onRoot = await page.evaluate(() => ({
            fillWidth: parseFloat(document.querySelector('.animation-progress-fill')?.style.width || '0'),
            dotLeft: parseFloat(document.querySelector('.animation-progress-dot')?.style.left || '0'),
            pausedProgress: Animations.pausedProgress,
            isChildBoard: AppState.isChildBoard()
        }));


        expect(onRoot.isChildBoard).toBe(false);
        expect(onRoot.fillWidth).toBe(0);
        expect(onRoot.pausedProgress).toBe(0);
    });
});
