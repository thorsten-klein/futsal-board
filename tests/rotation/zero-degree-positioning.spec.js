/**
 * Test to check if yellow borders (drop-shadow) are correctly positioned
 * at 0° rotation when board-canvas doesn't fill board-container.
 */
import { test, expect } from '../test-config.js';
import { goto } from '../helpers.js';

test.describe('0° positioning test', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
    });

    test('layers match canvas position at 0°', async ({ page }) => {
        const positions = await page.evaluate(() => {
            const canvas = document.getElementById('board-canvas').getBoundingClientRect();
            const drawing = document.getElementById('drawing-layer').getBoundingClientRect();
            const players = document.getElementById('players-layer').getBoundingClientRect();
            const boardArea = document.getElementById('board-area').getBoundingClientRect();

            return { canvas, drawing, players, boardArea };
        });

        console.log('Canvas:', positions.canvas);
        console.log('Drawing layer:', positions.drawing);
        console.log('Players layer:', positions.players);
        console.log('Board area:', positions.boardArea);

        // All layers should match canvas position
        expect(Math.abs(positions.canvas.x - positions.drawing.x)).toBeLessThan(1);
        expect(Math.abs(positions.canvas.y - positions.drawing.y)).toBeLessThan(1);
        expect(Math.abs(positions.canvas.x - positions.players.x)).toBeLessThan(1);
        expect(Math.abs(positions.canvas.y - positions.players.y)).toBeLessThan(1);
        expect(Math.abs(positions.canvas.x - positions.boardArea.x)).toBeLessThan(1);
        expect(Math.abs(positions.canvas.y - positions.boardArea.y)).toBeLessThan(1);
    });

    test('player, element, and shape at same board coordinates appear at same screen position', async ({ page }) => {
        // Add entities at board center (2000, 1000)
        await page.evaluate(() => {
            // Add player
            AppState.players.push({
                id: 'test-player',
                teamId: AppState.teams[0].id,
                number: '1',
                x: 2000,
                y: 1000,
                rotation: 0,
                visible: true
            });

            // Add element (cone)
            AppState.elements.push({
                id: 'test-element',
                type: 'cone',
                x: 2000,
                y: 1000,
                rotation: 0,
                visible: true
            });

            // Add shape
            Shapes.addShapeAtPosition('circle', 2000, 1000);

            // Render all
            Players.render();
            Elements.render();
            Shapes.render();
        });

        await page.waitForTimeout(300);

        // Get their screen positions
        const positions = await page.evaluate(() => {
            const player = document.getElementById('test-player');
            const element = document.getElementById('test-element');
            const shape = document.querySelector('.shape-svg');

            if (!player || !element || !shape) {
                return { error: 'Not all elements found', player: !!player, element: !!element, shape: !!shape };
            }

            const playerRect = player.getBoundingClientRect();
            const elementRect = element.getBoundingClientRect();
            const shapeRect = shape.getBoundingClientRect();

            // Calculate centers
            return {
                player: {
                    centerX: playerRect.x + playerRect.width / 2,
                    centerY: playerRect.y + playerRect.height / 2,
                    styleLeft: player.style.left,
                    styleTop: player.style.top
                },
                element: {
                    centerX: elementRect.x + elementRect.width / 2,
                    centerY: elementRect.y + elementRect.height / 2,
                    styleLeft: element.style.left,
                    styleTop: element.style.top
                },
                shape: {
                    centerX: shapeRect.x + shapeRect.width / 2,
                    centerY: shapeRect.y + shapeRect.height / 2,
                    styleLeft: shape.style.left,
                    styleTop: shape.style.top
                }
            };
        });

        if (positions.error) {
            console.error('Error:', positions);
            throw new Error(positions.error);
        }

        console.log('\n=== At board position (2000, 1000) ===');
        console.log('Player center:', positions.player.centerX, positions.player.centerY);
        console.log('Player style:', positions.player.styleLeft, positions.player.styleTop);
        console.log('\nElement center:', positions.element.centerX, positions.element.centerY);
        console.log('Element style:', positions.element.styleLeft, positions.element.styleTop);
        console.log('\nShape center:', positions.shape.centerX, positions.shape.centerY);
        console.log('Shape style:', positions.shape.styleLeft, positions.shape.styleTop);

        // All centers should be at approximately the same position
        const centerDiffX_PE = Math.abs(positions.player.centerX - positions.element.centerX);
        const centerDiffY_PE = Math.abs(positions.player.centerY - positions.element.centerY);
        const centerDiffX_PS = Math.abs(positions.player.centerX - positions.shape.centerX);
        const centerDiffY_PS = Math.abs(positions.player.centerY - positions.shape.centerY);

        console.log('\n=== Center differences ===');
        console.log('Player vs Element:', centerDiffX_PE, centerDiffY_PE);
        console.log('Player vs Shape:', centerDiffX_PS, centerDiffY_PS);

        // They should be aligned within a reasonable tolerance (allowing for rounding and scaling)
        expect(centerDiffX_PE).toBeLessThan(15);
        expect(centerDiffY_PE).toBeLessThan(15);
        expect(centerDiffX_PS).toBeLessThan(15);
        expect(centerDiffY_PS).toBeLessThan(15);
    });
});
