/**
 * Progress bar should show position relative to FULL animation hierarchy
 *
 * Example: Root → Child → Grandchild (3 boards, 2 transitions)
 * When on Child board and clicking "go to frame start":
 * - We go to Root position (start of first transition)
 * - In full hierarchy context, this is 0% if equal durations
 *
 * But when we're ALREADY at Child position (not clicking anything):
 * - Child is the END of first transition, START of second transition
 * - In full hierarchy: 50% if equal durations, 33% if first frame is 2x speed
 */
import { test, expect } from './test-config.js';
import { goto, addPlayer } from './helpers.js';

test.describe('Progress Bar Shows Full Hierarchy Position', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
    });

    test('on child board, go to start should show 0%', async ({ page }) => {
        // Create hierarchy: Root → Child → Grandchild
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

        // Go back to Child board
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

        // Now we're on Child board (depth 1)
        const boardInfo = await page.evaluate(() => ({
            chainLength: AppState.getBoardAncestryChain().length,
            depth: AppState.getBoardAncestryChain().length - 1
        }));

        expect(boardInfo.chainLength).toBe(2); // Root + Child
        expect(boardInfo.depth).toBe(1); // Child is at depth 1

        // Click "go to frame start"
        await page.locator('#btn-go-to-start').click();
        await page.waitForTimeout(200);

        const afterGoToStart = await page.evaluate(() => ({
            pausedProgress: Animations.pausedProgress,
            fillWidth: parseFloat(document.querySelector('.animation-progress-fill')?.style.width || '0'),
            dotLeft: parseFloat(document.querySelector('.animation-progress-dot')?.style.left || '0')
        }));

        // Child board (depth=1): formula (1-1)/1 = 0%
        expect(afterGoToStart.pausedProgress).toBeCloseTo(0, 2);
        expect(afterGoToStart.fillWidth).toBeCloseTo(0, 1);
        expect(afterGoToStart.dotLeft).toBeCloseTo(0, 1);
    });

    test('on child board with grandchild, go to start should show 0%', async ({ page }) => {
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
        }, { playerId });

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

        // Click go to start
        await page.locator('#btn-go-to-start').click();
        await page.waitForTimeout(200);

        const state = await page.evaluate(() => ({
            fillWidth: parseFloat(document.querySelector('.animation-progress-fill')?.style.width || '0'),
            dotLeft: parseFloat(document.querySelector('.animation-progress-dot')?.style.left || '0'),
            depth: AppState.getBoardAncestryChain().length - 1
        }));

        expect(state.depth).toBe(1); // Child is at depth 1

        // Child board (depth=1): formula (1-1)/1 = 0%
        expect(state.fillWidth).toBeCloseTo(0, 1);
        expect(state.dotLeft).toBeCloseTo(0, 1);
    });

    test('child board with custom frame speeds, go to start should show 0%', async ({ page }) => {
        await addPlayer(page);
        const playerId = await page.evaluate(() => AppState.players[0].id);

        // Set animation duration for first transition
        const firstDuration = await page.evaluate(() => {
            AppState.animationDuration = 2000; // First frame 2x speed (shorter duration)
            return AppState.animationDuration;
        });

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

        // Change duration for second transition
        await page.evaluate(() => {
            AppState.animationDuration = 4000; // Second frame normal speed
        });

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
        }, { playerId });

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

        // Click go to start
        await page.locator('#btn-go-to-start').click();
        await page.waitForTimeout(200);

        const state = await page.evaluate(() => ({
            fillWidth: parseFloat(document.querySelector('.animation-progress-fill')?.style.width || '0'),
            dotLeft: parseFloat(document.querySelector('.animation-progress-dot')?.style.left || '0'),
            pausedProgress: Animations.pausedProgress,
            depth: AppState.getBoardAncestryChain().length - 1
        }));

        expect(state.depth).toBe(1); // Child is at depth 1

        // Child board (depth=1): formula (1-1)/1 = 0%
        // Progress is based on depth, not frame durations
        expect(state.fillWidth).toBeCloseTo(0, 1);
        expect(state.dotLeft).toBeCloseTo(0, 1);
        expect(state.pausedProgress).toBeCloseTo(0, 2);
    });
});
