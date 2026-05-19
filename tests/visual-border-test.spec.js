/**
 * Visual test to compare positioning of players vs elements/shapes
 * and their selection borders at different rotations.
 */
import { test, expect } from './test-config.js';
import { goto } from './helpers.js';

/** Right-click board to open menu */
async function rightClickBoard(page) {
    const bb = await page.locator('#board-canvas').boundingBox();
    await page.mouse.click(bb.x + 10, bb.y + 10, { button: 'right' });
}

/** Get board canvas context menu */
async function getBoardCanvasMenu(page) {
    const menu = page.locator('#board-canvas-context-menu');
    await expect(menu).toBeVisible({ timeout: 3000 });
    return menu;
}

test.describe('Visual border positioning', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
    });

    test('compare player vs element positioning and selection borders', async ({ page }) => {
        // Listen to console
        page.on('console', msg => console.log('BROWSER:', msg.text()));

        // Add a player at board center (2000, 1000)
        const playerId = await page.evaluate(() => {
            const player = {
                id: 'player-test-' + Date.now(),
                teamId: AppState.teams[0].id,
                number: '1',
                x: 2000,
                y: 1000,
                rotation: 0,
                visible: true
            };
            AppState.players.push(player);
            Players.render();
            return player.id;
        });

        // Add a cone element at the same position
        const elementId = await page.evaluate(() => {
            const element = {
                id: 'element-test-' + Date.now(),
                type: 'cone',
                x: 2000,
                y: 1000,
                rotation: 0,
                visible: true
            };
            AppState.elements.push(element);
            Elements.render();
            return element.id;
        });

        // Add a rectangle shape at the same position
        await page.evaluate(() => {
            Shapes.addShapeAtPosition('rectangle', 2000, 1000);
        });

        await page.waitForTimeout(500);

        // Get positions at 0°
        const positions0 = await page.evaluate(({ playerId, elementId }) => {
            // Query all to debug
            const allPlayers = document.querySelectorAll('.player');
            const allElements = document.querySelectorAll('.element-svg');
            const allShapes = document.querySelectorAll('.shape-svg');

            console.log('Found players:', allPlayers.length, 'elements:', allElements.length, 'shapes:', allShapes.length);
            if (allPlayers.length) console.log('Player IDs:', Array.from(allPlayers).map(p => p.id));
            if (allElements.length) console.log('Element IDs:', Array.from(allElements).map(e => e.id));

            const playerDiv = document.getElementById(playerId) || allPlayers[allPlayers.length - 1];
            const elementSvg = document.getElementById(elementId) || allElements[allElements.length - 1];
            const shapeSvg = allShapes[allShapes.length - 1];

            if (!playerDiv) throw new Error('Player not found: ' + playerId);
            if (!elementSvg) throw new Error('Element not found: ' + elementId);
            if (!shapeSvg) throw new Error('Shape not found');

            const playerRect = playerDiv.getBoundingClientRect();
            const elementRect = elementSvg.getBoundingClientRect();
            const shapeRect = shapeSvg.getBoundingClientRect();

            const canvas = AppState.canvas.getBoundingClientRect();
            const boardArea = document.getElementById('board-area').getBoundingClientRect();
            const drawingLayer = document.getElementById('drawing-layer').getBoundingClientRect();

            return {
                canvas: { x: canvas.x, y: canvas.y, width: canvas.width, height: canvas.height },
                boardArea: { x: boardArea.x, y: boardArea.y, width: boardArea.width, height: boardArea.height },
                drawingLayer: { x: drawingLayer.x, y: drawingLayer.y, width: drawingLayer.width, height: drawingLayer.height },
                player: { x: playerRect.x, y: playerRect.y, width: playerRect.width, height: playerRect.height },
                element: { x: elementRect.x, y: elementRect.y, width: elementRect.width, height: elementRect.height },
                shape: { x: shapeRect.x, y: shapeRect.y, width: shapeRect.width, height: shapeRect.height },
                playerStyle: {
                    left: playerDiv.style.left,
                    top: playerDiv.style.top
                },
                elementStyle: {
                    left: elementSvg.style.left,
                    top: elementSvg.style.top
                },
                shapeStyle: {
                    left: shapeSvg.style.left,
                    top: shapeSvg.style.top
                }
            };
        }, { playerId, elementId });

        console.log('\n=== At 0° rotation ===');
        console.log('Canvas:', positions0.canvas);
        console.log('Board-area:', positions0.boardArea);
        console.log('Drawing-layer:', positions0.drawingLayer);
        console.log('\nPlayer (div):', positions0.player, 'style:', positions0.playerStyle);
        console.log('Element (svg):', positions0.element, 'style:', positions0.elementStyle);
        console.log('Shape (svg):', positions0.shape, 'style:', positions0.shapeStyle);

        // All should be at approximately the same center position
        const playerCenterX = positions0.player.x + positions0.player.width / 2;
        const playerCenterY = positions0.player.y + positions0.player.height / 2;
        const elementCenterX = positions0.element.x + positions0.element.width / 2;
        const elementCenterY = positions0.element.y + positions0.element.height / 2;
        const shapeCenterX = positions0.shape.x + positions0.shape.width / 2;
        const shapeCenterY = positions0.shape.y + positions0.shape.height / 2;

        console.log('\nCenters at 0°:');
        console.log('Player center:', playerCenterX, playerCenterY);
        console.log('Element center:', elementCenterX, elementCenterY);
        console.log('Shape center:', shapeCenterX, shapeCenterY);

        // Rotate 90°
        await rightClickBoard(page);
        const menu = await getBoardCanvasMenu(page);
        await menu.locator('[data-action="rotate-right"]').click();
        await page.waitForTimeout(500);

        // Get positions at 90°
        const positions90 = await page.evaluate(({ playerId, elementId }) => {
            const playerDiv = document.getElementById(playerId);
            const elementSvg = document.getElementById(elementId);
            const shapeSvg = document.querySelector('.shape-svg');

            const playerRect = playerDiv.getBoundingClientRect();
            const elementRect = elementSvg.getBoundingClientRect();
            const shapeRect = shapeSvg.getBoundingClientRect();

            const canvas = AppState.canvas.getBoundingClientRect();
            const boardArea = document.getElementById('board-area').getBoundingClientRect();
            const drawingLayer = document.getElementById('drawing-layer').getBoundingClientRect();
            const playersLayer = document.getElementById('players-layer').getBoundingClientRect();

            // Get computed transforms
            const boardAreaTransform = window.getComputedStyle(document.getElementById('board-area')).transform;
            const playersLayerTransform = window.getComputedStyle(document.getElementById('players-layer')).transform;
            const drawingLayerTransform = window.getComputedStyle(document.getElementById('drawing-layer')).transform;

            return {
                canvas: { x: canvas.x, y: canvas.y, width: canvas.width, height: canvas.height },
                boardArea: { x: boardArea.x, y: boardArea.y, width: boardArea.width, height: boardArea.height },
                drawingLayer: { x: drawingLayer.x, y: drawingLayer.y, width: drawingLayer.width, height: drawingLayer.height },
                playersLayer: { x: playersLayer.x, y: playersLayer.y, width: playersLayer.width, height: playersLayer.height },
                player: { x: playerRect.x, y: playerRect.y, width: playerRect.width, height: playerRect.height },
                element: { x: elementRect.x, y: elementRect.y, width: elementRect.width, height: elementRect.height },
                shape: { x: shapeRect.x, y: shapeRect.y, width: shapeRect.width, height: shapeRect.height },
                playerStyle: {
                    left: playerDiv.style.left,
                    top: playerDiv.style.top
                },
                elementStyle: {
                    left: elementSvg.style.left,
                    top: elementSvg.style.top
                },
                shapeStyle: {
                    left: shapeSvg.style.left,
                    top: shapeSvg.style.top
                },
                transforms: {
                    boardArea: boardAreaTransform,
                    playersLayer: playersLayerTransform,
                    drawingLayer: drawingLayerTransform
                },
                scaleFactor: AppState.boardRotationScaleFactor
            };
        }, { playerId, elementId });

        console.log('\n=== At 90° rotation ===');
        console.log('Canvas:', positions90.canvas);
        console.log('Board-area:', positions90.boardArea);
        console.log('Drawing-layer:', positions90.drawingLayer);
        console.log('Players-layer:', positions90.playersLayer);
        console.log('Scale factor:', positions90.scaleFactor);
        console.log('\nTransforms:');
        console.log('players-layer:', positions90.transforms.playersLayer);
        console.log('board-area:', positions90.transforms.boardArea);
        console.log('drawing-layer:', positions90.transforms.drawingLayer);
        console.log('\nPlayer (div):', positions90.player, 'style:', positions90.playerStyle);
        console.log('Element (svg):', positions90.element, 'style:', positions90.elementStyle);
        console.log('Shape (svg):', positions90.shape, 'style:', positions90.shapeStyle);

        const playerCenterX90 = positions90.player.x + positions90.player.width / 2;
        const playerCenterY90 = positions90.player.y + positions90.player.height / 2;
        const elementCenterX90 = positions90.element.x + positions90.element.width / 2;
        const elementCenterY90 = positions90.element.y + positions90.element.height / 2;
        const shapeCenterX90 = positions90.shape.x + positions90.shape.width / 2;
        const shapeCenterY90 = positions90.shape.y + positions90.shape.height / 2;

        console.log('\nCenters at 90°:');
        console.log('Player center:', playerCenterX90, playerCenterY90);
        console.log('Element center:', elementCenterX90, elementCenterY90);
        console.log('Shape center:', shapeCenterX90, shapeCenterY90);

        // Check if all centers are aligned at 90°
        console.log('\nCenter differences at 90°:');
        console.log('Player vs Element:',
            Math.abs(playerCenterX90 - elementCenterX90),
            Math.abs(playerCenterY90 - elementCenterY90));
        console.log('Player vs Shape:',
            Math.abs(playerCenterX90 - shapeCenterX90),
            Math.abs(playerCenterY90 - shapeCenterY90));

        // All should be aligned within a few pixels
        expect(Math.abs(playerCenterX90 - elementCenterX90)).toBeLessThan(10);
        expect(Math.abs(playerCenterY90 - elementCenterY90)).toBeLessThan(10);
        expect(Math.abs(playerCenterX90 - shapeCenterX90)).toBeLessThan(10);
        expect(Math.abs(playerCenterY90 - shapeCenterY90)).toBeLessThan(10);
    });
});
