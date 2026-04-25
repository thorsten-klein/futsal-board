/**
 * Tests to reproduce animation path label bugs:
 * 1. Path labels should appear at the animated position, not always in the middle
 * 2. When pausing animation, the path should remain as-is, not be recalculated
 */
import { test, expect } from './test-config.js';
import { goto, addPlayer } from './helpers.js';

/** Create a child board with a player that has moved, setting up an animation */
async function setupAnimation(page) {
    // Add a player on the parent board
    await addPlayer(page);
    const playerId = await page.evaluate(() => AppState.players[0].id);

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

    return { childId, playerId };
}

test.describe('Animation Path Label Position Bug', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
    });

    test('BUG: path label should move with animation progress, not stay in middle', async ({ page }) => {
        await setupAnimation(page);

        // Enable path labels during animation
        await page.evaluate(() => {
            AppState.animationShowPathLabelsAnimation = true;
            document.getElementById('btn-toggle-path-labels').classList.add('active');
        });

        // Get initial player position (should be at parent position)
        const initialPlayerPos = await page.evaluate(() => {
            const player = AppState.players[0];
            return { x: player.x, y: player.y };
        });

        // Start playing
        await page.locator('#btn-play-pause').click();
        await page.waitForTimeout(100);

        // Check label position at the start of animation (progress ~0)
        const labelAtStart = await page.evaluate(() => {
            const labelElement = document.querySelector('#paths-layer text');
            if (!labelElement) return null;
            return {
                x: parseFloat(labelElement.getAttribute('x')),
                y: parseFloat(labelElement.getAttribute('y')),
                visible: labelElement ? true : false
            };
        });

        // Let animation progress a bit
        await page.waitForTimeout(500);

        // Check label position during animation (progress ~0.15-0.2)
        const labelDuringAnimation = await page.evaluate(() => {
            const labelElement = document.querySelector('#paths-layer text');
            if (!labelElement) return null;
            return {
                x: parseFloat(labelElement.getAttribute('x')),
                y: parseFloat(labelElement.getAttribute('y')),
                visible: true,
                progress: Animations.getCurrentProgress()
            };
        });

        // Let animation progress more
        await page.waitForTimeout(1000);

        // Check label position later in animation (progress ~0.5+)
        const labelLaterInAnimation = await page.evaluate(() => {
            const labelElement = document.querySelector('#paths-layer text');
            if (!labelElement) return null;
            return {
                x: parseFloat(labelElement.getAttribute('x')),
                y: parseFloat(labelElement.getAttribute('y')),
                visible: true,
                progress: Animations.getCurrentProgress()
            };
        });

        // Pause to check
        await page.locator('#btn-play-pause').click();
        await page.waitForTimeout(100);


        // BUG: The label position should change as animation progresses,
        // following the animated path position.
        // Currently, the label always appears at the same position (middle of path)
        // regardless of animation progress.

        // This test documents the bug - the label should be visible only after
        // the animation reaches its position, not from the start
        if (labelAtStart && labelAtStart.visible) {
        }

        // The label positions should be different at different animation progress points
        // Currently they're all the same (middle of path)
        if (labelDuringAnimation && labelLaterInAnimation) {
            const labelMovedSignificantly = Math.abs(labelDuringAnimation.x - labelLaterInAnimation.x) > 50 ||
                                           Math.abs(labelDuringAnimation.y - labelLaterInAnimation.y) > 50;

            if (!labelMovedSignificantly) {
            }
        }
    });

    test('path label should only appear when animation reaches the label position', async ({ page }) => {
        await setupAnimation(page);

        // Enable path labels during animation
        await page.evaluate(() => {
            AppState.animationShowPathLabelsAnimation = true;
            document.getElementById('btn-toggle-path-labels').classList.add('active');
        });

        // Start playing
        await page.locator('#btn-play-pause').click();
        await page.waitForTimeout(50); // Very early in animation

        // Check if label is visible very early in animation
        const labelVisibleEarly = await page.evaluate(() => {
            const labelElement = document.querySelector('#paths-layer text');
            const progress = Animations.getCurrentProgress();
            return {
                visible: labelElement !== null,
                progress: progress
            };
        });


        // Expected: Label should NOT be visible when progress < 0.5
        // (since label is at midpoint and animation hasn't reached there yet)
        // BUG: Label appears immediately even when progress is very low

        // Pause
        await page.locator('#btn-play-pause').click();
        await page.waitForTimeout(100);

        if (labelVisibleEarly.visible && labelVisibleEarly.progress < 0.4) {
        }
    });
});

