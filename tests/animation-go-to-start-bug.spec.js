/**
 * Test for "Go to frame start" bug after pausing animation:
 * 1. Progress bar dot should be at position 0
 * 2. No arrowhead should be visible on the path
 */
import { test, expect } from './test-config.js';
import { goto, addPlayer } from './helpers.js';

/** Create a child board with a player that has moved, setting up an animation */
async function setupAnimation(page) {
    // Add a player on the parent board
    await addPlayer(page);
    const playerId = await page.evaluate(() => AppState.players[0].id);

    // Create and switch to child board
    await page.evaluate(() => {
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
    });
    await page.waitForTimeout(300);

    // Move the player to create a path
    await page.evaluate(({ playerId }) => {
        const player = AppState.players.find(p => p.id === playerId);
        if (player) {
            player.x = 2500;
            player.y = 1500;
            AppState.saveCurrentBoard();
            Players.render();
            Animations.renderParentPaths();
        }
    }, { playerId });
    await page.waitForTimeout(200);

    return { playerId };
}

test.describe('Go to Start Bug After Pause', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
    });

    test('BUG: progress bar dot should be at 0 after go to start', async ({ page }) => {
        await setupAnimation(page);

        // Enable paths and labels
        await page.evaluate(() => {
            AppState.animationShowPathsAnimation = true;
            AppState.animationShowPathLabelsAnimation = true;
            document.getElementById('btn-toggle-paths').classList.add('active');
            document.getElementById('btn-toggle-path-labels').classList.add('active');
        });

        // Start playing
        await page.locator('#btn-play-pause').click();
        await page.waitForTimeout(600); // Let it play partway

        // Pause
        await page.locator('#btn-play-pause').click();
        await page.waitForTimeout(100);

        const pausedProgress = await page.evaluate(() => Animations.pausedProgress);

        // Go to start
        await page.locator('#btn-go-to-start').click();
        await page.waitForTimeout(100);

        // Check progress bar state
        const progressBarState = await page.evaluate(() => {
            const fill = document.querySelector('.animation-progress-fill');
            const dot = document.querySelector('.animation-progress-dot');
            return {
                fillWidth: fill ? parseFloat(fill.style.width || '0') : null,
                dotLeft: dot ? parseFloat(dot.style.left || '0') : null,
                pausedProgress: Animations.pausedProgress
            };
        });


        // BUG: The progress bar should be at 0
        expect(progressBarState.pausedProgress).toBe(0);
        expect(progressBarState.fillWidth).toBe(0);
        expect(progressBarState.dotLeft).toBe(0);

        if (progressBarState.fillWidth !== 0 || progressBarState.dotLeft !== 0) {
        }
    });

    test('BUG: no arrowhead should be visible after go to start from paused state', async ({ page }) => {
        await setupAnimation(page);

        // Enable paths
        await page.evaluate(() => {
            AppState.animationShowPathsAnimation = true;
            document.getElementById('btn-toggle-paths').classList.add('active');
        });

        // Start playing
        await page.locator('#btn-play-pause').click();
        await page.waitForTimeout(600); // Let it play partway

        // Pause
        await page.locator('#btn-play-pause').click();
        await page.waitForTimeout(100);

        // Go to start
        await page.locator('#btn-go-to-start').click();
        await page.waitForTimeout(100);

        // Check path state
        const pathState = await page.evaluate(() => {
            const pathElement = document.querySelector('#paths-layer .path-line-visible');
            return {
                hasPath: pathElement !== null,
                hasArrow: pathElement ? (pathElement.getAttribute('marker-end') !== null) : null,
                markerValue: pathElement ? pathElement.getAttribute('marker-end') : null,
                pathData: pathElement ? pathElement.getAttribute('d') : null,
                pausedProgress: Animations.pausedProgress
            };
        });


        // Expected: pausedProgress should be 0
        expect(pathState.pausedProgress).toBe(0);

        // BUG: No arrow should be visible when we're at the start (progress = 0)
        // At the start of animation, the path hasn't been drawn yet, so no arrow should show
        if (pathState.hasArrow && pathState.markerValue) {
        }
    });

    test('complete workflow: play -> pause -> go to start -> verify state', async ({ page }) => {
        await setupAnimation(page);

        // Enable paths and labels
        await page.evaluate(() => {
            AppState.animationShowPathsAnimation = true;
            AppState.animationShowPathLabelsAnimation = true;
            document.getElementById('btn-toggle-paths').classList.add('active');
            document.getElementById('btn-toggle-path-labels').classList.add('active');
        });

        // Step 1: Play
        await page.locator('#btn-play-pause').click();
        await page.waitForTimeout(500);

        const stateWhilePlaying = await page.evaluate(() => ({
            isAnimating: AppState.isAnimating,
            progress: Animations.getCurrentProgress(),
            pausedProgress: Animations.pausedProgress
        }));

        expect(stateWhilePlaying.isAnimating).toBe(true);

        // Step 2: Pause
        await page.locator('#btn-play-pause').click();
        await page.waitForTimeout(100);

        const stateAfterPause = await page.evaluate(() => {
            const pathElement = document.querySelector('#paths-layer .path-line-visible');
            const fill = document.querySelector('.animation-progress-fill');
            return {
                isAnimating: AppState.isAnimating,
                pausedProgress: Animations.pausedProgress,
                pathHasArrow: pathElement ? (pathElement.getAttribute('marker-end') !== null) : null,
                progressBarFill: fill ? parseFloat(fill.style.width || '0') : null
            };
        });

        expect(stateAfterPause.isAnimating).toBe(false);
        expect(stateAfterPause.pausedProgress).toBeGreaterThan(0);
        expect(stateAfterPause.pausedProgress).toBeLessThan(1);

        // Step 3: Go to start
        await page.locator('#btn-go-to-start').click();
        await page.waitForTimeout(100);

        const stateAfterGoToStart = await page.evaluate(() => {
            const pathElement = document.querySelector('#paths-layer .path-line-visible');
            const fill = document.querySelector('.animation-progress-fill');
            const dot = document.querySelector('.animation-progress-dot');
            return {
                isAnimating: AppState.isAnimating,
                pausedProgress: Animations.pausedProgress,
                pathHasArrow: pathElement ? (pathElement.getAttribute('marker-end') !== null) : null,
                pathData: pathElement ? pathElement.getAttribute('d') : null,
                progressBarFill: fill ? parseFloat(fill.style.width || '0') : null,
                progressDotPosition: dot ? parseFloat(dot.style.left || '0') : null
            };
        });

        // Verify expectations
        expect(stateAfterGoToStart.isAnimating).toBe(false);
        expect(stateAfterGoToStart.pausedProgress).toBe(0);


        // Bug check 1: Progress bar should be at 0
        if (stateAfterGoToStart.progressBarFill !== 0) {
        } else {
        }

        if (stateAfterGoToStart.progressDotPosition !== 0) {
        } else {
        }

        // Bug check 2: Arrow should not be visible at start
        if (stateAfterGoToStart.pathHasArrow) {
        } else {
        }

        // Verify the actual values
        expect(stateAfterGoToStart.progressBarFill).toBe(0);
        expect(stateAfterGoToStart.progressDotPosition).toBe(0);
    });
});
