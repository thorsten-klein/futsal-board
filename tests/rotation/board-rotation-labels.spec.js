/**
 * Tests for player numbers and path labels staying upright during board rotation.
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

test.describe('Labels stay upright during rotation', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
    });

    test('player number stays upright at 90° rotation', async ({ page }) => {
        const playerId = await page.evaluate(() => {
            const player = {
                id: `player-${AppState.nextPlayerId++}`,
                x: 2250,
                y: 1250,
                teamId: 'team-1',
                number: 7,
                rotation: 0,
                visible: true
            };
            AppState.players.push(player);
            Players.render();
            return player.id;
        });

        // Rotate board 90° right
        await rightClickBoard(page);
        const menu = await getBoardCanvasMenu(page);
        await menu.locator('[data-action="rotate-right"]').click();
        await page.waitForTimeout(200);

        // Check player number transform
        const numberTransform = await page.evaluate((id) => {
            const playerDiv = document.querySelector(`[data-player-id="${id}"]`);
            if (!playerDiv) return null;
            const numberSpan = playerDiv.querySelector('.player-number');
            return numberSpan ? numberSpan.style.transform : null;
        }, playerId);

        // Player rotation stays at 0° (user-set value), board rotation is 90°
        // Total counter-rotation should be -(0 + 90) = -90°
        expect(numberTransform).toContain('rotate(-90deg)');
    });

    test('player number stays upright at 180° rotation', async ({ page }) => {
        const playerId = await page.evaluate(() => {
            const player = {
                id: `player-${AppState.nextPlayerId++}`,
                x: 2250,
                y: 1250,
                teamId: 'team-1',
                number: 3,
                rotation: 0,
                visible: true
            };
            AppState.players.push(player);
            Players.render();
            return player.id;
        });

        // Rotate board 180°
        await rightClickBoard(page);
        let menu = await getBoardCanvasMenu(page);
        await menu.locator('[data-action="rotate-right"]').click();
        await page.waitForTimeout(200);

        await rightClickBoard(page);
        menu = await getBoardCanvasMenu(page);
        await menu.locator('[data-action="rotate-right"]').click();
        await page.waitForTimeout(200);

        // Check player number transform
        const numberTransform = await page.evaluate((id) => {
            const playerDiv = document.querySelector(`[data-player-id="${id}"]`);
            if (!playerDiv) return null;
            const numberSpan = playerDiv.querySelector('.player-number');
            return numberSpan ? numberSpan.style.transform : null;
        }, playerId);

        // Player rotation stays at 0° (user-set value), board rotation is 180°
        // Total counter-rotation should be -(0 + 180) = -180°
        expect(numberTransform).toContain('rotate(-180deg)');
    });

    test('player number stays upright at 270° rotation', async ({ page }) => {
        const playerId = await page.evaluate(() => {
            const player = {
                id: `player-${AppState.nextPlayerId++}`,
                x: 2250,
                y: 1250,
                teamId: 'team-1',
                number: 5,
                rotation: 0,
                visible: true
            };
            AppState.players.push(player);
            Players.render();
            return player.id;
        });

        // Rotate board 270° (left)
        await rightClickBoard(page);
        const menu = await getBoardCanvasMenu(page);
        await menu.locator('[data-action="rotate-left"]').click();
        await page.waitForTimeout(200);

        // Check player number transform
        const numberTransform = await page.evaluate((id) => {
            const playerDiv = document.querySelector(`[data-player-id="${id}"]`);
            if (!playerDiv) return null;
            const numberSpan = playerDiv.querySelector('.player-number');
            return numberSpan ? numberSpan.style.transform : null;
        }, playerId);

        // Player rotation stays at 0° (user-set value), board rotation is 270°
        // Total counter-rotation should be -(0 + 270) = -270°
        expect(numberTransform).toContain('rotate(-270deg)');
    });

    test('path label stays upright at 90° rotation', async ({ page }) => {
        // Create path label directly and test counter-rotation
        const labelInfo = await page.evaluate(() => {
            const pathsLayer = document.getElementById('paths-layer');
            if (!pathsLayer) return null;

            // Manually call renderPathLabel to create a label
            const x = 2000;
            const y = 1000;
            const label = 'A';

            // Call renderPathLabel directly
            if (typeof Animations !== 'undefined' && Animations.renderPathLabel) {
                Animations.renderPathLabel(pathsLayer, x, y, label);
            }

            // Find the created label
            const labels = pathsLayer.querySelectorAll('text');
            const lastLabel = labels[labels.length - 1];

            return {
                found: !!lastLabel,
                transform: lastLabel ? lastLabel.getAttribute('transform') : null,
                x: lastLabel ? lastLabel.getAttribute('x') : null
            };
        });

        expect(labelInfo.found).toBe(true);
        // At 0° rotation, label should have no transform
        expect(labelInfo.transform).toBeNull();

        // Rotate board 90° right
        await rightClickBoard(page);
        const menu = await getBoardCanvasMenu(page);
        await menu.locator('[data-action="rotate-right"]').click();
        await page.waitForTimeout(200);

        // Re-render the label at the rotated board state
        const labelInfoAfterRotation = await page.evaluate(() => {
            const pathsLayer = document.getElementById('paths-layer');
            if (!pathsLayer) return null;

            // Clear and re-render
            pathsLayer.innerHTML = '';

            const x = 2000;
            const y = 1000;
            const label = 'A';

            if (typeof Animations !== 'undefined' && Animations.renderPathLabel) {
                Animations.renderPathLabel(pathsLayer, x, y, label);
            }

            const labels = pathsLayer.querySelectorAll('text');
            const lastLabel = labels[labels.length - 1];

            return {
                found: !!lastLabel,
                transform: lastLabel ? lastLabel.getAttribute('transform') : null
            };
        });

        expect(labelInfoAfterRotation.found).toBe(true);
        // Path label should have counter-rotation to stay upright
        // Board rotation is 90°, so label should have -90° rotation
        expect(labelInfoAfterRotation.transform).toContain('rotate(-90');
    });

    test('path label stays upright at 180° rotation', async ({ page }) => {
        // Rotate board 180°
        await rightClickBoard(page);
        let menu = await getBoardCanvasMenu(page);
        await menu.locator('[data-action="rotate-right"]').click();
        await page.waitForTimeout(200);

        await rightClickBoard(page);
        menu = await getBoardCanvasMenu(page);
        await menu.locator('[data-action="rotate-right"]').click();
        await page.waitForTimeout(200);

        // Create label after rotation
        const labelInfo = await page.evaluate(() => {
            const pathsLayer = document.getElementById('paths-layer');
            if (!pathsLayer) return null;

            pathsLayer.innerHTML = '';

            const x = 2000;
            const y = 1000;
            const label = 'B';

            if (typeof Animations !== 'undefined' && Animations.renderPathLabel) {
                Animations.renderPathLabel(pathsLayer, x, y, label);
            }

            const labels = pathsLayer.querySelectorAll('text');
            const lastLabel = labels[labels.length - 1];

            return {
                found: !!lastLabel,
                transform: lastLabel ? lastLabel.getAttribute('transform') : null
            };
        });

        expect(labelInfo.found).toBe(true);
        // Path label should have counter-rotation to stay upright
        // Board rotation is 180°, so label should have -180° rotation
        expect(labelInfo.transform).toContain('rotate(-180');
    });

    test('multiple player numbers stay upright at different board angles', async ({ page }) => {
        const playerIds = await page.evaluate(() => {
            const ids = [];
            for (let i = 0; i < 3; i++) {
                const player = {
                    id: `player-${AppState.nextPlayerId++}`,
                    x: 1000 + i * 500,
                    y: 1250,
                    teamId: 'team-1',
                    number: i + 1,
                    rotation: 0,
                    visible: true
                };
                AppState.players.push(player);
                ids.push(player.id);
            }
            Players.render();
            return ids;
        });

        // Test at 0°, 90°, 180°, 270°
        const angles = [0, 90, 180, 270];

        for (let i = 0; i < 4; i++) {
            if (i > 0) {
                await rightClickBoard(page);
                const menu = await getBoardCanvasMenu(page);
                await menu.locator('[data-action="rotate-right"]').click();
                await page.waitForTimeout(200);
            }

            const angle = angles[i];

            // Check all player number transforms
            const transforms = await page.evaluate((ids) => {
                return ids.map(id => {
                    const playerDiv = document.querySelector(`[data-player-id="${id}"]`);
                    const numberSpan = playerDiv?.querySelector('.player-number');
                    return numberSpan ? numberSpan.style.transform : null;
                });
            }, playerIds);

            // All player numbers should have appropriate counter-rotation
            // Player rotation stays at 0 (user-set value), so counter-rotation is just -boardRotation
            const expectedRotation = -angle; // -(0 + boardRotation)
            if (expectedRotation !== 0) {
                transforms.forEach(transform => {
                    expect(transform).toContain(`rotate(${expectedRotation}deg)`);
                });
            }
        }
    });
});
