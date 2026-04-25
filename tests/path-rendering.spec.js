import { test, expect } from './test-config.js';
import { goto } from './helpers.js';

/** Create a child board and switch to it programmatically */
async function createAndSwitchToChildBoard(page) {
    return await page.evaluate(() => {
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
}

test.describe('Path rendering', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
    });

    test('path label should be centered on simple path', async ({ page }) => {
        // Add a player on the parent board at (1000, 500)
        await page.evaluate(() => {
            const team = AppState.teams[0];
            AppState.addPlayer(team.id, 1000, 500);
            Players.render();
        });
        await expect(page.locator('[data-player-id]')).toHaveCount(1, { timeout: 2000 });

        // Create child board and switch to it
        await createAndSwitchToChildBoard(page);
        await page.waitForTimeout(200);

        // Move the player to (3000, 1500) to create a path
        await page.evaluate(() => {
            const player = AppState.players[0];
            player.x = 3000;
            player.y = 1500;
            // Enable path labels
            AppState.animationShowPathLabels = true;
            Players.render();
            Animations.renderParentPaths();
        });
        await page.waitForTimeout(300);

        // Get the path element
        const pathElement = page.locator('#paths-layer path.path-line-visible').first();
        await expect(pathElement).toBeVisible({ timeout: 2000 });

        // Get the path data to calculate its midpoint
        const pathData = await pathElement.getAttribute('d');
        expect(pathData).toBeTruthy();

        // Parse path coordinates (should be M startX startY L endX endY)
        const matches = pathData.match(/M\s*([\d.]+)\s+([\d.]+)\s+L\s*([\d.]+)\s+([\d.]+)/);
        expect(matches).toBeTruthy();

        const startX = parseFloat(matches[1]);
        const startY = parseFloat(matches[2]);
        const endX = parseFloat(matches[3]);
        const endY = parseFloat(matches[4]);

        // Calculate expected midpoint
        const expectedMidX = (startX + endX) / 2;
        const expectedMidY = (startY + endY) / 2;

        // Get the label element (should show "1" for first board transition)
        const labelText = page.locator('#paths-layer text').filter({ hasText: '1' }).first();
        await expect(labelText).toBeVisible();

        // Get label position
        const labelX = parseFloat(await labelText.getAttribute('x'));
        const labelY = parseFloat(await labelText.getAttribute('y'));

        // Verify label is at the midpoint (allow small tolerance for rounding)
        expect(Math.abs(labelX - expectedMidX)).toBeLessThan(1);
        expect(Math.abs(labelY - expectedMidY)).toBeLessThan(1);
    });

    test('path should stop before arrow, not overlap with target', async ({ page }) => {
        // Add a player on the parent board at (1000, 500)
        await page.evaluate(() => {
            const team = AppState.teams[0];
            AppState.addPlayer(team.id, 1000, 500);
            Players.render();
        });
        await expect(page.locator('[data-player-id]')).toHaveCount(1, { timeout: 2000 });

        // Create child board and switch to it
        await createAndSwitchToChildBoard(page);
        await page.waitForTimeout(200);

        // Move the player to (3000, 1500) to create a path
        const { childPlayerX, childPlayerY } = await page.evaluate(() => {
            const player = AppState.players[0];
            player.x = 3000;
            player.y = 1500;
            Players.render();
            Animations.renderParentPaths();
            return { childPlayerX: player.x, childPlayerY: player.y };
        });
        await page.waitForTimeout(300);

        // Get the path element
        const pathElement = page.locator('#paths-layer path.path-line-visible').first();
        await expect(pathElement).toBeVisible({ timeout: 2000 });

        // Get the path data
        const pathData = await pathElement.getAttribute('d');
        expect(pathData).toBeTruthy();

        // Parse path coordinates
        const matches = pathData.match(/M\s*([\d.]+)\s+([\d.]+)\s+L\s*([\d.]+)\s+([\d.]+)/);
        expect(matches).toBeTruthy();

        const pathEndX = parseFloat(matches[3]);
        const pathEndY = parseFloat(matches[4]);

        // Get the scale to convert board units to screen units
        const { scaleX, scaleY } = await page.evaluate(() => {
            const canvas = document.getElementById('board-canvas');
            return {
                scaleX: canvas.width / AppState.boardWidth,
                scaleY: canvas.height / AppState.boardHeight
            };
        });

        // Calculate where the child player is in screen coordinates
        const expectedPlayerScreenX = childPlayerX * scaleX;
        const expectedPlayerScreenY = childPlayerY * scaleY;

        // Calculate distance from path end to player position
        const distance = Math.sqrt(
            Math.pow(pathEndX - expectedPlayerScreenX, 2) +
            Math.pow(pathEndY - expectedPlayerScreenY, 2)
        );

        // The path should be shortened by 150 board units, which in screen units should be:
        const expectedShortenDistance = 150 * scaleX;

        // Verify the path stops before the player (within reasonable tolerance)
        // The distance should be close to the expected shorten distance
        expect(distance).toBeGreaterThan(expectedShortenDistance * 0.8);
        expect(distance).toBeLessThan(expectedShortenDistance * 1.2);
    });
});
