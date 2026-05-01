import { test, expect } from '@playwright/test';
import { FILE_URL } from './helpers.js';

test.describe('Plate Between Shapes Selection Bug', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto(FILE_URL);
        await page.evaluate(() => { try { localStorage.clear(); } catch (_) {} });
        await page.reload();
        await page.waitForSelector('#board-area', { state: 'attached' });
        await page.waitForTimeout(300);

        // Enable select tool
        await page.evaluate(() => {
            AppState.currentTool = 'select';
        });
    });

    test('TOUCH MODE: plate between two ellipses should be selectable', async ({ page }) => {
        // Enable touch mode
        await page.evaluate(() => {
            document.body.classList.add('touch-mode');
        });

        // Create two ellipses with a plate in between
        await page.evaluate(() => {
            // Left ellipse
            const ellipse1 = {
                id: 'ellipse-left',
                type: 'ellipse',
                x: 900,
                y: 1000,
                width: 200,
                height: 150,
                rotation: 0,
                color: '#3498db',
                fillColor: 'rgba(52, 152, 219, 0.3)',
                strokeWidth: 2,
                visible: true,
                inherited: false
            };

            // Right ellipse
            const ellipse2 = {
                id: 'ellipse-right',
                type: 'ellipse',
                x: 1100,
                y: 1000,
                width: 200,
                height: 150,
                rotation: 0,
                color: '#e74c3c',
                fillColor: 'rgba(231, 76, 60, 0.3)',
                strokeWidth: 2,
                visible: true,
                inherited: false
            };

            AppState.shapes.push(ellipse1, ellipse2);
            AppState.saveToLocalStorage();
            Shapes.render();

            // Plate in the middle
            AppState.addPlate('A', 1000, 1000, 0); // x, y exactly between the two ellipses
            Plates.render();
        });

        await page.waitForTimeout(300);

        // Get the plate ID (auto-generated)
        const plateId = await page.evaluate(() => AppState.plates[0]?.id);

        // Verify all elements are visible
        const ellipse1Svg = page.locator('svg[data-shape="ellipse-left"]');
        const ellipse2Svg = page.locator('svg[data-shape="ellipse-right"]');
        const plateSvg = page.locator(`svg[data-plate="${plateId}"]`);

        await expect(ellipse1Svg).toBeVisible();
        await expect(ellipse2Svg).toBeVisible();
        await expect(plateSvg).toBeVisible();

        // Get positions
        const box1 = await ellipse1Svg.boundingBox();
        const box2 = await ellipse2Svg.boundingBox();
        const plateBox = await plateSvg.boundingBox();


        // Click on the plate
        const plateCenterX = plateBox.x + plateBox.width / 2;
        const plateCenterY = plateBox.y + plateBox.height / 2;


        await page.mouse.click(plateCenterX, plateCenterY);
        await page.waitForTimeout(50);

        // Check what got selected
        const selectedPlate = await page.evaluate(() => AppState.selectedPlate);
        const selectedShape = await page.evaluate(() => AppState.selectedShape);


        // The plate should be selected, NOT a shape
        expect(selectedPlate?.id).toBe(plateId);
        expect(selectedShape).toBeNull();

        // Verify plate can be dragged
        const initialPlateBox = await plateSvg.boundingBox();

        await page.mouse.move(plateCenterX, plateCenterY);
        await page.mouse.down();
        await page.mouse.move(plateCenterX + 50, plateCenterY + 50, { steps: 5 });
        await page.mouse.up();
        await page.waitForTimeout(100);

        const finalPlateBox = await plateSvg.boundingBox();
        const plateMovedX = finalPlateBox.x - initialPlateBox.x;
        const plateMovedY = finalPlateBox.y - initialPlateBox.y;


        // Plate should have moved
        expect(Math.abs(plateMovedX - 50)).toBeLessThan(10);
        expect(Math.abs(plateMovedY - 50)).toBeLessThan(10);
    });

    test('TOUCH MODE: plate very close to ellipse edge should still be selectable', async ({ page }) => {
        // Enable touch mode
        await page.evaluate(() => {
            document.body.classList.add('touch-mode');
        });

        // Create one ellipse with plate right next to it
        await page.evaluate(() => {
            const ellipse = {
                id: 'ellipse-nearby',
                type: 'ellipse',
                x: 1000,
                y: 1000,
                width: 300,
                height: 200,
                rotation: 0,
                color: '#3498db',
                fillColor: 'rgba(52, 152, 219, 0.3)',
                strokeWidth: 2,
                visible: true,
                inherited: false
            };

            AppState.shapes.push(ellipse);
            AppState.saveToLocalStorage();
            Shapes.render();

            // Plate positioned close to the right edge of the ellipse
            AppState.addPlate('B', 1180, 1000, 0); // 180cm from ellipse center
            Plates.render();
        });

        await page.waitForTimeout(300);

        const plateId = await page.evaluate(() => AppState.plates[0]?.id);

        const plateSvg = page.locator(`svg[data-plate="${plateId}"]`);
        await expect(plateSvg).toBeVisible();

        const plateBox = await plateSvg.boundingBox();
        const plateCenterX = plateBox.x + plateBox.width / 2;
        const plateCenterY = plateBox.y + plateBox.height / 2;


        await page.mouse.click(plateCenterX, plateCenterY);
        await page.waitForTimeout(50);

        const selectedPlate = await page.evaluate(() => AppState.selectedPlate);
        const selectedShape = await page.evaluate(() => AppState.selectedShape);


        // The plate should be selected, NOT the ellipse
        expect(selectedPlate?.id).toBe(plateId);
        expect(selectedShape).toBeNull();
    });
});
