/**
 * Go to frame end button tests — verify that clicking stop/go-to-end
 * correctly moves players to their final positions.
 */
import { test, expect } from './test-config.js';
import { goto, addPlayer } from './helpers.js';

/** Create a child board with a player that has moved, setting up an animation */
async function setupAnimation(page) {
    // Add a player on the parent board
    await addPlayer(page);
    const playerId = await page.evaluate(() => AppState.players[0].id);

    // Get initial position on parent board
    const parentPos = await page.evaluate(({ playerId }) => {
        const player = AppState.players.find(p => p.id === playerId);
        return { x: player.x, y: player.y, rotation: player.rotation || 0 };
    }, { playerId });

    // Create and switch to child board
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
            Animations.renderParentPaths();
        }
        return childId;
    });
    await page.waitForTimeout(300);

    // Move the player to create a path
    const childPos = await page.evaluate(({ playerId }) => {
        const player = AppState.players.find(p => p.id === playerId);
        if (player) {
            player.x = 2500;
            player.y = 1500;
            player.rotation = 45;
            // Mark as explicitly set so it gets saved to child board
            player._explicitlySet = true;
            AppState.saveCurrentBoard();
            Players.render();
            Animations.renderParentPaths();
        }
        return { x: player.x, y: player.y, rotation: player.rotation };
    }, { playerId });
    await page.waitForTimeout(200);

    return { childId, playerId, parentPos, childPos };
}

