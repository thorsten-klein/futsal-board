/**
 * Tests for the transparent board overlay that blocks object selection while
 * animation is playing or paused mid-way.
 *
 * Behaviour:
 *  - Overlay appears (display:block) when play/playFrame starts.
 *  - Overlay stays visible while paused mid-animation.
 *  - Clicking the overlay calls goToFrameEnd() and hides it.
 *  - Overlay is hidden after goToFrameEnd() / goToStart().
 *  - Objects (player, ball, element, plate, shape) cannot be selected while
 *    the overlay is showing.
 */
import { test, expect } from './test-config.js';
import { goto } from './helpers.js';

/** Set up a child board with one of every object type. */
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
        Players.render(); Balls.render(); Elements.render();
        Plates.render(); Shapes.render();
    });
    await page.waitForTimeout(100);
}

const overlay = (page) => page.locator('#animation-board-overlay');

// ─── Overlay visibility ──────────────────────────────────────────────────────

test('overlay is hidden before animation starts', async ({ page }) => {
    await setup(page);
    await expect(overlay(page)).toBeHidden();
});

test('overlay becomes visible when play() starts', async ({ page }) => {
    await setup(page);
    await page.evaluate(() => Animations.play());
    await expect(overlay(page)).toBeVisible();
    await page.evaluate(() => Animations.pause());
});

test('overlay stays visible when paused mid-animation', async ({ page }) => {
    await setup(page);
    await page.evaluate(() => Animations.play());
    await page.evaluate(() => Animations.pause());
    await expect(overlay(page)).toBeVisible();
});

test('overlay is hidden after goToFrameEnd()', async ({ page }) => {
    await setup(page);
    await page.evaluate(() => { Animations.play(); Animations.pause(); });
    await page.evaluate(() => Animations.goToFrameEnd());
    await expect(overlay(page)).toBeHidden();
});

test('overlay is hidden after goToStart()', async ({ page }) => {
    await setup(page);
    await page.evaluate(() => { Animations.play(); Animations.pause(); });
    await page.evaluate(() => Animations.goToStart());
    await expect(overlay(page)).toBeHidden();
});

test('clicking the overlay calls goToFrameEnd and hides it', async ({ page }) => {
    await setup(page);
    await page.evaluate(() => { Animations.play(); Animations.pause(); });
    await expect(overlay(page)).toBeVisible();

    await overlay(page).click();

    await expect(overlay(page)).toBeHidden();
    const progress = await page.evaluate(() => Animations.pausedProgress);
    expect(progress).toBe(1);
});

test('overlay becomes visible when playFrame() starts', async ({ page }) => {
    await setup(page);
    await page.evaluate(() => Animations.playFrame());
    await expect(overlay(page)).toBeVisible();
    await page.evaluate(() => Animations.pause());
});

// ─── seekTo() / progress bar jumps ──────────────────────────────────────────

test('overlay becomes visible after seekTo(0.5) (progress bar jump mid-animation)', async ({ page }) => {
    await setup(page);

    // Jump to halfway through the animation.
    await page.evaluate(() => Animations.seekTo(0.5));

    await expect(overlay(page)).toBeVisible();
});

test('overlay hides after seekTo(1) (jump to end)', async ({ page }) => {
    await setup(page);

    await page.evaluate(() => Animations.seekTo(0.5));
    await expect(overlay(page)).toBeVisible();

    await page.evaluate(() => Animations.seekTo(1));
    await expect(overlay(page)).toBeHidden();
});

test('overlay hides after seekTo(0) (jump to start)', async ({ page }) => {
    await setup(page);

    await page.evaluate(() => Animations.seekTo(0.5));
    await expect(overlay(page)).toBeVisible();

    await page.evaluate(() => Animations.seekTo(0));
    await expect(overlay(page)).toBeHidden();
});

test('clicking the progress container shows the overlay', async ({ page }) => {
    await setup(page);

    const bar = page.locator('#animation-progress-container');
    const box = await bar.boundingBox();
    // Click roughly halfway along the progress bar.
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(50);

    await expect(overlay(page)).toBeVisible();
});

test('seekTo(0.5) removes the rotation handle (player) and shape handles', async ({ page }) => {
    await setup(page);

    // Select a player and a shape so their handles render.
    await page.evaluate(() => {
        AppState.selectedPlayer = AppState.players[0];
        Players.render();
        Players.updateRotationHandle();
        AppState.selectedShape = AppState.shapes.find(s => s.id === 'shape-test-1');
        Shapes.render();
        Shapes.updateHandles();
    });

    // Sanity check: at least one rotation handle exists before seeking.
    const handlesBefore = await page.locator('.rotation-handle').count();
    expect(handlesBefore).toBeGreaterThan(0);

    await page.evaluate(() => Animations.seekTo(0.5));
    await page.waitForTimeout(50);

    // After seeking, no rotation handles and no resize handles should remain.
    const rotationHandlesAfter = await page.locator('.rotation-handle').count();
    const resizeHandlesAfter = await page.locator('.shape-resize-handle, .resize-handle').count();
    expect(rotationHandlesAfter, 'rotation handles remain after seek').toBe(0);
    expect(resizeHandlesAfter, 'resize handles remain after seek').toBe(0);
});

test('seekTo(0.5) deselects every kind of object', async ({ page }) => {
    await setup(page);

    // Pre-select every object type.
    await page.evaluate(() => {
        AppState.selectedPlayer  = AppState.players[0];
        AppState.selectedBall    = AppState.balls[0];
        AppState.selectedElement = AppState.elements.find(e => e.type === 'cone');
        AppState.selectedPlate   = AppState.plates[0];
        AppState.selectedShape   = AppState.shapes.find(s => s.id === 'shape-test-1');
        Players.render(); Balls.render(); Elements.render(); Plates.render(); Shapes.render();
    });

    // Seek mid-animation.
    await page.evaluate(() => Animations.seekTo(0.5));
    await page.waitForTimeout(50);

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
});

// ─── Objects cannot be selected while overlay is active ─────────────────────

test('player cannot be selected while overlay is showing', async ({ page }) => {
    await setup(page);
    await page.evaluate(() => { Animations.play(); Animations.pause(); });

    // The overlay sits above players (z-index 250 > 200), so a real pointer
    // click on the player coords hits the overlay, not the player.
    const playerEl = page.locator('[data-player-id]').first();
    const box = await playerEl.boundingBox();
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(50);

    // The overlay consumed the click and called goToFrameEnd — now hidden.
    await expect(overlay(page)).toBeHidden();
    // The player handler never ran, so selectedPlayer stays null.
    const selected = await page.evaluate(() => AppState.selectedPlayer);
    expect(selected).toBeNull();
});

test('ball cannot be selected while overlay is showing', async ({ page }) => {
    await setup(page);
    await page.evaluate(() => { Animations.play(); Animations.pause(); });

    const ballEl = page.locator('[data-ball]').first();
    const box = await ballEl.boundingBox();
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(50);

    await expect(overlay(page)).toBeHidden();
    const selected = await page.evaluate(() => AppState.selectedBall);
    expect(selected).toBeNull();
});
