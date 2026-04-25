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

test.describe('Path arrow rendering', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
    });

    test('arrowhead should not overlap with path line', async ({ page }) => {
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
            Players.render();
            Animations.renderParentPaths();
        });
        await page.waitForTimeout(300);

        // Get the arrow marker definition
        const markerInfo = await page.evaluate(() => {
            const marker = document.getElementById('path-arrow');
            if (!marker) return null;

            return {
                refX: parseFloat(marker.getAttribute('refX')),
                refY: parseFloat(marker.getAttribute('refY')),
                markerWidth: parseFloat(marker.getAttribute('markerWidth')),
                markerHeight: parseFloat(marker.getAttribute('markerHeight'))
            };
        });

        expect(markerInfo).not.toBeNull();

        // Get the arrow path data
        const arrowPathData = await page.evaluate(() => {
            const marker = document.getElementById('path-arrow');
            const arrowPath = marker.querySelector('path');
            return arrowPath.getAttribute('d');
        });

        // Arrow path is "M0,0 L0,6 L9,3 z" - a triangle with tip at x=9
        expect(arrowPathData).toBe('M0,0 L0,6 L9,3 z');

        // The refX should be at or near x=0 to prevent overlap
        // refX=0 means the line connects to the back of the arrow
        // refX>0 means the line extends into the arrow body (overlap)
        // With the current arrow shape (tip at x=9), refX should be close to 0
        // to avoid overlap with the visible path line

        // Allow small tolerance, but refX should not be deep into the arrow
        // The arrow is 9 units long, so refX should be <= 1 to avoid visible overlap
        expect(markerInfo.refX).toBeLessThanOrEqual(1);
    });

    test('arrow should be positioned back from the target position', async ({ page }) => {
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

        // Get the path endpoint and verify it's positioned back from the target
        const pathInfo = await page.evaluate(() => {
            const visiblePath = document.querySelector('#paths-layer path.path-line-visible');
            if (!visiblePath) return null;

            const pathData = visiblePath.getAttribute('d');
            const matches = pathData.match(/M\s*([\d.]+)\s+([\d.]+)\s+L\s*([\d.]+)\s+([\d.]+)/);
            if (!matches) return null;

            return {
                endX: parseFloat(matches[3]),
                endY: parseFloat(matches[4]),
                hasArrowMarker: visiblePath.getAttribute('marker-end') === 'url(#path-arrow)'
            };
        });

        expect(pathInfo).not.toBeNull();
        expect(pathInfo.hasArrowMarker).toBe(true);

        // Get the scale to convert board units to screen units
        const { scaleX, scaleY } = await page.evaluate(() => {
            const canvas = document.getElementById('board-canvas');
            return {
                scaleX: canvas.width / AppState.boardWidth,
                scaleY: canvas.height / AppState.boardHeight
            };
        });

        // Calculate where the target is in screen coordinates
        const targetScreenX = childPlayerX * scaleX;
        const targetScreenY = childPlayerY * scaleY;

        // Calculate distance from path end to target
        const distance = Math.sqrt(
            Math.pow(pathInfo.endX - targetScreenX, 2) +
            Math.pow(pathInfo.endY - targetScreenY, 2)
        );

        // The arrow should be positioned significantly back from the target
        // The path is shortened by 150 board units, so the distance should be around that
        // Allow some tolerance (10%) for rounding
        const expectedDistance = 150 * scaleX;
        const tolerance = expectedDistance * 0.1;

        expect(distance).toBeGreaterThan(expectedDistance - tolerance);
        expect(distance).toBeLessThan(expectedDistance + tolerance);
    });
});
