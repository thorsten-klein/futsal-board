/**
 * Tests to verify non-rotatable elements (cones, poles, balls, plates) stay visually upright
 * regardless of board rotation. They should always appear as they do in the sidebar.
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

test.describe('Non-rotatable elements stay visually upright', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
    });

    test('cone stays upright at 90° rotation', async ({ page }) => {
        const coneId = await page.evaluate(() => {
            const cone = {
                id: `element-${AppState.nextElementId++}`,
                type: 'cone',
                x: 2250,
                y: 1250,
                rotation: 0,
                visible: true
            };
            AppState.elements.push(cone);
            Elements.render();
            return cone.id;
        });

        // Get cone bounding box before rotation
        const beforeBox = await page.evaluate((id) => {
            const svg = document.querySelector(`[data-element="${id}"].element-svg`);
            if (!svg) return null;
            const rect = svg.getBoundingClientRect();
            return {
                width: rect.width,
                height: rect.height,
                centerX: rect.left + rect.width / 2,
                centerY: rect.top + rect.height / 2
            };
        }, coneId);

        expect(beforeBox).not.toBeNull();
        // Cone should be taller than it is wide (upright)
        expect(beforeBox.height).toBeGreaterThan(beforeBox.width);

        // Rotate board 90°
        await rightClickBoard(page);
        const menu = await getBoardCanvasMenu(page);
        await menu.locator('[data-action="rotate-right"]').click();
        await page.waitForTimeout(200);

        // Get cone bounding box after rotation
        const afterBox = await page.evaluate((id) => {
            const svg = document.querySelector(`[data-element="${id}"].element-svg`);
            if (!svg) return null;
            const rect = svg.getBoundingClientRect();
            return {
                width: rect.width,
                height: rect.height,
                centerX: rect.left + rect.width / 2,
                centerY: rect.top + rect.height / 2
            };
        }, coneId);

        expect(afterBox).not.toBeNull();
        // Cone should STILL be taller than wide (upright, not rotated)
        expect(afterBox.height).toBeGreaterThan(afterBox.width);

        // Cone scales proportionally with board layer (boardRotationScaleFactor ~0.556 at 90°)
        const scaleFactor = await page.evaluate(() => AppState.boardRotationScaleFactor || 1);
        const expectedWidth = beforeBox.width * scaleFactor;
        const expectedHeight = beforeBox.height * scaleFactor;

        expect(Math.abs(afterBox.width - expectedWidth)).toBeLessThan(expectedWidth * 0.15);
        expect(Math.abs(afterBox.height - expectedHeight)).toBeLessThan(expectedHeight * 0.15);
    });

    test('pole stays upright at 180° rotation', async ({ page }) => {
        const poleId = await page.evaluate(() => {
            const pole = {
                id: `element-${AppState.nextElementId++}`,
                type: 'pole',
                x: 2250,
                y: 1250,
                rotation: 0,
                visible: true
            };
            AppState.elements.push(pole);
            Elements.render();
            return pole.id;
        });

        // Get pole dimensions before rotation
        const beforeBox = await page.evaluate((id) => {
            const svg = document.querySelector(`[data-element="${id}"].element-svg`);
            if (!svg) return null;
            const rect = svg.getBoundingClientRect();
            return {
                width: rect.width,
                height: rect.height
            };
        }, poleId);

        expect(beforeBox).not.toBeNull();
        // Pole should be taller than wide (upright)
        expect(beforeBox.height).toBeGreaterThan(beforeBox.width * 2);

        // Rotate board 180°
        await rightClickBoard(page);
        let menu = await getBoardCanvasMenu(page);
        await menu.locator('[data-action="rotate-right"]').click();
        await page.waitForTimeout(200);

        await rightClickBoard(page);
        menu = await getBoardCanvasMenu(page);
        await menu.locator('[data-action="rotate-right"]').click();
        await page.waitForTimeout(200);

        // Get pole dimensions after rotation
        const afterBox = await page.evaluate((id) => {
            const svg = document.querySelector(`[data-element="${id}"].element-svg`);
            if (!svg) return null;
            const rect = svg.getBoundingClientRect();
            return {
                width: rect.width,
                height: rect.height
            };
        }, poleId);

        expect(afterBox).not.toBeNull();
        // Pole should STILL be taller than wide (upright, not upside down)
        expect(afterBox.height).toBeGreaterThan(afterBox.width * 2);

        // Dimensions should remain similar
        expect(Math.abs(afterBox.width - beforeBox.width)).toBeLessThan(beforeBox.width * 0.25);
        expect(Math.abs(afterBox.height - beforeBox.height)).toBeLessThan(beforeBox.height * 0.25);
    });

    test('ball stays circular at all rotations', async ({ page }) => {
        const ballId = await page.evaluate(() => {
            const ball = {
                id: `ball-${AppState.nextBallId++}`,
                x: 2250,
                y: 1250,
                color: '#ff0000',
                visible: true
            };
            AppState.balls.push(ball);
            Balls.render();
            return ball.id;
        });

        // Test at 0°, 90°, 180°, 270°
        for (let i = 0; i < 4; i++) {
            if (i > 0) {
                await rightClickBoard(page);
                const menu = await getBoardCanvasMenu(page);
                await menu.locator('[data-action="rotate-right"]').click();
                await page.waitForTimeout(200);
            }

            const box = await page.evaluate(({ id, angle }) => {
                const svg = document.querySelector(`[data-ball="${id}"].ball-svg`);
                if (!svg) return null;
                const rect = svg.getBoundingClientRect();
                return {
                    width: rect.width,
                    height: rect.height,
                    angle: angle
                };
            }, { id: ballId, angle: i * 90 });

            expect(box).not.toBeNull();
            // Ball should always be roughly square/circular (width ≈ height)
            const ratio = box.width / box.height;
            expect(ratio).toBeGreaterThan(0.9);
            expect(ratio).toBeLessThan(1.1);
        }
    });

    test('plate stays square at all rotations', async ({ page }) => {
        const plateId = await page.evaluate(() => {
            const plate = {
                id: `plate-${AppState.nextPlateId++}`,
                x: 2250,
                y: 1250,
                color: '#00ff00',
                visible: true
            };
            AppState.plates.push(plate);
            Plates.render();
            return plate.id;
        });

        // Test at 0°, 90°, 180°, 270°
        for (let i = 0; i < 4; i++) {
            if (i > 0) {
                await rightClickBoard(page);
                const menu = await getBoardCanvasMenu(page);
                await menu.locator('[data-action="rotate-right"]').click();
                await page.waitForTimeout(200);
            }

            const box = await page.evaluate(({ id, angle }) => {
                const svg = document.querySelector(`[data-plate="${id}"].plate-svg`);
                if (!svg) return null;
                const rect = svg.getBoundingClientRect();
                return {
                    width: rect.width,
                    height: rect.height,
                    angle: angle
                };
            }, { id: plateId, angle: i * 90 });

            expect(box).not.toBeNull();
            // Plate should always be roughly square (width ≈ height)
            const ratio = box.width / box.height;
            expect(ratio).toBeGreaterThan(0.9);
            expect(ratio).toBeLessThan(1.1);
        }
    });

    test('multiple cones all stay upright at 270° rotation', async ({ page }) => {
        const coneIds = await page.evaluate(() => {
            const ids = [];
            for (let i = 0; i < 3; i++) {
                const cone = {
                    id: `element-${AppState.nextElementId++}`,
                    type: 'cone',
                    x: 1000 + i * 1000,
                    y: 1250,
                    rotation: 0,
                    visible: true
                };
                AppState.elements.push(cone);
                ids.push(cone.id);
            }
            Elements.render();
            return ids;
        });

        // Rotate board 270° (left)
        await rightClickBoard(page);
        const menu = await getBoardCanvasMenu(page);
        await menu.locator('[data-action="rotate-left"]').click();
        await page.waitForTimeout(200);

        // Check all cones are upright
        const boxes = await page.evaluate((ids) => {
            return ids.map(id => {
                const svg = document.querySelector(`[data-element="${id}"].element-svg`);
                if (!svg) return null;
                const rect = svg.getBoundingClientRect();
                return {
                    width: rect.width,
                    height: rect.height
                };
            });
        }, coneIds);

        boxes.forEach(box => {
            expect(box).not.toBeNull();
            // All cones should be taller than wide (upright)
            expect(box.height).toBeGreaterThan(box.width);
        });
    });
});
