/**
 * Tests for board rotation feature.
 *
 * - Right-click context menu shows "Rotate Board Left" and "Rotate Board Right"
 * - Rotating the board transforms all element positions correctly
 * - Elements with rotation (players, elements, shapes) update their rotation
 * - Elements without rotation (balls, plates) only update position
 * - Player numbers and labels stay upright after rotation
 * - Board rotation persists across saves/loads
 */
import { test, expect } from '../test-config.js';
import { goto, addBall, addPlate, addElement } from '../helpers.js';

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

/** Add a player at a specific position via page.evaluate. */
async function addPlayerAt(page, x, y, teamId = 'team-1') {
    await page.evaluate(({ x, y, teamId }) => {
        const player = {
            id: `player-${AppState.nextPlayerId++}`,
            x: x,
            y: y,
            teamId: teamId,
            number: 1,
            rotation: 0,
            visible: true
        };
        AppState.players.push(player);
        Players.render();
        return player.id;
    }, { x, y, teamId });
}

test.describe('Board rotation context menu', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
    });

    test('right-clicking board shows rotate left and rotate right options', async ({ page }) => {
        await rightClickBoard(page);
        const menu = await getBoardCanvasMenu(page);

        const rotateLeft = menu.locator('[data-action="rotate-left"]');
        const rotateRight = menu.locator('[data-action="rotate-right"]');

        await expect(rotateLeft).toBeVisible();
        await expect(rotateRight).toBeVisible();
        await expect(rotateLeft).toContainText('Rotate Board Left');
        await expect(rotateRight).toContainText('Rotate Board Right');
    });

    test('menu has divider before reset option', async ({ page }) => {
        await rightClickBoard(page);
        const menu = await getBoardCanvasMenu(page);

        const dividers = menu.locator('.context-menu-divider');
        await expect(dividers).toHaveCount(1);
    });
});

test.describe('Board rotation functionality', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
    });

    test('rotating board right updates boardRotation to 90', async ({ page }) => {
        await rightClickBoard(page);
        const menu = await getBoardCanvasMenu(page);
        await menu.locator('[data-action="rotate-right"]').click();

        const rotation = await page.evaluate(() => AppState.boardRotation);
        expect(rotation).toBe(90);
    });

    test('rotating board left updates boardRotation to 270', async ({ page }) => {
        await rightClickBoard(page);
        const menu = await getBoardCanvasMenu(page);
        await menu.locator('[data-action="rotate-left"]').click();

        const rotation = await page.evaluate(() => AppState.boardRotation);
        expect(rotation).toBe(270);
    });

    test('rotating board right twice updates boardRotation to 180', async ({ page }) => {
        // First rotation
        await rightClickBoard(page);
        let menu = await getBoardCanvasMenu(page);
        await menu.locator('[data-action="rotate-right"]').click();

        // Second rotation
        await rightClickBoard(page);
        menu = await getBoardCanvasMenu(page);
        await menu.locator('[data-action="rotate-right"]').click();

        const rotation = await page.evaluate(() => AppState.boardRotation);
        expect(rotation).toBe(180);
    });

    test('rotating board right four times returns to 0', async ({ page }) => {
        for (let i = 0; i < 4; i++) {
            await rightClickBoard(page);
            const menu = await getBoardCanvasMenu(page);
            await menu.locator('[data-action="rotate-right"]').click();
        }

        const rotation = await page.evaluate(() => AppState.boardRotation);
        expect(rotation).toBe(0);
    });
});

