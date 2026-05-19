/**
 * Test to reproduce the drag & drop direction bug at 90° rotation.
 *
 * Bug Description:
 * When the board is rotated 90°, dragging objects left and down should move them
 * in the expected screen direction. However, there's a bug where the drag goes
 * in the opposite direction.
 *
 * Test Strategy:
 * 1. Create board with each object type (ball, player, plate, shapes)
 * 2. Rotate board 90°
 * 3. Drag each object 200cm left and 200cm down (in screen coordinates)
 * 4. Verify the object moved in the correct direction (not inverted)
 */
import { test, expect } from './test-config.js';
import { goto } from './helpers.js';

test.describe('Drag & Drop Direction Bug at 90° Rotation', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
    });

    /**
     * Helper to convert cm to screen pixels based on current board scale
     */
    async function cmToScreenPixels(page, cm) {
        return await page.evaluate((cm) => {
            const canvasRect = AppState.canvas.getBoundingClientRect();
            const scaleX = canvasRect.width / AppState.boardWidth;
            return cm * scaleX;
        }, cm);
    }

    /**
     * Helper to rotate board to 90°
     */
    async function rotateBoardTo90(page) {
        await page.click('button[data-tab="settings"]');
        await page.waitForTimeout(200);
        await page.click('#btn-rotate-right');
        await page.waitForTimeout(300);

        const rotation = await page.evaluate(() => AppState.boardRotation);
        expect(rotation).toBe(90);
    }

    /**
     * Helper to drag an element left and down by specified cm
     */
    async function dragElementLeftAndDown(page, elementLocator, leftCm, downCm) {
        // Click to select
        await elementLocator.click();
        await page.waitForTimeout(50);

        // Get current position
        const box = await elementLocator.boundingBox();
        const startX = box.x + box.width / 2;
        const startY = box.y + box.height / 2;

        // Convert cm to pixels
        const leftPx = await cmToScreenPixels(page, leftCm);
        const downPx = await cmToScreenPixels(page, downCm);

        // Calculate end position (left = negative X, down = positive Y in screen coords)
        const endX = startX - leftPx;
        const endY = startY + downPx;

        console.log(`Dragging from (${startX.toFixed(1)}, ${startY.toFixed(1)}) to (${endX.toFixed(1)}, ${endY.toFixed(1)})`);
        console.log(`Delta: left=${leftPx.toFixed(1)}px, down=${downPx.toFixed(1)}px`);

        // Perform drag
        await elementLocator.hover();
        await page.mouse.down();
        await page.mouse.move(endX, endY, { steps: 10 });
        await page.mouse.up();
        await page.waitForTimeout(100);
    }

    test('ball drag at 90° should move in correct direction', async ({ page }) => {
        // Create a ball at center
        const ballId = await page.evaluate(() => {
            const ball = {
                id: `ball-${AppState.nextBallId++}`,
                x: 2250, // center X
                y: 1250, // center Y
                color: '#ffffff',
                visible: true
            };
            AppState.balls.push(ball);
            Balls.render();
            return ball.id;
        });

        // Rotate board to 90°
        await rotateBoardTo90(page);

        // Get initial position
        const initialPos = await page.evaluate((id) => {
            const ball = AppState.balls.find(b => b.id === id);
            return { x: ball.x, y: ball.y };
        }, ballId);

        console.log('Ball initial position (board coords):', initialPos);

        // Drag ball 200cm left and 200cm down (screen coordinates)
        const ballElement = page.locator(`[data-ball="${ballId}"].ball-svg`);
        await dragElementLeftAndDown(page, ballElement, 200, 200);

        // Get new position
        const newPos = await page.evaluate((id) => {
            const ball = AppState.balls.find(b => b.id === id);
            return { x: ball.x, y: ball.y };
        }, ballId);

        console.log('Ball new position (board coords):', newPos);
        console.log('Ball position delta:', {
            dx: newPos.x - initialPos.x,
            dy: newPos.y - initialPos.y
        });

        // At 90° rotation (clockwise):
        // Screen left (negative screen X) should map to board POSITIVE Y
        // Screen down (positive screen Y) should map to board POSITIVE X
        //
        // CORRECT Expected behavior at 90° clockwise:
        // - Dragging screen left (200cm) → board Y should INCREASE by ~200
        // - Dragging screen down (200cm) → board X should INCREASE by ~200
        //
        // BUG: Currently they DECREASE (opposite direction!)

        const deltaX = newPos.x - initialPos.x;
        const deltaY = newPos.y - initialPos.y;

        // Check if drag went in CORRECT direction
        expect(deltaY, 'Dragging screen left should INCREASE board Y').toBeGreaterThan(100);
        expect(deltaX, 'Dragging screen down should INCREASE board X').toBeGreaterThan(100);
    });

    test('player drag at 90° should move in correct direction', async ({ page }) => {
        // Create a team and player
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

        // Wait for player to be created
        await page.waitForTimeout(300);

        // Rotate board to 90°
        await rotateBoardTo90(page);

        // Get initial position
        const initialPos = await page.evaluate((id) => {
            const player = AppState.players.find(p => p.id === id);
            return { x: player.x, y: player.y };
        }, playerId);

        console.log('Player initial position (board coords):', initialPos);

        // Drag player 200cm left and 200cm down
        const playerElement = page.locator(`.player[data-player-id="${playerId}"]`);
        await expect(playerElement).toBeVisible({ timeout: 5000 });
        await dragElementLeftAndDown(page, playerElement, 200, 200);

        // Get new position
        const newPos = await page.evaluate((id) => {
            const player = AppState.players.find(p => p.id === id);
            return { x: player.x, y: player.y };
        }, playerId);

        console.log('Player new position (board coords):', newPos);
        console.log('Player position delta:', {
            dx: newPos.x - initialPos.x,
            dy: newPos.y - initialPos.y
        });

        const deltaX = newPos.x - initialPos.x;
        const deltaY = newPos.y - initialPos.y;

        // Check if drag went in CORRECT direction
        expect(deltaY, 'Player: screen left should INCREASE board Y').toBeGreaterThan(100);
        expect(deltaX, 'Player: screen down should INCREASE board X').toBeGreaterThan(100);
    });

    test('plate drag at 90° should move in correct direction', async ({ page }) => {
        // Create a plate at center
        const plateId = await page.evaluate(() => {
            const plate = {
                id: `plate-${AppState.nextPlateId++}`,
                x: 2250,
                y: 1250,
                color: '#FFFFFF',
                visible: true
            };
            AppState.plates.push(plate);
            Plates.render();
            return plate.id;
        });

        // Rotate board to 90°
        await rotateBoardTo90(page);

        // Get initial position
        const initialPos = await page.evaluate((id) => {
            const plate = AppState.plates.find(p => p.id === id);
            return { x: plate.x, y: plate.y };
        }, plateId);

        console.log('Plate initial position (board coords):', initialPos);

        // Drag plate 200cm left and 200cm down
        const plateElement = page.locator(`[data-plate="${plateId}"].plate-svg`);
        await dragElementLeftAndDown(page, plateElement, 200, 200);

        // Get new position
        const newPos = await page.evaluate((id) => {
            const plate = AppState.plates.find(p => p.id === id);
            return { x: plate.x, y: plate.y };
        }, plateId);

        console.log('Plate new position (board coords):', newPos);
        console.log('Plate position delta:', {
            dx: newPos.x - initialPos.x,
            dy: newPos.y - initialPos.y
        });

        const deltaX = newPos.x - initialPos.x;
        const deltaY = newPos.y - initialPos.y;

        // Check if drag went in CORRECT direction
        expect(deltaY, 'Plate: screen left should INCREASE board Y').toBeGreaterThan(100);
        expect(deltaX, 'Plate: screen down should INCREASE board X').toBeGreaterThan(100);
    });

    test('rectangle drag at 90° should move in correct direction', async ({ page }) => {
        // Create a rectangle at center
        const rectId = await page.evaluate(() => {
            const rect = {
                id: `shape-${AppState.nextShapeId++}`,
                type: 'rectangle',
                x: 2250,
                y: 1250,
                width: 200,
                height: 150,
                strokeColor: '#000000',
                fillColor: '#FF6B35',
                strokeWidth: 2,
                rotation: 0,
                visible: true
            };
            AppState.shapes.push(rect);
            Shapes.render();
            return rect.id;
        });

        // Wait for shape to be created
        await page.waitForTimeout(300);

        // Rotate board to 90°
        await rotateBoardTo90(page);

        // Get initial position
        const initialPos = await page.evaluate((id) => {
            const shape = AppState.shapes.find(s => s.id === id);
            return { x: shape.x, y: shape.y };
        }, rectId);

        console.log('Rectangle initial position (board coords):', initialPos);

        // Drag rectangle 200cm left and 200cm down
        const rectElement = page.locator(`.shape-svg[data-shape="${rectId}"]`);
        await expect(rectElement).toBeVisible({ timeout: 5000 });
        await dragElementLeftAndDown(page, rectElement, 200, 200);

        // Get new position
        const newPos = await page.evaluate((id) => {
            const shape = AppState.shapes.find(s => s.id === id);
            return { x: shape.x, y: shape.y };
        }, rectId);

        console.log('Rectangle new position (board coords):', newPos);
        console.log('Rectangle position delta:', {
            dx: newPos.x - initialPos.x,
            dy: newPos.y - initialPos.y
        });

        const deltaX = newPos.x - initialPos.x;
        const deltaY = newPos.y - initialPos.y;

        // Check if drag went in CORRECT direction
        expect(deltaY, 'Rectangle: screen left should INCREASE board Y').toBeGreaterThan(100);
        expect(deltaX, 'Rectangle: screen down should INCREASE board X').toBeGreaterThan(100);
    });

    test('circle drag at 90° should move in correct direction', async ({ page }) => {
        // Create a circle at center
        const circleId = await page.evaluate(() => {
            const circle = {
                id: `shape-${AppState.nextShapeId++}`,
                type: 'circle',
                x: 2250,
                y: 1250,
                width: 200,
                height: 200,
                color: '#000000',
                fillColor: '#3498DB',
                strokeWidth: 2,
                visible: true,
                rotation: 0
            };
            AppState.shapes.push(circle);
            Shapes.render();
            return circle.id;
        });

        // Wait for shape to be created
        await page.waitForTimeout(300);

        // Rotate board to 90°
        await rotateBoardTo90(page);

        // Get initial position
        const initialPos = await page.evaluate((id) => {
            const shape = AppState.shapes.find(s => s.id === id);
            return { x: shape.x, y: shape.y };
        }, circleId);

        console.log('Circle initial position (board coords):', initialPos);

        // Drag circle 200cm left and 200cm down
        const circleElement = page.locator(`.shape-svg[data-shape="${circleId}"]`);
        await expect(circleElement).toBeVisible({ timeout: 5000 });
        await dragElementLeftAndDown(page, circleElement, 200, 200);

        // Get new position
        const newPos = await page.evaluate((id) => {
            const shape = AppState.shapes.find(s => s.id === id);
            return { x: shape.x, y: shape.y };
        }, circleId);

        console.log('Circle new position (board coords):', newPos);
        console.log('Circle position delta:', {
            dx: newPos.x - initialPos.x,
            dy: newPos.y - initialPos.y
        });

        const deltaX = newPos.x - initialPos.x;
        const deltaY = newPos.y - initialPos.y;

        // Check if drag went in CORRECT direction
        expect(deltaY, 'Circle: screen left should INCREASE board Y').toBeGreaterThan(100);
        expect(deltaX, 'Circle: screen down should INCREASE board X').toBeGreaterThan(100);
    });

    test('all objects together: comprehensive drag test at 90°', async ({ page }) => {
        // Create one of each object type
        const objects = await page.evaluate(() => {
            // Ball
            const ball = {
                id: `ball-${AppState.nextBallId++}`,
                x: 1500,
                y: 1000,
                color: '#ffffff',
                visible: true
            };
            AppState.balls.push(ball);

            // Player (with team)
            if (!AppState.teams.find(t => t.id === 'team-1')) {
                AppState.teams.push({
                    id: 'team-1',
                    name: 'Team 1',
                    color: '#ff0000'
                });
            }
            const player = {
                id: `player-${AppState.nextPlayerId++}`,
                x: 2000,
                y: 1000,
                teamId: 'team-1',
                number: 1,
                rotation: 0,
                visible: true
            };
            AppState.players.push(player);

            // Plate
            const plate = {
                id: `plate-${AppState.nextPlateId++}`,
                x: 2500,
                y: 1000,
                color: '#FFD700',
                visible: true
            };
            AppState.plates.push(plate);

            // Rectangle
            const rect = {
                id: `shape-${AppState.nextShapeId++}`,
                type: 'rectangle',
                x: 3000,
                y: 1000,
                width: 150,
                height: 100,
                strokeColor: '#000000',
                fillColor: '#FF6B35',
                strokeWidth: 2,
                rotation: 0,
                visible: true
            };
            AppState.shapes.push(rect);

            // Render all
            Balls.render();
            Players.render();
            Plates.render();
            Shapes.render();

            return {
                ballId: ball.id,
                playerId: player.id,
                plateId: plate.id,
                rectId: rect.id
            };
        });

        // Rotate board to 90°
        await rotateBoardTo90(page);
        await page.waitForTimeout(300);

        // Test each object
        const testCases = [
            { type: 'ball', id: objects.ballId, selector: `[data-ball="${objects.ballId}"].ball-svg` },
            { type: 'player', id: objects.playerId, selector: `.player[data-player-id="${objects.playerId}"]` },
            { type: 'plate', id: objects.plateId, selector: `[data-plate="${objects.plateId}"].plate-svg` },
            { type: 'rectangle', id: objects.rectId, selector: `.shape-svg[data-shape="${objects.rectId}"]` }
        ];

        for (const testCase of testCases) {
            console.log(`\n=== Testing ${testCase.type} ===`);

            // Get initial position
            const initialPos = await page.evaluate(({ type, id }) => {
                let obj;
                if (type === 'ball') obj = AppState.balls.find(b => b.id === id);
                else if (type === 'player') obj = AppState.players.find(p => p.id === id);
                else if (type === 'plate') obj = AppState.plates.find(p => p.id === id);
                else if (type === 'rectangle') obj = AppState.shapes.find(s => s.id === id);
                return { x: obj.x, y: obj.y };
            }, { type: testCase.type, id: testCase.id });

            console.log(`${testCase.type} initial position:`, initialPos);

            // Drag 200cm left and 200cm down
            const element = page.locator(testCase.selector);
            await expect(element).toBeVisible({ timeout: 5000 });
            await dragElementLeftAndDown(page, element, 200, 200);

            // Get new position
            const newPos = await page.evaluate(({ type, id }) => {
                let obj;
                if (type === 'ball') obj = AppState.balls.find(b => b.id === id);
                else if (type === 'player') obj = AppState.players.find(p => p.id === id);
                else if (type === 'plate') obj = AppState.plates.find(p => p.id === id);
                else if (type === 'rectangle') obj = AppState.shapes.find(s => s.id === id);
                return { x: obj.x, y: obj.y };
            }, { type: testCase.type, id: testCase.id });

            console.log(`${testCase.type} new position:`, newPos);

            const deltaX = newPos.x - initialPos.x;
            const deltaY = newPos.y - initialPos.y;
            console.log(`${testCase.type} delta:`, { dx: deltaX, dy: deltaY });

            // Verify CORRECT direction (screen left/down should INCREASE board Y/X at 90°)
            expect(deltaY, `${testCase.type}: screen left should INCREASE board Y`).toBeGreaterThan(100);
            expect(deltaX, `${testCase.type}: screen down should INCREASE board X`).toBeGreaterThan(100);
        }
    });
});
