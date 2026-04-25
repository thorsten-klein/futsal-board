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

test.describe('Path shortening - balls vs players', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
    });

    test('player path should be shortened by 150 board units', async ({ page }) => {
        // Add a player on the parent board
        await page.evaluate(() => {
            const team = AppState.teams[0];
            AppState.addPlayer(team.id, 1000, 500);
            Players.render();
        });
        await expect(page.locator('[data-player-id]')).toHaveCount(1, { timeout: 2000 });

        // Create child board and switch to it
        await createAndSwitchToChildBoard(page);
        await page.waitForTimeout(200);

        // Move the player to create a path
        const { childPlayerX, childPlayerY } = await page.evaluate(() => {
            const player = AppState.players[0];
            player.x = 3000;
            player.y = 1500;
            Players.render();
            Animations.renderParentPaths();
            return { childPlayerX: player.x, childPlayerY: player.y };
        });
        await page.waitForTimeout(300);

        // Get the player path
        const pathInfo = await page.evaluate(() => {
            const playerPath = document.querySelector('#paths-layer path.path-line-visible[data-path-key^="player-"]');
            if (!playerPath) return null;

            const pathData = playerPath.getAttribute('d');
            const matches = pathData.match(/M\s*([\d.]+)\s+([\d.]+)\s+L\s*([\d.]+)\s+([\d.]+)/);
            if (!matches) return null;

            return {
                endX: parseFloat(matches[3]),
                endY: parseFloat(matches[4])
            };
        });

        expect(pathInfo).not.toBeNull();

        // Get the scale
        const { scaleX, scaleY } = await page.evaluate(() => {
            const canvas = document.getElementById('board-canvas');
            return {
                scaleX: canvas.width / AppState.boardWidth,
                scaleY: canvas.height / AppState.boardHeight
            };
        });

        // Calculate distance from path end to player position
        const targetScreenX = childPlayerX * scaleX;
        const targetScreenY = childPlayerY * scaleY;
        const distance = Math.sqrt(
            Math.pow(pathInfo.endX - targetScreenX, 2) +
            Math.pow(pathInfo.endY - targetScreenY, 2)
        );

        // Player paths should be shortened by 150 board units
        const expectedDistance = 150 * scaleX;
        expect(distance).toBeGreaterThan(expectedDistance * 0.9);
        expect(distance).toBeLessThan(expectedDistance * 1.1);
    });

    test('ball path should be shortened by 100 board units', async ({ page }) => {
        // Add a ball on the parent board
        await page.evaluate(() => {
            AppState.addBall('orange', 1000, 500);
            Balls.render();
        });
        await expect(page.locator('[data-ball]')).toHaveCount(1, { timeout: 2000 });

        // Create child board and switch to it
        await createAndSwitchToChildBoard(page);
        await page.waitForTimeout(200);

        // Move the ball to create a path
        const { childBallX, childBallY } = await page.evaluate(() => {
            const ball = AppState.balls[0];
            ball.x = 3000;
            ball.y = 1500;
            Balls.render();
            Animations.renderParentPaths();
            return { childBallX: ball.x, childBallY: ball.y };
        });
        await page.waitForTimeout(300);

        // Get the ball path
        const pathInfo = await page.evaluate(() => {
            const ballPath = document.querySelector('#paths-layer path.path-line-visible[data-path-key^="ball-"]');
            if (!ballPath) return null;

            const pathData = ballPath.getAttribute('d');
            const matches = pathData.match(/M\s*([\d.]+)\s+([\d.]+)\s+L\s*([\d.]+)\s+([\d.]+)/);
            if (!matches) return null;

            return {
                endX: parseFloat(matches[3]),
                endY: parseFloat(matches[4])
            };
        });

        expect(pathInfo).not.toBeNull();

        // Get the scale
        const { scaleX, scaleY } = await page.evaluate(() => {
            const canvas = document.getElementById('board-canvas');
            return {
                scaleX: canvas.width / AppState.boardWidth,
                scaleY: canvas.height / AppState.boardHeight
            };
        });

        // Calculate distance from path end to ball position
        const targetScreenX = childBallX * scaleX;
        const targetScreenY = childBallY * scaleY;
        const distance = Math.sqrt(
            Math.pow(pathInfo.endX - targetScreenX, 2) +
            Math.pow(pathInfo.endY - targetScreenY, 2)
        );

        // Ball paths should be shortened by 100 board units
        const expectedDistance = 100 * scaleX;
        expect(distance).toBeGreaterThan(expectedDistance * 0.9);
        expect(distance).toBeLessThan(expectedDistance * 1.1);
    });
});
