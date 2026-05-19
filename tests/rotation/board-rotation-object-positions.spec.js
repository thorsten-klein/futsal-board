/**
 * Tests to ensure all object types maintain correct board coordinates during rotation.
 * Objects should NOT have their coordinates modified - only visual rotation should happen via CSS transforms.
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

const TEST_X = 1000;
const TEST_Y = 1000;

test.describe('Object positions during board rotation', () => {
    test('cone maintains board coordinates at all rotations', async ({ page }) => {
        await goto(page);

        // Add a cone at test position
        const coneId = await page.evaluate(({ x, y }) => {
            const cone = {
                id: 'test-cone',
                type: 'cone',
                x: x,
                y: y,
                color: '#ff0000',
                visible: true
            };
            AppState.elements.push(cone);
            Elements.render();
            return cone.id;
        }, { x: TEST_X, y: TEST_Y });

        // Check at 0°
        let state = await page.evaluate((id) => {
            const cone = AppState.elements.find(el => el.id === id);
            return {
                rotation: AppState.boardRotation,
                x: cone.x,
                y: cone.y
            };
        }, coneId);
        console.log('Cone at 0°: x=', state.x, 'y=', state.y);
        expect(state.rotation).toBe(0);
        expect(state.x).toBe(TEST_X);
        expect(state.y).toBe(TEST_Y);

        // Rotate to 90°
        await rightClickBoard(page);
        let menu = await getBoardCanvasMenu(page);
        await menu.locator('[data-action="rotate-right"]').click();
        await page.waitForTimeout(200);

        state = await page.evaluate((id) => {
            const cone = AppState.elements.find(el => el.id === id);
            return {
                rotation: AppState.boardRotation,
                x: cone.x,
                y: cone.y
            };
        }, coneId);
        expect(state.rotation).toBe(90);
        expect(state.x).toBe(TEST_X);
        expect(state.y).toBe(TEST_Y);

        // Rotate to 180°
        await rightClickBoard(page);
        menu = await getBoardCanvasMenu(page);
        await menu.locator('[data-action="rotate-right"]').click();
        await page.waitForTimeout(200);

        state = await page.evaluate((id) => {
            const cone = AppState.elements.find(el => el.id === id);
            return {
                rotation: AppState.boardRotation,
                x: cone.x,
                y: cone.y
            };
        }, coneId);
        expect(state.rotation).toBe(180);
        expect(state.x).toBe(TEST_X);
        expect(state.y).toBe(TEST_Y);

        // Rotate to 270°
        await rightClickBoard(page);
        menu = await getBoardCanvasMenu(page);
        await menu.locator('[data-action="rotate-right"]').click();
        await page.waitForTimeout(200);

        state = await page.evaluate((id) => {
            const cone = AppState.elements.find(el => el.id === id);
            return {
                rotation: AppState.boardRotation,
                x: cone.x,
                y: cone.y
            };
        }, coneId);
        expect(state.rotation).toBe(270);
        expect(state.x).toBe(TEST_X);
        expect(state.y).toBe(TEST_Y);
    });

    test('player maintains board coordinates at all rotations', async ({ page }) => {
        await goto(page);

        // Add a player at test position
        const playerId = await page.evaluate(({ x, y }) => {
            const player = {
                id: 'test-player',
                number: 99,
                color: '#ff0000',
                x: x,
                y: y,
                rotation: 0,
                visible: true,
                _explicitlySet: true
            };
            AppState.players.push(player);
            Players.render();
            return player.id;
        }, { x: TEST_X, y: TEST_Y });

        // Check at 0°
        let state = await page.evaluate((id) => {
            const player = AppState.players.find(p => p.id === id);
            return {
                rotation: AppState.boardRotation,
                x: player.x,
                y: player.y
            };
        }, playerId);
        expect(state.rotation).toBe(0);
        expect(state.x).toBe(TEST_X);
        expect(state.y).toBe(TEST_Y);

        // Rotate to 90°
        await rightClickBoard(page);
        let menu = await getBoardCanvasMenu(page);
        await menu.locator('[data-action="rotate-right"]').click();
        await page.waitForTimeout(200);

        state = await page.evaluate((id) => {
            const player = AppState.players.find(p => p.id === id);
            return {
                rotation: AppState.boardRotation,
                x: player.x,
                y: player.y
            };
        }, playerId);
        expect(state.rotation).toBe(90);
        expect(state.x).toBe(TEST_X);
        expect(state.y).toBe(TEST_Y);

        // Rotate to 180°
        await rightClickBoard(page);
        menu = await getBoardCanvasMenu(page);
        await menu.locator('[data-action="rotate-right"]').click();
        await page.waitForTimeout(200);

        state = await page.evaluate((id) => {
            const player = AppState.players.find(p => p.id === id);
            return {
                rotation: AppState.boardRotation,
                x: player.x,
                y: player.y
            };
        }, playerId);
        expect(state.rotation).toBe(180);
        expect(state.x).toBe(TEST_X);
        expect(state.y).toBe(TEST_Y);

        // Rotate to 270°
        await rightClickBoard(page);
        menu = await getBoardCanvasMenu(page);
        await menu.locator('[data-action="rotate-right"]').click();
        await page.waitForTimeout(200);

        state = await page.evaluate((id) => {
            const player = AppState.players.find(p => p.id === id);
            return {
                rotation: AppState.boardRotation,
                x: player.x,
                y: player.y
            };
        }, playerId);
        expect(state.rotation).toBe(270);
        expect(state.x).toBe(TEST_X);
        expect(state.y).toBe(TEST_Y);
    });

    test('ball maintains board coordinates at all rotations', async ({ page }) => {
        await goto(page);

        // Add a ball at test position
        const ballId = await page.evaluate(({ x, y }) => {
            const ball = {
                id: 'test-ball',
                x: x,
                y: y,
                visible: true,
                _explicitlySet: true
            };
            AppState.balls.push(ball);
            Balls.render();
            return ball.id;
        }, { x: TEST_X, y: TEST_Y });

        // Check at 0°
        let state = await page.evaluate((id) => {
            const ball = AppState.balls.find(b => b.id === id);
            return {
                rotation: AppState.boardRotation,
                x: ball.x,
                y: ball.y
            };
        }, ballId);
        expect(state.rotation).toBe(0);
        expect(state.x).toBe(TEST_X);
        expect(state.y).toBe(TEST_Y);

        // Rotate to 90°
        await rightClickBoard(page);
        let menu = await getBoardCanvasMenu(page);
        await menu.locator('[data-action="rotate-right"]').click();
        await page.waitForTimeout(200);

        state = await page.evaluate((id) => {
            const ball = AppState.balls.find(b => b.id === id);
            return {
                rotation: AppState.boardRotation,
                x: ball.x,
                y: ball.y
            };
        }, ballId);
        expect(state.rotation).toBe(90);
        expect(state.x).toBe(TEST_X);
        expect(state.y).toBe(TEST_Y);

        // Rotate to 180°
        await rightClickBoard(page);
        menu = await getBoardCanvasMenu(page);
        await menu.locator('[data-action="rotate-right"]').click();
        await page.waitForTimeout(200);

        state = await page.evaluate((id) => {
            const ball = AppState.balls.find(b => b.id === id);
            return {
                rotation: AppState.boardRotation,
                x: ball.x,
                y: ball.y
            };
        }, ballId);
        expect(state.rotation).toBe(180);
        expect(state.x).toBe(TEST_X);
        expect(state.y).toBe(TEST_Y);

        // Rotate to 270°
        await rightClickBoard(page);
        menu = await getBoardCanvasMenu(page);
        await menu.locator('[data-action="rotate-right"]').click();
        await page.waitForTimeout(200);

        state = await page.evaluate((id) => {
            const ball = AppState.balls.find(b => b.id === id);
            return {
                rotation: AppState.boardRotation,
                x: ball.x,
                y: ball.y
            };
        }, ballId);
        expect(state.rotation).toBe(270);
        expect(state.x).toBe(TEST_X);
        expect(state.y).toBe(TEST_Y);
    });

    test('plate maintains board coordinates at all rotations', async ({ page }) => {
        await goto(page);

        // Add a plate at test position
        const plateId = await page.evaluate(({ x, y }) => {
            const plate = {
                id: 'test-plate',
                number: 99,
                color: '#ff0000',
                x: x,
                y: y,
                visible: true
            };
            AppState.plates.push(plate);
            Plates.render();
            return plate.id;
        }, { x: TEST_X, y: TEST_Y });

        // Check at 0°
        let state = await page.evaluate((id) => {
            const plate = AppState.plates.find(p => p.id === id);
            return {
                rotation: AppState.boardRotation,
                x: plate.x,
                y: plate.y
            };
        }, plateId);
        expect(state.rotation).toBe(0);
        expect(state.x).toBe(TEST_X);
        expect(state.y).toBe(TEST_Y);

        // Rotate to 90°
        await rightClickBoard(page);
        let menu = await getBoardCanvasMenu(page);
        await menu.locator('[data-action="rotate-right"]').click();
        await page.waitForTimeout(200);

        state = await page.evaluate((id) => {
            const plate = AppState.plates.find(p => p.id === id);
            return {
                rotation: AppState.boardRotation,
                x: plate.x,
                y: plate.y
            };
        }, plateId);
        expect(state.rotation).toBe(90);
        expect(state.x).toBe(TEST_X);
        expect(state.y).toBe(TEST_Y);

        // Rotate to 180°
        await rightClickBoard(page);
        menu = await getBoardCanvasMenu(page);
        await menu.locator('[data-action="rotate-right"]').click();
        await page.waitForTimeout(200);

        state = await page.evaluate((id) => {
            const plate = AppState.plates.find(p => p.id === id);
            return {
                rotation: AppState.boardRotation,
                x: plate.x,
                y: plate.y
            };
        }, plateId);
        expect(state.rotation).toBe(180);
        expect(state.x).toBe(TEST_X);
        expect(state.y).toBe(TEST_Y);

        // Rotate to 270°
        await rightClickBoard(page);
        menu = await getBoardCanvasMenu(page);
        await menu.locator('[data-action="rotate-right"]').click();
        await page.waitForTimeout(200);

        state = await page.evaluate((id) => {
            const plate = AppState.plates.find(p => p.id === id);
            return {
                rotation: AppState.boardRotation,
                x: plate.x,
                y: plate.y
            };
        }, plateId);
        expect(state.rotation).toBe(270);
        expect(state.x).toBe(TEST_X);
        expect(state.y).toBe(TEST_Y);
    });

    test('shape maintains board coordinates at all rotations', async ({ page }) => {
        await goto(page);

        // Add a shape at test position
        const shapeId = await page.evaluate(({ x, y }) => {
            const shape = {
                id: 'test-shape',
                type: 'circle',
                x: x,
                y: y,
                width: 100,
                height: 100,
                color: '#ff0000',
                rotation: 0,
                visible: true
            };
            AppState.shapes.push(shape);
            Shapes.render();
            return shape.id;
        }, { x: TEST_X, y: TEST_Y });

        // Check at 0°
        let state = await page.evaluate((id) => {
            const shape = AppState.shapes.find(s => s.id === id);
            return {
                rotation: AppState.boardRotation,
                x: shape.x,
                y: shape.y
            };
        }, shapeId);
        expect(state.rotation).toBe(0);
        expect(state.x).toBe(TEST_X);
        expect(state.y).toBe(TEST_Y);

        // Rotate to 90°
        await rightClickBoard(page);
        let menu = await getBoardCanvasMenu(page);
        await menu.locator('[data-action="rotate-right"]').click();
        await page.waitForTimeout(200);

        state = await page.evaluate((id) => {
            const shape = AppState.shapes.find(s => s.id === id);
            return {
                rotation: AppState.boardRotation,
                x: shape.x,
                y: shape.y
            };
        }, shapeId);
        expect(state.rotation).toBe(90);
        expect(state.x).toBe(TEST_X);
        expect(state.y).toBe(TEST_Y);

        // Rotate to 180°
        await rightClickBoard(page);
        menu = await getBoardCanvasMenu(page);
        await menu.locator('[data-action="rotate-right"]').click();
        await page.waitForTimeout(200);

        state = await page.evaluate((id) => {
            const shape = AppState.shapes.find(s => s.id === id);
            return {
                rotation: AppState.boardRotation,
                x: shape.x,
                y: shape.y
            };
        }, shapeId);
        expect(state.rotation).toBe(180);
        expect(state.x).toBe(TEST_X);
        expect(state.y).toBe(TEST_Y);

        // Rotate to 270°
        await rightClickBoard(page);
        menu = await getBoardCanvasMenu(page);
        await menu.locator('[data-action="rotate-right"]').click();
        await page.waitForTimeout(200);

        state = await page.evaluate((id) => {
            const shape = AppState.shapes.find(s => s.id === id);
            return {
                rotation: AppState.boardRotation,
                x: shape.x,
                y: shape.y
            };
        }, shapeId);
        expect(state.rotation).toBe(270);
        expect(state.x).toBe(TEST_X);
        expect(state.y).toBe(TEST_Y);
    });

    test('rotating left also maintains coordinates', async ({ page }) => {
        await goto(page);

        // Add objects of each type
        const ids = await page.evaluate(({ x, y }) => {
            const cone = {
                id: 'test-cone-left',
                type: 'cone',
                x: x,
                y: y,
                color: '#ff0000',
                visible: true
            };
            AppState.elements.push(cone);

            const player = {
                id: 'test-player-left',
                number: 88,
                color: '#00ff00',
                x: x + 100,
                y: y,
                rotation: 0,
                visible: true,
                _explicitlySet: true
            };
            AppState.players.push(player);

            const ball = {
                id: 'test-ball-left',
                x: x + 200,
                y: y,
                visible: true,
                _explicitlySet: true
            };
            AppState.balls.push(ball);

            Elements.render();
            Players.render();
            Balls.render();

            return { coneId: cone.id, playerId: player.id, ballId: ball.id };
        }, { x: TEST_X, y: TEST_Y });

        // Rotate left to 270°
        await rightClickBoard(page);
        let menu = await getBoardCanvasMenu(page);
        await menu.locator('[data-action="rotate-left"]').click();
        await page.waitForTimeout(200);

        let state = await page.evaluate((testIds) => {
            const cone = AppState.elements.find(el => el.id === testIds.coneId);
            const player = AppState.players.find(p => p.id === testIds.playerId);
            const ball = AppState.balls.find(b => b.id === testIds.ballId);

            return {
                rotation: AppState.boardRotation,
                cone: { x: cone.x, y: cone.y },
                player: { x: player.x, y: player.y },
                ball: { x: ball.x, y: ball.y }
            };
        }, ids);

        console.log('After rotate left to 270°:');
        console.log('Cone:', state.cone);
        console.log('Player:', state.player);
        console.log('Ball:', state.ball);

        expect(state.rotation).toBe(270);
        expect(state.cone.x).toBe(TEST_X);
        expect(state.cone.y).toBe(TEST_Y);
        expect(state.player.x).toBe(TEST_X + 100);
        expect(state.player.y).toBe(TEST_Y);
        expect(state.ball.x).toBe(TEST_X + 200);
        expect(state.ball.y).toBe(TEST_Y);
    });

    test('objects created while board is rotated have correct coordinates', async ({ page }) => {
        await goto(page);

        // Rotate board to 180° first
        await rightClickBoard(page);
        let menu = await getBoardCanvasMenu(page);
        await menu.locator('[data-action="rotate-right"]').click();
        await page.waitForTimeout(200);

        await rightClickBoard(page);
        menu = await getBoardCanvasMenu(page);
        await menu.locator('[data-action="rotate-right"]').click();
        await page.waitForTimeout(200);

        // Verify board is at 180°
        let rotation = await page.evaluate(() => AppState.boardRotation);
        expect(rotation).toBe(180);

        // Now add objects at test position while board is rotated
        const ids = await page.evaluate(({ x, y }) => {
            const cone = {
                id: 'test-cone-rotated',
                type: 'cone',
                x: x,
                y: y,
                color: '#ff0000',
                visible: true
            };
            AppState.elements.push(cone);

            const player = {
                id: 'test-player-rotated',
                number: 77,
                color: '#0000ff',
                x: x,
                y: y,
                rotation: 0,
                visible: true,
                _explicitlySet: true
            };
            AppState.players.push(player);

            Elements.render();
            Players.render();

            return { coneId: cone.id, playerId: player.id };
        }, { x: TEST_X, y: TEST_Y });

        // Check positions are correct at 180°
        let state = await page.evaluate((testIds) => {
            const cone = AppState.elements.find(el => el.id === testIds.coneId);
            const player = AppState.players.find(p => p.id === testIds.playerId);

            return {
                rotation: AppState.boardRotation,
                cone: { x: cone.x, y: cone.y },
                player: { x: player.x, y: player.y, rotation: player.rotation }
            };
        }, ids);

        console.log('Objects created at 180° board rotation:');
        console.log('Cone:', state.cone);
        console.log('Player:', state.player);

        expect(state.rotation).toBe(180);
        expect(state.cone.x).toBe(TEST_X);
        expect(state.cone.y).toBe(TEST_Y);
        expect(state.player.x).toBe(TEST_X);
        expect(state.player.y).toBe(TEST_Y);

        // Rotate back to 0° and check positions still correct
        await page.click('button[data-tab="settings"]');
        await page.waitForTimeout(200);
        await page.click('#btn-reset-rotation');
        await page.waitForTimeout(200);

        state = await page.evaluate((testIds) => {
            const cone = AppState.elements.find(el => el.id === testIds.coneId);
            const player = AppState.players.find(p => p.id === testIds.playerId);

            return {
                rotation: AppState.boardRotation,
                cone: { x: cone.x, y: cone.y },
                player: { x: player.x, y: player.y, rotation: player.rotation }
            };
        }, ids);

        console.log('After reset to 0°:');
        console.log('Cone:', state.cone);
        console.log('Player:', state.player);

        expect(state.rotation).toBe(0);
        expect(state.cone.x).toBe(TEST_X);
        expect(state.cone.y).toBe(TEST_Y);
        expect(state.player.x).toBe(TEST_X);
        expect(state.player.y).toBe(TEST_Y);
    });

    test('text shape appears same at 180° as at 0° (not upside down)', async ({ page }) => {
        await goto(page);

        // Add a text shape at test position with rotation 0
        const textId = await page.evaluate(({ x, y }) => {
            const textShape = {
                id: 'test-text',
                type: 'text',
                x: x,
                y: y,
                width: 144,
                height: 72,
                color: '#000000',
                text: 'Test',
                fontSize: 48,
                rotation: 0,
                visible: true
            };
            AppState.shapes.push(textShape);
            Shapes.render();
            return textShape.id;
        }, { x: TEST_X, y: TEST_Y });

        // Get CSS rotation at 0° board rotation
        let cssRotation = await page.evaluate((id) => {
            const textSvg = document.getElementById(id);
            const transformMatch = textSvg.style.transform.match(/rotate\(([-\d.]+)deg\)/);
            let rotation = transformMatch ? parseFloat(transformMatch[1]) : 0;
            rotation = ((rotation % 360) + 360) % 360;
            return rotation;
        }, textId);
        console.log('Text CSS rotation at board 0°:', cssRotation);
        expect(cssRotation).toBe(0);

        // Rotate board to 180°
        await rightClickBoard(page);
        let menu = await getBoardCanvasMenu(page);
        await menu.locator('[data-action="rotate-right"]').click();
        await page.waitForTimeout(200);

        await rightClickBoard(page);
        menu = await getBoardCanvasMenu(page);
        await menu.locator('[data-action="rotate-right"]').click();
        await page.waitForTimeout(200);

        // Verify board is at 180°
        let boardRotation = await page.evaluate(() => AppState.boardRotation);
        expect(boardRotation).toBe(180);

        // Get CSS rotation at 180° board rotation
        // Text should have 180° CSS rotation to counter the board rotation and appear upright
        cssRotation = await page.evaluate((id) => {
            const textSvg = document.getElementById(id);
            const transformMatch = textSvg.style.transform.match(/rotate\(([-\d.]+)deg\)/);
            let rotation = transformMatch ? parseFloat(transformMatch[1]) : 0;
            rotation = ((rotation % 360) + 360) % 360;
            return rotation;
        }, textId);
        console.log('Text CSS rotation at board 180°:', cssRotation);
        // Text should be rotated 180° to counter the board layer rotation (also 180°)
        // Total rotation: 180° (layer) + 180° (element) = 360° = 0° (appears upright, same as at 0°)
        expect(cssRotation).toBe(180);

        // Verify text coordinates and rotation property haven't changed incorrectly
        let state = await page.evaluate((id) => {
            const shape = AppState.shapes.find(s => s.id === id);
            return {
                x: shape.x,
                y: shape.y,
                rotation: shape.rotation
            };
        }, textId);
        expect(state.x).toBe(TEST_X);
        expect(state.y).toBe(TEST_Y);
        expect(state.rotation).toBe(0); // Shape rotation property maintains user-set value, counter-rotation applied in rendering
    });
});