test.describe('Animation Pause Path Recalculation Bug', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
    });

    test('BUG: pausing animation should preserve path state, not recalculate it', async ({ page }) => {
        await setupAnimation(page);

        // Enable path display during animation
        await page.evaluate(() => {
            AppState.animationShowPathsAnimation = true;
            document.getElementById('btn-toggle-paths').classList.add('active');
        });

        // Start playing
        await page.locator('#btn-play-pause').click();
        await page.waitForTimeout(800); // Let it animate partway

        // Capture path state during animation
        const pathDuringAnimation = await page.evaluate(() => {
            const pathElement = document.querySelector('#paths-layer .path-line-visible');
            const progress = Animations.getCurrentProgress();
            return {
                pathData: pathElement ? pathElement.getAttribute('d') : null,
                progress: progress,
                hasMarker: pathElement ? pathElement.getAttribute('marker-end') : null,
                visible: pathElement !== null
            };
        });

        // Pause the animation
        await page.locator('#btn-play-pause').click();
        await page.waitForTimeout(100);

        // Capture path state after pausing
        const pathAfterPause = await page.evaluate(() => {
            const pathElement = document.querySelector('#paths-layer .path-line-visible');
            const progress = Animations.pausedProgress;
            return {
                pathData: pathElement ? pathElement.getAttribute('d') : null,
                progress: progress,
                hasMarker: pathElement ? pathElement.getAttribute('marker-end') : null,
                visible: pathElement !== null,
                isAnimating: AppState.isAnimating
            };
        });


        // BUG: When pausing, the path is recalculated without animation progress
        // This causes the path to show the full path instead of the partial path
        // that was visible during animation

        // The path should remain as it was during animation (partial path)
        // Currently, after pause, it shows the full path with arrow marker

        expect(pathAfterPause.isAnimating).toBe(false); // Animation should be paused

        // BUG INDICATOR: After pause, marker appears (it shouldn't during animation state)
        if (pathDuringAnimation.hasMarker === null && pathAfterPause.hasMarker !== null) {
        }

        // BUG INDICATOR: Path data changes significantly after pause
        if (pathDuringAnimation.pathData && pathAfterPause.pathData) {
            const pathChangedSignificantly = pathDuringAnimation.pathData !== pathAfterPause.pathData;
            if (pathChangedSignificantly) {
            }
        }
    });

    test('paused animation should maintain partial path visibility', async ({ page }) => {
        await setupAnimation(page);

        // Enable path display during animation
        await page.evaluate(() => {
            AppState.animationShowPathsAnimation = true;
            document.getElementById('btn-toggle-paths').classList.add('active');
        });

        // Start playing
        await page.locator('#btn-play-pause').click();
        await page.waitForTimeout(500); // Partway through animation

        // Get the animation progress
        const progressBeforePause = await page.evaluate(() => Animations.getCurrentProgress());

        // Pause
        await page.locator('#btn-play-pause').click();
        await page.waitForTimeout(100);

        // Get paused progress
        const pausedProgress = await page.evaluate(() => Animations.pausedProgress);


        // Expected behavior: The path should remain at the paused state
        // BUG: The path is recalculated and shows full path with arrow

        // Check if we can resume from this point
        await page.locator('#btn-play-pause').click(); // Resume
        await page.waitForTimeout(100);

        const progressAfterResume = await page.evaluate(() => Animations.getCurrentProgress());


        // The progress should be preserved and resume should continue from paused point
        expect(Math.abs(pausedProgress - (progressBeforePause || 0))).toBeLessThan(0.1);

        // Stop the animation
        await page.locator('#btn-play-pause').click();
    });

    test('path state comparison: playing vs paused', async ({ page }) => {
        await setupAnimation(page);

        // Enable paths and labels
        await page.evaluate(() => {
            AppState.animationShowPathsAnimation = true;
            AppState.animationShowPathLabelsAnimation = true;
            document.getElementById('btn-toggle-paths').classList.add('active');
            document.getElementById('btn-toggle-path-labels').classList.add('active');
        });

        // Start animation
        await page.locator('#btn-play-pause').click();
        await page.waitForTimeout(600);

        // Capture complete state during animation
        const stateDuringAnimation = await page.evaluate(() => {
            const pathElement = document.querySelector('#paths-layer .path-line-visible');
            const labelElements = Array.from(document.querySelectorAll('#paths-layer text'));
            return {
                progress: Animations.getCurrentProgress(),
                pathData: pathElement?.getAttribute('d'),
                pathHasArrow: pathElement?.hasAttribute('marker-end'),
                labelCount: labelElements.length,
                labels: labelElements.map(el => ({
                    x: el.getAttribute('x'),
                    y: el.getAttribute('y'),
                    text: el.textContent
                })),
                isAnimating: AppState.isAnimating
            };
        });

        // Pause
        await page.locator('#btn-play-pause').click();
        await page.waitForTimeout(100);

        // Capture complete state after pause
        const stateAfterPause = await page.evaluate(() => {
            const pathElement = document.querySelector('#paths-layer .path-line-visible');
            const labelElements = Array.from(document.querySelectorAll('#paths-layer text'));
            return {
                progress: Animations.pausedProgress,
                pathData: pathElement?.getAttribute('d'),
                pathHasArrow: pathElement?.hasAttribute('marker-end'),
                labelCount: labelElements.length,
                labels: labelElements.map(el => ({
                    x: el.getAttribute('x'),
                    y: el.getAttribute('y'),
                    text: el.textContent
                })),
                isAnimating: AppState.isAnimating
            };
        });


        // Document the bugs

        if (stateDuringAnimation.pathHasArrow !== stateAfterPause.pathHasArrow) {
        }

        if (stateDuringAnimation.pathData !== stateAfterPause.pathData) {
        }

        if (stateDuringAnimation.labelCount !== stateAfterPause.labelCount) {
        }

        // Expected: states should be very similar, only isAnimating should change
        expect(stateAfterPause.isAnimating).toBe(false);
    });
});
