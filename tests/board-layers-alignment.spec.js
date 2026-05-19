/**
 * Tests to ensure all board layers are properly aligned and sized.
 */
import { test, expect } from './test-config.js';
import { goto } from './helpers.js';

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

test.describe('Board layers alignment', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
    });

    test('players-layer matches board-canvas size and position at 0°', async ({ page }) => {
        const layers = await page.evaluate(() => {
            const canvas = document.getElementById('board-canvas');
            const playersLayer = document.getElementById('players-layer');
            const container = document.querySelector('.board-container');

            const canvasRect = canvas.getBoundingClientRect();
            const playersRect = playersLayer.getBoundingClientRect();
            const containerRect = container.getBoundingClientRect();

            return {
                canvas: {
                    width: canvasRect.width,
                    height: canvasRect.height,
                    left: canvasRect.left,
                    top: canvasRect.top
                },
                players: {
                    width: playersRect.width,
                    height: playersRect.height,
                    left: playersRect.left,
                    top: playersRect.top
                },
                container: {
                    width: containerRect.width,
                    height: containerRect.height
                }
            };
        });

        // players-layer should be exactly the same size as board-canvas
        expect(Math.abs(layers.players.width - layers.canvas.width)).toBeLessThan(1);
        expect(Math.abs(layers.players.height - layers.canvas.height)).toBeLessThan(1);

        // players-layer should be at exactly the same position as board-canvas
        expect(Math.abs(layers.players.left - layers.canvas.left)).toBeLessThan(1);
        expect(Math.abs(layers.players.top - layers.canvas.top)).toBeLessThan(1);
    });

    test('board-canvas is centered in board-container at 0°', async ({ page }) => {
        const positions = await page.evaluate(() => {
            const canvas = document.getElementById('board-canvas');
            const container = document.querySelector('.board-container');

            const canvasRect = canvas.getBoundingClientRect();
            const containerRect = container.getBoundingClientRect();

            return {
                canvasLeft: canvasRect.left,
                canvasRight: canvasRect.right,
                canvasTop: canvasRect.top,
                canvasBottom: canvasRect.bottom,
                containerLeft: containerRect.left,
                containerRight: containerRect.right,
                containerTop: containerRect.top,
                containerBottom: containerRect.bottom
            };
        });

        // Calculate margins from container edges
        const leftMargin = positions.canvasLeft - positions.containerLeft;
        const rightMargin = positions.containerRight - positions.canvasRight;
        const topMargin = positions.canvasTop - positions.containerTop;
        const bottomMargin = positions.containerBottom - positions.canvasBottom;

        // Canvas should be centered horizontally (left and right margins equal)
        expect(Math.abs(leftMargin - rightMargin)).toBeLessThan(2);

        // Canvas should be centered vertically (top and bottom margins equal)
        expect(Math.abs(topMargin - bottomMargin)).toBeLessThan(2);
    });

    test('players-layer matches board-canvas size and position at 90°', async ({ page }) => {
        // Rotate board 90°
        await rightClickBoard(page);
        const menu = await getBoardCanvasMenu(page);
        await menu.locator('[data-action="rotate-right"]').click();
        await page.waitForTimeout(200);

        const layers = await page.evaluate(() => {
            const canvas = document.getElementById('board-canvas');
            const playersLayer = document.getElementById('players-layer');

            // Use CSS dimensions (untransformed) for comparison
            const canvasWidth = parseFloat(canvas.style.width);
            const canvasHeight = parseFloat(canvas.style.height);
            const canvasLeft = parseFloat(canvas.style.left);
            const canvasTop = parseFloat(canvas.style.top);

            const playersWidth = parseFloat(playersLayer.style.width);
            const playersHeight = parseFloat(playersLayer.style.height);
            const playersLeft = parseFloat(playersLayer.style.left);
            const playersTop = parseFloat(playersLayer.style.top);

            return {
                canvas: {
                    width: canvasWidth,
                    height: canvasHeight,
                    left: canvasLeft,
                    top: canvasTop
                },
                players: {
                    width: playersWidth,
                    height: playersHeight,
                    left: playersLeft,
                    top: playersTop
                }
            };
        });

        // players-layer should be exactly the same size as board-canvas (CSS size, not transformed)
        expect(Math.abs(layers.players.width - layers.canvas.width)).toBeLessThan(1);
        expect(Math.abs(layers.players.height - layers.canvas.height)).toBeLessThan(1);

        // players-layer should be at exactly the same position as board-canvas (CSS position)
        expect(Math.abs(layers.players.left - layers.canvas.left)).toBeLessThan(1);
        expect(Math.abs(layers.players.top - layers.canvas.top)).toBeLessThan(1);
    });

    test('board-canvas is centered in board-container at 90°', async ({ page }) => {
        // Rotate board 90°
        await rightClickBoard(page);
        const menu = await getBoardCanvasMenu(page);
        await menu.locator('[data-action="rotate-right"]').click();
        await page.waitForTimeout(200);

        const positions = await page.evaluate(() => {
            const canvas = document.getElementById('board-canvas');
            const container = document.querySelector('.board-container');

            const canvasRect = canvas.getBoundingClientRect();
            const containerRect = container.getBoundingClientRect();

            return {
                canvasLeft: canvasRect.left,
                canvasRight: canvasRect.right,
                canvasTop: canvasRect.top,
                canvasBottom: canvasRect.bottom,
                containerLeft: containerRect.left,
                containerRight: containerRect.right,
                containerTop: containerRect.top,
                containerBottom: containerRect.bottom
            };
        });

        // Calculate margins from container edges
        const leftMargin = positions.canvasLeft - positions.containerLeft;
        const rightMargin = positions.containerRight - positions.canvasRight;
        const topMargin = positions.canvasTop - positions.containerTop;
        const bottomMargin = positions.containerBottom - positions.canvasBottom;

        // Canvas should be centered horizontally (left and right margins equal)
        expect(Math.abs(leftMargin - rightMargin)).toBeLessThan(2);

        // Canvas should be centered vertically (top and bottom margins equal)
        expect(Math.abs(topMargin - bottomMargin)).toBeLessThan(2);
    });

    test('players-layer matches board-canvas at all rotation angles', async ({ page }) => {
        const angles = [0, 90, 180, 270];

        for (let i = 0; i < angles.length; i++) {
            if (i > 0) {
                await rightClickBoard(page);
                const menu = await getBoardCanvasMenu(page);
                await menu.locator('[data-action="rotate-right"]').click();
                await page.waitForTimeout(200);
            }

            const layers = await page.evaluate((angle) => {
                const canvas = document.getElementById('board-canvas');
                const playersLayer = document.getElementById('players-layer');

                // Use CSS dimensions (untransformed) for comparison
                const canvasWidth = parseFloat(canvas.style.width);
                const canvasHeight = parseFloat(canvas.style.height);
                const canvasLeft = parseFloat(canvas.style.left);
                const canvasTop = parseFloat(canvas.style.top);

                const playersWidth = parseFloat(playersLayer.style.width);
                const playersHeight = parseFloat(playersLayer.style.height);
                const playersLeft = parseFloat(playersLayer.style.left);
                const playersTop = parseFloat(playersLayer.style.top);

                return {
                    angle: AppState.boardRotation,
                    canvas: {
                        width: canvasWidth,
                        height: canvasHeight,
                        left: canvasLeft,
                        top: canvasTop
                    },
                    players: {
                        width: playersWidth,
                        height: playersHeight,
                        left: playersLeft,
                        top: playersTop
                    }
                };
            }, angles[i]);

            expect(layers.angle).toBe(angles[i]);

            // players-layer should match board-canvas exactly (CSS size and position)
            expect(Math.abs(layers.players.width - layers.canvas.width)).toBeLessThan(1);
            expect(Math.abs(layers.players.height - layers.canvas.height)).toBeLessThan(1);
            expect(Math.abs(layers.players.left - layers.canvas.left)).toBeLessThan(1);
            expect(Math.abs(layers.players.top - layers.canvas.top)).toBeLessThan(1);
        }
    });
});
