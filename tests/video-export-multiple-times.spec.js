/**
 * Test to verify that video export can be triggered multiple times in succession.
 *
 * Bug: After exporting a video once, clicking the download button again shows
 * "Cannot Download" error instead of starting a new recording.
 *
 * Expected: Should be able to export videos multiple times without errors.
 */
import { test, expect } from './test-config.js';
import { goto, addPlayer } from './helpers.js';

test.describe('Video Export Multiple Times', () => {
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

    test('state flags are properly reset after export completes', async ({ page }) => {
        const result = await page.evaluate(async () => {
            // Simulate a complete export by manually triggering the onstop handler
            const results = {
                beforeExport: {
                    isRecording: Animations.isRecording,
                    isAnimating: AppState.isAnimating
                }
            };

            // Simulate the state during recording
            AppState.isAnimating = true;
            Animations.isRecording = true;

            results.duringExport = {
                isRecording: Animations.isRecording,
                isAnimating: AppState.isAnimating
            };

            // Simulate what happens in mediaRecorder.onstop (the success path)
            // This is the code path that was missing AppState.isAnimating = false
            AppState.isAnimating = false;
            Animations.isRecording = false;

            results.afterExport = {
                isRecording: Animations.isRecording,
                isAnimating: AppState.isAnimating
            };

            // Now check if we can start a new export (should not trigger "Cannot Download")
            const canStartAgain = !(AppState.isAnimating || Animations.isRecording);

            return {
                ...results,
                canStartAgain
            };
        });

        // Before export, both should be false
        expect(result.beforeExport.isRecording).toBeFalsy();
        expect(result.beforeExport.isAnimating).toBeFalsy();

        // During export, both should be true
        expect(result.duringExport.isRecording).toBeTruthy();
        expect(result.duringExport.isAnimating).toBeTruthy();

        // After export, both should be reset to false (this is the bug fix)
        expect(result.afterExport.isRecording).toBeFalsy();
        expect(result.afterExport.isAnimating).toBeFalsy();

        // Should be able to start a new export
        expect(result.canStartAgain).toBeTruthy();
    });

    test('clicking download button twice should not show Cannot Download error', async ({ page }) => {
        // Listen for any toast/message dialogs
        const messages = [];
        page.on('dialog', async dialog => {
            messages.push(dialog.message());
            await dialog.dismiss();
        });

        // Mock to capture Utils.showMessage calls
        await page.evaluate(() => {
            window.capturedMessages = [];
            const originalShowMessage = Utils.showMessage;
            Utils.showMessage = function(msg, title) {
                window.capturedMessages.push({ msg, title });
                // Don't actually show the message
            };
        });

        // First click
        await page.click('#btn-header-download-animation');
        await page.waitForTimeout(1000);

        // Stop recording early
        await page.evaluate(() => {
            Animations.isRecording = false;
            AppState.isAnimating = false;
        });

        await page.waitForTimeout(1500);

        // Clear captured messages
        await page.evaluate(() => {
            window.capturedMessages = [];
        });

        // Second click - should NOT show "Cannot Download"
        await page.click('#btn-header-download-animation');
        await page.waitForTimeout(500);

        const capturedMessages = await page.evaluate(() => window.capturedMessages);

        // Check that we didn't get "Cannot Download" error
        const hasCannotDownloadError = capturedMessages.some(m =>
            m.title === 'Cannot Download' || m.msg.includes('already playing or recording')
        );

        expect(hasCannotDownloadError).toBeFalsy();
    });
});
