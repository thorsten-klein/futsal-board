/**
 * Test that clicking on a ball path selects the path.
 * When a ball is moved on a child board, clicking on the path should select it.
 */
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

test.describe('Ball path selection', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
    });

    test('clicking on ball path selects the path', async ({ page }) => {
        // Add a ball on the parent board
        await page.locator('.ball-template').first().click();
        await expect(page.locator('[data-ball]')).toHaveCount(1, { timeout: 3000 });

        // Create child board and switch to it
        await createAndSwitchToChildBoard(page);
        await page.waitForTimeout(200);

        // Move the ball to create a path
        await page.evaluate(() => {
            const ball = AppState.balls[0];
            ball.x = 2500;
            ball.y = 1500;
            Balls.render();
            Animations.renderParentPaths();
        });
        await page.waitForTimeout(200);

        // Verify path exists
        const pathExists = await page.evaluate(() => {
            const ballId = AppState.balls[0].id;
            return AppState.parentBallPositions[ballId] !== undefined;
        });
        expect(pathExists).toBe(true);

        // Click on the ball path
        const path = page.locator('#paths-layer path[data-path-key^="ball-"]').first();
        await expect(path).toBeVisible({ timeout: 2000 });
        await path.click({ force: true });
        await page.waitForTimeout(200);

        // VERIFY: Path should be selected
        const selectedPath = await page.evaluate(() => {
            return AppState.selectedPath;
        });
        expect(selectedPath).toBeTruthy();
        expect(selectedPath).toContain('ball-');
    });

    test('clicking on ball path highlights it', async ({ page }) => {
        // Add a ball on the parent board
        await page.evaluate(() => {
            AppState.addBall('white', 2000, 1000);
            Balls.render();
        });
        await expect(page.locator('[data-ball]')).toHaveCount(1, { timeout: 2000 });

        // Create child board and switch to it
        await createAndSwitchToChildBoard(page);
        await page.waitForTimeout(200);

        // Move the ball
        await page.evaluate(() => {
            const ball = AppState.balls[0];
            ball.x = 2500;
            ball.y = 1500;
            Balls.render();
            Animations.renderParentPaths();
        });
        await page.waitForTimeout(200);

        // Click on the ball path
        const path = page.locator('#paths-layer path[data-path-key^="ball-"]').first();
        await path.click({ force: true });
        await page.waitForTimeout(200);

        // VERIFY: Visible path should have path-selected class
        const hasSelectedClass = await page.evaluate(() => {
            const visiblePath = document.querySelector('#paths-layer .path-line-visible[data-path-key^="ball-"]');
            return visiblePath && visiblePath.classList.contains('path-selected');
        });
        expect(hasSelectedClass).toBe(true);
    });

    test('clicking on ball path deselects other objects', async ({ page }) => {
        // Add a ball on the parent board
        await page.locator('.ball-template').first().click();
        await expect(page.locator('[data-ball]')).toHaveCount(1, { timeout: 3000 });

        // Create child board and switch to it
        await createAndSwitchToChildBoard(page);
        await page.waitForTimeout(200);

        // Move the ball and add a player
        await page.evaluate(() => {
            const ball = AppState.balls[0];
            ball.x = 2500;
            ball.y = 1500;
            Balls.render();

            // Add a player
            const team = AppState.teams[0];
            AppState.addPlayer(team.id, 1500, 1500);
            Players.render();

            Animations.renderParentPaths();
        });
        await page.waitForTimeout(200);

        // Select the player first
        const player = page.locator('[data-player-id]').first();
        await player.click();
        await page.waitForTimeout(100);

        // Verify player is selected
        let selectedPlayer = await page.evaluate(() => AppState.selectedPlayer);
        expect(selectedPlayer).toBeTruthy();

        // Click on the ball path
        const path = page.locator('#paths-layer path[data-path-key^="ball-"]').first();
        await path.click({ force: true });
        await page.waitForTimeout(200);

        // VERIFY: Player should be deselected, path should be selected
        selectedPlayer = await page.evaluate(() => AppState.selectedPlayer);
        const selectedPath = await page.evaluate(() => AppState.selectedPath);

        expect(selectedPlayer).toBeNull();
        expect(selectedPath).toBeTruthy();
        expect(selectedPath).toContain('ball-');
    });

    test('selected ball path shows position display', async ({ page }) => {
        // Add a ball on the parent board
        await page.evaluate(() => {
            AppState.addBall('white', 2000, 1000);
            Balls.render();
        });

        // Create child board and switch to it
        await createAndSwitchToChildBoard(page);
        await page.waitForTimeout(200);

        // Move the ball
        await page.evaluate(() => {
            const ball = AppState.balls[0];
            ball.x = 2500;
            ball.y = 1500;
            Balls.render();
            Animations.renderParentPaths();
        });
        await page.waitForTimeout(200);

        // Click on the ball path
        const path = page.locator('#paths-layer path[data-path-key^="ball-"]').first();
        await path.click({ force: true });
        await page.waitForTimeout(200);

        // VERIFY: Position display should be visible
        const positionDisplay = page.locator('.position-display');
        await expect(positionDisplay).toBeVisible({ timeout: 1000 });
    });
});