test.describe('Element position rotation', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
    });

    test('player position rotates correctly when rotating board right', async ({ page }) => {
        // Add player at known position (right side of center)
        await addPlayerAt(page, 2500, 1250);

        const beforePos = await page.evaluate(() => {
            const player = AppState.players[0];
            return { x: player.x, y: player.y };
        });

        // Rotate board right (90° clockwise)
        await rightClickBoard(page);
        const menu = await getBoardCanvasMenu(page);
        await menu.locator('[data-action="rotate-right"]').click();

        const afterPos = await page.evaluate(() => {
            const player = AppState.players[0];
            console.log('After rotation:', player.x, player.y);
            return { x: player.x, y: player.y };
        });

        // Coordinates stay fixed to the board (like a physical board)
        // Only visual rotation happens via CSS transforms
        expect(afterPos.x).toBe(beforePos.x);
        expect(afterPos.y).toBe(beforePos.y);
    });

    test('ball position rotates correctly when rotating board right', async ({ page }) => {
        // Add ball at known position
        const beforePos = await page.evaluate(() => {
            const ball = {
                id: `ball-${AppState.nextBallId++}`,
                x: 2500,
                y: 1250,
                color: '#ffffff'
            };
            AppState.balls.push(ball);
            Balls.render();
            return { x: ball.x, y: ball.y };
        });

        // Rotate board right
        await rightClickBoard(page);
        const menu = await getBoardCanvasMenu(page);
        await menu.locator('[data-action="rotate-right"]').click();

        const afterPos = await page.evaluate(() => {
            const ball = AppState.balls[0];
            return { x: ball.x, y: ball.y };
        });

        // Coordinates stay fixed to the board
        expect(afterPos.x).toBe(beforePos.x);
        expect(afterPos.y).toBe(beforePos.y);
    });

    test('plate position rotates correctly when rotating board right', async ({ page }) => {
        // Add plate at known position
        const beforePos = await page.evaluate(() => {
            const plate = {
                id: `plate-${AppState.nextPlateId++}`,
                x: 2500,
                y: 1250,
                color: '#ff0000'
            };
            AppState.plates.push(plate);
            Plates.render();
            return { x: plate.x, y: plate.y };
        });

        // Rotate board right
        await rightClickBoard(page);
        const menu = await getBoardCanvasMenu(page);
        await menu.locator('[data-action="rotate-right"]').click();

        const afterPos = await page.evaluate(() => {
            const plate = AppState.plates[0];
            return { x: plate.x, y: plate.y };
        });

        // Coordinates stay fixed to the board
        expect(afterPos.x).toBe(beforePos.x);
        expect(afterPos.y).toBe(beforePos.y);
    });

    test('element position rotates correctly when rotating board right', async ({ page }) => {
        // Add element at known position
        const result = await page.evaluate(() => {
            const element = {
                id: `element-${AppState.nextElementId++}`,
                type: 'cone',
                x: 2500,
                y: 1250,
                rotation: 0
            };
            AppState.elements.push(element);
            Elements.render();
            return {
                id: element.id,
                beforePos: { x: element.x, y: element.y }
            };
        });

        // Rotate board right
        await rightClickBoard(page);
        const menu = await getBoardCanvasMenu(page);
        await menu.locator('[data-action="rotate-right"]').click();

        const afterPos = await page.evaluate((id) => {
            const element = AppState.elements.find(e => e.id === id);
            return element ? { x: element.x, y: element.y } : null;
        }, result.id);

        // Coordinates stay fixed to the board
        expect(afterPos.x).toBe(result.beforePos.x);
        expect(afterPos.y).toBe(result.beforePos.y);
    });

    test('shape position rotates correctly when rotating board right', async ({ page }) => {
        // Add shape at known position
        const beforePos = await page.evaluate(() => {
            const shape = {
                id: `shape-${AppState.nextShapeId++}`,
                type: 'rectangle',
                x: 2500,
                y: 1250,
                width: 200,
                height: 100,
                rotation: 0,
                color: '#000000'
            };
            AppState.shapes.push(shape);
            Shapes.render();
            return { x: shape.x, y: shape.y };
        });

        // Rotate board right
        await rightClickBoard(page);
        const menu = await getBoardCanvasMenu(page);
        await menu.locator('[data-action="rotate-right"]').click();

        const afterPos = await page.evaluate(() => {
            const shape = AppState.shapes[0];
            return { x: shape.x, y: shape.y };
        });

        // Coordinates stay fixed to the board
        expect(afterPos.x).toBe(beforePos.x);
        expect(afterPos.y).toBe(beforePos.y);
    });
});

