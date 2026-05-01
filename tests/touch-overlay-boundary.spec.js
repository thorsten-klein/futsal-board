import { test, expect } from '@playwright/test';
import { FILE_URL } from './helpers.js';

test.describe('Touch Overlay Boundary Bug', () => {
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

    test('TOUCH MODE: clicking just outside ball overlay should NOT select the ball', async ({ page }) => {
        // Create a ball
        await page.evaluate(() => {
            AppState.addBall('#f39c12', 1000, 1000);
            Balls.render();
        });

        await page.waitForTimeout(300);

        const ballId = await page.evaluate(() => AppState.balls[0]?.id);
        const ballOverlay = page.locator(`.touch-overlay[data-ball="${ballId}"]`);
        await expect(ballOverlay).toBeVisible();

        const overlayBox = await ballOverlay.boundingBox();
        const overlayCenterX = overlayBox.x + overlayBox.width / 2;
        const overlayCenterY = overlayBox.y + overlayBox.height / 2;

        // Overlay is 60px diameter (30px radius)
        // Click 35px from center (5px outside the overlay edge)
        const clickX = overlayCenterX + 35;
        const clickY = overlayCenterY;


        // Check what element is at this point
        const elementAtPoint = await page.evaluate(({ x, y }) => {
            const el = document.elementFromPoint(x, y);
            return {
                tagName: el?.tagName,
                className: el?.className,
                id: el?.id,
                dataBall: el?.dataset?.ball,
                parentTagName: el?.parentElement?.tagName,
                parentDataBall: el?.parentElement?.dataset?.ball
            };
        }, { x: clickX, y: clickY });


        await page.mouse.click(clickX, clickY);
        await page.waitForTimeout(50);

        const selectedBall = await page.evaluate(() => AppState.selectedBall);
        const selectedShape = await page.evaluate(() => AppState.selectedShape);


        // Nothing should be selected when clicking outside the overlay
        expect(selectedBall).toBeNull();
        expect(selectedShape).toBeNull();
    });

    test('TOUCH MODE: clicking just outside plate overlay should NOT select the plate', async ({ page }) => {
        // Create a plate
        await page.evaluate(() => {
            AppState.addPlate('A', 1000, 1000, 0);
            Plates.render();
        });

        await page.waitForTimeout(300);

        const plateId = await page.evaluate(() => AppState.plates[0]?.id);
        const plateOverlay = page.locator(`.touch-overlay[data-plate="${plateId}"]`);
        await expect(plateOverlay).toBeVisible();

        const overlayBox = await plateOverlay.boundingBox();
        const overlayCenterX = overlayBox.x + overlayBox.width / 2;
        const overlayCenterY = overlayBox.y + overlayBox.height / 2;

        // Click 35px from center (5px outside the 30px radius overlay)
        const clickX = overlayCenterX + 35;
        const clickY = overlayCenterY;


        await page.mouse.click(clickX, clickY);
        await page.waitForTimeout(50);

        const selectedPlate = await page.evaluate(() => AppState.selectedPlate);
        const selectedShape = await page.evaluate(() => AppState.selectedShape);


        // Nothing should be selected
        expect(selectedPlate).toBeNull();
        expect(selectedShape).toBeNull();
    });

    test('TOUCH MODE: clicking just outside player overlay should NOT select the player', async ({ page }) => {
        // Create a player
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
            AppState.saveToLocalStorage();
            Players.render();
        });

        await page.waitForTimeout(300);

        const playerId = await page.evaluate(() => AppState.players[0]?.id);
        const playerOverlay = page.locator(`.touch-overlay[data-player-id="${playerId}"]`);
        await expect(playerOverlay).toBeVisible();

        const overlayBox = await playerOverlay.boundingBox();
        const overlayCenterX = overlayBox.x + overlayBox.width / 2;
        const overlayCenterY = overlayBox.y + overlayBox.height / 2;

        // Click 35px from center (5px outside the 30px radius overlay)
        const clickX = overlayCenterX + 35;
        const clickY = overlayCenterY;


        await page.mouse.click(clickX, clickY);
        await page.waitForTimeout(50);

        const selectedPlayer = await page.evaluate(() => AppState.selectedPlayer);
        const selectedShape = await page.evaluate(() => AppState.selectedShape);


        // Nothing should be selected
        expect(selectedPlayer).toBeNull();
        expect(selectedShape).toBeNull();
    });

    test('TOUCH MODE: clicking just outside shape overlay should NOT select the shape', async ({ page }) => {
        // Create a circle shape
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
            AppState.saveToLocalStorage();
            Shapes.render();
        });

        await page.waitForTimeout(300);

        const shapeOverlay = page.locator('.touch-overlay[data-shape="circle-1"]');
        await expect(shapeOverlay).toBeVisible();

        const overlayBox = await shapeOverlay.boundingBox();
        const overlayCenterX = overlayBox.x + overlayBox.width / 2;
        const overlayCenterY = overlayBox.y + overlayBox.height / 2;

        // Click 45px from center (outside the 30px tolerance + 30px overlay radius)
        // Shape center is at 1000,1000 (board coords), overlay radius is 30px, tolerance is 30px
        // So we need to click more than 60px away from center to avoid selection
        const clickX = overlayCenterX + 65;
        const clickY = overlayCenterY;


        // Check what element is at this point
        const elementAtPoint = await page.evaluate(({ x, y }) => {
            const el = document.elementFromPoint(x, y);
            return {
                tagName: el?.tagName,
                className: el?.className,
                id: el?.id,
                dataShape: el?.dataset?.shape,
                parentTagName: el?.parentElement?.tagName,
                parentDataShape: el?.parentElement?.dataset?.shape
            };
        }, { x: clickX, y: clickY });


        await page.mouse.click(clickX, clickY);
        await page.waitForTimeout(50);

        const selectedShape = await page.evaluate(() => AppState.selectedShape);


        // Nothing should be selected
        expect(selectedShape).toBeNull();
    });
});
