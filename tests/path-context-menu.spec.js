/**
 * Test path context menu functionality on child boards.
 * When a player is moved on a child board, a path appears showing the movement.
 * Double-clicking or right-clicking the path should open a context menu with
 * options to increase/decrease the number of ghosts (intermediate positions).
 * The menu should stay open after clicking +/-, only closing when clicking
 * elsewhere or selecting another object.
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

test.describe('Path context menu', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
    });

    test('right-click on path opens context menu', async ({ page }) => {
        // Add a player on the parent board
        await page.evaluate(() => {
            const team = AppState.teams[0];
            AppState.addPlayer(team.id, 2000, 1000);
            Players.render();
        });
        await expect(page.locator('[data-player-id]')).toHaveCount(1, { timeout: 2000 });

        // Create child board and switch to it
        await createAndSwitchToChildBoard(page);
        await page.waitForTimeout(200);

        // Move the player to create a path
        await page.evaluate(() => {
            const player = AppState.players[0];
            player.x = 2500;
            player.y = 1500;
            Players.render();
            Animations.renderParentPaths();
        });
        await page.waitForTimeout(200);

        // Verify path exists
        const pathExists = await page.evaluate(() => {
            const pathKey = `player-${AppState.players[0].id}`;
            return AppState.parentPlayerPositions[AppState.players[0].id] !== undefined;
        });
        expect(pathExists).toBe(true);

        // Right-click on the path
        const path = page.locator('#paths-layer path[data-path-key]').first();
        await expect(path).toBeVisible({ timeout: 2000 });
        await path.click({ button: 'right' });
        await page.waitForTimeout(200);

        // VERIFY: Path context menu should be visible
        const pathMenu = page.locator('#path-context-menu');
        await expect(pathMenu).toBeVisible({ timeout: 2000 });
    });

    test('double-click on path opens context menu', async ({ page }) => {
        // Add a player on the parent board
        await page.evaluate(() => {
            const team = AppState.teams[0];
            AppState.addPlayer(team.id, 2000, 1000);
            Players.render();
        });
        await expect(page.locator('[data-player-id]')).toHaveCount(1, { timeout: 2000 });

        // Create child board and switch to it
        await createAndSwitchToChildBoard(page);
        await page.waitForTimeout(200);

        // Move the player to create a path
        await page.evaluate(() => {
            const player = AppState.players[0];
            player.x = 2500;
            player.y = 1500;
            Players.render();
            Animations.renderParentPaths();
        });
        await page.waitForTimeout(200);

        // Double-click on the path.
        // NOTE: Playwright's CDP-based click simulation does not generate browser-native
        // click/dblclick events on SVG <path> elements with fill:none in Chromium.
        // We dispatch the full browser event sequence programmatically instead.
        const path = page.locator('#paths-layer path[data-path-key]').first();
        await expect(path).toBeVisible({ timeout: 2000 });
        await page.evaluate(() => {
            const pathElement = document.querySelector('#paths-layer path[data-path-key]');
            if (pathElement) {
                const rect = pathElement.getBoundingClientRect();
                const cx = rect.x + rect.width / 2;
                const cy = rect.y + rect.height / 2;
                const opts = { bubbles: true, cancelable: true, clientX: cx, clientY: cy };
                pathElement.dispatchEvent(new MouseEvent('mousedown', opts));
                pathElement.dispatchEvent(new MouseEvent('mouseup', opts));
                pathElement.dispatchEvent(new MouseEvent('click', opts));
                pathElement.dispatchEvent(new MouseEvent('mousedown', { ...opts, detail: 2 }));
                pathElement.dispatchEvent(new MouseEvent('mouseup', { ...opts, detail: 2 }));
                pathElement.dispatchEvent(new MouseEvent('click', { ...opts, detail: 2 }));
                pathElement.dispatchEvent(new MouseEvent('dblclick', { ...opts, detail: 2 }));
            }
        });
        await page.waitForTimeout(200);

        // VERIFY: Path context menu should be visible
        const pathMenu = page.locator('#path-context-menu');
        await expect(pathMenu).toBeVisible({ timeout: 2000 });
    });

    test('path context menu has increase ghosts button (+)', async ({ page }) => {
        // Add a player on the parent board
        await page.evaluate(() => {
            const team = AppState.teams[0];
            AppState.addPlayer(team.id, 2000, 1000);
            Players.render();
        });

        // Create child board and switch to it
        await createAndSwitchToChildBoard(page);
        await page.waitForTimeout(200);

        // Move the player
        await page.evaluate(() => {
            const player = AppState.players[0];
            player.x = 2500;
            player.y = 1500;
            Players.render();
            Animations.renderParentPaths();
        });
        await page.waitForTimeout(200);

        // Right-click on the path
        const path = page.locator('#paths-layer path[data-path-key]').first();
        await path.click({ button: 'right' });
        await page.waitForTimeout(200);

        // VERIFY: Menu has + button for increasing ghosts
        const pathMenu = page.locator('#path-context-menu');
        await expect(pathMenu).toBeVisible({ timeout: 2000 });

        const increaseBtn = pathMenu.locator('[data-action="increase-ghosts"]');
        await expect(increaseBtn).toBeVisible({ timeout: 1000 });
    });

    test('path context menu has decrease ghosts button (-)', async ({ page }) => {
        // Add a player on the parent board
        await page.evaluate(() => {
            const team = AppState.teams[0];
            AppState.addPlayer(team.id, 2000, 1000);
            Players.render();
        });

        // Create child board and switch to it
        await createAndSwitchToChildBoard(page);
        await page.waitForTimeout(200);

        // Move the player
        await page.evaluate(() => {
            const player = AppState.players[0];
            player.x = 2500;
            player.y = 1500;
            Players.render();
            Animations.renderParentPaths();
        });
        await page.waitForTimeout(200);

        // Right-click on the path
        const path = page.locator('#paths-layer path[data-path-key]').first();
        await path.click({ button: 'right' });
        await page.waitForTimeout(200);

        // VERIFY: Menu has - button for decreasing ghosts
        const pathMenu = page.locator('#path-context-menu');
        await expect(pathMenu).toBeVisible({ timeout: 2000 });

        const decreaseBtn = pathMenu.locator('[data-action="decrease-ghosts"]');
        await expect(decreaseBtn).toBeVisible({ timeout: 1000 });
    });

    test('clicking + increases number of ghosts', async ({ page }) => {
        // Add a player on the parent board
        await page.evaluate(() => {
            const team = AppState.teams[0];
            AppState.addPlayer(team.id, 2000, 1000);
            Players.render();
        });

        // Create child board and switch to it
        await createAndSwitchToChildBoard(page);
        await page.waitForTimeout(200);

        // Move the player
        await page.evaluate(() => {
            const player = AppState.players[0];
            player.x = 2500;
            player.y = 1500;
            Players.render();
            Animations.renderParentPaths();
        });
        await page.waitForTimeout(200);

        // Get initial ghost count
        const initialGhostCount = await page.evaluate(() => {
            const pathKey = `player-${AppState.players[0].id}`;
            return (AppState.pathIntermediates[pathKey] || []).length;
        });

        // Right-click on the path
        const path = page.locator('#paths-layer path[data-path-key]').first();
        await path.click({ button: 'right' });
        await page.waitForTimeout(200);

        // Click the + button
        const increaseBtn = page.locator('#path-context-menu [data-action="increase-ghosts"]');
        await increaseBtn.click();
        await page.waitForTimeout(200);

        // VERIFY: Ghost count increased by 1
        const newGhostCount = await page.evaluate(() => {
            const pathKey = `player-${AppState.players[0].id}`;
            return (AppState.pathIntermediates[pathKey] || []).length;
        });
        expect(newGhostCount).toBe(initialGhostCount + 1);
    });

    test('clicking - decreases number of ghosts', async ({ page }) => {
        // Add a player on the parent board
        await page.evaluate(() => {
            const team = AppState.teams[0];
            AppState.addPlayer(team.id, 2000, 1000);
            Players.render();
        });

        // Create child board and switch to it
        await createAndSwitchToChildBoard(page);
        await page.waitForTimeout(200);

        // Move the player
        await page.evaluate(() => {
            const player = AppState.players[0];
            player.x = 2500;
            player.y = 1500;
            Players.render();
            Animations.renderParentPaths();
        });
        await page.waitForTimeout(200);

        // Add some ghosts first
        await page.evaluate(() => {
            const pathKey = `player-${AppState.players[0].id}`;
            const parent = AppState.parentPlayerPositions[AppState.players[0].id];
            const current = AppState.players[0];
            // Add 3 intermediate positions
            AppState.pathIntermediates[pathKey] = [
                { x: parent.x + 100, y: parent.y + 100 },
                { x: parent.x + 250, y: parent.y + 250 },
                { x: parent.x + 400, y: parent.y + 400 }
            ];
            Animations.renderParentPaths();
        });
        await page.waitForTimeout(200);

        const initialGhostCount = await page.evaluate(() => {
            const pathKey = `player-${AppState.players[0].id}`;
            return (AppState.pathIntermediates[pathKey] || []).length;
        });

        // Right-click on a ghost (which will show the path menu)
        const ghost = page.locator('.ghost-player').first();
        await ghost.click({ button: 'right' });
        await page.waitForTimeout(200);

        // Click the - button
        const decreaseBtn = page.locator('#path-context-menu [data-action="decrease-ghosts"]');
        await decreaseBtn.click();
        await page.waitForTimeout(200);

        // VERIFY: Ghost count decreased by 1
        const newGhostCount = await page.evaluate(() => {
            const pathKey = `player-${AppState.players[0].id}`;
            return (AppState.pathIntermediates[pathKey] || []).length;
        });
        expect(newGhostCount).toBe(initialGhostCount - 1);
    });

    test('context menu stays open after clicking +', async ({ page }) => {
        // Add a player on the parent board
        await page.evaluate(() => {
            const team = AppState.teams[0];
            AppState.addPlayer(team.id, 2000, 1000);
            Players.render();
        });

        // Create child board and switch to it
        await createAndSwitchToChildBoard(page);
        await page.waitForTimeout(200);

        // Move the player
        await page.evaluate(() => {
            const player = AppState.players[0];
            player.x = 2500;
            player.y = 1500;
            Players.render();
            Animations.renderParentPaths();
        });
        await page.waitForTimeout(200);

        // Right-click on the path
        const path = page.locator('#paths-layer path[data-path-key]').first();
        await path.click({ button: 'right' });
        await page.waitForTimeout(200);

        const pathMenu = page.locator('#path-context-menu');
        await expect(pathMenu).toBeVisible();

        // Click the + button
        const increaseBtn = pathMenu.locator('[data-action="increase-ghosts"]');
        await increaseBtn.click();
        await page.waitForTimeout(200);

        // VERIFY: Menu should still be visible
        await expect(pathMenu).toBeVisible();
    });

    test('context menu stays open after clicking -', async ({ page }) => {
        // Add a player on the parent board
        await page.evaluate(() => {
            const team = AppState.teams[0];
            AppState.addPlayer(team.id, 2000, 1000);
            Players.render();
        });

        // Create child board and switch to it
        await createAndSwitchToChildBoard(page);
        await page.waitForTimeout(200);

        // Move the player and add ghosts
        await page.evaluate(() => {
            const player = AppState.players[0];
            player.x = 2500;
            player.y = 1500;
            Players.render();

            const pathKey = `player-${player.id}`;
            const parent = AppState.parentPlayerPositions[player.id];
            AppState.pathIntermediates[pathKey] = [
                { x: parent.x + 100, y: parent.y + 100 },
                { x: parent.x + 250, y: parent.y + 250 }
            ];
            Animations.renderParentPaths();
        });
        await page.waitForTimeout(200);

        // Right-click on a ghost (which will show the path menu)
        const ghost = page.locator('.ghost-player').first();
        await ghost.click({ button: 'right' });
        await page.waitForTimeout(200);

        const pathMenu = page.locator('#path-context-menu');
        await expect(pathMenu).toBeVisible();

        // Click the - button
        const decreaseBtn = pathMenu.locator('[data-action="decrease-ghosts"]');
        await decreaseBtn.click();
        await page.waitForTimeout(200);

        // VERIFY: Menu should still be visible
        await expect(pathMenu).toBeVisible();
    });

    test('context menu closes when clicking elsewhere on the board', async ({ page }) => {
        // Add a player on the parent board
        await page.evaluate(() => {
            const team = AppState.teams[0];
            AppState.addPlayer(team.id, 2000, 1000);
            Players.render();
        });

        // Create child board and switch to it
        await createAndSwitchToChildBoard(page);
        await page.waitForTimeout(200);

        // Move the player
        await page.evaluate(() => {
            const player = AppState.players[0];
            player.x = 2500;
            player.y = 1500;
            Players.render();
            Animations.renderParentPaths();
        });
        await page.waitForTimeout(200);

        // Right-click on the path
        const path = page.locator('#paths-layer path[data-path-key]').first();
        await path.click({ button: 'right' });
        await page.waitForTimeout(200);

        const pathMenu = page.locator('#path-context-menu');
        await expect(pathMenu).toBeVisible();

        // Click elsewhere on the board (click on the board container background)
        await page.locator('.board-container').click({ position: { x: 50, y: 50 } });
        await page.waitForTimeout(200);

        // VERIFY: Menu should be hidden
        await expect(pathMenu).not.toBeVisible();
    });

    test('context menu closes when selecting another object', async ({ page }) => {
        // Add a player on the parent board
        await page.evaluate(() => {
            const team = AppState.teams[0];
            AppState.addPlayer(team.id, 2000, 1000);
            Players.render();
        });

        // Create child board and switch to it
        await createAndSwitchToChildBoard(page);
        await page.waitForTimeout(200);

        // Move the player and add a ball
        await page.evaluate(() => {
            const player = AppState.players[0];
            player.x = 2500;
            player.y = 1500;
            Players.render();

            // Add a ball
            AppState.addBall(1000, 1000);
            Balls.render();
            Animations.renderParentPaths();
        });
        await page.waitForTimeout(200);

        // Right-click on the path
        const path = page.locator('#paths-layer path[data-path-key]').first();
        await path.click({ button: 'right' });
        await page.waitForTimeout(200);

        const pathMenu = page.locator('#path-context-menu');
        await expect(pathMenu).toBeVisible();

        // Click on the ball to select it
        const ball = page.locator('[data-ball]').first();
        await ball.click();
        await page.waitForTimeout(200);

        // VERIFY: Menu should be hidden
        await expect(pathMenu).not.toBeVisible();
    });

    test('multiple clicks on + increase ghosts multiple times', async ({ page }) => {
        // Add a player on the parent board
        await page.evaluate(() => {
            const team = AppState.teams[0];
            AppState.addPlayer(team.id, 2000, 1000);
            Players.render();
        });

        // Create child board and switch to it
        await createAndSwitchToChildBoard(page);
        await page.waitForTimeout(200);

        // Move the player
        await page.evaluate(() => {
            const player = AppState.players[0];
            player.x = 2500;
            player.y = 1500;
            Players.render();
            Animations.renderParentPaths();
        });
        await page.waitForTimeout(200);

        const initialGhostCount = await page.evaluate(() => {
            const pathKey = `player-${AppState.players[0].id}`;
            return (AppState.pathIntermediates[pathKey] || []).length;
        });

        // Right-click on the path
        const path = page.locator('#paths-layer path[data-path-key]').first();
        await path.click({ button: 'right' });
        await page.waitForTimeout(200);

        const increaseBtn = page.locator('#path-context-menu [data-action="increase-ghosts"]');

        // Click + three times
        await increaseBtn.click();
        await page.waitForTimeout(100);
        await increaseBtn.click();
        await page.waitForTimeout(100);
        await increaseBtn.click();
        await page.waitForTimeout(100);

        // VERIFY: Ghost count increased by 3
        const newGhostCount = await page.evaluate(() => {
            const pathKey = `player-${AppState.players[0].id}`;
            return (AppState.pathIntermediates[pathKey] || []).length;
        });
        expect(newGhostCount).toBe(initialGhostCount + 3);

        // VERIFY: Menu is still visible
        const pathMenu = page.locator('#path-context-menu');
        await expect(pathMenu).toBeVisible();
    });
});
