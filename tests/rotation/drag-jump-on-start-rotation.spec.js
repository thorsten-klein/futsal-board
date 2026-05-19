/**
 * Test to reproduce the "jump on drag start" bug at 90° rotation.
 *
 * Bug Description:
 * When starting to drag an object on a 90° rotated board, the object jumps
 * to a different position instead of staying under the cursor.
 *
 * Expected: Object should stay under cursor when drag starts
 * Actual: Object jumps to incorrect position
 */
import { test, expect } from '../test-config.js';
import { goto } from '../helpers.js';

test.describe('Drag jump on start at 90° rotation', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
    });

    test('ball should NOT jump when drag starts at 90°', async ({ page }) => {
        // Create a ball at a specific position
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

        await page.waitForTimeout(200);

        // Rotate board to 90°
        await page.click('button[data-tab="settings"]');
        await page.waitForTimeout(200);
        await page.click('#btn-rotate-right');
        await page.waitForTimeout(500);

        // Get initial position
        const initialPos = await page.evaluate((id) => {
            const ball = AppState.balls.find(b => b.id === id);
            return { x: ball.x, y: ball.y };
        }, ballId);

        console.log('Initial position:', initialPos);

        // Get ball element and click to select
        const ballElement = page.locator(`[data-ball="${ballId}"].ball-svg`);
        await ballElement.click();
        await page.waitForTimeout(100);

        // Start dragging by pressing mouse down (click OFFSET from center to simulate real usage)
        const box = await ballElement.boundingBox();
        const clickX = box.x + box.width * 0.7; // Click 70% to the right (off-center)
        const clickY = box.y + box.height * 0.7; // Click 70% down (off-center)

        console.log('Clicking at screen position (off-center):', { x: clickX, y: clickY });

        await page.mouse.move(clickX, clickY);
        await page.mouse.down();
        await page.waitForTimeout(50);

        // Get position immediately after mousedown (before any actual movement)
        const posAfterMouseDown = await page.evaluate((id) => {
            const ball = AppState.balls.find(b => b.id === id);
            return { x: ball.x, y: ball.y };
        }, ballId);

        console.log('Position after mousedown:', posAfterMouseDown);

        // Now move the mouse just 1 pixel to trigger drag
        await page.mouse.move(clickX + 1, clickY + 1);
        await page.waitForTimeout(50);

        // Get position after first mouse move (this is where jump would occur)
        const posAfterFirstMove = await page.evaluate((id) => {
            const ball = AppState.balls.find(b => b.id === id);
            // Debug: check canvas dimensions and drag offset
            console.log('DEBUG canvas.width:', AppState.canvas.width, 'canvas.height:', AppState.canvas.height);
            console.log('DEBUG dragOffset:', AppState.dragOffset);
            return { x: ball.x, y: ball.y };
        }, ballId);

        console.log('Position after first mouse move:', posAfterFirstMove);

        // Calculate how much the ball jumped from mousedown to first movement
        const jumpX = Math.abs(posAfterFirstMove.x - posAfterMouseDown.x);
        const jumpY = Math.abs(posAfterFirstMove.y - posAfterMouseDown.y);

        console.log('Jump on first move:', { jumpX, jumpY });

        await page.mouse.up();

        // Ball should NOT jump excessively when drag starts (allow up to 15cm tolerance)
        expect(jumpX, 'Ball should not jump more than 15cm in X direction').toBeLessThan(15);
        expect(jumpY, 'Ball should not jump more than 15cm in Y direction').toBeLessThan(15);
    });

    test('player should NOT jump when drag starts at 90°', async ({ page }) => {
        // Create a player
        const playerId = await page.evaluate(() => {
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

        await page.waitForTimeout(300);

        // Rotate board to 90°
        await page.click('button[data-tab="settings"]');
        await page.waitForTimeout(200);
        await page.click('#btn-rotate-right');
        await page.waitForTimeout(500);

        // Get initial position
        const initialPos = await page.evaluate((id) => {
            const player = AppState.players.find(p => p.id === id);
            return { x: player.x, y: player.y };
        }, playerId);

        console.log('Initial position:', initialPos);

        // Get player element and click to select
        const playerElement = page.locator(`.player[data-player-id="${playerId}"]`);
        await playerElement.click();
        await page.waitForTimeout(100);

        // Start dragging
        const box = await playerElement.boundingBox();
        const clickX = box.x + box.width / 2;
        const clickY = box.y + box.height / 2;

        console.log('Clicking at screen position:', { x: clickX, y: clickY });

        await page.mouse.move(clickX, clickY);
        await page.mouse.down();
        await page.waitForTimeout(50);

        // Get position immediately after mousedown
        const posAfterMouseDown = await page.evaluate((id) => {
            const player = AppState.players.find(p => p.id === id);
            return { x: player.x, y: player.y };
        }, playerId);

        console.log('Position after mousedown:', posAfterMouseDown);

        // Now move the mouse just 1 pixel to trigger drag
        await page.mouse.move(clickX + 1, clickY + 1);
        await page.waitForTimeout(50);

        // Get position after first mouse move
        const posAfterFirstMove = await page.evaluate((id) => {
            const player = AppState.players.find(p => p.id === id);
            return { x: player.x, y: player.y };
        }, playerId);

        console.log('Position after first mouse move:', posAfterFirstMove);

        const jumpX = Math.abs(posAfterFirstMove.x - posAfterMouseDown.x);
        const jumpY = Math.abs(posAfterFirstMove.y - posAfterMouseDown.y);

        console.log('Jump on first move:', { jumpX, jumpY });

        await page.mouse.up();

        // Should NOT jump excessively when drag starts
        expect(jumpX, 'Should not jump more than 15cm in X direction').toBeLessThan(15);
        expect(jumpY, 'Should not jump more than 15cm in Y direction').toBeLessThan(15);
    });

    test('plate should NOT jump when drag starts at 90°', async ({ page }) => {
        // Create a plate
        const plateId = await page.evaluate(() => {
            const plate = {
                id: `plate-${AppState.nextPlateId++}`,
                x: 2250,
                y: 1250,
                color: '#FFD700',
                visible: true
            };
            AppState.plates.push(plate);
            Plates.render();
            return plate.id;
        });

        await page.waitForTimeout(200);

        // Rotate board to 90°
        await page.click('button[data-tab="settings"]');
        await page.waitForTimeout(200);
        await page.click('#btn-rotate-right');
        await page.waitForTimeout(500);

        // Get initial position
        const initialPos = await page.evaluate((id) => {
            const plate = AppState.plates.find(p => p.id === id);
            return { x: plate.x, y: plate.y };
        }, plateId);

        console.log('Initial position:', initialPos);

        // Get plate element and click to select
        const plateElement = page.locator(`[data-plate="${plateId}"].plate-svg`);
        await plateElement.click();
        await page.waitForTimeout(100);

        // Start dragging
        const box = await plateElement.boundingBox();
        const clickX = box.x + box.width / 2;
        const clickY = box.y + box.height / 2;

        console.log('Clicking at screen position:', { x: clickX, y: clickY });

        await page.mouse.move(clickX, clickY);
        await page.mouse.down();
        await page.waitForTimeout(50);

        // Get position immediately after mousedown
        const posAfterMouseDown = await page.evaluate((id) => {
            const plate = AppState.plates.find(p => p.id === id);
            return { x: plate.x, y: plate.y };
        }, plateId);

        console.log('Position after mousedown:', posAfterMouseDown);

        // Now move the mouse just 1 pixel to trigger drag
        await page.mouse.move(clickX + 1, clickY + 1);
        await page.waitForTimeout(50);

        // Get position after first mouse move
        const posAfterFirstMove = await page.evaluate((id) => {
            const plate = AppState.plates.find(p => p.id === id);
            return { x: plate.x, y: plate.y };
        }, plateId);

        console.log('Position after first mouse move:', posAfterFirstMove);

        const jumpX = Math.abs(posAfterFirstMove.x - posAfterMouseDown.x);
        const jumpY = Math.abs(posAfterFirstMove.y - posAfterMouseDown.y);

        console.log('Jump on first move:', { jumpX, jumpY });

        await page.mouse.up();

        // Should NOT jump excessively when drag starts
        expect(jumpX, 'Should not jump more than 15cm in X direction').toBeLessThan(15);
        expect(jumpY, 'Should not jump more than 15cm in Y direction').toBeLessThan(15);
    });

    test('shape should NOT jump when drag starts at 90°', async ({ page }) => {
        // Create a rectangle
        const rectId = await page.evaluate(() => {
            const rect = {
                id: `shape-${AppState.nextShapeId++}`,
                type: 'rectangle',
                x: 2250,
                y: 1250,
                width: 200,
                height: 150,
                color: '#000000',
                fillColor: '#FF6B35',
                strokeWidth: 2,
                rotation: 0,
                visible: true
            };
            AppState.shapes.push(rect);
            Shapes.render();
            return rect.id;
        });

        await page.waitForTimeout(300);

        // Rotate board to 90°
        await page.click('button[data-tab="settings"]');
        await page.waitForTimeout(200);
        await page.click('#btn-rotate-right');
        await page.waitForTimeout(500);

        // Get initial position
        const initialPos = await page.evaluate((id) => {
            const shape = AppState.shapes.find(s => s.id === id);
            return { x: shape.x, y: shape.y };
        }, rectId);

        console.log('Initial position:', initialPos);

        // Get shape element and click to select
        const shapeElement = page.locator(`.shape-svg[data-shape="${rectId}"]`);
        await shapeElement.click();
        await page.waitForTimeout(100);

        // Start dragging
        const box = await shapeElement.boundingBox();
        const clickX = box.x + box.width / 2;
        const clickY = box.y + box.height / 2;

        console.log('Clicking at screen position:', { x: clickX, y: clickY });

        await page.mouse.move(clickX, clickY);
        await page.mouse.down();
        await page.waitForTimeout(50);

        // Get position immediately after mousedown
        const posAfterMouseDown = await page.evaluate((id) => {
            const shape = AppState.shapes.find(s => s.id === id);
            return { x: shape.x, y: shape.y };
        }, rectId);

        console.log('Position after mousedown:', posAfterMouseDown);

        // Now move the mouse just 1 pixel to trigger drag
        await page.mouse.move(clickX + 1, clickY + 1);
        await page.waitForTimeout(50);

        // Get position after first mouse move
        const posAfterFirstMove = await page.evaluate((id) => {
            const shape = AppState.shapes.find(s => s.id === id);
            return { x: shape.x, y: shape.y };
        }, rectId);

        console.log('Position after first mouse move:', posAfterFirstMove);

        const jumpX = Math.abs(posAfterFirstMove.x - posAfterMouseDown.x);
        const jumpY = Math.abs(posAfterFirstMove.y - posAfterMouseDown.y);

        console.log('Jump on first move:', { jumpX, jumpY });

        await page.mouse.up();

        // Should NOT jump excessively when drag starts
        expect(jumpX, 'Should not jump more than 15cm in X direction').toBeLessThan(15);
        expect(jumpY, 'Should not jump more than 15cm in Y direction').toBeLessThan(15);
    });
});