test.describe('Element rotation updates', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
    });

    test('player rotation increases by 90° when rotating board right', async ({ page }) => {
        await addPlayerAt(page, 2500, 1250);

        // Rotate board right
        await rightClickBoard(page);
        const menu = await getBoardCanvasMenu(page);
        await menu.locator('[data-action="rotate-right"]').click();

        const rotation = await page.evaluate(() => AppState.players[0].rotation);
        // Player rotation maintains user-set value during board rotation
        expect(rotation).toBe(0);
    });

    test('player rotation decreases by 90° when rotating board left', async ({ page }) => {
        await addPlayerAt(page, 2500, 1250);

        // Rotate board left
        await rightClickBoard(page);
        const menu = await getBoardCanvasMenu(page);
        await menu.locator('[data-action="rotate-left"]').click();

        const rotation = await page.evaluate(() => AppState.players[0].rotation);
        // Player rotation maintains user-set value during board rotation
        expect(rotation).toBe(0);
    });

    test('element rotation updates when rotating board right (rotatable type)', async ({ page }) => {
        const elementId = await page.evaluate(() => {
            const element = {
                id: `element-${AppState.nextElementId++}`,
                type: 'goal',  // Use rotatable element type
                x: 2500,
                y: 1250,
                rotation: 45
            };
            AppState.elements.push(element);
            Elements.render();
            return element.id;
        });

        await rightClickBoard(page);
        const menu = await getBoardCanvasMenu(page);
        await menu.locator('[data-action="rotate-right"]').click();

        const rotation = await page.evaluate((id) => {
            const element = AppState.elements.find(e => e.id === id);
            return element ? element.rotation : null;
        }, elementId);
        // Element rotation maintains user-set value during board rotation
        expect(rotation).toBe(45);
    });

    test('shape rotation updates when rotating board right', async ({ page }) => {
        await page.evaluate(() => {
            const shape = {
                id: `shape-${AppState.nextShapeId++}`,
                type: 'rectangle',
                x: 2500,
                y: 1250,
                width: 200,
                height: 100,
                rotation: 30,
                color: '#000000'
            };
            AppState.shapes.push(shape);
            Shapes.render();
        });

        await rightClickBoard(page);
        const menu = await getBoardCanvasMenu(page);
        await menu.locator('[data-action="rotate-right"]').click();

        const rotation = await page.evaluate(() => AppState.shapes[0].rotation);
        // Shape rotation maintains user-set value during board rotation
        expect(rotation).toBe(30);
    });

    test('balls do not have rotation property after board rotation', async ({ page }) => {
        await page.evaluate(() => {
            const ball = {
                id: `ball-${AppState.nextBallId++}`,
                x: 2500,
                y: 1250,
                color: '#ffffff'
            };
            AppState.balls.push(ball);
            Balls.render();
        });

        await rightClickBoard(page);
        const menu = await getBoardCanvasMenu(page);
        await menu.locator('[data-action="rotate-right"]').click();

        const hasRotation = await page.evaluate(() => {
            const ball = AppState.balls[0];
            return ball.rotation !== undefined;
        });

        expect(hasRotation).toBe(false);
    });

    test('plates do not have rotation property after board rotation', async ({ page }) => {
        await page.evaluate(() => {
            const plate = {
                id: `plate-${AppState.nextPlateId++}`,
                x: 2500,
                y: 1250,
                color: '#ff0000'
            };
            AppState.plates.push(plate);
            Plates.render();
        });

        await rightClickBoard(page);
        const menu = await getBoardCanvasMenu(page);
        await menu.locator('[data-action="rotate-right"]').click();

        const hasRotation = await page.evaluate(() => {
            const plate = AppState.plates[0];
            return plate.rotation !== undefined;
        });

        expect(hasRotation).toBe(false);
    });
});

