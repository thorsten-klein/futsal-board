import { test, expect } from '@playwright/test';
import { FILE_URL } from './helpers.js';

test.describe('Touch Overlay Movement Bug', () => {
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

    test('TOUCH MODE: ball overlay should move with ball when dragged', async ({ page }) => {
        await page.evaluate(() => {
            AppState.addBall('#f39c12', 1000, 1000);
            Balls.render();
        });

        await page.waitForTimeout(300);

        const ballId = await page.evaluate(() => AppState.balls[0]?.id);
        const ballSvg = page.locator(`svg[data-ball="${ballId}"]`);
        const ballOverlay = page.locator(`.touch-overlay[data-ball="${ballId}"]`);

        const initialBallBox = await ballSvg.boundingBox();
        const initialOverlayBox = await ballOverlay.boundingBox();

        const ballCenterX = initialBallBox.x + initialBallBox.width / 2;
        const ballCenterY = initialBallBox.y + initialBallBox.height / 2;

        // Drag the ball
        await page.mouse.move(ballCenterX, ballCenterY);
        await page.mouse.down();
        await page.mouse.move(ballCenterX + 100, ballCenterY + 100, { steps: 5 });
        await page.mouse.up();
        await page.waitForTimeout(100);

        const finalBallBox = await ballSvg.boundingBox();
        const finalOverlayBox = await ballOverlay.boundingBox();

        // Ball should have moved ~100px
        expect(Math.abs((finalBallBox.x - initialBallBox.x) - 100)).toBeLessThan(10);
        expect(Math.abs((finalBallBox.y - initialBallBox.y) - 100)).toBeLessThan(10);

        // Overlay should have moved with the ball
        expect(Math.abs((finalOverlayBox.x - initialOverlayBox.x) - 100)).toBeLessThan(10);
        expect(Math.abs((finalOverlayBox.y - initialOverlayBox.y) - 100)).toBeLessThan(10);
    });

    test('TOUCH MODE: plate overlay should move with plate when dragged', async ({ page }) => {
        await page.evaluate(() => {
            AppState.addPlate('A', 1000, 1000, 0);
            Plates.render();
        });

        await page.waitForTimeout(300);

        const plateId = await page.evaluate(() => AppState.plates[0]?.id);
        const plateSvg = page.locator(`svg[data-plate="${plateId}"]`);
        const plateOverlay = page.locator(`.touch-overlay[data-plate="${plateId}"]`);

        const initialPlateBox = await plateSvg.boundingBox();
        const initialOverlayBox = await plateOverlay.boundingBox();

        const plateCenterX = initialPlateBox.x + initialPlateBox.width / 2;
        const plateCenterY = initialPlateBox.y + initialPlateBox.height / 2;

        // Drag the plate
        await page.mouse.move(plateCenterX, plateCenterY);
        await page.mouse.down();
        await page.mouse.move(plateCenterX + 100, plateCenterY + 100, { steps: 5 });
        await page.mouse.up();
        await page.waitForTimeout(100);

        const finalPlateBox = await plateSvg.boundingBox();
        const finalOverlayBox = await plateOverlay.boundingBox();

        // Overlay should have moved with the plate
        expect(Math.abs((finalOverlayBox.x - initialOverlayBox.x) - 100)).toBeLessThan(10);
        expect(Math.abs((finalOverlayBox.y - initialOverlayBox.y) - 100)).toBeLessThan(10);
    });

    test('TOUCH MODE: player overlay should move with player when dragged', async ({ page }) => {
        await page.evaluate(() => {
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
                x: 1000,
                y: 1000,
                rotation: 0,
                visible: true
            };

            AppState.players.push(player);
            Players.render();
        });

        await page.waitForTimeout(300);

        const playerId = await page.evaluate(() => AppState.players[0]?.id);
        const playerEl = page.locator(`.player[data-player-id="${playerId}"]`);
        const playerOverlay = page.locator(`.touch-overlay[data-player-id="${playerId}"]`);

        const initialPlayerBox = await playerEl.boundingBox();
        const initialOverlayBox = await playerOverlay.boundingBox();

        const playerCenterX = initialPlayerBox.x + initialPlayerBox.width / 2;
        const playerCenterY = initialPlayerBox.y + initialPlayerBox.height / 2;

        // Drag the player
        await page.mouse.move(playerCenterX, playerCenterY);
        await page.mouse.down();
        await page.mouse.move(playerCenterX + 100, playerCenterY + 100, { steps: 5 });
        await page.mouse.up();
        await page.waitForTimeout(100);

        const finalPlayerBox = await playerEl.boundingBox();
        const finalOverlayBox = await playerOverlay.boundingBox();

        // Overlay should have moved with the player
        expect(Math.abs((finalOverlayBox.x - initialOverlayBox.x) - 100)).toBeLessThan(10);
        expect(Math.abs((finalOverlayBox.y - initialOverlayBox.y) - 100)).toBeLessThan(10);
    });

    test('TOUCH MODE: shape overlay should move with shape when dragged', async ({ page }) => {
        await page.evaluate(() => {
            const shape = {
                id: 'circle-1',
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
        });

        await page.waitForTimeout(300);

        const shapeSvg = page.locator('svg[data-shape="circle-1"]');
        const shapeOverlay = page.locator('.touch-overlay[data-shape="circle-1"]');

        const initialShapeBox = await shapeSvg.boundingBox();
        const initialOverlayBox = await shapeOverlay.boundingBox();

        const shapeCenterX = initialShapeBox.x + initialShapeBox.width / 2;
        const shapeCenterY = initialShapeBox.y + initialShapeBox.height / 2;

        // First, click to select the shape
        await page.mouse.click(shapeCenterX, shapeCenterY);
        await page.waitForTimeout(50);

        let selectedShape = await page.evaluate(() => AppState.selectedShape);

        // Then drag the shape
        await page.mouse.move(shapeCenterX, shapeCenterY);
        await page.mouse.down();
        await page.waitForTimeout(50);

        let draggedShape = await page.evaluate(() => AppState.draggedShape);

        await page.mouse.move(shapeCenterX + 100, shapeCenterY + 100, { steps: 5 });
        await page.mouse.up();
        await page.waitForTimeout(100);

        const finalShapeBox = await shapeSvg.boundingBox();
        const finalOverlayBox = await shapeOverlay.boundingBox();

        // Overlay should have moved with the shape
        expect(Math.abs((finalOverlayBox.x - initialOverlayBox.x) - 100)).toBeLessThan(10);
        expect(Math.abs((finalOverlayBox.y - initialOverlayBox.y) - 100)).toBeLessThan(10);
    });
});
