/**
 * Test for player jump when unselecting by clicking empty board
 */
import { test, expect } from '../test-config.js';
import { goto } from '../helpers.js';

test.describe('Player unselect jump', () => {
    test('player should not jump when unselected by clicking empty board at 90°', async ({ page }) => {
        page.on('console', msg => console.log('BROWSER:', msg.text()));

        await page.setViewportSize({ width: 800, height: 1200 });
        await goto(page);

        // Add a player at a specific position
        await page.evaluate(() => {
            const player = {
                id: 'unselect-test-player',
                type: 'player',
                x: 2000,
                y: 1000,
                number: 10,
                team: 'team1',
                visible: true
            };
            AppState.players.push(player);
            Players.render();
        });

        await page.waitForTimeout(300);

        // Rotate board 90°
        const bb = await page.locator('#board-canvas').boundingBox();
        await page.mouse.click(bb.x + 10, bb.y + 10, { button: 'right' });
        const menu = page.locator('#board-canvas-context-menu');
        await menu.waitFor({ state: 'visible', timeout: 3000 });
        await menu.locator('[data-action="rotate-right"]').click();

        await page.waitForTimeout(500);

        // Get player initial position
        const initialPos = await page.evaluate(() => {
            const player = AppState.players.find(p => p.id === 'unselect-test-player');
            return { x: player.x, y: player.y };
        });

        console.log('Initial position:', initialPos);

        // Select the player by clicking on it
        const playerDiv = page.locator('#unselect-test-player');
        await playerDiv.click();

        await page.waitForTimeout(100);

        // Get position after selection
        const posAfterSelect = await page.evaluate(() => {
            const player = AppState.players.find(p => p.id === 'unselect-test-player');
            return { x: player.x, y: player.y };
        });

        console.log('Position after selection:', posAfterSelect);

        // Click on empty board to unselect (click in top-left corner of canvas)
        await page.mouse.click(bb.x + 50, bb.y + 50);

        await page.waitForTimeout(100);

        // Get position after unselecting
        const posAfterUnselect = await page.evaluate(() => {
            const player = AppState.players.find(p => p.id === 'unselect-test-player');
            const isSelected = AppState.selectedPlayer && AppState.selectedPlayer.id === 'unselect-test-player';
            return {
                x: player.x,
                y: player.y,
                isSelected: isSelected
            };
        });

        console.log('Position after unselect:', posAfterUnselect);
        console.log('Is still selected:', posAfterUnselect.isSelected);

        // Calculate position change from initial to after unselect
        const jumpX = Math.abs(posAfterUnselect.x - initialPos.x);
        const jumpY = Math.abs(posAfterUnselect.y - initialPos.y);

        console.log('\n=== UNSELECT JUMP CHECK ===');
        console.log('Jump on unselect:', { x: jumpX.toFixed(2), y: jumpY.toFixed(2) });

        // Player should not have moved
        expect(jumpX).toBeLessThan(1);
        expect(jumpY).toBeLessThan(1);

        // Player should no longer be selected (selectedPlayer is null when nothing is selected)
        expect(posAfterUnselect.isSelected).toBeFalsy();
    });

    test('player should not jump when unselected at 0°', async ({ page }) => {
        page.on('console', msg => console.log('BROWSER:', msg.text()));

        await page.setViewportSize({ width: 800, height: 1200 });
        await goto(page);

        // Add a player
        await page.evaluate(() => {
            const player = {
                id: 'unselect-test-player-0deg',
                type: 'player',
                x: 2000,
                y: 1000,
                number: 10,
                team: 'team1',
                visible: true
            };
            AppState.players.push(player);
            Players.render();
        });

        await page.waitForTimeout(300);

        // Get player initial position
        const initialPos = await page.evaluate(() => {
            const player = AppState.players.find(p => p.id === 'unselect-test-player-0deg');
            return { x: player.x, y: player.y };
        });

        // Select the player
        const playerDiv = page.locator('#unselect-test-player-0deg');
        await playerDiv.click();
        await page.waitForTimeout(100);

        // Click on empty board to unselect
        const bb = await page.locator('#board-canvas').boundingBox();
        await page.mouse.click(bb.x + 50, bb.y + 50);
        await page.waitForTimeout(100);

        // Get position after unselecting
        const posAfterUnselect = await page.evaluate(() => {
            const player = AppState.players.find(p => p.id === 'unselect-test-player-0deg');
            return { x: player.x, y: player.y };
        });

        // Calculate position change
        const jumpX = Math.abs(posAfterUnselect.x - initialPos.x);
        const jumpY = Math.abs(posAfterUnselect.y - initialPos.y);

        console.log('Jump on unselect at 0°:', { x: jumpX.toFixed(2), y: jumpY.toFixed(2) });

        // Player should not have moved
        expect(jumpX).toBeLessThan(1);
        expect(jumpY).toBeLessThan(1);
    });
});
