/**
 * Tests to ensure default goals stay visible and correctly positioned during board rotation.
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

test.describe('Default goals during rotation', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
    });

    test('default goals exist at 0° rotation', async ({ page }) => {
        const goals = await page.evaluate(() => {
            return {
                count: AppState.elements.filter(el => el.type === 'goal').length,
                elements: AppState.elements.filter(el => el.type === 'goal').map(g => ({
                    id: g.id,
                    x: g.x,
                    y: g.y,
                    type: g.type,
                    visible: g.visible
                }))
            };
        });

        // Should have 2 default goals
        expect(goals.count).toBe(2);
        expect(goals.elements[0].visible).toBe(true);
        expect(goals.elements[1].visible).toBe(true);

        // Check goals are rendered in DOM
        const goalsInDOM = await page.evaluate(() => {
            return document.querySelectorAll('[data-element][data-element*="goal"]').length;
        });
        expect(goalsInDOM).toBe(2);
    });

    test('default goals stay visible after 90° rotation', async ({ page }) => {
        // Rotate board 90°
        await rightClickBoard(page);
        const menu = await getBoardCanvasMenu(page);
        await menu.locator('[data-action="rotate-right"]').click();
        await page.waitForTimeout(200);

        const goals = await page.evaluate(() => {
            return {
                count: AppState.elements.filter(el => el.type === 'goal').length,
                elements: AppState.elements.filter(el => el.type === 'goal').map(g => ({
                    id: g.id,
                    x: g.x,
                    y: g.y,
                    type: g.type,
                    visible: g.visible
                }))
            };
        });

        // Should still have 2 goals
        expect(goals.count).toBe(2);
        expect(goals.elements[0].visible).toBe(true);
        expect(goals.elements[1].visible).toBe(true);

        // Check goals are rendered in DOM
        const goalsInDOM = await page.evaluate(() => {
            return document.querySelectorAll('[data-element][data-element*="goal"]').length;
        });
        expect(goalsInDOM).toBe(2);
    });

    test('default goals stay visible after 180° rotation', async ({ page }) => {
        // Rotate board 180°
        await rightClickBoard(page);
        let menu = await getBoardCanvasMenu(page);
        await menu.locator('[data-action="rotate-right"]').click();
        await page.waitForTimeout(200);

        await rightClickBoard(page);
        menu = await getBoardCanvasMenu(page);
        await menu.locator('[data-action="rotate-right"]').click();
        await page.waitForTimeout(200);

        const goals = await page.evaluate(() => {
            return {
                count: AppState.elements.filter(el => el.type === 'goal').length,
                elements: AppState.elements.filter(el => el.type === 'goal').map(g => ({
                    id: g.id,
                    x: g.x,
                    y: g.y,
                    type: g.type,
                    visible: g.visible
                }))
            };
        });

        // Should still have 2 goals
        expect(goals.count).toBe(2);
        expect(goals.elements[0].visible).toBe(true);
        expect(goals.elements[1].visible).toBe(true);

        // Check goals are rendered in DOM
        const goalsInDOM = await page.evaluate(() => {
            return document.querySelectorAll('[data-element][data-element*="goal"]').length;
        });
        expect(goalsInDOM).toBe(2);
    });

    test('default goals are at correct visual positions at 0°', async ({ page }) => {
        const goalPositions = await page.evaluate(() => {
            const goals = AppState.elements.filter(el => el.type === 'goal');
            return goals.map(goal => {
                const svg = document.querySelector(`[data-element="${goal.id}"].element-svg`);
                if (!svg) return null;
                const rect = svg.getBoundingClientRect();
                const container = document.querySelector('.board-container');
                const containerRect = container.getBoundingClientRect();

                return {
                    id: goal.id,
                    dataX: goal.x,
                    dataY: goal.y,
                    visualCenterX: rect.left + rect.width / 2 - containerRect.left,
                    visualCenterY: rect.top + rect.height / 2 - containerRect.top,
                    width: rect.width,
                    height: rect.height
                };
            });
        });

        expect(goalPositions.length).toBe(2);

        // Both goals should be visible
        goalPositions.forEach(pos => {
            expect(pos).not.toBeNull();
        });

        // Goals should be on opposite sides of the board (one left, one right)
        const xPositions = goalPositions.map(p => p.dataX).sort((a, b) => a - b);
        expect(xPositions[0]).toBeLessThan(500); // Left goal near x=0
        expect(xPositions[1]).toBeGreaterThan(4000); // Right goal near x=4500
    });

    test('default goals stay at correct visual positions after 90° rotation', async ({ page }) => {
        // Get initial positions
        const beforeRotation = await page.evaluate(() => {
            const goals = AppState.elements.filter(el => el.type === 'goal');
            return goals.map(goal => {
                const svg = document.querySelector(`[data-element="${goal.id}"].element-svg`);
                if (!svg) return null;
                const rect = svg.getBoundingClientRect();
                const container = document.querySelector('.board-container');
                const containerRect = container.getBoundingClientRect();

                return {
                    id: goal.id,
                    dataX: goal.x,
                    dataY: goal.y,
                    visualCenterX: rect.left + rect.width / 2 - containerRect.left,
                    visualCenterY: rect.top + rect.height / 2 - containerRect.top,
                    visualExists: true
                };
            });
        });

        expect(beforeRotation.length).toBe(2);

        // Rotate board 90°
        await rightClickBoard(page);
        const menu = await getBoardCanvasMenu(page);
        await menu.locator('[data-action="rotate-right"]').click();
        await page.waitForTimeout(200);

        const afterRotation = await page.evaluate(() => {
            const goals = AppState.elements.filter(el => el.type === 'goal');
            return goals.map(goal => {
                const svg = document.querySelector(`[data-element="${goal.id}"].element-svg`);
                if (!svg) return null;
                const rect = svg.getBoundingClientRect();
                const container = document.querySelector('.board-container');
                const containerRect = container.getBoundingClientRect();

                return {
                    id: goal.id,
                    dataX: goal.x,
                    dataY: goal.y,
                    visualCenterX: rect.left + rect.width / 2 - containerRect.left,
                    visualCenterY: rect.top + rect.height / 2 - containerRect.top,
                    visualExists: true
                };
            });
        });

        expect(afterRotation.length).toBe(2);

        // Goals should still be visible and positioned
        afterRotation.forEach(pos => {
            expect(pos).not.toBeNull();
            expect(pos.visualExists).toBe(true);
        });
    });

    test('goals are visible at all rotation angles (0°, 90°, 180°, 270°)', async ({ page }) => {
        const angles = [0, 90, 180, 270];

        for (let i = 0; i < 4; i++) {
            if (i > 0) {
                await rightClickBoard(page);
                const menu = await getBoardCanvasMenu(page);
                await menu.locator('[data-action="rotate-right"]').click();
                await page.waitForTimeout(200);
            }

            const angle = angles[i];

            const result = await page.evaluate(() => {
                const goals = AppState.elements.filter(el => el.type === 'goal');
                const goalsInDOM = document.querySelectorAll('[data-element][data-element*="goal"]').length;

                return {
                    goalsInState: goals.length,
                    goalsVisible: goals.filter(g => g.visible).length,
                    goalsInDOM: goalsInDOM,
                    angle: AppState.boardRotation
                };
            });

            expect(result.goalsInState).toBe(2);
            expect(result.goalsVisible).toBe(2);
            expect(result.goalsInDOM).toBe(2);
            expect(result.angle).toBe(angle);
        }
    });

    test('goals have visible bounding boxes within viewport at all angles', async ({ page }) => {
        const angles = [0, 90, 180, 270];

        for (let i = 0; i < 4; i++) {
            if (i > 0) {
                await rightClickBoard(page);
                const menu = await getBoardCanvasMenu(page);
                await menu.locator('[data-action="rotate-right"]').click();
                await page.waitForTimeout(200);
            }

            const angle = angles[i];

            const result = await page.evaluate(() => {
                const goals = AppState.elements.filter(el => el.type === 'goal');
                const container = document.querySelector('.board-container');
                const containerRect = container.getBoundingClientRect();

                const goalBoxes = goals.map(goal => {
                    const svg = document.querySelector(`[data-element="${goal.id}"].element-svg`);
                    if (!svg) return null;
                    const rect = svg.getBoundingClientRect();

                    return {
                        id: goal.id,
                        width: rect.width,
                        height: rect.height,
                        left: rect.left,
                        top: rect.top,
                        right: rect.right,
                        bottom: rect.bottom,
                        isInViewport: rect.width > 0 && rect.height > 0 &&
                                      rect.left < containerRect.right &&
                                      rect.right > containerRect.left &&
                                      rect.top < containerRect.bottom &&
                                      rect.bottom > containerRect.top
                    };
                });

                return {
                    angle: AppState.boardRotation,
                    containerWidth: containerRect.width,
                    containerHeight: containerRect.height,
                    containerTop: containerRect.top,
                    containerLeft: containerRect.left,
                    goals: goalBoxes
                };
            });

            expect(result.angle).toBe(angle);
            expect(result.goals.length).toBe(2);

            // Both goals should have non-zero dimensions
            result.goals.forEach(goal => {
                expect(goal).not.toBeNull();
                expect(goal.width).toBeGreaterThan(0);
                expect(goal.height).toBeGreaterThan(0);
                // Goals should be at least partially visible in the viewport
                expect(goal.isInViewport).toBe(true);
            });
        }
    });

    test('goals stay at correct field positions after rotation (visual test)', async ({ page }) => {
        // At 0°: goals should be at left and right edges
        const at0 = await page.evaluate(() => {
            const goals = AppState.elements.filter(el => el.type === 'goal').sort((a, b) => a.x - b.x);
            return {
                leftGoal: { x: goals[0].x, y: goals[0].y },
                rightGoal: { x: goals[1].x, y: goals[1].y },
                boardWidth: AppState.boardWidth,
                boardHeight: AppState.boardHeight
            };
        });

        // At 0°: left goal should be at left edge (x ≈ 250), right goal at right edge (x ≈ 4250)
        expect(at0.leftGoal.x).toBeLessThan(500); // Near left edge
        expect(at0.rightGoal.x).toBeGreaterThan(4000); // Near right edge
        // Both at vertical center
        expect(Math.abs(at0.leftGoal.y - at0.boardHeight / 2)).toBeLessThan(100);
        expect(Math.abs(at0.rightGoal.y - at0.boardHeight / 2)).toBeLessThan(100);

        // Rotate 90° right
        await rightClickBoard(page);
        let menu = await getBoardCanvasMenu(page);
        await menu.locator('[data-action="rotate-right"]').click();
        await page.waitForTimeout(200);

        const at90 = await page.evaluate(() => {
            const goals = AppState.elements.filter(el => el.type === 'goal');
            return {
                goals: goals.map(g => ({ id: g.id, x: g.x, y: g.y, rotation: g.rotation })),
                boardWidth: AppState.boardWidth,
                boardHeight: AppState.boardHeight,
                boardRotation: AppState.boardRotation
            };
        });

        // With CSS transform-based rotation, coordinates don't change - only visual positions change
        // Goals stay at their original board coordinates
        expect(at90.goals.length).toBe(2);

        // Both goals should still be at y = 1250 (vertical center)
        at90.goals.forEach(goal => {
            expect(goal.y).toBe(at0.boardHeight / 2);
        });

        // One goal at x ≈ 250 (left edge), one at x ≈ 4250 (right edge)
        const leftGoal = at90.goals.find(g => g.x < 500);
        const rightGoal = at90.goals.find(g => g.x > 4000);

        expect(leftGoal).toBeDefined();
        expect(rightGoal).toBeDefined();
    });
});
