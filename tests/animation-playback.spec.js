/**
 * Animation playback control tests — verify play/pause, speed/FPS controls,
 * and animation toggle settings work correctly.
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

test.describe('Animation Playback Controls', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
    });

    test('play/pause button toggles animation state and updates button icon', async ({ page }) => {
        await setupAnimation(page);

        const playPauseBtn = page.locator('#btn-play-pause');
        const playIcon = playPauseBtn.locator('.play-icon');
        const pauseIcon = playPauseBtn.locator('.pause-icon');

        // Initial state should show play icon (paused state)
        await expect(playIcon).toBeVisible();
        await expect(pauseIcon).toBeHidden();

        // Click to start playing
        await playPauseBtn.click();
        await page.waitForTimeout(300);

        // Button icon should change to pause
        await expect(playIcon).toBeHidden();
        await expect(pauseIcon).toBeVisible();

        // Animation should be running
        const isAnimating = await page.evaluate(() => AppState.isAnimating);
        expect(isAnimating).toBe(true);

        // Click to pause
        await playPauseBtn.click();
        await page.waitForTimeout(300);

        // Button icon should change back to play
        await expect(playIcon).toBeVisible();
        await expect(pauseIcon).toBeHidden();

        // Animation should be paused
        const isStillAnimating = await page.evaluate(() => AppState.isAnimating);
        expect(isStillAnimating).toBe(false);
    });

    test('go to start button resets animation to beginning', async ({ page }) => {
        await setupAnimation(page);

        // Start playing
        await page.locator('#btn-play-pause').click();
        await page.waitForTimeout(500); // Let it play a bit

        // Pause
        await page.locator('#btn-play-pause').click();
        await page.waitForTimeout(100);

        // Verify we're partway through
        const progressBefore = await page.evaluate(() => Animations.pausedProgress);
        expect(progressBefore).toBeGreaterThan(0);

        // Go to start
        await page.locator('#btn-go-to-start').click();
        await page.waitForTimeout(100);

        // Progress should be 0
        const progressAfter = await page.evaluate(() => Animations.pausedProgress);
        expect(progressAfter).toBe(0);
    });

    test('play frame advances animation by one frame increment', async ({ page }) => {
        await setupAnimation(page);

        // Click play frame button
        await page.locator('#btn-play-frame').click();
        await page.waitForTimeout(200);

        // Progress should have advanced
        const progress = await page.evaluate(() => Animations.pausedProgress);
        expect(progress).toBeGreaterThan(0);
        expect(progress).toBeLessThan(1);

        // Click again
        await page.locator('#btn-play-frame').click();
        await page.waitForTimeout(200);

        // Progress should have advanced further
        const progress2 = await page.evaluate(() => Animations.pausedProgress);
        expect(progress2).toBeGreaterThan(progress);
    });

    test('stop button goes to end of animation', async ({ page }) => {
        await setupAnimation(page);

        // Start playing
        await page.locator('#btn-play-pause').click();
        await page.waitForTimeout(300);

        // Click stop
        await page.locator('#btn-stop').click();
        await page.waitForTimeout(100);

        // Progress should be at end (1)
        const progress = await page.evaluate(() => Animations.pausedProgress);
        expect(progress).toBe(1);

        // Animation should have stopped
        const isAnimating = await page.evaluate(() => AppState.isAnimating);
        expect(isAnimating).toBe(false);
    });
});

test.describe('Animation Speed and FPS Controls', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
    });

    test('FPS increase button increases frame rate', async ({ page }) => {
        await setupAnimation(page);

        // Switch to settings tab to access FPS controls
        await page.locator('.sidebar-tab[data-tab="settings"]').click();
        await page.waitForTimeout(100);

        const initialFPS = await page.evaluate(() => AppState.animationFPS);

        // Click increase button (both speed-btn and fps-btn classes)
        await page.locator('button.fps-btn.speed-btn[data-action="increase"]').click();
        await page.waitForTimeout(100);

        const newFPS = await page.evaluate(() => AppState.animationFPS);
        expect(newFPS).toBeGreaterThan(initialFPS);

        // Verify display updated
        const displayText = await page.locator('#fps-value').textContent();
        expect(displayText).toBe(String(newFPS));
    });

    test('FPS decrease button decreases frame rate', async ({ page }) => {
        await setupAnimation(page);

        // Switch to settings tab to access FPS controls
        await page.locator('.sidebar-tab[data-tab="settings"]').click();
        await page.waitForTimeout(100);

        const initialFPS = await page.evaluate(() => AppState.animationFPS);

        // Click decrease button (both speed-btn and fps-btn classes)
        await page.locator('button.fps-btn.speed-btn[data-action="decrease"]').click();
        await page.waitForTimeout(100);

        const newFPS = await page.evaluate(() => AppState.animationFPS);
        expect(newFPS).toBeLessThan(initialFPS);

        // Verify display updated
        const displayText = await page.locator('#fps-value').textContent();
        expect(displayText).toBe(String(newFPS));
    });

    test('animation speed dropdown changes duration', async ({ page }) => {
        await setupAnimation(page);

        // Select a specific duration from dropdown
        await page.locator('#animation-speed-dropdown').selectOption('1000');
        await page.waitForTimeout(100);

        const duration = await page.evaluate(() => AppState.animationDuration);
        expect(duration).toBe(1000);

        // Verify dropdown value is updated
        const dropdownValue = await page.locator('#animation-speed-dropdown').inputValue();
        expect(dropdownValue).toBe('1000');
    });
});

test.describe('Animation Toggle Settings', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
    });

    test('toggle paths button shows/hides paths during animation', async ({ page }) => {
        await setupAnimation(page);

        const toggleBtn = page.locator('#btn-toggle-paths');

        // Initial state
        const initialState = await page.evaluate(() => AppState.animationShowPathsAnimation);

        // Click toggle
        await toggleBtn.click();
        await page.waitForTimeout(100);

        // State should have toggled
        const newState = await page.evaluate(() => AppState.animationShowPathsAnimation);
        expect(newState).toBe(!initialState);

        // Button should have 'active' class if enabled
        if (newState) {
            await expect(toggleBtn).toHaveClass(/active/);
        } else {
            const hasActive = await toggleBtn.evaluate(el => el.classList.contains('active'));
            expect(hasActive).toBe(false);
        }
    });

    test('toggle path labels button shows/hides labels', async ({ page }) => {
        await setupAnimation(page);

        const toggleBtn = page.locator('#btn-toggle-path-labels');

        const initialState = await page.evaluate(() => AppState.animationShowPathLabelsAnimation);

        await toggleBtn.click();
        await page.waitForTimeout(100);

        const newState = await page.evaluate(() => AppState.animationShowPathLabelsAnimation);
        expect(newState).toBe(!initialState);
    });

    test('toggle remove paths after frame button', async ({ page }) => {
        await setupAnimation(page);

        const toggleBtn = page.locator('#btn-toggle-remove-paths');

        const initialState = await page.evaluate(() => AppState.animationRemovePathAfterFrame);

        await toggleBtn.click();
        await page.waitForTimeout(100);

        const newState = await page.evaluate(() => AppState.animationRemovePathAfterFrame);
        expect(newState).toBe(!initialState);
    });

    test('toggle ghosts button shows/hides intermediate ghost positions', async ({ page }) => {
        await setupAnimation(page);

        const toggleBtn = page.locator('#btn-toggle-ghosts');

        const initialState = await page.evaluate(() => AppState.animationShowGhostsAnimation);

        await toggleBtn.click();
        await page.waitForTimeout(100);

        const newState = await page.evaluate(() => AppState.animationShowGhostsAnimation);
        expect(newState).toBe(!initialState);
    });

    test('toggle repeat button enables/disables animation looping', async ({ page }) => {
        await setupAnimation(page);

        const toggleBtn = page.locator('#btn-toggle-repeat');

        const initialState = await page.evaluate(() => AppState.animationRepeat);

        await toggleBtn.click();
        await page.waitForTimeout(100);

        const newState = await page.evaluate(() => AppState.animationRepeat);
        expect(newState).toBe(!initialState);
    });

    test('animation completes and stops when repeat is disabled', async ({ page }) => {
        await setupAnimation(page);

        // Ensure repeat is off
        await page.evaluate(() => {
            AppState.animationRepeat = false;
            document.getElementById('btn-toggle-repeat').classList.remove('active');
        });

        // Start playing
        await page.locator('#btn-play-pause').click();

        // Wait for animation to complete (default duration + buffer)
        await page.waitForTimeout(3500);

        // Animation should have stopped
        const isAnimating = await page.evaluate(() => AppState.isAnimating);
        expect(isAnimating).toBe(false);

        // Progress should be at end
        const progress = await page.evaluate(() => Animations.pausedProgress);
        expect(progress).toBeGreaterThanOrEqual(0.99);
    });

    test('double-click on player shows context menu after animation completes', async ({ page }) => {
        await setupAnimation(page);

        // Ensure repeat is off so animation stops at end
        await page.evaluate(() => { AppState.animationRepeat = false; });

        // Play animation to completion
        await page.locator('#btn-play-pause').click();
        await page.waitForTimeout(3500); // default duration (3s) + buffer

        // Verify animation has stopped
        const isAnimating = await page.evaluate(() => AppState.isAnimating);
        expect(isAnimating).toBe(false);

        // Double-click the player — should open context menu
        const player = page.locator('[data-player-id]').first();
        await player.dblclick();

        const menu = page.locator('.context-menu:not(.hidden)').first();
        await expect(menu).toBeVisible({ timeout: 2000 });
    });

    test('double-click on player shows context menu after clicking stop', async ({ page }) => {
        await setupAnimation(page);

        // Start animation then stop it immediately
        await page.locator('#btn-play-pause').click();
        await page.waitForTimeout(300);
        await page.locator('#btn-stop').click();
        await page.waitForTimeout(100);

        // Double-click the player — should open context menu
        const player = page.locator('[data-player-id]').first();
        await player.dblclick();

        const menu = page.locator('.context-menu:not(.hidden)').first();
        await expect(menu).toBeVisible({ timeout: 2000 });
    });

    test('pause and resume maintains progress position', async ({ page }) => {
        await setupAnimation(page);

        // Start playing
        await page.locator('#btn-play-pause').click();
        await page.waitForTimeout(500);

        // Pause
        await page.locator('#btn-play-pause').click();
        await page.waitForTimeout(100);

        const pausedProgress = await page.evaluate(() => Animations.pausedProgress);
        expect(pausedProgress).toBeGreaterThan(0);
        expect(pausedProgress).toBeLessThan(1);

        // Resume
        await page.locator('#btn-play-pause').click();
        await page.waitForTimeout(100);

        // Should resume from where it paused (approximately)
        const resumedProgress = await page.evaluate(() => Animations.getCurrentProgress());
        expect(resumedProgress).toBeGreaterThanOrEqual(pausedProgress - 0.05);
    });
});