test.describe('Go To Frame End', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
    });

    test('stop button moves player to correct end position', async ({ page }) => {
        const { playerId, childPos } = await setupAnimation(page);

        // Start playing
        await page.locator('#btn-play-pause').click();
        await page.waitForTimeout(500); // Let it play partway

        // Pause
        await page.locator('#btn-play-pause').click();
        await page.waitForTimeout(100);

        // Verify we're partway through
        const progressBefore = await page.evaluate(() => Animations.pausedProgress);
        expect(progressBefore).toBeGreaterThan(0);
        expect(progressBefore).toBeLessThan(1);

        // Click stop (goes to frame end)
        await page.locator('#btn-stop').click();
        await page.waitForTimeout(100);

        // Check final position - should match the child board position
        const finalPos = await page.evaluate(({ playerId }) => {
            const player = AppState.players.find(p => p.id === playerId);
            return { x: player.x, y: player.y, rotation: player.rotation || 0 };
        }, { playerId });

        // Player should be at the END position (child board position)
        expect(finalPos.x).toBeCloseTo(childPos.x, 0);
        expect(finalPos.y).toBeCloseTo(childPos.y, 0);
        expect(finalPos.rotation).toBeCloseTo(childPos.rotation, 0);
    });

    test('clicking board area during animation goes to frame end with correct position', async ({ page }) => {
        const { playerId, childPos } = await setupAnimation(page);

        // Start playing
        await page.locator('#btn-play-pause').click();
        await page.waitForTimeout(300);

        // Click on board area to go to frame end
        await page.locator('.board-container').click({ position: { x: 400, y: 400 } });
        await page.waitForTimeout(100);

        // Check progress is at end
        const progress = await page.evaluate(() => Animations.pausedProgress);
        expect(progress).toBe(1);

        // Check final position - should match the child board position
        const finalPos = await page.evaluate(({ playerId }) => {
            const player = AppState.players.find(p => p.id === playerId);
            return { x: player.x, y: player.y, rotation: player.rotation || 0 };
        }, { playerId });

        expect(finalPos.x).toBeCloseTo(childPos.x, 0);
        expect(finalPos.y).toBeCloseTo(childPos.y, 0);
        expect(finalPos.rotation).toBeCloseTo(childPos.rotation, 0);
    });

    test('go to frame end after natural completion maintains position', async ({ page }) => {
        const { playerId, childPos } = await setupAnimation(page);

        // Start playing and let it complete naturally
        await page.evaluate(() => { AppState.animationRepeat = false; });
        await page.locator('#btn-play-pause').click();
        await page.waitForTimeout(3500); // Wait for completion (default 3s duration + buffer)

        // Animation should have stopped at end
        const isAnimating = await page.evaluate(() => AppState.isAnimating);
        expect(isAnimating).toBe(false);

        // Check position after natural completion
        const posAfterComplete = await page.evaluate(({ playerId }) => {
            const player = AppState.players.find(p => p.id === playerId);
            return { x: player.x, y: player.y, rotation: player.rotation || 0 };
        }, { playerId });

        // Should be at end position
        expect(posAfterComplete.x).toBeCloseTo(childPos.x, 0);
        expect(posAfterComplete.y).toBeCloseTo(childPos.y, 0);
        expect(posAfterComplete.rotation).toBeCloseTo(childPos.rotation, 0);

        // Now manually call goToFrameEnd (via stop button)
        await page.locator('#btn-stop').click();
        await page.waitForTimeout(100);

        // Position should still be correct
        const posAfterStop = await page.evaluate(({ playerId }) => {
            const player = AppState.players.find(p => p.id === playerId);
            return { x: player.x, y: player.y, rotation: player.rotation || 0 };
        }, { playerId });

        expect(posAfterStop.x).toBeCloseTo(childPos.x, 0);
        expect(posAfterStop.y).toBeCloseTo(childPos.y, 0);
        expect(posAfterStop.rotation).toBeCloseTo(childPos.rotation, 0);
    });

    test('go to frame end immediately after starting animation', async ({ page }) => {
        const { playerId, childPos } = await setupAnimation(page);

        // Start playing
        await page.locator('#btn-play-pause').click();
        await page.waitForTimeout(50); // Just a tiny bit

        // Immediately stop
        await page.locator('#btn-stop').click();
        await page.waitForTimeout(100);

        // Check final position
        const finalPos = await page.evaluate(({ playerId }) => {
            const player = AppState.players.find(p => p.id === playerId);
            return { x: player.x, y: player.y, rotation: player.rotation || 0 };
        }, { playerId });

        // Should still be at the correct end position
        expect(finalPos.x).toBeCloseTo(childPos.x, 0);
        expect(finalPos.y).toBeCloseTo(childPos.y, 0);
        expect(finalPos.rotation).toBeCloseTo(childPos.rotation, 0);
    });

    test('go to end works after go to beginning without playing', async ({ page }) => {
        const { playerId, parentPos, childPos } = await setupAnimation(page);

        // Click go to start (should move to parent position)
        await page.locator('#btn-go-to-start').click();
        await page.waitForTimeout(200);

        // Verify we're at the start
        const posAtStart = await page.evaluate(({ playerId }) => {
            const player = AppState.players.find(p => p.id === playerId);
            return { x: player.x, y: player.y, rotation: player.rotation || 0 };
        }, { playerId });

        expect(posAtStart.x).toBeCloseTo(parentPos.x, 0);
        expect(posAtStart.y).toBeCloseTo(parentPos.y, 0);

        // Now click stop/go to end WITHOUT playing the animation
        await page.locator('#btn-stop').click();
        await page.waitForTimeout(200);

        // Check final position - should be at child position (end)
        const posAtEnd = await page.evaluate(({ playerId }) => {
            const player = AppState.players.find(p => p.id === playerId);
            return { x: player.x, y: player.y, rotation: player.rotation || 0 };
        }, { playerId });

        // Should be at the END position (child board position), not still at start
        expect(posAtEnd.x).toBeCloseTo(childPos.x, 0);
        expect(posAtEnd.y).toBeCloseTo(childPos.y, 0);
        expect(posAtEnd.rotation).toBeCloseTo(childPos.rotation, 0);
    });

    test('clicking board after go to frame start navigates to last frame', async ({ page }) => {
        const { playerId, parentPos, childPos } = await setupAnimation(page);

        // Click go to frame start — moves to parent position, sets pausedProgress = 0
        await page.locator('#btn-go-to-start').click();
        await page.waitForTimeout(200);

        // Verify we're at start position and pausedProgress is 0
        const posAtStart = await page.evaluate(({ playerId }) => {
            const player = AppState.players.find(p => p.id === playerId);
            return { x: player.x, y: player.y, pausedProgress: Animations.pausedProgress };
        }, { playerId });
        expect(posAtStart.x).toBeCloseTo(parentPos.x, 0);
        expect(posAtStart.y).toBeCloseTo(parentPos.y, 0);
        expect(posAtStart.pausedProgress).toBe(0);

        // Click on board area — should go to last frame (child board position)
        await page.locator('.board-container').click({ position: { x: 400, y: 400 } });
        await page.waitForTimeout(100);

        // Player should be at end position (child board = last frame)
        const finalPos = await page.evaluate(({ playerId }) => {
            const player = AppState.players.find(p => p.id === playerId);
            return { x: player.x, y: player.y, rotation: player.rotation || 0, pausedProgress: Animations.pausedProgress };
        }, { playerId });

        expect(finalPos.x).toBeCloseTo(childPos.x, 0);
        expect(finalPos.y).toBeCloseTo(childPos.y, 0);
        expect(finalPos.rotation).toBeCloseTo(childPos.rotation, 0);
        expect(finalPos.pausedProgress).toBe(1);
    });
});
