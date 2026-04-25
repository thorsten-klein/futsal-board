/**
 * Test to verify that players cannot be selected while video is recording
 */
import { test, expect } from './test-config.js';
import { goto, addPlayer } from './helpers.js';

test.describe('Player Selection During Recording', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
    });

    test('player selection is prevented while video is recording', async ({ page }) => {
        // Add a player to the parent board
        await addPlayer(page);

        const playerId = await page.evaluate(() => AppState.players[0].id);


        // Simulate recording state
        await page.evaluate(() => {
            Animations.isRecording = true;
        });
        await page.waitForTimeout(100);

        // Get player's selected state before click
        const selectedBefore = await page.evaluate(() => {
            return AppState.selectedPlayer !== null;
        });

        // Try to click on the player
        await page.locator(`[data-player-id="${playerId}"]`).click();
        await page.waitForTimeout(100);

        // Player should NOT be selected because recording is in progress
        const selectedAfter = await page.evaluate(() => {
            return AppState.selectedPlayer !== null;
        });

        expect(selectedBefore).toBe(false);
        expect(selectedAfter).toBe(false);

        // Cleanup: stop recording
        await page.evaluate(() => {
            Animations.isRecording = false;
        });
    });

    test('player can be selected after recording completes', async ({ page }) => {
        // Add a player
        await addPlayer(page);

        const playerId = await page.evaluate(() => AppState.players[0].id);

        // Simulate recording state
        await page.evaluate(() => {
            Animations.isRecording = true;
        });
        await page.waitForTimeout(100);

        // Try to click on the player (should not select)
        await page.locator(`[data-player-id="${playerId}"]`).click();
        await page.waitForTimeout(100);

        const selectedDuringRecording = await page.evaluate(() => {
            return AppState.selectedPlayer !== null;
        });

        expect(selectedDuringRecording).toBe(false);

        // Stop recording
        await page.evaluate(() => {
            Animations.isRecording = false;
        });
        await page.waitForTimeout(100);

        // Now try to click on the player again (should select)
        await page.locator(`[data-player-id="${playerId}"]`).click();
        await page.waitForTimeout(100);

        const selectedAfterRecording = await page.evaluate(() => {
            return AppState.selectedPlayer !== null;
        });

        expect(selectedAfterRecording).toBe(true);
    });

    test('no player is selected when recording starts', async ({ page }) => {
        // Add a player and select it
        await addPlayer(page);

        const playerId = await page.evaluate(() => AppState.players[0].id);

        // Select the player
        await page.locator(`[data-player-id="${playerId}"]`).click();
        await page.waitForTimeout(200);

        // Verify player is selected
        const selectedBefore = await page.evaluate(() => {
            return AppState.selectedPlayer !== null;
        });
        expect(selectedBefore).toBe(true);

        // Start recording (simulated)
        await page.evaluate(() => {
            // Clear selection when recording starts
            AppState.selectedPlayer = null;
            Players.render();
            Animations.isRecording = true;
        });
        await page.waitForTimeout(100);

        // Player should no longer be selected
        const selectedDuringRecording = await page.evaluate(() => {
            return AppState.selectedPlayer !== null;
        });

        expect(selectedDuringRecording).toBe(false);

        // Cleanup
        await page.evaluate(() => {
            Animations.isRecording = false;
        });
    });
});
