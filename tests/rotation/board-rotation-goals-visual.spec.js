/**
 * Tests to ensure default goals maintain correct visual position and size at all rotation angles.
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

test.describe('Default goals visual position and size during rotation', () => {
    test('default goals are correctly sized and positioned at all rotation angles', async ({ page }) => {
        await goto(page);

        // Store initial board ID for later tests
        const initialBoardId = await page.evaluate(() => AppState.currentBoardId);

        // Get initial state at 0°
        const at0 = await page.evaluate(() => {
            const goals = AppState.elements.filter(el => el.type === 'goal').sort((a, b) => a.x - b.x);
            const container = document.querySelector('.board-container');
            const containerRect = container.getBoundingClientRect();
            const canvas = AppState.canvas;

            return {
                rotation: AppState.boardRotation,
                canvasWidth: canvas.width,
                canvasHeight: canvas.height,
                boardRotationScaleFactor: AppState.boardRotationScaleFactor,
                goals: goals.map(goal => {
                    const svg = document.querySelector(`[data-element="${goal.id}"].element-svg`);
                    if (!svg) return null;
                    const rect = svg.getBoundingClientRect();

                    // Extract rotation from transform (e.g., "translate(...) rotate(90deg)")
                    const transformMatch = svg.style.transform.match(/rotate\(([-\d.]+)deg\)/);
                    let cssRotation = transformMatch ? parseFloat(transformMatch[1]) : 0;
                    // Normalize to 0-359 range
                    cssRotation = ((cssRotation % 360) + 360) % 360;

                    return {
                        id: goal.id,
                        dataRotation: goal.rotation !== undefined ? goal.rotation : 0,
                        cssRotation: cssRotation,
                        visualWidth: rect.width,
                        visualHeight: rect.height,
                        visualCenterX: rect.left + rect.width / 2 - containerRect.left,
                        visualCenterY: rect.top + rect.height / 2 - containerRect.top,
                        visualLeft: rect.left - containerRect.left,
                        visualTop: rect.top - containerRect.top,
                        visualRight: rect.right - containerRect.left,
                        visualBottom: rect.bottom - containerRect.top
                    };
                }),
                containerWidth: containerRect.width,
                containerHeight: containerRect.height,
                boardWidth: AppState.boardWidth,
                boardHeight: AppState.boardHeight
            };
        });

        expect(at0.rotation).toBe(0);
        expect(at0.goals.length).toBe(2);
        expect(at0.goals[0]).not.toBeNull();
        expect(at0.goals[1]).not.toBeNull();

        // At 0°: goals should be on left and right edges
        // Left goal (x ≈ 250) should be near left edge
        // Right goal (x ≈ 4250) should be near right edge
        const leftGoal = at0.goals[0];  // x = 250
        const rightGoal = at0.goals[1]; // x = 4250

        // Goals should have consistent size at 0°
        const goal0Width = leftGoal.visualWidth;
        const goal0Height = leftGoal.visualHeight;
        expect(Math.abs(rightGoal.visualWidth - goal0Width)).toBeLessThan(2);
        expect(Math.abs(rightGoal.visualHeight - goal0Height)).toBeLessThan(2);

        // Goals should be taller than wide (goal is 100x300cm)
        expect(leftGoal.visualHeight).toBeGreaterThan(leftGoal.visualWidth * 2);
        expect(rightGoal.visualHeight).toBeGreaterThan(rightGoal.visualWidth * 2);

        // Left goal should be near left edge, right goal near right edge
        expect(leftGoal.visualCenterX).toBeLessThan(at0.containerWidth * 0.3);
        expect(rightGoal.visualCenterX).toBeGreaterThan(at0.containerWidth * 0.7);

        // Both should be vertically centered
        expect(Math.abs(leftGoal.visualCenterY - at0.containerHeight / 2)).toBeLessThan(at0.containerHeight * 0.2);
        expect(Math.abs(rightGoal.visualCenterY - at0.containerHeight / 2)).toBeLessThan(at0.containerHeight * 0.2);

        // Goals face opposite directions: left goal faces right (0°), right goal faces left (180°)
        expect(leftGoal.dataRotation).toBe(0);
        expect(rightGoal.dataRotation).toBe(180);

        // CSS rotation should match data rotation (goals are rendered with their correct orientation)
        expect(leftGoal.cssRotation).toBe(0);
        expect(rightGoal.cssRotation).toBe(180);

        // Rotate 90° left (counter-clockwise)
        await rightClickBoard(page);
        let menu = await getBoardCanvasMenu(page);
        await menu.locator('[data-action="rotate-left"]').click();
        await page.waitForTimeout(200);

        const at90 = await page.evaluate(() => {
            const goals = AppState.elements.filter(el => el.type === 'goal');
            const container = document.querySelector('.board-container');
            const containerRect = container.getBoundingClientRect();
            const canvas = AppState.canvas;
            const playersLayer = document.getElementById('players-layer');

            return {
                rotation: AppState.boardRotation,
                scaleFactor: AppState.boardRotationScaleFactor || 1,
                goals: goals.map(goal => {
                    const svg = document.querySelector(`[data-element="${goal.id}"].element-svg`);
                    if (!svg) return null;
                    const rect = svg.getBoundingClientRect();

                    // Extract rotation from transform (e.g., "translate(...) rotate(90deg)")
                    const transformMatch = svg.style.transform.match(/rotate\(([-\d.]+)deg\)/);
                    let cssRotation = transformMatch ? parseFloat(transformMatch[1]) : 0;
                    // Normalize to 0-359 range
                    cssRotation = ((cssRotation % 360) + 360) % 360;

                    return {
                        id: goal.id,
                        dataRotation: goal.rotation !== undefined ? goal.rotation : 0,
                        cssRotation: cssRotation,
                        visualWidth: rect.width,
                        visualHeight: rect.height,
                        visualCenterX: rect.left + rect.width / 2 - containerRect.left,
                        visualCenterY: rect.top + rect.height / 2 - containerRect.top
                    };
                }),
                containerWidth: containerRect.width,
                containerHeight: containerRect.height
            };
        });

        expect(at90.rotation).toBe(270);
        expect(at90.goals.length).toBe(2);
        expect(at90.goals[0]).not.toBeNull();
        expect(at90.goals[1]).not.toBeNull();

        // At 270° (90° left): original left goal should now be at top, right goal at bottom
        // At 270° board rotation, goals rotate WITH the board, so they maintain orientation relative to board
        // They also scale proportionally with board layer (boardRotationScaleFactor)
        const goals90 = at90.goals;
        const scaleFactor = at90.scaleFactor; // Use actual scale factor from the test

        // Width and height swap because goals rotate 90°, and both dimensions scale down
        const expectedWidth = goal0Height * scaleFactor;
        const expectedHeight = goal0Width * scaleFactor;

        expect(Math.abs(goals90[0].visualWidth - expectedWidth)).toBeLessThan(expectedWidth * 0.2);
        expect(Math.abs(goals90[0].visualHeight - expectedHeight)).toBeLessThan(expectedHeight * 0.2);
        expect(Math.abs(goals90[1].visualWidth - expectedWidth)).toBeLessThan(expectedWidth * 0.2);
        expect(Math.abs(goals90[1].visualHeight - expectedHeight)).toBeLessThan(expectedHeight * 0.2);

        // Goals rotate WITH board, so they appear horizontal (wider than tall)
        expect(goals90[0].visualWidth).toBeGreaterThan(goals90[0].visualHeight * 2);
        expect(goals90[1].visualWidth).toBeGreaterThan(goals90[1].visualHeight * 2);

        // One goal should be near top, one near bottom
        const topGoal90 = goals90.find(g => g.visualCenterY < at90.containerHeight / 2);
        const bottomGoal90 = goals90.find(g => g.visualCenterY > at90.containerHeight / 2);
        expect(topGoal90).toBeDefined();
        expect(bottomGoal90).toBeDefined();

        expect(topGoal90.visualCenterY).toBeLessThan(at90.containerHeight * 0.3);
        expect(bottomGoal90.visualCenterY).toBeGreaterThan(at90.containerHeight * 0.7);

        // Both should be horizontally centered
        expect(Math.abs(topGoal90.visualCenterX - at90.containerWidth / 2)).toBeLessThan(at90.containerWidth * 0.2);
        expect(Math.abs(bottomGoal90.visualCenterX - at90.containerWidth / 2)).toBeLessThan(at90.containerWidth * 0.2);

        // Goals maintain their data rotation values (these don't change with board rotation)
        // Visual rotation is handled by the board layer CSS transform
        const leftGoal90 = goals90.find(g => g.id === leftGoal.id);
        const rightGoal90 = goals90.find(g => g.id === rightGoal.id);

        // Data rotation stays the same (0 for left goal, 180 for right goal)
        expect(leftGoal90.dataRotation).toBe(0);
        expect(rightGoal90.dataRotation).toBe(180);

        // CSS rotation on individual elements should also match their data rotation
        // The board layer transform handles the visual 270° rotation
        expect(leftGoal90.cssRotation).toBe(0);
        expect(rightGoal90.cssRotation).toBe(180);

        // Rotate to 180° (another 90° left)
        await rightClickBoard(page);
        menu = await getBoardCanvasMenu(page);
        await menu.locator('[data-action="rotate-left"]').click();
        await page.waitForTimeout(200);

        const at180 = await page.evaluate(() => {
            const goals = AppState.elements.filter(el => el.type === 'goal').sort((a, b) => a.x - b.x);
            const container = document.querySelector('.board-container');
            const containerRect = container.getBoundingClientRect();

            return {
                rotation: AppState.boardRotation,
                scaleFactor: AppState.boardRotationScaleFactor || 1,
                goals: goals.map(goal => {
                    const svg = document.querySelector(`[data-element="${goal.id}"].element-svg`);
                    if (!svg) return null;
                    const rect = svg.getBoundingClientRect();

                    // Extract rotation from transform (e.g., "translate(...) rotate(90deg)")
                    const transformMatch = svg.style.transform.match(/rotate\(([-\d.]+)deg\)/);
                    let cssRotation = transformMatch ? parseFloat(transformMatch[1]) : 0;
                    // Normalize to 0-359 range
                    cssRotation = ((cssRotation % 360) + 360) % 360;

                    return {
                        id: goal.id,
                        dataRotation: goal.rotation !== undefined ? goal.rotation : 0,
                        cssRotation: cssRotation,
                        visualWidth: rect.width,
                        visualHeight: rect.height,
                        visualCenterX: rect.left + rect.width / 2 - containerRect.left,
                        visualCenterY: rect.top + rect.height / 2 - containerRect.top
                    };
                }),
                containerWidth: containerRect.width,
                containerHeight: containerRect.height
            };
        });

        expect(at180.rotation).toBe(180);
        expect(at180.goals.length).toBe(2);

        // At 180°: goals should be on right and left edges (swapped from 0°)
        const leftGoal180 = at180.goals[0];  // x = 250 (now visually on right)
        const rightGoal180 = at180.goals[1]; // x = 4250 (now visually on left)

        // Goals should maintain the same visual size
        expect(Math.abs(leftGoal180.visualWidth - goal0Width)).toBeLessThan(goal0Width * 0.1);
        expect(Math.abs(leftGoal180.visualHeight - goal0Height)).toBeLessThan(goal0Height * 0.1);
        expect(Math.abs(rightGoal180.visualWidth - goal0Width)).toBeLessThan(goal0Width * 0.1);
        expect(Math.abs(rightGoal180.visualHeight - goal0Height)).toBeLessThan(goal0Height * 0.1);

        // Goals should still be taller than wide
        expect(leftGoal180.visualHeight).toBeGreaterThan(leftGoal180.visualWidth * 2);
        expect(rightGoal180.visualHeight).toBeGreaterThan(rightGoal180.visualWidth * 2);

        // At 180°, positions are swapped: original left goal (x=250) is now visually on right
        expect(rightGoal180.visualCenterX).toBeLessThan(at180.containerWidth * 0.3);
        expect(leftGoal180.visualCenterX).toBeGreaterThan(at180.containerWidth * 0.7);

        // Goals maintain their data rotation (0° for left, 180° for right)
        // Visual rotation is handled by the board layer CSS transform (180°)
        const origLeftGoal180 = at180.goals.find(g => g.id === leftGoal.id);
        const origRightGoal180 = at180.goals.find(g => g.id === rightGoal.id);
        expect(origLeftGoal180.dataRotation).toBe(0);
        expect(origRightGoal180.dataRotation).toBe(180);

        // CSS rotation on individual elements matches their data rotation
        expect(origLeftGoal180.cssRotation).toBe(0);
        expect(origRightGoal180.cssRotation).toBe(180);

        // Rotate to 270° (another 90° left, which is 90° right from 0°)
        await rightClickBoard(page);
        menu = await getBoardCanvasMenu(page);
        await menu.locator('[data-action="rotate-left"]').click();
        await page.waitForTimeout(200);

        const at270 = await page.evaluate(() => {
            const goals = AppState.elements.filter(el => el.type === 'goal');
            const container = document.querySelector('.board-container');
            const containerRect = container.getBoundingClientRect();

            return {
                rotation: AppState.boardRotation,
                scaleFactor: AppState.boardRotationScaleFactor || 1,
                goals: goals.map(goal => {
                    const svg = document.querySelector(`[data-element="${goal.id}"].element-svg`);
                    if (!svg) return null;
                    const rect = svg.getBoundingClientRect();

                    // Extract rotation from transform (e.g., "translate(...) rotate(90deg)")
                    const transformMatch = svg.style.transform.match(/rotate\(([-\d.]+)deg\)/);
                    let cssRotation = transformMatch ? parseFloat(transformMatch[1]) : 0;
                    // Normalize to 0-359 range
                    cssRotation = ((cssRotation % 360) + 360) % 360;

                    return {
                        id: goal.id,
                        dataRotation: goal.rotation !== undefined ? goal.rotation : 0,
                        cssRotation: cssRotation,
                        visualWidth: rect.width,
                        visualHeight: rect.height,
                        visualCenterX: rect.left + rect.width / 2 - containerRect.left,
                        visualCenterY: rect.top + rect.height / 2 - containerRect.top
                    };
                }),
                containerWidth: containerRect.width,
                containerHeight: containerRect.height
            };
        });

        expect(at270.rotation).toBe(90);
        expect(at270.goals.length).toBe(2);

        // At 90° (270° left = 90° right): original left goal should be at bottom, right goal at top
        const goals270 = at270.goals;

        // At 90° board rotation, goals rotate WITH board and scale proportionally
        // Width and height swap, and both dimensions scale by ~0.556
        expect(Math.abs(goals270[0].visualWidth - expectedWidth)).toBeLessThan(expectedWidth * 0.15);
        expect(Math.abs(goals270[0].visualHeight - expectedHeight)).toBeLessThan(expectedHeight * 0.15);
        expect(Math.abs(goals270[1].visualWidth - expectedWidth)).toBeLessThan(expectedWidth * 0.15);
        expect(Math.abs(goals270[1].visualHeight - expectedHeight)).toBeLessThan(expectedHeight * 0.15);

        // Goals rotate WITH board, so they appear horizontal (wider than tall)
        expect(goals270[0].visualWidth).toBeGreaterThan(goals270[0].visualHeight * 2);
        expect(goals270[1].visualWidth).toBeGreaterThan(goals270[1].visualHeight * 2);

        // One goal should be near top, one near bottom
        const topGoal270 = goals270.find(g => g.visualCenterY < at270.containerHeight / 2);
        const bottomGoal270 = goals270.find(g => g.visualCenterY > at270.containerHeight / 2);
        expect(topGoal270).toBeDefined();
        expect(bottomGoal270).toBeDefined();

        expect(topGoal270.visualCenterY).toBeLessThan(at270.containerHeight * 0.3);
        expect(bottomGoal270.visualCenterY).toBeGreaterThan(at270.containerHeight * 0.7);

        // Both should be horizontally centered
        expect(Math.abs(topGoal270.visualCenterX - at270.containerWidth / 2)).toBeLessThan(at270.containerWidth * 0.2);
        expect(Math.abs(bottomGoal270.visualCenterX - at270.containerWidth / 2)).toBeLessThan(at270.containerWidth * 0.2);

        // Goals maintain their data rotation (0° for left, 180° for right)
        // Visual rotation is handled by the board layer CSS transform (270°)
        const origLeftGoal270 = goals270.find(g => g.id === leftGoal.id);
        const origRightGoal270 = goals270.find(g => g.id === rightGoal.id);
        expect(origLeftGoal270.dataRotation).toBe(0);
        expect(origRightGoal270.dataRotation).toBe(180);

        // CSS rotation on individual elements matches their data rotation
        expect(origLeftGoal270.cssRotation).toBe(0);
        expect(origRightGoal270.cssRotation).toBe(180);

        // Test rotating right (clockwise)
        await rightClickBoard(page);
        menu = await getBoardCanvasMenu(page);
        await menu.locator('[data-action="rotate-right"]').click();
        await page.waitForTimeout(200);

        const afterRotateRight = await page.evaluate(() => {
            const goals = AppState.elements.filter(el => el.type === 'goal');
            const container = document.querySelector('.board-container');
            const containerRect = container.getBoundingClientRect();

            return {
                rotation: AppState.boardRotation,
                scaleFactor: AppState.boardRotationScaleFactor || 1,
                goals: goals.map(goal => {
                    const svg = document.querySelector(`[data-element="${goal.id}"].element-svg`);
                    if (!svg) return null;
                    const rect = svg.getBoundingClientRect();

                    const transformMatch = svg.style.transform.match(/rotate\(([-\d.]+)deg\)/);
                    let cssRotation = transformMatch ? parseFloat(transformMatch[1]) : 0;
                    cssRotation = ((cssRotation % 360) + 360) % 360;

                    return {
                        id: goal.id,
                        dataRotation: goal.rotation !== undefined ? goal.rotation : 0,
                        cssRotation: cssRotation
                    };
                })
            };
        });

        expect(afterRotateRight.rotation).toBe(180);  // From 90° + 90° right = 180°
        const leftGoalAfterRight = afterRotateRight.goals.find(g => g.id === leftGoal.id);
        const rightGoalAfterRight = afterRotateRight.goals.find(g => g.id === rightGoal.id);
        // Goals maintain their individual rotation
        expect(leftGoalAfterRight.cssRotation).toBe(0);
        expect(rightGoalAfterRight.cssRotation).toBe(180);

        // Test reset rotation - need to open settings tab first
        await page.click('button[data-tab="settings"]');
        await page.waitForTimeout(200);
        await page.click('#btn-reset-rotation');
        await page.waitForTimeout(200);

        const afterReset = await page.evaluate(() => {
            const goals = AppState.elements.filter(el => el.type === 'goal');
            const container = document.querySelector('.board-container');
            const containerRect = container.getBoundingClientRect();

            return {
                rotation: AppState.boardRotation,
                scaleFactor: AppState.boardRotationScaleFactor || 1,
                goals: goals.map(goal => {
                    const svg = document.querySelector(`[data-element="${goal.id}"].element-svg`);
                    if (!svg) return null;
                    const rect = svg.getBoundingClientRect();

                    const transformMatch = svg.style.transform.match(/rotate\(([-\d.]+)deg\)/);
                    let cssRotation = transformMatch ? parseFloat(transformMatch[1]) : 0;
                    cssRotation = ((cssRotation % 360) + 360) % 360;

                    return {
                        id: goal.id,
                        dataRotation: goal.rotation !== undefined ? goal.rotation : 0,
                        cssRotation: cssRotation
                    };
                })
            };
        });

        expect(afterReset.rotation).toBe(0);
        const leftGoalAfterReset = afterReset.goals.find(g => g.id === leftGoal.id);
        const rightGoalAfterReset = afterReset.goals.find(g => g.id === rightGoal.id);
        // After reset to 0°, goals have been rotated through 90→180→0, so:
        // Left goal: was at 90°, rotated to 180°, reset means it goes back to its state relative to 0° board
        // Since goals rotate with board, when board is reset to 0°, goals should also be back to original rotations
        expect(leftGoalAfterReset.cssRotation).toBe(0);
        expect(rightGoalAfterReset.cssRotation).toBe(180);
    });

    test('new board created at rotated angle has correct goal orientations', async ({ page }) => {
        await goto(page);

        // Rotate board to 180°
        await rightClickBoard(page);
        let menu = await getBoardCanvasMenu(page);
        await menu.locator('[data-action="rotate-right"]').click();
        await page.waitForTimeout(200);

        await rightClickBoard(page);
        menu = await getBoardCanvasMenu(page);
        await menu.locator('[data-action="rotate-right"]').click();
        await page.waitForTimeout(200);

        // Verify we're at 180°
        const rotation = await page.evaluate(() => AppState.boardRotation);
        expect(rotation).toBe(180);

        // Create a new board via file menu
        await page.click('#btn-file-menu');
        await page.waitForTimeout(200);
        await page.click('#file-menu [data-action="new-board"]');
        await page.waitForTimeout(500);

        // Check that goals have correct orientation
        const boardState = await page.evaluate(() => {
            const goals = AppState.elements.filter(el => el.type === 'goal').sort((a, b) => a.x - b.x);

            return {
                rotation: AppState.boardRotation,
                scaleFactor: AppState.boardRotationScaleFactor || 1,
                goals: goals.map(goal => {
                    const svg = document.querySelector(`[data-element="${goal.id}"].element-svg`);
                    if (!svg) return null;

                    const transformMatch = svg.style.transform.match(/rotate\(([-\d.]+)deg\)/);
                    let cssRotation = transformMatch ? parseFloat(transformMatch[1]) : 0;
                    cssRotation = ((cssRotation % 360) + 360) % 360;

                    return {
                        id: goal.id,
                        dataRotation: goal.rotation !== undefined ? goal.rotation : 0,
                        cssRotation: cssRotation,
                        x: goal.x
                    };
                })
            };
        });

        expect(boardState.rotation).toBe(180);
        expect(boardState.goals.length).toBe(2);

        const leftGoal = boardState.goals[0];  // x = 250
        const rightGoal = boardState.goals[1]; // x = 4250

        // Goals maintain their data rotation (0° and 180°)
        // Visual rotation is handled by the board layer CSS transform (180°)
        expect(leftGoal.cssRotation).toBe(0);
        expect(rightGoal.cssRotation).toBe(180);
    });
});
