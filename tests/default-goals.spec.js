/**
 * Tests that the two default goals on a new board are placed at the correct
 * pitch positions and orientations:
 *
 *   Left goal:  pitch (0, 1000), rotation   0°
 *   Right goal: pitch (4000, 1000), rotation 180°
 *
 * Pitch coordinates are stored coordinates minus the board's pitch offset
 * (AppState.pitchOffsetX / pitchOffsetY, both 250 units).
 */
import { test, expect } from './test-config.js';
import { goto } from './helpers.js';

test.describe('Default goals on a new board', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
    });

    test('new board has exactly 2 goal elements', async ({ page }) => {
        const goals = await page.evaluate(() =>
            AppState.elements.filter(e => e.type === 'goal')
        );
        expect(goals).toHaveLength(2);
    });

    test('left goal is at pitch position (0, 1000) with rotation 0°', async ({ page }) => {
        const { pitchOffsetX, pitchOffsetY, elements } = await page.evaluate(() => ({
            pitchOffsetX: AppState.pitchOffsetX,
            pitchOffsetY: AppState.pitchOffsetY,
            elements: AppState.elements,
        }));

        const goals = elements.filter(e => e.type === 'goal');
        const leftGoal = goals.find(e => e.rotation === 0);

        expect(leftGoal, 'left goal (rotation 0°) not found').toBeTruthy();
        expect(leftGoal.x - pitchOffsetX).toBe(0);
        expect(leftGoal.y - pitchOffsetY).toBe(1000);
        expect(leftGoal.rotation).toBe(0);
    });

    test('right goal is at pitch position (4000, 1000) with rotation 180°', async ({ page }) => {
        const { pitchOffsetX, pitchOffsetY, elements } = await page.evaluate(() => ({
            pitchOffsetX: AppState.pitchOffsetX,
            pitchOffsetY: AppState.pitchOffsetY,
            elements: AppState.elements,
        }));

        const goals = elements.filter(e => e.type === 'goal');
        const rightGoal = goals.find(e => e.rotation === 180);

        expect(rightGoal, 'right goal (rotation 180°) not found').toBeTruthy();
        expect(rightGoal.x - pitchOffsetX).toBe(4000);
        expect(rightGoal.y - pitchOffsetY).toBe(1000);
        expect(rightGoal.rotation).toBe(180);
    });
});
