import { test, expect } from '@playwright/test';
import { FILE_URL } from './helpers.js';

test.describe('Player Between Shapes Selection Bug', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(FILE_URL);
        await page.evaluate(() => { try { localStorage.clear(); } catch (_) {} });
        await page.reload();
        await page.waitForSelector('#board-area', { state: 'attached' });
        await page.waitForTimeout(300);

        // Enable select tool
        await page.evaluate(() => {
            AppState.currentTool = 'select';
        });
    });

    test('TOUCH MODE: player between two ellipses should be selectable', async ({ page }) => {
        // Enable touch mode
        await page.evaluate(() => {
            document.body.classList.add('touch-mode');
        });

        // Create two ellipses with a player in between
        await page.evaluate(() => {
            // Left ellipse
            const ellipse1 = {
                id: 'ellipse-left',
                type: 'ellipse',
                x: 900,
                y: 1000,
                width: 200,
                height: 150,
                rotation: 0,
                color: '#3498db',
                fillColor: 'rgba(52, 152, 219, 0.3)',
                strokeWidth: 2,
                visible: true,
                inherited: false
            };

            // Right ellipse
            const ellipse2 = {
                id: 'ellipse-right',
                type: 'ellipse',
                x: 1100,
                y: 1000,
                width: 200,
                height: 150,
                rotation: 0,
                color: '#e74c3c',
                fillColor: 'rgba(231, 76, 60, 0.3)',
                strokeWidth: 2,
                visible: true,
                inherited: false
            };

            AppState.shapes.push(ellipse1, ellipse2);
            AppState.saveToLocalStorage();
            Shapes.render();

            // Create team and player in the middle
            if (AppState.teams.length === 0) {
                AppState.teams = [
                    { id: 'team-1', name: 'Team A', color: '#27ae60' }
                ];
            }

            const team = AppState.teams[0];
            const player = {
                id: 'player-1',
                teamId: team.id,
                number: 7,
                name: 'Player 7',
                color: team.color,
                x: 1000, // exactly between the two ellipses
                y: 1000,
                rotation: 0,
                visible: true
            };

            AppState.players.push(player);
            AppState.saveToLocalStorage();
            Players.render();
        });

        await page.waitForTimeout(300);

        // Get the player ID
        const playerId = await page.evaluate(() => AppState.players[0]?.id);

        // Verify all elements are visible
        const ellipse1Svg = page.locator('svg[data-shape="ellipse-left"]');
        const ellipse2Svg = page.locator('svg[data-shape="ellipse-right"]');
        const playerEl = page.locator(`.player[data-player-id="${playerId}"]`);

        await expect(ellipse1Svg).toBeVisible();
        await expect(ellipse2Svg).toBeVisible();
        await expect(playerEl).toBeVisible();

        // Get positions
        const box1 = await ellipse1Svg.boundingBox();
        const box2 = await ellipse2Svg.boundingBox();
        const playerBox = await playerEl.boundingBox();


        // Click on the player
        const playerCenterX = playerBox.x + playerBox.width / 2;
        const playerCenterY = playerBox.y + playerBox.height / 2;


        await page.mouse.click(playerCenterX, playerCenterY);
        await page.waitForTimeout(50);

        // Check what got selected
        const selectedPlayer = await page.evaluate(() => AppState.selectedPlayer);
        const selectedShape = await page.evaluate(() => AppState.selectedShape);


        // The player should be selected, NOT a shape
        expect(selectedPlayer?.id).toBe(playerId);
        expect(selectedShape).toBeNull();

        // Verify player can be dragged
        const initialPlayerBox = await playerEl.boundingBox();

        await page.mouse.move(playerCenterX, playerCenterY);
        await page.mouse.down();
        await page.mouse.move(playerCenterX + 50, playerCenterY + 50, { steps: 5 });
        await page.mouse.up();
        await page.waitForTimeout(100);

        const finalPlayerBox = await playerEl.boundingBox();
        const playerMovedX = finalPlayerBox.x - initialPlayerBox.x;
        const playerMovedY = finalPlayerBox.y - initialPlayerBox.y;


        // Player should have moved
        expect(Math.abs(playerMovedX - 50)).toBeLessThan(10);
        expect(Math.abs(playerMovedY - 50)).toBeLessThan(10);
    });

    test('TOUCH MODE: player very close to ellipse edge should still be selectable', async ({ page }) => {
        // Enable touch mode
        await page.evaluate(() => {
            document.body.classList.add('touch-mode');
        });

        // Create one ellipse with player right next to it
        await page.evaluate(() => {
            const ellipse = {
                id: 'ellipse-nearby',
                type: 'ellipse',
                x: 1000,
                y: 1000,
                width: 300,
                height: 200,
                rotation: 0,
                color: '#3498db',
                fillColor: 'rgba(52, 152, 219, 0.3)',
                strokeWidth: 2,
                visible: true,
                inherited: false
            };

            AppState.shapes.push(ellipse);
            AppState.saveToLocalStorage();
            Shapes.render();

            // Create team and player close to the ellipse
            if (AppState.teams.length === 0) {
                AppState.teams = [
                    { id: 'team-1', name: 'Team A', color: '#27ae60' }
                ];
            }

            const team = AppState.teams[0];
            const player = {
                id: 'player-1',
                teamId: team.id,
                number: 9,
                name: 'Player 9',
                color: team.color,
                x: 1180, // 180cm from ellipse center
                y: 1000,
                rotation: 0,
                visible: true
            };

            AppState.players.push(player);
            AppState.saveToLocalStorage();
            Players.render();
        });

        await page.waitForTimeout(300);

        const playerId = await page.evaluate(() => AppState.players[0]?.id);

        const playerEl = page.locator(`.player[data-player-id="${playerId}"]`);
        await expect(playerEl).toBeVisible();

        const playerBox = await playerEl.boundingBox();
        const playerCenterX = playerBox.x + playerBox.width / 2;
        const playerCenterY = playerBox.y + playerBox.height / 2;


        await page.mouse.click(playerCenterX, playerCenterY);
        await page.waitForTimeout(50);

        const selectedPlayer = await page.evaluate(() => AppState.selectedPlayer);
        const selectedShape = await page.evaluate(() => AppState.selectedShape);


        // The player should be selected, NOT the ellipse
        expect(selectedPlayer?.id).toBe(playerId);
        expect(selectedShape).toBeNull();
    });
});
