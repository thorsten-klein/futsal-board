/**
 * Test that progress bar is correctly recalculated when navigating to another board
 * after clicking "go to frame start" on a grandchild board
 */
import { test, expect } from './test-config.js';
import { goto, addPlayer } from './helpers.js';

test.describe('Progress Bar After Go To Start Then Navigate', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
    });

    test('progress bar recalculates when navigating from grandchild after go to start', async ({ page }) => {
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

        // On Grandchild: progress should be 100%
        const onGrandchildBefore = await page.evaluate(() => ({
            fillWidth: parseFloat(document.querySelector('.animation-progress-fill')?.style.width || '0'),
            pausedProgress: Animations.pausedProgress
        }));

        expect(onGrandchildBefore.fillWidth).toBe(100);
        expect(onGrandchildBefore.pausedProgress).toBe(1);

        // Click "go to frame start" on Grandchild
        await page.locator('#btn-go-to-start').click();
        await page.waitForTimeout(200);

        const afterGoToStart = await page.evaluate(() => ({
            fillWidth: parseFloat(document.querySelector('.animation-progress-fill')?.style.width || '0'),
            dotLeft: parseFloat(document.querySelector('.animation-progress-dot')?.style.left || '0'),
            pausedProgress: Animations.pausedProgress
        }));


        // After go to start on Grandchild, it should show position in full hierarchy
        // Root→Child→Grandchild, at Child position = 1/2 = 50%
        expect(afterGoToStart.fillWidth).toBe(50);
        expect(afterGoToStart.dotLeft).toBe(50);
        expect(afterGoToStart.pausedProgress).toBe(0.5);

        // Now navigate to Child board
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
            fillWidth: parseFloat(document.querySelector('.animation-progress-fill')?.style.width || '0'),
            dotLeft: parseFloat(document.querySelector('.animation-progress-dot')?.style.left || '0'),
            pausedProgress: Animations.pausedProgress,
            chainLength: AppState.getBoardAncestryChain().length
        }));


        // When navigating to Child, it should show 100% (at end of Root→Child hierarchy)
        // NOT 50% which was the position on Grandchild
        expect(onChild.chainLength).toBe(2); // Root + Child
        expect(onChild.fillWidth).toBe(100);
        expect(onChild.dotLeft).toBe(100);
        expect(onChild.pausedProgress).toBe(1);
    });

    test('progress bar recalculates when navigating to root after go to start on grandchild', async ({ page }) => {
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
            player.x = 2000;
            player.y = 1000;
            AppState.saveCurrentBoard();
        }, { playerId });

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

        // Click "go to frame start" on Grandchild
        await page.locator('#btn-go-to-start').click();
        await page.waitForTimeout(200);

        const afterGoToStart = await page.evaluate(() => ({
            pausedProgress: Animations.pausedProgress
        }));

        expect(afterGoToStart.pausedProgress).toBe(0.5);

        // Navigate to Root board
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

        const onRoot = await page.evaluate(() => ({
            fillWidth: parseFloat(document.querySelector('.animation-progress-fill')?.style.width || '0'),
            dotLeft: parseFloat(document.querySelector('.animation-progress-dot')?.style.left || '0'),
            pausedProgress: Animations.pausedProgress,
            isChildBoard: AppState.isChildBoard()
        }));


        // On Root, progress should always be 0%
        // NOT 50% which was the position on Grandchild
        expect(onRoot.isChildBoard).toBe(false);
        expect(onRoot.fillWidth).toBe(0);
        expect(onRoot.dotLeft).toBe(0);
        expect(onRoot.pausedProgress).toBe(0);
    });

    test('progress bar recalculates when navigating between child boards after go to start', async ({ page }) => {
        await addPlayer(page);
        const playerId = await page.evaluate(() => AppState.players[0].id);

        // Create Child1
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

        const child1BoardId = await page.evaluate(() => AppState.currentBoardId);

        // Create Grandchild from Child1
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

        // Click "go to frame start" on Grandchild
        await page.locator('#btn-go-to-start').click();
        await page.waitForTimeout(200);

        const afterGoToStart = await page.evaluate(() => ({
            pausedProgress: Animations.pausedProgress
        }));

        expect(afterGoToStart.pausedProgress).toBe(0.5);

        // Navigate to Child1
        await page.evaluate(({ child1BoardId }) => {
            AppState.loadBoard(child1BoardId);
            Players.render();
            Balls.render();
            Elements.render();
            Plates.render();
            Shapes.render();
            Animations.renderParentPaths();
        }, { child1BoardId });

        await page.waitForTimeout(300);

        const onChild1 = await page.evaluate(() => ({
            fillWidth: parseFloat(document.querySelector('.animation-progress-fill')?.style.width || '0'),
            pausedProgress: Animations.pausedProgress
        }));


        // Child1 should show 100% (at end of Root→Child1 hierarchy)
        expect(onChild1.fillWidth).toBe(100);
        expect(onChild1.pausedProgress).toBe(1);
    });
});
