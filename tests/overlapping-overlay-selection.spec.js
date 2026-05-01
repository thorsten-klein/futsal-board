import { test, expect } from '@playwright/test';
import { FILE_URL } from './helpers.js';

test.describe('Overlapping Overlay Selection', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(FILE_URL);
        await page.evaluate(() => { try { localStorage.clear(); } catch (_) {} });
        await page.reload();
        await page.waitForSelector('#board-area', { state: 'attached' });
        await page.waitForTimeout(300);

        // Enable select tool and touch mode
        await page.evaluate(() => {
            AppState.currentTool = 'select';
            document.body.classList.add('touch-mode');
        });
    });

    test('TOUCH MODE: when ball and shape overlays overlap, ball should be selected (higher z-index)', async ({ page }) => {
        await page.evaluate(() => {
            // Create a shape (z-index 25)
            const shape = {
                id: 'shape-1',
                type: 'circle',
                x: 1000,
                y: 1000,
                width: 100,
                height: 100,
                rotation: 0,
                color: '#3498db',
                fillColor: 'rgba(52, 152, 219, 0.3)',
                strokeWidth: 2,
                visible: true,
                inherited: false
            };
            AppState.shapes.push(shape);
            Shapes.render();

            // Create a ball very close (z-index 30)
            AppState.addBall('#f39c12', 1010, 1010); // 10cm offset = overlapping touch areas
            Balls.render();
        });

        await page.waitForTimeout(300);

        const ballId = await page.evaluate(() => AppState.balls[0]?.id);
        const shapeOverlay = page.locator('.touch-overlay[data-shape="shape-1"]');
        const ballOverlay = page.locator(`.touch-overlay[data-ball="${ballId}"]`);

        const shapeBox = await shapeOverlay.boundingBox();
        const ballBox = await ballOverlay.boundingBox();


        // Find overlapping area
        const overlapX = Math.max(shapeBox.x, ballBox.x) + 10;
        const overlapY = Math.max(shapeBox.y, ballBox.y) + 10;


        // Check what element is at this point
        const elementAtPoint = await page.evaluate(({ x, y }) => {
            const el = document.elementFromPoint(x, y);
            return {
                className: el?.className,
                dataBall: el?.dataset?.ball,
                dataShape: el?.dataset?.shape,
                zIndex: el?.style?.zIndex
            };
        }, { x: overlapX, y: overlapY });


        await page.mouse.click(overlapX, overlapY);
        await page.waitForTimeout(50);

        const selectedBall = await page.evaluate(() => AppState.selectedBall);
        const selectedShape = await page.evaluate(() => AppState.selectedShape);


        // Ball should be selected (higher z-index)
        expect(selectedBall?.id).toBe(ballId);
        expect(selectedShape).toBeNull();
    });

    test('TOUCH MODE: when player and shape overlays overlap, player should be selected (higher z-index)', async ({ page }) => {
        await page.evaluate(() => {
            // Create a shape (z-index 25)
            const shape = {
                id: 'shape-1',
                type: 'circle',
                x: 1000,
                y: 1000,
                width: 100,
                height: 100,
                rotation: 0,
                color: '#3498db',
                fillColor: 'rgba(52, 152, 219, 0.3)',
                strokeWidth: 2,
                visible: true,
                inherited: false
            };
            AppState.shapes.push(shape);
            Shapes.render();

            // Create a player very close (z-index 30)
            if (AppState.teams.length === 0) {
                AppState.teams = [
                    { id: 'team-1', name: 'Team A', color: '#27ae60' }
                ];
            }

            const player = {
                id: 'player-1',
                teamId: 'team-1',
                number: 7,
                name: 'Player 7',
                color: '#27ae60',
                x: 1010, // 10cm offset = overlapping touch areas
                y: 1010,
                rotation: 0,
                visible: true
            };

            AppState.players.push(player);
            Players.render();
        });

        await page.waitForTimeout(300);

        const shapeOverlay = page.locator('.touch-overlay[data-shape="shape-1"]');
        const playerOverlay = page.locator('.touch-overlay[data-player-id="player-1"]');

        const shapeBox = await shapeOverlay.boundingBox();
        const playerBox = await playerOverlay.boundingBox();


        // Find overlapping area
        const overlapX = Math.max(shapeBox.x, playerBox.x) + 10;
        const overlapY = Math.max(shapeBox.y, playerBox.y) + 10;


        await page.mouse.click(overlapX, overlapY);
        await page.waitForTimeout(50);

        const selectedPlayer = await page.evaluate(() => AppState.selectedPlayer);
        const selectedShape = await page.evaluate(() => AppState.selectedShape);


        // Player should be selected (higher z-index)
        expect(selectedPlayer?.id).toBe('player-1');
        expect(selectedShape).toBeNull();
    });

    test('TOUCH MODE: when two balls overlap, the one clicked should be selected', async ({ page }) => {
        await page.evaluate(() => {
            // Create two balls very close together (both z-index 30)
            AppState.addBall('#f39c12', 1000, 1000);
            AppState.addBall('#e74c3c', 1020, 1020); // 20cm offset = overlapping touch areas
            Balls.render();
        });

        await page.waitForTimeout(300);

        const ball1Id = await page.evaluate(() => AppState.balls[0]?.id);
        const ball2Id = await page.evaluate(() => AppState.balls[1]?.id);

        const ball1Overlay = page.locator(`.touch-overlay[data-ball="${ball1Id}"]`);
        const ball2Overlay = page.locator(`.touch-overlay[data-ball="${ball2Id}"]`);

        const ball1Box = await ball1Overlay.boundingBox();
        const ball2Box = await ball2Overlay.boundingBox();

        // Click closer to ball2 center
        const clickX = ball2Box.x + ball2Box.width / 2;
        const clickY = ball2Box.y + ball2Box.height / 2;


        // Check what element is at this point
        const elementAtPoint = await page.evaluate(({ x, y }) => {
            const el = document.elementFromPoint(x, y);
            return {
                className: el?.className,
                dataBall: el?.dataset?.ball,
                zIndex: el?.style?.zIndex
            };
        }, { x: clickX, y: clickY });


        await page.mouse.click(clickX, clickY);
        await page.waitForTimeout(50);

        const selectedBall = await page.evaluate(() => AppState.selectedBall);


        // Ball 2 should be selected (it's on top in DOM order)
        expect(selectedBall?.id).toBe(ball2Id);
    });
});
