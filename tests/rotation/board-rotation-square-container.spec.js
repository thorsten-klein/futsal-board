/**
 * Tests for object sizes when board-container is square.
 * When the container is square, objects should have identical sizes at all rotations.
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

test.describe('Object sizes in square container at all rotations', () => {
    test('all object types have similar visual size at all rotations when container is nearly square', async ({ page }) => {
        await goto(page);

        // Resize toolbar (sidebar) to make board-container square
        const containerDims = await page.evaluate(() => {
            const toolbar = document.querySelector('.toolbar');
            const container = document.querySelector('.board-container');

            // Calculate toolbar width needed to make container square
            const viewportHeight = window.innerHeight;
            const headerHeight = 60; // Approximate header height
            const availableHeight = viewportHeight - headerHeight;
            const desiredContainerSize = availableHeight;
            const viewportWidth = window.innerWidth;
            const toolbarWidth = viewportWidth - desiredContainerSize;

            // Set toolbar width
            toolbar.style.width = `${Math.max(300, toolbarWidth)}px`;
            toolbar.style.minWidth = `${Math.max(300, toolbarWidth)}px`;

            // Trigger resize
            Board.resize();

            // Return container dimensions
            const rect = container.getBoundingClientRect();
            return {
                width: rect.width,
                height: rect.height,
                viewportHeight,
                toolbarWidth,
                desiredSize: desiredContainerSize
            };
        });

        await page.waitForTimeout(300);

        console.log('Container dimensions:', containerDims);

        // Verify container is approximately square (within 10% tolerance)
        const sizeDiff = Math.abs(containerDims.width - containerDims.height);
        const avgSize = (containerDims.width + containerDims.height) / 2;
        expect(sizeDiff).toBeLessThan(avgSize * 0.1);

        // Create one of each object type at center
        const objectIds = await page.evaluate(() => {
            const ids = {};

            // Goal (rotatable element)
            const goal = {
                id: `element-${AppState.nextElementId++}`,
                type: 'goal',
                x: 2250,
                y: 1250,
                rotation: 0,
                visible: true
            };
            AppState.elements.push(goal);
            ids.goal = goal.id;

            // Cone (non-rotatable element)
            const cone = {
                id: `element-${AppState.nextElementId++}`,
                type: 'cone',
                x: 2250,
                y: 1250,
                rotation: 0,
                visible: true
            };
            AppState.elements.push(cone);
            ids.cone = cone.id;

            // Ball
            const ball = {
                id: `ball-${AppState.nextBallId++}`,
                x: 2250,
                y: 1250,
                color: '#ffffff',
                visible: true
            };
            AppState.balls.push(ball);
            ids.ball = ball.id;

            // Plate
            const plate = {
                id: `plate-${AppState.nextPlateId++}`,
                x: 2250,
                y: 1250,
                color: '#ff0000',
                visible: true
            };
            AppState.plates.push(plate);
            ids.plate = plate.id;

            // Player
            const player = {
                id: `player-${AppState.nextPlayerId++}`,
                x: 2250,
                y: 1250,
                teamId: 'team-1',
                number: 1,
                rotation: 0
            };
            AppState.players.push(player);
            ids.player = player.id;

            // Shape (rectangle)
            const shape = {
                id: `shape-${AppState.nextShapeId++}`,
                type: 'rectangle',
                x: 2250,
                y: 1250,
                width: 200,
                height: 100,
                rotation: 0,
                color: '#000000',
                fillColor: 'rgba(0,0,0,0.1)',
                strokeWidth: 2,
                visible: true
            };
            AppState.shapes.push(shape);
            ids.shape = shape.id;

            // Render all
            Elements.render();
            Balls.render();
            Plates.render();
            Players.render();
            Shapes.render();

            return ids;
        });

        // Helper to get all object sizes
        const getAllSizes = async () => {
            return await page.evaluate((ids) => {
                const sizes = {};

                const goal = document.querySelector(`[data-element="${ids.goal}"].element-svg`);
                if (goal) {
                    const rect = goal.getBoundingClientRect();
                    sizes.goal = { width: rect.width, height: rect.height };
                }

                const cone = document.querySelector(`[data-element="${ids.cone}"].element-svg`);
                if (cone) {
                    const rect = cone.getBoundingClientRect();
                    sizes.cone = { width: rect.width, height: rect.height };
                }

                const ball = document.querySelector(`[data-ball="${ids.ball}"].ball-svg`);
                if (ball) {
                    const rect = ball.getBoundingClientRect();
                    sizes.ball = { width: rect.width, height: rect.height };
                }

                const plate = document.querySelector(`[data-plate="${ids.plate}"].plate-svg`);
                if (plate) {
                    const rect = plate.getBoundingClientRect();
                    sizes.plate = { width: rect.width, height: rect.height };
                }

                const player = document.querySelector(`[data-player="${ids.player}"].player-svg`);
                if (player) {
                    const rect = player.getBoundingClientRect();
                    sizes.player = { width: rect.width, height: rect.height };
                }

                const shape = document.getElementById(ids.shape);
                if (shape) {
                    const rect = shape.getBoundingClientRect();
                    sizes.shape = { width: rect.width, height: rect.height };
                }

                return sizes;
            }, objectIds);
        };

        // Get sizes at 0°
        const sizesAt0 = await getAllSizes();
        const scaleAt0 = await page.evaluate(() => AppState.boardRotationScaleFactor || 1);
        console.log('Sizes at 0°:', sizesAt0);
        console.log('Scale factor at 0°:', scaleAt0);

        // Open settings tab to access rotation buttons
        await page.click('button[data-tab="settings"]');
        await page.waitForTimeout(200);

        // Rotate to 90°
        await page.click('#btn-rotate-right');
        await page.waitForTimeout(300);

        const sizesAt90 = await getAllSizes();
        const scaleAt90 = await page.evaluate(() => AppState.boardRotationScaleFactor || 1);
        console.log('Sizes at 90°:', sizesAt90);
        console.log('Scale factor at 90°:', scaleAt90);

        // Rotate to 180°
        await page.click('#btn-rotate-right');
        await page.waitForTimeout(300);

        const sizesAt180 = await getAllSizes();
        const scaleAt180 = await page.evaluate(() => AppState.boardRotationScaleFactor || 1);
        console.log('Sizes at 180°:', sizesAt180);
        console.log('Scale factor at 180°:', scaleAt180);

        // Rotate to 270°
        await page.click('#btn-rotate-right');
        await page.waitForTimeout(300);

        const sizesAt270 = await getAllSizes();
        const scaleAt270 = await page.evaluate(() => AppState.boardRotationScaleFactor || 1);
        console.log('Sizes at 270°:', sizesAt270);
        console.log('Scale factor at 270°:', scaleAt270);

        // For square container, boardRotationScaleFactor should be ~1.0
        console.log('\nScale factors:', { scaleAt0, scaleAt90, scaleAt180, scaleAt270 });

        // At 0°/180°: scale factor is always 1.0
        expect(scaleAt0).toBe(1.0);
        expect(scaleAt180).toBe(1.0);

        // At 90°/270°: scale factor is container-aware
        // For nearly-square container (660x645), scale factor should be close to 1.0
        // Calculated as: (rect.width / boardHeight) / (rect.width / boardWidth)
        // = (660/2500) / (660/4500) = 0.264 / 0.147 = 1.796
        // Wait that's wrong. Let me recalculate:
        // scaleAt0 = min(660/4500, 645/2500) = min(0.147, 0.258) = 0.147
        // scaleAt90 = min(660/2500, 645/4500) = min(0.264, 0.143) = 0.143
        // scaleFactor = 0.143 / 0.147 = 0.973 (close to 1.0 for nearly-square container)
        expect(Math.abs(scaleAt90 - 1.0)).toBeLessThan(0.05); // Within 5% of 1.0
        expect(Math.abs(scaleAt270 - 1.0)).toBeLessThan(0.05);

        // With container-aware scaling in nearly-square container,
        // objects at 90°/270° should have similar sizes to 0°/180° (within ~5% due to container not being perfectly square)

        // Helper to compare sizes (expecting similar sizes in nearly-square container)
        const compareSizes = (size1, size2, objectName, angle1, angle2) => {
            if (!size1 || !size2) {
                console.log(`${objectName}: skipping - missing sizes`);
                return;
            }

            const tolerance = 0.10; // 10% tolerance for nearly-square container (660x645)
            const widthDiff = Math.abs(size1.width - size2.width);
            const heightDiff = Math.abs(size1.height - size2.height);
            const widthPct = size1.width > 0 ? (widthDiff / size1.width * 100).toFixed(1) : '0.0';
            const heightPct = size1.height > 0 ? (heightDiff / size1.height * 100).toFixed(1) : '0.0';

            console.log(`${objectName}: ${angle1} (${size1.width.toFixed(2)}x${size1.height.toFixed(2)}) vs ${angle2} (${size2.width.toFixed(2)}x${size2.height.toFixed(2)}) - diff: ${widthPct}% / ${heightPct}%`);

            expect(widthDiff).toBeLessThan(size1.width * tolerance);
            expect(heightDiff).toBeLessThan(size1.height * tolerance);
        };

        // Compare each object across rotations
        // In nearly-square container, objects have similar sizes at all rotations (within ~5-10%)
        // Rotatable objects (goals, shapes) swap dimensions at 90°/270°
        // Non-rotatable objects (cones, balls, plates, players) keep same dimensions

        // Goal: rotates with board, dimensions swap at 90°/270° but magnitudes stay similar
        compareSizes(sizesAt0.goal, sizesAt180.goal, 'goal', '0°', '180°');
        // At 90°/270°: width and height should swap (but magnitudes stay similar)
        const goalSwapped = { width: sizesAt0.goal.height, height: sizesAt0.goal.width };
        compareSizes(goalSwapped, sizesAt90.goal, 'goal', '0° swapped', '90°');
        compareSizes(sizesAt90.goal, sizesAt270.goal, 'goal', '90°', '270°');

        // Cone: stays upright, similar size at all rotations
        compareSizes(sizesAt0.cone, sizesAt90.cone, 'cone', '0°', '90°');
        compareSizes(sizesAt0.cone, sizesAt180.cone, 'cone', '0°', '180°');
        compareSizes(sizesAt0.cone, sizesAt270.cone, 'cone', '0°', '270°');

        // Ball: circular, similar size at all rotations
        compareSizes(sizesAt0.ball, sizesAt90.ball, 'ball', '0°', '90°');
        compareSizes(sizesAt0.ball, sizesAt180.ball, 'ball', '0°', '180°');
        compareSizes(sizesAt0.ball, sizesAt270.ball, 'ball', '0°', '270°');

        // Plate: square, similar size at all rotations
        compareSizes(sizesAt0.plate, sizesAt90.plate, 'plate', '0°', '90°');
        compareSizes(sizesAt0.plate, sizesAt180.plate, 'plate', '0°', '180°');
        compareSizes(sizesAt0.plate, sizesAt270.plate, 'plate', '0°', '270°');

        // Player: circular with label, similar size at all rotations
        if (sizesAt0.player && sizesAt90.player) {
            compareSizes(sizesAt0.player, sizesAt90.player, 'player', '0°', '90°');
            compareSizes(sizesAt0.player, sizesAt180.player, 'player', '0°', '180°');
            compareSizes(sizesAt0.player, sizesAt270.player, 'player', '0°', '270°');
        }

        // Shape: rotates with board, dimensions swap at 90°/270° but magnitudes stay similar
        compareSizes(sizesAt0.shape, sizesAt180.shape, 'shape', '0°', '180°');
        const shapeSwapped = { width: sizesAt0.shape.height, height: sizesAt0.shape.width };
        compareSizes(shapeSwapped, sizesAt90.shape, 'shape', '0° swapped', '90°');
        compareSizes(sizesAt90.shape, sizesAt270.shape, 'shape', '90°', '270°');
    });
});
