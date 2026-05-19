/**
 * Tests to ensure elements scale proportionally with the board during rotation.
 *
 * Critical behavior: When the board layer is scaled (e.g., 0.556x at 90° rotation),
 * all elements should scale by the same factor to maintain their size relative to the board.
 * This ensures objects don't appear larger/smaller than they should relative to the board.
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

test.describe('Proportional scaling during board rotation', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
    });

    test('goals scale proportionally with board layer scale factor', async ({ page }) => {
        // Create goal at center
        const goalId = await page.evaluate(() => {
            const goal = {
                id: `element-${AppState.nextElementId++}`,
                type: 'goal',
                x: 2250,
                y: 1250,
                rotation: 0,
                visible: true
            };
            AppState.elements.push(goal);
            Elements.render();
            return goal.id;
        });

        // Measure at 0° rotation
        const at0deg = await page.evaluate((id) => {
            const svg = document.querySelector(`[data-element="${id}"].element-svg`);
            const goalRect = svg.getBoundingClientRect();

            return {
                goalWidth: goalRect.width,
                goalHeight: goalRect.height,
                boardRotationScaleFactor: AppState.boardRotationScaleFactor || 1
            };
        }, goalId);

        console.log('At 0°: goal', at0deg.goalWidth, 'x', at0deg.goalHeight);
        console.log('At 0°: board scale factor', at0deg.boardRotationScaleFactor);

        // Rotate board 90°
        await rightClickBoard(page);
        const menu = await getBoardCanvasMenu(page);
        await menu.locator('[data-action="rotate-right"]').click();
        await page.waitForTimeout(200);

        // Measure at 90° rotation
        const at90deg = await page.evaluate((id) => {
            const svg = document.querySelector(`[data-element="${id}"].element-svg`);
            const goalRect = svg.getBoundingClientRect();

            return {
                goalWidth: goalRect.width,
                goalHeight: goalRect.height,
                boardRotationScaleFactor: AppState.boardRotationScaleFactor || 1
            };
        }, goalId);

        console.log('At 90°: goal', at90deg.goalWidth, 'x', at90deg.goalHeight);
        console.log('At 90°: board scale factor', at90deg.boardRotationScaleFactor);

        // Critical check: goal size should scale by the same factor as the board layer
        // At 0°: scale factor = 1, goal = 22x67
        // At 90°: scale factor = ~0.556, goal dimensions swap and scale
        // Expected: (22 * 0.556) x (67 * 0.556) ≈ 12 x 37 (but swapped due to rotation)
        // So at 90°: width ≈ 67 * 0.556 = 37, height ≈ 22 * 0.556 = 12
        const expectedWidth = at0deg.goalHeight * at90deg.boardRotationScaleFactor;
        const expectedHeight = at0deg.goalWidth * at90deg.boardRotationScaleFactor;

        expect(Math.abs(at90deg.goalWidth - expectedWidth)).toBeLessThan(expectedWidth * 0.1);
        expect(Math.abs(at90deg.goalHeight - expectedHeight)).toBeLessThan(expectedHeight * 0.1);
    });

    test('balls scale proportionally with board layer scale factor', async ({ page }) => {
        // Create ball at center
        const result = await page.evaluate(() => {
            const ball = {
                id: `ball-${AppState.nextBallId++}`,
                x: 2250,
                y: 1250,
                color: '#ffffff',
                visible: true  // Add visible property
            };
            AppState.balls.push(ball);
            Balls.render();

            // Debug: check if ball was rendered
            const ballSvgs = document.querySelectorAll('.ball-svg');
            const ballIds = Array.from(ballSvgs).map(svg => svg.id);
            const ballsLayer = document.getElementById('balls-layer');

            return {
                ballId: ball.id,
                ballsInState: AppState.balls.length,
                ballSvgsInDOM: ballSvgs.length,
                ballIds: ballIds,
                layerExists: !!ballsLayer,
                layerChildCount: ballsLayer ? ballsLayer.children.length : 0
            };
        });

        console.log('Ball creation result:', result);
        const ballId = result.ballId;

        // Small wait for render
        await page.waitForTimeout(100);

        // Measure at 0° rotation
        const at0deg = await page.evaluate((id) => {
            const svg = document.getElementById(id);
            if (!svg) {
                const allBalls = Array.from(document.querySelectorAll('.ball-svg')).map(el => el.id);
                throw new Error(`Ball SVG not found: ${id}. Available: ${allBalls.join(', ')}`);
            }
            const ballRect = svg.getBoundingClientRect();

            return {
                ballWidth: ballRect.width,
                boardRotationScaleFactor: AppState.boardRotationScaleFactor || 1
            };
        }, ballId);

        console.log('Ball at 0°: size', at0deg.ballWidth, 'scale factor', at0deg.boardRotationScaleFactor);

        // Rotate board 90°
        await rightClickBoard(page);
        const menu = await getBoardCanvasMenu(page);
        await menu.locator('[data-action="rotate-right"]').click();
        await page.waitForTimeout(200);

        // Measure at 90° rotation
        const at90deg = await page.evaluate((id) => {
            const svg = document.getElementById(id);
            if (!svg) throw new Error(`Ball SVG not found: ${id}`);
            const ballRect = svg.getBoundingClientRect();

            return {
                ballWidth: ballRect.width,
                boardRotationScaleFactor: AppState.boardRotationScaleFactor || 1
            };
        }, ballId);

        console.log('Ball at 90°: size', at90deg.ballWidth, 'scale factor', at90deg.boardRotationScaleFactor);

        // Ball size should scale by the board layer scale factor
        // Balls are circular (non-rotatable), so dimensions don't swap
        const expectedWidth = at0deg.ballWidth * at90deg.boardRotationScaleFactor;
        expect(Math.abs(at90deg.ballWidth - expectedWidth)).toBeLessThan(expectedWidth * 0.1);
    });

    test('plates scale proportionally with board layer scale factor', async ({ page }) => {
        // Create plate at center
        const plateId = await page.evaluate(() => {
            const plate = {
                id: `plate-${AppState.nextPlateId++}`,
                x: 2250,
                y: 1250,
                color: '#ff0000',
                visible: true  // Add visible property
            };
            AppState.plates.push(plate);
            Plates.render();
            return plate.id;
        });

        // Measure at 0° rotation
        const at0deg = await page.evaluate((id) => {
            const svg = document.getElementById(id);
            if (!svg) throw new Error(`Plate SVG not found: ${id}`);
            const plateRect = svg.getBoundingClientRect();

            return {
                plateWidth: plateRect.width,
                boardRotationScaleFactor: AppState.boardRotationScaleFactor || 1
            };
        }, plateId);

        console.log('Plate at 0°: size', at0deg.plateWidth, 'scale factor', at0deg.boardRotationScaleFactor);

        // Rotate board 90°
        await rightClickBoard(page);
        const menu = await getBoardCanvasMenu(page);
        await menu.locator('[data-action="rotate-right"]').click();
        await page.waitForTimeout(200);

        // Measure at 90° rotation
        const at90deg = await page.evaluate((id) => {
            const svg = document.getElementById(id);
            if (!svg) throw new Error(`Plate SVG not found: ${id}`);
            const plateRect = svg.getBoundingClientRect();

            return {
                plateWidth: plateRect.width,
                boardRotationScaleFactor: AppState.boardRotationScaleFactor || 1
            };
        }, plateId);

        console.log('Plate at 90°: size', at90deg.plateWidth, 'scale factor', at90deg.boardRotationScaleFactor);

        // Plate size should scale by the board layer scale factor
        // Plates are circular (non-rotatable), so dimensions don't swap
        const expectedWidth = at0deg.plateWidth * at90deg.boardRotationScaleFactor;
        expect(Math.abs(at90deg.plateWidth - expectedWidth)).toBeLessThan(expectedWidth * 0.1);
    });

    test('non-rotatable elements scale proportionally with board layer', async ({ page }) => {
        // Create cone (non-rotatable element)
        const coneId = await page.evaluate(() => {
            const cone = {
                id: `element-${AppState.nextElementId++}`,
                type: 'cone',
                x: 2250,
                y: 1250,
                visible: true
            };
            AppState.elements.push(cone);
            Elements.render();
            return cone.id;
        });

        // Measure at 0° rotation
        const at0deg = await page.evaluate((id) => {
            const svg = document.querySelector(`[data-element="${id}"].element-svg`);
            const coneRect = svg.getBoundingClientRect();

            return {
                coneWidth: coneRect.width,
                coneHeight: coneRect.height,
                boardRotationScaleFactor: AppState.boardRotationScaleFactor || 1
            };
        }, coneId);

        console.log('Cone at 0°: size', at0deg.coneWidth, 'x', at0deg.coneHeight, 'scale factor', at0deg.boardRotationScaleFactor);

        // Rotate board 90°
        await rightClickBoard(page);
        const menu = await getBoardCanvasMenu(page);
        await menu.locator('[data-action="rotate-right"]').click();
        await page.waitForTimeout(200);

        // Measure at 90° rotation
        const at90deg = await page.evaluate((id) => {
            const svg = document.querySelector(`[data-element="${id}"].element-svg`);
            const coneRect = svg.getBoundingClientRect();

            return {
                coneWidth: coneRect.width,
                coneHeight: coneRect.height,
                boardRotationScaleFactor: AppState.boardRotationScaleFactor || 1
            };
        }, coneId);

        console.log('Cone at 90°: size', at90deg.coneWidth, 'x', at90deg.coneHeight, 'scale factor', at90deg.boardRotationScaleFactor);

        // Non-rotatable elements stay upright, so dimensions don't swap
        // They should scale by the board layer scale factor
        const expectedWidth = at0deg.coneWidth * at90deg.boardRotationScaleFactor;
        const expectedHeight = at0deg.coneHeight * at90deg.boardRotationScaleFactor;

        expect(Math.abs(at90deg.coneWidth - expectedWidth)).toBeLessThan(expectedWidth * 0.1);
        expect(Math.abs(at90deg.coneHeight - expectedHeight)).toBeLessThan(expectedHeight * 0.1);
    });

    test('players scale proportionally with board layer scale factor', async ({ page }) => {
        // Create player at center
        const playerId = await page.evaluate(() => {
            const player = {
                id: `player-${AppState.nextPlayerId++}`,
                x: 2250,
                y: 1250,
                teamId: 'team-1',
                number: 7,
                rotation: 0,
                visible: true
            };
            AppState.players.push(player);
            Players.render();
            return player.id;
        });

        // Measure at 0° rotation
        const at0deg = await page.evaluate((id) => {
            const playerDiv = document.querySelector(`[data-player-id="${id}"]`);
            if (!playerDiv) throw new Error(`Player not found: ${id}`);
            const playerRect = playerDiv.getBoundingClientRect();

            return {
                playerWidth: playerRect.width,
                playerHeight: playerRect.height,
                boardRotationScaleFactor: AppState.boardRotationScaleFactor || 1
            };
        }, playerId);

        console.log('Player at 0°: size', at0deg.playerWidth, 'x', at0deg.playerHeight, 'scale factor', at0deg.boardRotationScaleFactor);

        // Rotate board 90°
        await rightClickBoard(page);
        const menu = await getBoardCanvasMenu(page);
        await menu.locator('[data-action="rotate-right"]').click();
        await page.waitForTimeout(200);

        // Measure at 90° rotation
        const at90deg = await page.evaluate((id) => {
            const playerDiv = document.querySelector(`[data-player-id="${id}"]`);
            if (!playerDiv) throw new Error(`Player not found: ${id}`);
            const playerRect = playerDiv.getBoundingClientRect();

            return {
                playerWidth: playerRect.width,
                playerHeight: playerRect.height,
                boardRotationScaleFactor: AppState.boardRotationScaleFactor || 1
            };
        }, playerId);

        console.log('Player at 90°: size', at90deg.playerWidth, 'x', at90deg.playerHeight, 'scale factor', at90deg.boardRotationScaleFactor);

        // Players are square and don't rotate, so dimensions don't swap
        // They should scale by the board layer scale factor
        const expectedWidth = at0deg.playerWidth * at90deg.boardRotationScaleFactor;
        const expectedHeight = at0deg.playerHeight * at90deg.boardRotationScaleFactor;

        expect(Math.abs(at90deg.playerWidth - expectedWidth)).toBeLessThan(expectedWidth * 0.1);
        expect(Math.abs(at90deg.playerHeight - expectedHeight)).toBeLessThan(expectedHeight * 0.1);
    });

    test('multiple element types all scale by same board layer factor', async ({ page }) => {
        // Create multiple element types
        const ids = await page.evaluate(() => {
            const goal = {
                id: `element-${AppState.nextElementId++}`,
                type: 'goal',
                x: 1000,
                y: 1250,
                rotation: 0,
                visible: true
            };
            const cone = {
                id: `element-${AppState.nextElementId++}`,
                type: 'cone',
                x: 2250,
                y: 1250,
                visible: true
            };
            const ball = {
                id: `ball-${AppState.nextBallId++}`,
                x: 3500,
                y: 1250,
                color: '#ffffff',
                visible: true
            };

            AppState.elements.push(goal);
            AppState.elements.push(cone);
            AppState.balls.push(ball);
            Elements.render();
            Balls.render();

            return {
                goalId: goal.id,
                coneId: cone.id,
                ballId: ball.id
            };
        });

        // Measure all at 0°
        const at0deg = await page.evaluate((ids) => {
            const goalSvg = document.querySelector(`[data-element="${ids.goalId}"].element-svg`);
            const coneSvg = document.querySelector(`[data-element="${ids.coneId}"].element-svg`);
            const ballSvg = document.getElementById(ids.ballId);

            const goalRect = goalSvg.getBoundingClientRect();
            const coneRect = coneSvg.getBoundingClientRect();
            const ballRect = ballSvg.getBoundingClientRect();

            return {
                goalWidth: goalRect.width,
                goalHeight: goalRect.height,
                coneWidth: coneRect.width,
                ballWidth: ballRect.width,
                boardRotationScaleFactor: AppState.boardRotationScaleFactor || 1
            };
        }, ids);

        console.log('Sizes at 0°:', at0deg);

        // Rotate board 90°
        await rightClickBoard(page);
        const menu = await getBoardCanvasMenu(page);
        await menu.locator('[data-action="rotate-right"]').click();
        await page.waitForTimeout(200);

        // Measure all at 90°
        const at90deg = await page.evaluate((ids) => {
            const goalSvg = document.querySelector(`[data-element="${ids.goalId}"].element-svg`);
            const coneSvg = document.querySelector(`[data-element="${ids.coneId}"].element-svg`);
            const ballSvg = document.getElementById(ids.ballId);

            const goalRect = goalSvg.getBoundingClientRect();
            const coneRect = coneSvg.getBoundingClientRect();
            const ballRect = ballSvg.getBoundingClientRect();

            return {
                goalWidth: goalRect.width,
                goalHeight: goalRect.height,
                coneWidth: coneRect.width,
                ballWidth: ballRect.width,
                boardRotationScaleFactor: AppState.boardRotationScaleFactor || 1
            };
        }, ids);

        console.log('Sizes at 90°:', at90deg);

        // All elements should scale by the board layer scale factor
        // Goal: rotates, so dimensions swap and scale
        const expectedGoalWidth = at0deg.goalHeight * at90deg.boardRotationScaleFactor;
        const expectedGoalHeight = at0deg.goalWidth * at90deg.boardRotationScaleFactor;
        // Cone and ball: non-rotatable, dimensions don't swap, just scale
        const expectedConeWidth = at0deg.coneWidth * at90deg.boardRotationScaleFactor;
        const expectedBallWidth = at0deg.ballWidth * at90deg.boardRotationScaleFactor;

        expect(Math.abs(at90deg.goalWidth - expectedGoalWidth)).toBeLessThan(expectedGoalWidth * 0.1);
        expect(Math.abs(at90deg.goalHeight - expectedGoalHeight)).toBeLessThan(expectedGoalHeight * 0.1);
        expect(Math.abs(at90deg.coneWidth - expectedConeWidth)).toBeLessThan(expectedConeWidth * 0.1);
        expect(Math.abs(at90deg.ballWidth - expectedBallWidth)).toBeLessThan(expectedBallWidth * 0.1);
    });
});