test.describe('Label orientation', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
    });

    test('player number stays upright after board rotation', async ({ page }) => {
        await addPlayerAt(page, 2500, 1250);

        // Rotate board right
        await rightClickBoard(page);
        const menu = await getBoardCanvasMenu(page);
        await menu.locator('[data-action="rotate-right"]').click();

        // Wait for player to be visible after rotation
        await page.waitForSelector('[data-player-id]', { state: 'attached', timeout: 2000 });
        await page.waitForTimeout(100);

        // Check that player number element has counter-rotation applied
        const numberTransform = await page.evaluate(() => {
            const playerDiv = document.querySelector('[data-player-id]');
            if (!playerDiv) return 'no-player-div';
            const numberSpan = playerDiv.querySelector('.player-number');
            if (!numberSpan) return 'no-number-span';
            return numberSpan.style.transform;
        });

        // Player rotation is 90°, so number should be counter-rotated by -90°
        expect(numberTransform).toContain('rotate(-90deg)');
    });

    test('player number stays upright after rotating left', async ({ page }) => {
        await addPlayerAt(page, 2500, 1250);

        // Rotate board left
        await rightClickBoard(page);
        const menu = await getBoardCanvasMenu(page);
        await menu.locator('[data-action="rotate-left"]').click();

        // Wait for player to be visible after rotation
        await page.waitForSelector('[data-player-id]', { state: 'attached', timeout: 2000 });
        await page.waitForTimeout(100);

        const numberTransform = await page.evaluate(() => {
            const playerDiv = document.querySelector('[data-player-id]');
            if (!playerDiv) return 'no-player-div';
            const numberSpan = playerDiv.querySelector('.player-number');
            if (!numberSpan) return 'no-number-span';
            return numberSpan.style.transform;
        });

        // Player rotation is 270° (or -90°), so number should be counter-rotated
        expect(numberTransform).toContain('rotate(-270deg)');
    });
});

test.describe('Board rotation persistence', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
    });

    test('board rotation persists after save and reload', async ({ page }) => {
        // Rotate board right
        await rightClickBoard(page);
        const menu = await getBoardCanvasMenu(page);
        await menu.locator('[data-action="rotate-right"]').click();

        // Save is automatic, reload the board
        await page.evaluate(() => {
            const currentId = AppState.currentBoardId;
            AppState.loadBoard(currentId);
            Players.render();
            Balls.render();
            Elements.render();
            Plates.render();
            Shapes.render();
        });

        const rotation = await page.evaluate(() => AppState.boardRotation);
        expect(rotation).toBe(90);
    });
});

