/**
 * Tests for drag and drop functionality at different board rotations.
 * Ensures that dragging objects works correctly when board is rotated.
 */
import { test, expect } from '../test-config.js';
import { goto } from '../helpers.js';

/** Right-click on an empty part of the board to open context menu. */
async function rightClickBoard(page) {
    const bb = await page.locator('#board-canvas').boundingBox();
    await page.mouse.click(bb.x + 10, bb.y + 10, { button: 'right' });
}

/** Get the board canvas context menu. */
async function getBoardCanvasMenu(page) {
    const menu = page.locator('#board-canvas-context-menu');
    await expect(menu).toBeVisible({ timeout: 3000 });
    return menu;
}

test.describe('Drag and drop at different board rotations', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
    });

    test('dragging ball right at 0° moves it right', async ({ page }) => {
        // Create a ball at center
        const ballId = await page.evaluate(() => {
            const ball = {
                id: `ball-${AppState.nextBallId++}`,
                x: 2250,
                y: 1250,
                color: '#ffffff',
                visible: true
            };
            AppState.balls.push(ball);
            Balls.render();
            return ball.id;
        });

        // Get initial position
        const initialPos = await page.evaluate((id) => {
            const ball = AppState.balls.find(b => b.id === id);
            return { x: ball.x, y: ball.y };
        }, ballId);

        // Get ball visual position and drag it
        const ballElement = page.locator(`[data-ball="${ballId}"].ball-svg`);

        // In desktop mode, need to click once to select, then drag
        // First click: select the ball
        await ballElement.click();
        await page.waitForTimeout(50);

        // Second mousedown + drag: actually drag it
        const box = await ballElement.boundingBox();
        await ballElement.hover();
        await page.mouse.down();
        await page.mouse.move(box.x + box.width / 2 + 100, box.y + box.height / 2, { steps: 10 });
        await page.mouse.up();
        await page.waitForTimeout(100);

        // Get new position
        const newPos = await page.evaluate((id) => {
            const ball = AppState.balls.find(b => b.id === id);
            return { x: ball.x, y: ball.y };
        }, ballId);

        console.log('0° rotation: initial', initialPos, '-> new', newPos);

        // At 0° rotation, dragging right should increase X coordinate
        expect(newPos.x).toBeGreaterThan(initialPos.x);
        // Y should stay roughly the same (allow small variance)
        expect(Math.abs(newPos.y - initialPos.y)).toBeLessThan(50);
    });

    test('dragging ball right at 90° moves it right (not mirrored)', async ({ page }) => {
        // Rotate board to 90°
        await page.click('button[data-tab="settings"]');
        await page.waitForTimeout(200);
        await page.click('#btn-rotate-right');
        await page.waitForTimeout(300);

        // Verify rotation
        const rotation = await page.evaluate(() => AppState.boardRotation);
        expect(rotation).toBe(90);

        // Create a ball at center
        const ballId = await page.evaluate(() => {
            const ball = {
                id: `ball-${AppState.nextBallId++}`,
                x: 2250,
                y: 1250,
                color: '#ffffff',
                visible: true
            };
            AppState.balls.push(ball);
            Balls.render();
            return ball.id;
        });

        // Get initial position
        const initialPos = await page.evaluate((id) => {
            const ball = AppState.balls.find(b => b.id === id);
            return { x: ball.x, y: ball.y };
        }, ballId);

        // Get ball visual position
        const ballElement = page.locator(`[data-ball="${ballId}"].ball-svg`);

        // In desktop mode, need to click once to select, then drag
        await ballElement.click();
        await page.waitForTimeout(50);

        const box = await ballElement.boundingBox();

        console.log('Ball bounding box at 90°:', box);

        // Drag ball to the visual right on screen (100px right)
        const startX = box.x + box.width / 2;
        const startY = box.y + box.height / 2;
        const endX = startX + 100;
        const endY = startY;

        console.log('Dragging from', { x: startX, y: startY }, 'to', { x: endX, y: endY });

        await ballElement.hover();
        await page.mouse.down();
        await page.mouse.move(endX, endY, { steps: 10 });
        await page.mouse.up();
        await page.waitForTimeout(100);

        // Get new position
        const newPos = await page.evaluate((id) => {
            const ball = AppState.balls.find(b => b.id === id);
            return { x: ball.x, y: ball.y };
        }, ballId);

        console.log('90° rotation: initial', initialPos, '-> new', newPos);

        // At 90° rotation with board rotated clockwise:
        // Visual right on screen = board negative Y direction
        // So dragging visual right should DECREASE Y coordinate
        // And X should stay roughly the same
        expect(newPos.y).toBeLessThan(initialPos.y);
        expect(Math.abs(newPos.x - initialPos.x)).toBeLessThan(50);
    });

    test('dragging ball down at 90° moves it down (not mirrored)', async ({ page }) => {
        // Rotate board to 90°
        await page.click('button[data-tab="settings"]');
        await page.waitForTimeout(200);
        await page.click('#btn-rotate-right');
        await page.waitForTimeout(300);

        // Create a ball at center
        const ballId = await page.evaluate(() => {
            const ball = {
                id: `ball-${AppState.nextBallId++}`,
                x: 2250,
                y: 1250,
                color: '#ffffff',
                visible: true
            };
            AppState.balls.push(ball);
            Balls.render();
            return ball.id;
        });

        // Get initial position
        const initialPos = await page.evaluate((id) => {
            const ball = AppState.balls.find(b => b.id === id);
            return { x: ball.x, y: ball.y };
        }, ballId);

        // Get ball visual position
        const ballElement = page.locator(`[data-ball="${ballId}"].ball-svg`);

        // In desktop mode, need to click once to select, then drag
        await ballElement.click();
        await page.waitForTimeout(50);

        const box = await ballElement.boundingBox();

        // Drag ball down on screen (100px down)
        const startX = box.x + box.width / 2;
        const startY = box.y + box.height / 2;
        const endX = startX;
        const endY = startY + 100;

        await ballElement.hover();
        await page.mouse.down();
        await page.mouse.move(endX, endY, { steps: 10 });
        await page.mouse.up();
        await page.waitForTimeout(100);

        // Get new position
        const newPos = await page.evaluate((id) => {
            const ball = AppState.balls.find(b => b.id === id);
            return { x: ball.x, y: ball.y };
        }, ballId);

        console.log('90° rotation (down): initial', initialPos, '-> new', newPos);

        // At 90° rotation with board rotated clockwise:
        // Visual down on screen = board positive X direction
        // So dragging visual down should INCREASE X coordinate
        // And Y should stay roughly the same
        expect(newPos.x).toBeGreaterThan(initialPos.x);
        expect(Math.abs(newPos.y - initialPos.y)).toBeLessThan(50);
    });

    test('dragging player at 90° works correctly', async ({ page }) => {
        // Rotate board to 90°
        await page.click('button[data-tab="settings"]');
        await page.waitForTimeout(200);
        await page.click('#btn-rotate-right');
        await page.waitForTimeout(300);

        // Create a team and player at center
        const playerId = await page.evaluate(() => {
            // Ensure team exists
            if (!AppState.teams.find(t => t.id === 'team-1')) {
                AppState.teams.push({
                    id: 'team-1',
                    name: 'Team 1',
                    color: '#ff0000'
                });
            }

            const player = {
                id: `player-${AppState.nextPlayerId++}`,
                x: 2250,
                y: 1250,
                teamId: 'team-1',
                number: 1,
                rotation: 0,
                visible: true
            };
            AppState.players.push(player);
            Players.render();
            return player.id;
        });

        // Get initial position
        const initialPos = await page.evaluate((id) => {
            const player = AppState.players.find(p => p.id === id);
            return { x: player.x, y: player.y };
        }, playerId);

        // Wait for player to be rendered
        await page.waitForTimeout(300);

        // Get player visual position - use more specific selector
        const playerElement = page.locator(`.player[data-player-id="${playerId}"]`);
        await expect(playerElement).toBeVisible({ timeout: 5000 });

        // In desktop mode, need to click once to select, then drag
        await playerElement.click();
        await page.waitForTimeout(50);

        const box = await playerElement.boundingBox();

        // Drag player to the visual right on screen
        const startX = box.x + box.width / 2;
        const startY = box.y + box.height / 2;
        const endX = startX + 100;
        const endY = startY;

        await playerElement.hover();
        await page.mouse.down();
        await page.mouse.move(endX, endY, { steps: 10 });
        await page.mouse.up();
        await page.waitForTimeout(100);

        // Get new position
        const newPos = await page.evaluate((id) => {
            const player = AppState.players.find(p => p.id === id);
            return { x: player.x, y: player.y };
        }, playerId);

        console.log('90° rotation (player): initial', initialPos, '-> new', newPos);

        // At 90° rotation, dragging visual right should DECREASE Y
        expect(newPos.y).toBeLessThan(initialPos.y);
        expect(Math.abs(newPos.x - initialPos.x)).toBeLessThan(50);
    });
});
