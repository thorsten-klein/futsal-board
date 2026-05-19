/**
 * Debug test to check coordinate transformation at 90° rotation
 */
import { test, expect } from './test-config.js';
import { goto } from './helpers.js';

test('check coordinate transformation at 90°', async ({ page }) => {
    await goto(page);

    // Rotate board to 90°
    await page.click('button[data-tab="settings"]');
    await page.waitForTimeout(200);
    await page.click('#btn-rotate-right');
    await page.waitForTimeout(500);

    // Test coordinate transformation
    const result = await page.evaluate(() => {
        const testX = 780;
        const testY = 397;

        const coords1 = Utils.screenToBoardCoords(testX, testY);
        const coords2 = Utils.screenToBoardCoords(testX + 1, testY + 1);

        return {
            canvas: {
                width: AppState.canvas.width,
                height: AppState.canvas.height,
                boundingWidth: AppState.canvas.getBoundingClientRect().width,
                boundingHeight: AppState.canvas.getBoundingClientRect().height
            },
            boardRotation: AppState.boardRotation,
            scaleFactor: AppState.boardRotationScaleFactor,
            referenceScale: AppState.referenceScale,
            coords1,
            coords2,
            delta: {
                x: coords2.x - coords1.x,
                y: coords2.y - coords1.y
            }
        };
    });

    console.log('Canvas dimensions:', result.canvas);
    console.log('Board rotation:', result.boardRotation);
    console.log('Scale factor:', result.scaleFactor);
    console.log('Reference scale:', result.referenceScale);
    console.log('Screen (780, 397) -> Board:', result.coords1);
    console.log('Screen (781, 398) -> Board:', result.coords2);
    console.log('Delta for 1px move:', result.delta);

    // A 1-pixel screen movement should result in a small board coordinate change
    // Not a 7cm jump!
    expect(Math.abs(result.delta.x)).toBeLessThan(10);
    expect(Math.abs(result.delta.y)).toBeLessThan(10);
});
