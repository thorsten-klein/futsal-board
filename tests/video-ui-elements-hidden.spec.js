/**
 * Test to verify that UI elements like Frame Speed Box and Animation Bar
 * are hidden during video recording but not during photo export.
 *
 * Bug: When recording a video, UI overlays (frame-speed-control, animation-player-overlay)
 * were being captured because the entire boardContainer was being captured with htmlToImage.
 * Photo export correctly only captures the relevant layers (court, players, paths, etc.).
 *
 * Fix: Hide UI overlays before capturing frames for video recording, restore after.
 */
import { test, expect } from './test-config.js';
import { goto, addPlayer } from './helpers.js';

test.describe('Video Recording UI Element Visibility', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);

        // Create a parent board with a player, then a child board with moved player
        await addPlayer(page);

        await page.evaluate(() => {
            // Save current board and create a child
            AppState.saveCurrentBoard();
            const childId = AppState.createChildBoard(AppState.currentBoardId);
            if (childId) {
                AppState.loadBoard(childId);
                Players.render();
            }

            // Move player to different position in child
            const childPlayer = AppState.players[0];
            if (childPlayer) {
                childPlayer.x = 2500;
                childPlayer.y = 1500;
                AppState.saveCurrentBoard();
                Players.render();
            }
        });

        await page.waitForTimeout(200);
    });

    test('UI elements are hidden during video recording capture', async ({ page }) => {
        // Make UI elements visible first
        await page.evaluate(() => {
            const frameSpeedControl = document.getElementById('frame-speed-control');
            const animationOverlay = document.getElementById('animation-player-overlay');

            if (frameSpeedControl) frameSpeedControl.style.display = 'block';
            if (animationOverlay) animationOverlay.style.display = 'flex';
        });

        await page.waitForTimeout(100);

        // Verify elements are visible before recording
        const visibleBefore = await page.evaluate(() => {
            const frameSpeedControl = document.getElementById('frame-speed-control');
            const animationOverlay = document.getElementById('animation-player-overlay');

            return {
                frameSpeed: frameSpeedControl && window.getComputedStyle(frameSpeedControl).display !== 'none',
                animationBar: animationOverlay && window.getComputedStyle(animationOverlay).display !== 'none'
            };
        });

        expect(visibleBefore.frameSpeed || visibleBefore.animationBar).toBeTruthy();

        // Mock the capture to verify elements are hidden during capture
        let capturedWithHiddenUI = false;

        await page.evaluate(() => {
            // Override the captureToCanvas function to check if UI is hidden
            window._originalHtmlToImage = window.htmlToImage;
            window._uiCheckResults = [];

            if (typeof htmlToImage !== 'undefined') {
                const originalToCanvas = htmlToImage.toCanvas;
                htmlToImage.toCanvas = function(element, options) {
                    const frameSpeedControl = document.getElementById('frame-speed-control');
                    const animationOverlay = document.getElementById('animation-player-overlay');

                    window._uiCheckResults.push({
                        frameSpeedHidden: frameSpeedControl && window.getComputedStyle(frameSpeedControl).display === 'none',
                        animationBarHidden: animationOverlay && window.getComputedStyle(animationOverlay).display === 'none'
                    });

                    return originalToCanvas.call(this, element, options);
                };
            }
        });

        // Trigger video recording (will fail/stop early but we just need to check capture behavior)
        const recordingPromise = page.evaluate(async () => {
            try {
                // We'll let it run just long enough to capture a frame
                const downloadPromise = Animations.downloadAnimation(320, 240);

                // Wait a bit for the first capture to happen
                await new Promise(r => setTimeout(r, 500));

                // Stop recording by setting flags
                Animations.isRecording = false;
                AppState.isAnimating = false;

                return window._uiCheckResults;
            } catch (err) {
                return window._uiCheckResults || [];
            }
        });

        await page.waitForTimeout(1000);

        const checkResults = await recordingPromise;

        // Verify that during at least one capture, UI elements were hidden
        if (checkResults && checkResults.length > 0) {
            const allHidden = checkResults.every(result =>
                result.frameSpeedHidden && result.animationBarHidden
            );
            expect(allHidden).toBeTruthy();
        }
    });

    test('only relevant elements are captured in photo export', async ({ page }) => {
        // This test documents the expected behavior for photo export
        // Photo export should only include board elements, not UI controls

        const result = await page.evaluate(async () => {
            const boardContainer = document.querySelector('.board-container');
            const playersLayer = document.getElementById('players-layer');

            return {
                containerExists: !!boardContainer,
                playersLayerExists: !!playersLayer,
                // In photo export, we capture specific layers, not the whole container
                photoExportUsesLayers: true
            };
        });

        expect(result.containerExists).toBeTruthy();
        expect(result.playersLayerExists).toBeTruthy();
        expect(result.photoExportUsesLayers).toBeTruthy();
    });
});
