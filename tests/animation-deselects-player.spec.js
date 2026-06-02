/**
 * Regression tests: starting animation (play or playFrame) must deselect every
 * type of selectable object — player, ball, element, plate, shape.
 *
 * Bug: play() and playFrame() only cleared selectedPlayer; all other selected-*
 * state fields were left non-null, keeping highlights visible during playback.
 */
import { test, expect } from './test-config.js';
import { goto } from './helpers.js';

/** Assert all selected-* state fields are null and no selection CSS class remains. */
async function assertNothingSelected(page) {
    const state = await page.evaluate(() => ({
        selectedPlayer:  AppState.selectedPlayer,
        selectedBall:    AppState.selectedBall,
        selectedElement: AppState.selectedElement,
        selectedPlate:   AppState.selectedPlate,
        selectedShape:   AppState.selectedShape,
        selectedPath:    AppState.selectedPath,
        selectedGhost:   AppState.selectedGhost,
    }));
    expect(state.selectedPlayer,  'selectedPlayer').toBeNull();
    expect(state.selectedBall,    'selectedBall').toBeNull();
    expect(state.selectedElement, 'selectedElement').toBeNull();
    expect(state.selectedPlate,   'selectedPlate').toBeNull();
    expect(state.selectedShape,   'selectedShape').toBeNull();
    expect(state.selectedPath,    'selectedPath').toBeNull();
    expect(state.selectedGhost,   'selectedGhost').toBeNull();

    // No selection highlight CSS classes should remain in the DOM.
    for (const cls of ['.player.selected', '.ball-selected', '.element-selected',
                        '.plate-selected', '.shape-selected']) {
        const count = await page.locator(cls).count();
        expect(count, `DOM elements matching "${cls}"`).toBe(0);
    }
}

/** Add objects on the root board, create a child board, switch to it. */
async function setup(page) {
    await goto(page);
    await page.evaluate(() => {
        AppState.addPlayer('team-1', 2250, 1250);
        AppState.addBall('#ffffff', 2000, 1200);
        AppState.addElement('cone', 1000, 1000);
        AppState.addPlate('#ff0000', 2000, 1500);
        AppState.shapes.push({
            id: 'shape-test-1', type: 'rectangle',
            x: 1500, y: 1000, width: 200, height: 100,
            rotation: 0, color: '#ff6b35', strokeWidth: 3,
            visible: true, inherited: false
        });
        AppState.saveCurrentBoard();
        const childId = AppState.createChildBoard(AppState.currentBoardId);
        AppState.loadBoard(childId);
        Players.render();
        Balls.render();
        Elements.render();
        Plates.render();
        Shapes.render();
    });
    await page.waitForTimeout(100);
}

// ─── play() tests ───────────────────────────────────────────────────────────

test.describe('play() deselects every object type', () => {
    test('play() deselects a selected player', async ({ page }) => {
        await setup(page);
        await page.evaluate(() => { AppState.selectedPlayer = AppState.players[0]; Players.render(); });
        await page.evaluate(() => Animations.play());
        await page.waitForTimeout(50);
        await assertNothingSelected(page);
        await page.evaluate(() => Animations.pause());
    });

    test('play() deselects a selected ball', async ({ page }) => {
        await setup(page);
        await page.evaluate(() => { AppState.selectedBall = AppState.balls[0]; Balls.render(); });
        await page.evaluate(() => Animations.play());
        await page.waitForTimeout(50);
        await assertNothingSelected(page);
        await page.evaluate(() => Animations.pause());
    });

    test('play() deselects a selected element', async ({ page }) => {
        await setup(page);
        await page.evaluate(() => {
            AppState.selectedElement = AppState.elements.find(e => e.type === 'cone');
            Elements.render();
        });
        await page.evaluate(() => Animations.play());
        await page.waitForTimeout(50);
        await assertNothingSelected(page);
        await page.evaluate(() => Animations.pause());
    });

    test('play() deselects a selected plate', async ({ page }) => {
        await setup(page);
        await page.evaluate(() => { AppState.selectedPlate = AppState.plates[0]; Plates.render(); });
        await page.evaluate(() => Animations.play());
        await page.waitForTimeout(50);
        await assertNothingSelected(page);
        await page.evaluate(() => Animations.pause());
    });

    test('play() deselects a selected shape', async ({ page }) => {
        await setup(page);
        await page.evaluate(() => {
            AppState.selectedShape = AppState.shapes.find(s => s.id === 'shape-test-1');
            Shapes.render();
        });
        await page.evaluate(() => Animations.play());
        await page.waitForTimeout(50);
        await assertNothingSelected(page);
        await page.evaluate(() => Animations.pause());
    });
});

// ─── playFrame() tests ──────────────────────────────────────────────────────

test.describe('playFrame() deselects every object type', () => {
    test('playFrame() deselects a selected player', async ({ page }) => {
        await setup(page);
        await page.evaluate(() => { AppState.selectedPlayer = AppState.players[0]; Players.render(); });
        await page.evaluate(() => Animations.playFrame());
        await page.waitForTimeout(50);
        await assertNothingSelected(page);
        await page.evaluate(() => Animations.pause());
    });

    test('playFrame() deselects a selected ball', async ({ page }) => {
        await setup(page);
        await page.evaluate(() => { AppState.selectedBall = AppState.balls[0]; Balls.render(); });
        await page.evaluate(() => Animations.playFrame());
        await page.waitForTimeout(50);
        await assertNothingSelected(page);
        await page.evaluate(() => Animations.pause());
    });

    test('playFrame() deselects a selected element', async ({ page }) => {
        await setup(page);
        await page.evaluate(() => {
            AppState.selectedElement = AppState.elements.find(e => e.type === 'cone');
            Elements.render();
        });
        await page.evaluate(() => Animations.playFrame());
        await page.waitForTimeout(50);
        await assertNothingSelected(page);
        await page.evaluate(() => Animations.pause());
    });

    test('playFrame() deselects a selected plate', async ({ page }) => {
        await setup(page);
        await page.evaluate(() => { AppState.selectedPlate = AppState.plates[0]; Plates.render(); });
        await page.evaluate(() => Animations.playFrame());
        await page.waitForTimeout(50);
        await assertNothingSelected(page);
        await page.evaluate(() => Animations.pause());
    });

    test('playFrame() deselects a selected shape', async ({ page }) => {
        await setup(page);
        await page.evaluate(() => {
            AppState.selectedShape = AppState.shapes.find(s => s.id === 'shape-test-1');
            Shapes.render();
        });
        await page.evaluate(() => Animations.playFrame());
        await page.waitForTimeout(50);
        await assertNothingSelected(page);
        await page.evaluate(() => Animations.pause());
    });
});