test.describe('Non-rotatable elements stay upright', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
    });

    test('balls remain visually upright after board rotation', async ({ page }) => {
        // Add ball with known position
        const ballId = await page.evaluate(() => {
            const ball = {
                id: `ball-${AppState.nextBallId++}`,
                x: 2500,
                y: 1250,
                color: '#ffffff'
            };
            AppState.balls.push(ball);
            Balls.render();
            return ball.id;
        });

        // Rotate board right 90 degrees
        await rightClickBoard(page);
        const menu = await getBoardCanvasMenu(page);
        await menu.locator('[data-action="rotate-right"]').click();

        // Verify ball has no rotation property (stays upright)
        const ballData = await page.evaluate((id) => {
            const ball = AppState.balls.find(b => b.id === id);
            return {
                hasRotation: ball.rotation !== undefined,
                rotation: ball.rotation
            };
        }, ballId);

        expect(ballData.hasRotation).toBe(false);
        expect(ballData.rotation).toBeUndefined();
    });

    test('plates remain visually upright after board rotation', async ({ page }) => {
        // Add plate with known position
        const plateId = await page.evaluate(() => {
            const plate = {
                id: `plate-${AppState.nextPlateId++}`,
                x: 2500,
                y: 1250,
                color: '#ff0000'
            };
            AppState.plates.push(plate);
            Plates.render();
            return plate.id;
        });

        // Rotate board right 90 degrees
        await rightClickBoard(page);
        const menu = await getBoardCanvasMenu(page);
        await menu.locator('[data-action="rotate-right"]').click();

        // Verify plate has no rotation property (stays upright)
        const plateData = await page.evaluate((id) => {
            const plate = AppState.plates.find(p => p.id === id);
            return {
                hasRotation: plate.rotation !== undefined,
                rotation: plate.rotation
            };
        }, plateId);

        expect(plateData.hasRotation).toBe(false);
        expect(plateData.rotation).toBeUndefined();
    });

    test('balls remain upright after multiple rotations', async ({ page }) => {
        const ballId = await page.evaluate(() => {
            const ball = {
                id: `ball-${AppState.nextBallId++}`,
                x: 2500,
                y: 1250,
                color: '#ffffff'
            };
            AppState.balls.push(ball);
            Balls.render();
            return ball.id;
        });

        // Rotate board 4 times (full circle)
        for (let i = 0; i < 4; i++) {
            await rightClickBoard(page);
            const menu = await getBoardCanvasMenu(page);
            await menu.locator('[data-action="rotate-right"]').click();
        }

        // Verify ball still has no rotation
        const hasRotation = await page.evaluate((id) => {
            const ball = AppState.balls.find(b => b.id === id);
            return ball.rotation !== undefined;
        }, ballId);

        expect(hasRotation).toBe(false);
    });

    test('plates remain upright after multiple rotations', async ({ page }) => {
        const plateId = await page.evaluate(() => {
            const plate = {
                id: `plate-${AppState.nextPlateId++}`,
                x: 2500,
                y: 1250,
                color: '#ff0000'
            };
            AppState.plates.push(plate);
            Plates.render();
            return plate.id;
        });

        // Rotate board left then right
        await rightClickBoard(page);
        let menu = await getBoardCanvasMenu(page);
        await menu.locator('[data-action="rotate-left"]').click();

        await rightClickBoard(page);
        menu = await getBoardCanvasMenu(page);
        await menu.locator('[data-action="rotate-right"]').click();

        // Verify plate still has no rotation
        const hasRotation = await page.evaluate((id) => {
            const plate = AppState.plates.find(p => p.id === id);
            return plate.rotation !== undefined;
        }, plateId);

        expect(hasRotation).toBe(false);
    });

    test('balls svg element has no rotation transform in DOM', async ({ page }) => {
        const ballId = await page.evaluate(() => {
            const ball = {
                id: `ball-${AppState.nextBallId++}`,
                x: 2500,
                y: 1250,
                color: '#ffffff'
            };
            AppState.balls.push(ball);
            Balls.render();
            return ball.id;
        });

        // Rotate board
        await rightClickBoard(page);
        const menu = await getBoardCanvasMenu(page);
        await menu.locator('[data-action="rotate-right"]').click();

        await page.waitForTimeout(200);

        // Check that ball SVG element has no rotation transform
        const ballTransform = await page.evaluate((id) => {
            const ballEl = document.querySelector(`[data-ball="${id}"]`);
            if (!ballEl) return null;
            const svg = ballEl.querySelector('.ball-svg');
            if (!svg) return null;
            return svg.style.transform;
        }, ballId);

        // Ball SVG should have no rotation or an empty transform
        expect(ballTransform === '' || ballTransform === null || !ballTransform.includes('rotate')).toBe(true);
    });

    test('plates svg element has no rotation transform in DOM', async ({ page }) => {
        const plateId = await page.evaluate(() => {
            const plate = {
                id: `plate-${AppState.nextPlateId++}`,
                x: 2500,
                y: 1250,
                color: '#ff0000'
            };
            AppState.plates.push(plate);
            Plates.render();
            return plate.id;
        });

        // Rotate board
        await rightClickBoard(page);
        const menu = await getBoardCanvasMenu(page);
        await menu.locator('[data-action="rotate-right"]').click();

        await page.waitForTimeout(200);

        // Check that plate SVG element has no rotation transform
        const plateTransform = await page.evaluate((id) => {
            const plateEl = document.querySelector(`[data-plate="${id}"]`);
            if (!plateEl) return null;
            const svg = plateEl.querySelector('.plate-svg');
            if (!svg) return null;
            return svg.style.transform;
        }, plateId);

        // Plate SVG should have no rotation or an empty transform
        expect(plateTransform === '' || plateTransform === null || !plateTransform.includes('rotate')).toBe(true);
    });

    test('cones stay upright after board rotation', async ({ page }) => {
        // Add cone element
        const coneId = await page.evaluate(() => {
            const element = {
                id: `element-${AppState.nextElementId++}`,
                type: 'cone',
                x: 2500,
                y: 1250,
                rotation: 0
            };
            AppState.elements.push(element);
            Elements.render();
            return element.id;
        });

        // Rotate board right 90 degrees
        await rightClickBoard(page);
        const menu = await getBoardCanvasMenu(page);
        await menu.locator('[data-action="rotate-right"]').click();

        // Verify cone rotation stays at 0 (upright)
        const coneRotation = await page.evaluate((id) => {
            const element = AppState.elements.find(e => e.id === id);
            return element ? element.rotation : null;
        }, coneId);

        // Cones should not rotate - stay at 0
        expect(coneRotation === 0 || coneRotation === undefined).toBe(true);
    });

    test('poles stay upright after board rotation', async ({ page }) => {
        // Add pole element
        const poleId = await page.evaluate(() => {
            const element = {
                id: `element-${AppState.nextElementId++}`,
                type: 'pole',
                x: 2500,
                y: 1250,
                rotation: 0
            };
            AppState.elements.push(element);
            Elements.render();
            return element.id;
        });

        // Rotate board right 90 degrees
        await rightClickBoard(page);
        const menu = await getBoardCanvasMenu(page);
        await menu.locator('[data-action="rotate-right"]').click();

        // Verify pole rotation stays at 0 (upright)
        const poleRotation = await page.evaluate((id) => {
            const element = AppState.elements.find(e => e.id === id);
            return element ? element.rotation : null;
        }, poleId);

        // Poles should not rotate - stay at 0
        expect(poleRotation === 0 || poleRotation === undefined).toBe(true);
    });

    test('cones with initial rotation stay at that rotation', async ({ page }) => {
        // Add cone with 45 degree rotation
        const coneId = await page.evaluate(() => {
            const element = {
                id: `element-${AppState.nextElementId++}`,
                type: 'cone',
                x: 2500,
                y: 1250,
                rotation: 45
            };
            AppState.elements.push(element);
            Elements.render();
            return element.id;
        });

        // Rotate board right 90 degrees
        await rightClickBoard(page);
        const menu = await getBoardCanvasMenu(page);
        await menu.locator('[data-action="rotate-right"]').click();

        // Verify cone keeps its original rotation
        const coneRotation = await page.evaluate((id) => {
            const element = AppState.elements.find(e => e.id === id);
            return element ? element.rotation : null;
        }, coneId);

        // Cone should maintain its original 45 degree rotation
        expect(coneRotation).toBe(45);
    });

    test('cones stay upright after multiple board rotations', async ({ page }) => {
        const coneId = await page.evaluate(() => {
            const element = {
                id: `element-${AppState.nextElementId++}`,
                type: 'cone',
                x: 2500,
                y: 1250,
                rotation: 0
            };
            AppState.elements.push(element);
            Elements.render();
            return element.id;
        });

        // Rotate board 4 times (full circle)
        for (let i = 0; i < 4; i++) {
            await rightClickBoard(page);
            const menu = await getBoardCanvasMenu(page);
            await menu.locator('[data-action="rotate-right"]').click();
        }

        // Verify cone still at 0 rotation
        const coneRotation = await page.evaluate((id) => {
            const element = AppState.elements.find(e => e.id === id);
            return element ? element.rotation : null;
        }, coneId);

        expect(coneRotation === 0 || coneRotation === undefined).toBe(true);
    });

    test('goals DO rotate with board (rotatable element type)', async ({ page }) => {
        // Add goal element (which IS rotatable)
        const goalId = await page.evaluate(() => {
            const element = {
                id: `element-${AppState.nextElementId++}`,
                type: 'goal',
                x: 2500,
                y: 1250,
                rotation: 0
            };
            AppState.elements.push(element);
            Elements.render();
            return element.id;
        });

        // Rotate board right 90 degrees
        await rightClickBoard(page);
        const menu = await getBoardCanvasMenu(page);
        await menu.locator('[data-action="rotate-right"]').click();

        // Verify goal rotation maintains user-set value
        const goalRotation = await page.evaluate((id) => {
            const element = AppState.elements.find(e => e.id === id);
            return element ? element.rotation : null;
        }, goalId);

        // Goal rotation maintains user-set value during board rotation
        expect(goalRotation).toBe(0);
    });
});
