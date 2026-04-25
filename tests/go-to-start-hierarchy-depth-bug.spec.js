/**
 * Bug: "Go to start" should position progress bar based on board hierarchy depth
 *
 * Expected behavior:
 * - Child board (depth 1): Go to start → 0% (start of current frame)
 * - Grandchild board (depth 2): Go to start → 50% (1/2)
 * - Great-grandchild board (depth 3): Go to start → 66.67% (2/3)
 *
 * Formula: progress = (depth - 1) / depth
 *
 * Hierarchy: Root → Child → Grandchild → Great-grandchild
 */
import { test, expect } from './test-config.js';
import { goto, addPlayer } from './helpers.js';

test.describe('Go to Start - Hierarchy Depth Bug', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
    });

    test('Child board: Go to start should position at 0%', async ({ page }) => {
        // Setup: Create Root → Child hierarchy
        await addPlayer(page);
        const playerId = await page.evaluate(() => AppState.players[0].id);

        // Move player on root
        await page.evaluate(({ playerId }) => {
            const player = AppState.players.find(p => p.id === playerId);
            player.x = 1000;
            player.y = 500;
            AppState.saveCurrentBoard();
        }, { playerId });

        // Create Child board
        await page.evaluate(() => {
            AppState.saveCurrentBoard();
            const childId = AppState.createChildBoard(AppState.currentBoardId);
            AppState.loadBoard(childId);
            Players.render();
        });

        // Move player on Child board
        await page.evaluate(({ playerId }) => {
            const player = AppState.players.find(p => p.id === playerId);
            player.x = 3000;
            player.y = 1500;
            AppState.saveCurrentBoard();
            Players.render();
            Animations.renderParentPaths();
        }, { playerId });

        await page.waitForTimeout(200);

        // Click "Go to start"
        await page.locator('#btn-go-to-start').click();
        await page.waitForTimeout(200);

        const result = await page.evaluate(() => {
            const fill = document.querySelector('.animation-progress-fill');
            const dot = document.querySelector('.animation-progress-dot');
            return {
                pausedProgress: Animations.pausedProgress,
                fillWidth: parseFloat(fill?.style.width || '0'),
                dotLeft: parseFloat(dot?.style.left || '0'),
                depth: AppState.getBoardAncestryChain().length - 1
            };
        });

        // Expected: depth = 1, so (1-1)/1 = 0%
        expect(result.depth).toBe(1);
        expect(result.pausedProgress).toBeCloseTo(0, 2);
        expect(result.fillWidth).toBeCloseTo(0, 1);
        expect(result.dotLeft).toBeCloseTo(0, 1);
    });

    test('Grandchild board: Go to start should position at 50%', async ({ page }) => {
        // Setup: Create Root → Child → Grandchild hierarchy
        await addPlayer(page);
        const playerId = await page.evaluate(() => AppState.players[0].id);

        // Move player on root
        await page.evaluate(({ playerId }) => {
            const player = AppState.players.find(p => p.id === playerId);
            player.x = 1000;
            player.y = 500;
            AppState.saveCurrentBoard();
        }, { playerId });

        // Create Child board
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

        // Create Grandchild board
        await page.evaluate(() => {
            AppState.saveCurrentBoard();
            const grandchildId = AppState.createChildBoard(AppState.currentBoardId);
            AppState.loadBoard(grandchildId);
            Players.render();
        });

        // Move player on Grandchild board
        await page.evaluate(({ playerId }) => {
            const player = AppState.players.find(p => p.id === playerId);
            player.x = 3000;
            player.y = 1500;
            AppState.saveCurrentBoard();
            Players.render();
            Animations.renderParentPaths();
        }, { playerId });

        await page.waitForTimeout(200);

        // Click "Go to start"
        await page.locator('#btn-go-to-start').click();
        await page.waitForTimeout(200);

        const result = await page.evaluate(() => {
            const fill = document.querySelector('.animation-progress-fill');
            const dot = document.querySelector('.animation-progress-dot');
            return {
                pausedProgress: Animations.pausedProgress,
                fillWidth: parseFloat(fill?.style.width || '0'),
                dotLeft: parseFloat(dot?.style.left || '0'),
                depth: AppState.getBoardAncestryChain().length - 1
            };
        });

        // Expected: depth = 2, so (2-1)/2 = 0.5 = 50%
        expect(result.depth).toBe(2);
        expect(result.pausedProgress).toBeCloseTo(0.5, 2);
        expect(result.fillWidth).toBeCloseTo(50, 1);
        expect(result.dotLeft).toBeCloseTo(50, 1);
    });

    test('Great-grandchild board: Go to start should position at 66.67%', async ({ page }) => {
        // Setup: Create Root → Child → Grandchild → Great-grandchild hierarchy
        await addPlayer(page);
        const playerId = await page.evaluate(() => AppState.players[0].id);

        // Move player on root
        await page.evaluate(({ playerId }) => {
            const player = AppState.players.find(p => p.id === playerId);
            player.x = 1000;
            player.y = 500;
            AppState.saveCurrentBoard();
        }, { playerId });

        // Create Child board
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

        // Create Grandchild board
        await page.evaluate(() => {
            AppState.saveCurrentBoard();
            const grandchildId = AppState.createChildBoard(AppState.currentBoardId);
            AppState.loadBoard(grandchildId);
            Players.render();
        });

        await page.evaluate(({ playerId }) => {
            const player = AppState.players.find(p => p.id === playerId);
            player.x = 2500;
            player.y = 1200;
            AppState.saveCurrentBoard();
        }, { playerId });

        // Create Great-grandchild board
        await page.evaluate(() => {
            AppState.saveCurrentBoard();
            const greatGrandchildId = AppState.createChildBoard(AppState.currentBoardId);
            AppState.loadBoard(greatGrandchildId);
            Players.render();
        });

        // Move player on Great-grandchild board
        await page.evaluate(({ playerId }) => {
            const player = AppState.players.find(p => p.id === playerId);
            player.x = 3000;
            player.y = 1500;
            AppState.saveCurrentBoard();
            Players.render();
            Animations.renderParentPaths();
        }, { playerId });

        await page.waitForTimeout(200);

        // Click "Go to start"
        await page.locator('#btn-go-to-start').click();
        await page.waitForTimeout(200);

        const result = await page.evaluate(() => {
            const fill = document.querySelector('.animation-progress-fill');
            const dot = document.querySelector('.animation-progress-dot');
            return {
                pausedProgress: Animations.pausedProgress,
                fillWidth: parseFloat(fill?.style.width || '0'),
                dotLeft: parseFloat(dot?.style.left || '0'),
                depth: AppState.getBoardAncestryChain().length - 1
            };
        });

        // Expected: depth = 3, so (3-1)/3 = 0.6667 = 66.67%
        expect(result.depth).toBe(3);
        expect(result.pausedProgress).toBeCloseTo(2/3, 2);
        expect(result.fillWidth).toBeCloseTo(66.67, 1);
        expect(result.dotLeft).toBeCloseTo(66.67, 1);
    });

    test('All depths together: verify formula (depth-1)/depth', async ({ page }) => {
        // Create complete hierarchy
        await addPlayer(page);
        const playerId = await page.evaluate(() => AppState.players[0].id);

        // Root position
        await page.evaluate(({ playerId }) => {
            const player = AppState.players.find(p => p.id === playerId);
            player.x = 1000;
            player.y = 500;
            AppState.saveCurrentBoard();
        }, { playerId });

        const rootBoardId = await page.evaluate(() => AppState.currentBoardId);

        // Child
        const childBoardId = await page.evaluate(() => {
            AppState.saveCurrentBoard();
            const childId = AppState.createChildBoard(AppState.currentBoardId);
            AppState.loadBoard(childId);
            const player = AppState.players.find(p => p.id === AppState.players[0].id);
            player.x = 2000;
            player.y = 1000;
            AppState.saveCurrentBoard();
            Players.render();
            return childId;
        });

        // Grandchild
        const grandchildBoardId = await page.evaluate(() => {
            AppState.saveCurrentBoard();
            const grandchildId = AppState.createChildBoard(AppState.currentBoardId);
            AppState.loadBoard(grandchildId);
            const player = AppState.players.find(p => p.id === AppState.players[0].id);
            player.x = 2500;
            player.y = 1200;
            AppState.saveCurrentBoard();
            Players.render();
            return grandchildId;
        });

        // Great-grandchild
        const greatGrandchildBoardId = await page.evaluate(() => {
            AppState.saveCurrentBoard();
            const greatGrandchildId = AppState.createChildBoard(AppState.currentBoardId);
            AppState.loadBoard(greatGrandchildId);
            const player = AppState.players.find(p => p.id === AppState.players[0].id);
            player.x = 3000;
            player.y = 1500;
            AppState.saveCurrentBoard();
            Players.render();
            Animations.renderParentPaths();
            return greatGrandchildId;
        });

        await page.waitForTimeout(200);

        // Test Child board (depth 1): should be 0%
        await page.evaluate(({ childBoardId }) => {
            AppState.loadBoard(childBoardId);
            Players.render();
            Balls.render();
            Elements.render();
            Plates.render();
            Shapes.render();
            Animations.renderParentPaths();
        }, { childBoardId });

        await page.waitForTimeout(200);
        await page.locator('#btn-go-to-start').click();
        await page.waitForTimeout(200);

        const childResult = await page.evaluate(() => ({
            depth: AppState.getBoardAncestryChain().length - 1,
            pausedProgress: Animations.pausedProgress
        }));

        expect(childResult.depth).toBe(1);
        expect(childResult.pausedProgress).toBeCloseTo(0, 2);

        // Test Grandchild board (depth 2): should be 50%
        await page.evaluate(({ grandchildBoardId }) => {
            AppState.loadBoard(grandchildBoardId);
            Players.render();
            Balls.render();
            Elements.render();
            Plates.render();
            Shapes.render();
            Animations.renderParentPaths();
        }, { grandchildBoardId });

        await page.waitForTimeout(200);
        await page.locator('#btn-go-to-start').click();
        await page.waitForTimeout(200);

        const grandchildResult = await page.evaluate(() => ({
            depth: AppState.getBoardAncestryChain().length - 1,
            pausedProgress: Animations.pausedProgress
        }));

        expect(grandchildResult.depth).toBe(2);
        expect(grandchildResult.pausedProgress).toBeCloseTo(0.5, 2);

        // Test Great-grandchild board (depth 3): should be 66.67%
        await page.evaluate(({ greatGrandchildBoardId }) => {
            AppState.loadBoard(greatGrandchildBoardId);
            Players.render();
            Balls.render();
            Elements.render();
            Plates.render();
            Shapes.render();
            Animations.renderParentPaths();
        }, { greatGrandchildBoardId });

        await page.waitForTimeout(200);
        await page.locator('#btn-go-to-start').click();
        await page.waitForTimeout(200);

        const greatGrandchildResult = await page.evaluate(() => ({
            depth: AppState.getBoardAncestryChain().length - 1,
            pausedProgress: Animations.pausedProgress
        }));

        expect(greatGrandchildResult.depth).toBe(3);
        expect(greatGrandchildResult.pausedProgress).toBeCloseTo(2/3, 2);
    });
});
