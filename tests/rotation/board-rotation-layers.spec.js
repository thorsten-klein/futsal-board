/**
 * Tests to ensure all board layers rotate together and board size remains correct.
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

test.describe('Board layers rotation', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
    });

    test('all board layers have rotation transform at 90°', async ({ page }) => {
        // Rotate board 90°
        await rightClickBoard(page);
        const menu = await getBoardCanvasMenu(page);
        await menu.locator('[data-action="rotate-right"]').click();
        await page.waitForTimeout(200);

        const transforms = await page.evaluate(() => {
            return {
                courtSvg: document.getElementById('court-svg')?.style.transform || '',
                boardCanvas: document.getElementById('board-canvas')?.style.transform || '',
                pathsLayer: document.getElementById('paths-layer')?.style.transform || '',
                drawingLayer: document.getElementById('drawing-layer')?.style.transform || '',
                playersLayer: document.getElementById('players-layer')?.style.transform || '',
                boardArea: document.getElementById('board-area')?.style.transform || ''
            };
        });

        // All transformed layers should have rotation transform at 90°
        expect(transforms.courtSvg).toContain('rotate(90deg)');
        expect(transforms.boardCanvas).toContain('rotate(90deg)');
        expect(transforms.drawingLayer).toContain('rotate(90deg)');
        expect(transforms.playersLayer).toContain('rotate(90deg)');

        // paths-layer and board-area are nested inside players-layer, so they
        // inherit the rotation and must NOT have their own transform.
        expect(transforms.pathsLayer || '').not.toContain('rotate');
        expect(transforms.boardArea || '').not.toContain('rotate');
    });

    test('all board layers have rotation transform at 180°', async ({ page }) => {
        // Rotate board 180°
        await rightClickBoard(page);
        let menu = await getBoardCanvasMenu(page);
        await menu.locator('[data-action="rotate-right"]').click();
        await page.waitForTimeout(200);

        await rightClickBoard(page);
        menu = await getBoardCanvasMenu(page);
        await menu.locator('[data-action="rotate-right"]').click();
        await page.waitForTimeout(200);

        const transforms = await page.evaluate(() => {
            return {
                courtSvg: document.getElementById('court-svg')?.style.transform || '',
                boardCanvas: document.getElementById('board-canvas')?.style.transform || '',
                pathsLayer: document.getElementById('paths-layer')?.style.transform || '',
                drawingLayer: document.getElementById('drawing-layer')?.style.transform || '',
                playersLayer: document.getElementById('players-layer')?.style.transform || '',
                boardArea: document.getElementById('board-area')?.style.transform || ''
            };
        });

        // All transformed layers should have rotation transform at 180°
        expect(transforms.courtSvg).toContain('rotate(180deg)');
        expect(transforms.boardCanvas).toContain('rotate(180deg)');
        expect(transforms.drawingLayer).toContain('rotate(180deg)');
        expect(transforms.playersLayer).toContain('rotate(180deg)');

        // paths-layer and board-area are nested inside players-layer, so they
        // inherit the rotation and must NOT have their own transform.
        expect(transforms.pathsLayer || '').not.toContain('rotate');
        expect(transforms.boardArea || '').not.toContain('rotate');
    });

    test('board maintains proper aspect ratio at 90° rotation', async ({ page }) => {
        // Rotate board 90°
        await rightClickBoard(page);
        const menu = await getBoardCanvasMenu(page);
        await menu.locator('[data-action="rotate-right"]').click();
        await page.waitForTimeout(200);

        // Get board container and layer sizes
        const sizes = await page.evaluate(() => {
            const container = document.querySelector('.board-container');
            const courtSvg = document.getElementById('court-svg');
            const boardCanvas = document.getElementById('board-canvas');

            const containerRect = container.getBoundingClientRect();
            const courtRect = courtSvg.getBoundingClientRect();
            const canvasRect = boardCanvas.getBoundingClientRect();

            return {
                containerWidth: containerRect.width,
                containerHeight: containerRect.height,
                courtWidth: courtRect.width,
                courtHeight: courtRect.height,
                canvasWidth: canvasRect.width,
                canvasHeight: canvasRect.height,
                boardWidth: AppState.boardWidth,
                boardHeight: AppState.boardHeight
            };
        });

        // At 90° rotation, the board is rotated so its width becomes height
        // The scale factor should adjust so the rotated board fits
        // Court and canvas should have similar dimensions
        expect(Math.abs(sizes.courtHeight - sizes.canvasHeight)).toBeLessThan(50);
        expect(Math.abs(sizes.courtWidth - sizes.canvasWidth)).toBeLessThan(50);

        // Board should fit within container (allowing some margin for rotation)
        expect(sizes.courtHeight).toBeLessThanOrEqual(sizes.containerHeight + 10);
        expect(sizes.courtWidth).toBeLessThanOrEqual(sizes.containerWidth + 10);
    });

    test('rotated board fills container height at 90° and 270°', async ({ page }) => {
        const angles = [90, 270];

        for (const angle of angles) {
            // Navigate fresh for each test
            await goto(page);

            if (angle === 90) {
                await rightClickBoard(page);
                const menu = await getBoardCanvasMenu(page);
                await menu.locator('[data-action="rotate-right"]').click();
                await page.waitForTimeout(200);
            } else if (angle === 270) {
                await rightClickBoard(page);
                const menu = await getBoardCanvasMenu(page);
                await menu.locator('[data-action="rotate-left"]').click();
                await page.waitForTimeout(200);
            }

            const sizes = await page.evaluate(() => {
                const container = document.querySelector('.board-container');
                const courtSvg = document.getElementById('court-svg');
                const boardCanvas = document.getElementById('board-canvas');

                const containerRect = container.getBoundingClientRect();
                const courtRect = courtSvg.getBoundingClientRect();
                const canvasRect = boardCanvas.getBoundingClientRect();

                return {
                    containerHeight: containerRect.height,
                    courtHeight: courtRect.height,
                    canvasHeight: canvasRect.height,
                    containerWidth: containerRect.width,
                    courtWidth: courtRect.width,
                    canvasWidth: canvasRect.width
                };
            });

            // At 90° or 270°, the rotated board should still fill the container height
            // Allow some margin for rounding
            expect(Math.abs(sizes.courtHeight - sizes.containerHeight)).toBeLessThan(100);
            expect(Math.abs(sizes.canvasHeight - sizes.containerHeight)).toBeLessThan(100);
        }
    });
});
