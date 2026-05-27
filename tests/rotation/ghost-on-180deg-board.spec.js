/**
 * Tests for player-path ghosts on a 180°-rotated board.
 *
 * Bugs being reproduced (per user report on 180°-rotated board):
 *  1. Ghost player number text appears upside-down.
 *  2. Ghost player arms / direction indicator wrong.
 *  3. Player name label appears upside-down.
 *  4. Dragging the ghost moves it in the OPPOSITE direction of the mouse.
 *
 * Each test asserts on the *effective screen-space rotation* of the
 * relevant element, computed by walking up the ancestor chain and
 * multiplying every transform.  This catches counter-rotation bugs
 * regardless of where in the chain the rotation is missing.
 */
import { test, expect } from '../test-config.js';
import { goto, addPlayer } from '../helpers.js';

/**
 * Compute the effective rotation (in degrees) of an element in screen
 * space, walking up the DOM and multiplying every CSS transform.
 * Returns the rotation angle modulo 360, in [0, 360).
 */
function effectiveScreenRotationInPage() {
    return function (selector) {
        const el = document.querySelector(selector);
        if (!el) return { error: `not found: ${selector}` };
        let m = new DOMMatrix();
        let node = el;
        while (node && node !== document.documentElement) {
            const t = getComputedStyle(node).transform;
            if (t && t !== 'none') {
                m = new DOMMatrix(t).multiply(m);
            }
            node = node.parentElement;
        }
        const angle = Math.atan2(m.b, m.a) * 180 / Math.PI;
        const normalized = ((Math.round(angle) % 360) + 360) % 360;
        return { angle: Math.round(angle), normalized };
    };
}

async function setupChildBoardWithIntermediate(page, { withName = false } = {}) {
    const playerId = await page.evaluate((withName) => {
        const player = AppState.players[0];
        player.x = 1000;
        player.y = 1250;
        player.rotation = 0;
        if (withName) {
            player.name = 'Alice';
            player.namePosition = 'below';
        }
        AppState.saveCurrentBoard();
        Players.render();
        return player.id;
    }, withName);

    await page.evaluate(() => {
        AppState.saveCurrentBoard();
        const childId = AppState.createChildBoard(AppState.currentBoardId);
        AppState.loadBoard(childId);
    });

    await page.evaluate(({ playerId }) => {
        const player = AppState.players.find(p => p.id === playerId);
        player.x = 3500;
        player.y = 1250;
        player._explicitlySet = true;
        AppState.pathIntermediates[`player-${playerId}`] = [
            { x: 2250, y: 1250, rotation: 0 }
        ];
        AppState.animationShowGhostsBoard = true;
        AppState.saveCurrentBoard();
        Players.render();
        Animations.renderParentPaths();
    }, { playerId });

    await page.waitForTimeout(150);
    return playerId;
}

async function rotateBoardTo180(page) {
    await page.evaluate(() => {
        App.rotateBoard(90);
        App.rotateBoard(90);
    });
    await page.waitForTimeout(300);
    const rotation = await page.evaluate(() => AppState.boardRotation);
    expect(rotation).toBe(180);
}

test.describe('Ghost on 180°-rotated board', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
        await page.evaluate(() => { window.__rot = function (selector) {
            const el = document.querySelector(selector);
            if (!el) return { error: `not found: ${selector}` };
            let m = new DOMMatrix();
            let node = el;
            while (node && node !== document.documentElement) {
                const t = getComputedStyle(node).transform;
                if (t && t !== 'none') {
                    m = new DOMMatrix(t).multiply(m);
                }
                node = node.parentElement;
            }
            const angle = Math.atan2(m.b, m.a) * 180 / Math.PI;
            const normalized = ((Math.round(angle) % 360) + 360) % 360;
            return { angle: Math.round(angle), normalized };
        }; });
        await addPlayer(page);
    });

    test('ghost number text is upright (effective screen rotation = 0) at 180°', async ({ page }) => {
        // Use a clearly asymmetric number ('7' so upside-down looks like 'L').
        await page.evaluate(() => { AppState.players[0].number = 7; });
        const playerId = await setupChildBoardWithIntermediate(page);
        await rotateBoardTo180(page);

        const info = await page.evaluate((id) => {
            return window.__rot(`#${id} .player-number`);
        }, `ghost-player-${playerId}-0`);

        console.log('Ghost number screen rotation:', info);
        expect(info.error).toBeUndefined();
        expect(info.normalized).toBe(0);
    });

    test('real player number text is upright at 180°', async ({ page }) => {
        // Make sure the real player has a number visible.
        await page.evaluate(() => {
            AppState.players[0].number = 7;
            Players.render();
        });
        await rotateBoardTo180(page);

        const playerId = await page.evaluate(() => AppState.players[0].id);
        const info = await page.evaluate((id) => window.__rot(`#${id} .player-number`), playerId);

        console.log('Real player number screen rotation:', info);
        expect(info.error).toBeUndefined();
        expect(info.normalized).toBe(0);
    });

    test('parent-board ghost number is upright at 180° (show-all-ghosts mode)', async ({ page }) => {
        const playerId = await setupChildBoardWithIntermediate(page);
        // Enable show-all-ghosts so root + parent-board ghosts render too.
        await page.evaluate(() => {
            AppState.animationShowAllGhosts = true;
            Animations.renderIntermediateGhosts();
        });
        await rotateBoardTo180(page);
        // Re-render after rotation so ghosts use the new boardRotation.
        await page.evaluate(() => Animations.renderIntermediateGhosts());
        await page.waitForTimeout(100);

        const ghostIds = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('.ghost-player')).map(g => g.id);
        });
        console.log('All ghost ids at 180°:', ghostIds);
        expect(ghostIds.length).toBeGreaterThan(0);

        const rotations = await page.evaluate((ids) =>
            ids.map(id => ({ id, ...window.__rot(`#${id} .player-number`) })), ghostIds);
        console.log('Per-ghost number rotations:', rotations);

        for (const r of rotations) {
            expect(r.normalized).toBe(0);
        }
    });

    test('rotating ghost at 180° produces the angle the user dragged toward (board-space)', async ({ page }) => {
        // At 180° board rotation, dragging the rotation handle to a visible
        // direction on screen should set intermediate.rotation to the same
        // direction *in board coordinates*.  The rotation value is rendered
        // through the layer's CSS rotate(180°), so dragging the handle to
        // visual-up (12 o'clock on screen) corresponds to rotation = 180
        // (which, after the layer's 180° rotation, points the ghost up on
        // screen).  Mirror of how Players.handleRotationMove works.
        const playerId = await setupChildBoardWithIntermediate(page);
        await rotateBoardTo180(page);

        // Select the ghost so the rotation handle appears.
        const ghostSelector = `#ghost-player-${playerId}-0`;
        await page.locator(ghostSelector).click();
        await page.waitForTimeout(150);

        const handle = page.locator(`${ghostSelector} .ghost-rotation-handle`);
        await expect(handle).toBeVisible({ timeout: 3000 });

        const ghostBox = await page.locator(ghostSelector).boundingBox();
        const ghostCenterX = ghostBox.x + ghostBox.width / 2;
        const ghostCenterY = ghostBox.y + ghostBox.height / 2;

        // Press on the rotation handle, then drag the mouse to a position
        // directly to the VISUAL RIGHT of the ghost (3 o'clock on screen).
        const handleBox = await handle.boundingBox();
        const handleCx = handleBox.x + handleBox.width / 2;
        const handleCy = handleBox.y + handleBox.height / 2;
        await page.mouse.move(handleCx, handleCy);
        await page.mouse.down();
        await page.mouse.move(ghostCenterX + 200, ghostCenterY, { steps: 12 });
        await page.mouse.up();
        await page.waitForTimeout(150);

        const rotation = await page.evaluate(({ playerId }) => {
            const ints = AppState.pathIntermediates[`player-${playerId}`];
            return ints[0].rotation;
        }, { playerId });

        console.log('Ghost rotation after dragging handle to visual-right at 180°:', rotation);

        // Drag was to the VISUAL right on screen.  Convention: rotation=0
        // means the player points "up" (12 o'clock).  Dragging right (3
        // o'clock) means the player should be facing right, i.e. rotation=90,
        // EXPRESSED IN SCREEN SPACE.  Because the layer is rotated 180°, the
        // board-space rotation that produces a screen-space "right" facing
        // is 90 + 180 = 270 (mod 360).
        //
        // So intermediate.rotation should be 270 (±5° for drag jitter).
        const diff = Math.min(
            Math.abs(rotation - 270),
            Math.abs(rotation - 270 + 360),
            Math.abs(rotation - 270 - 360),
        );
        expect(diff).toBeLessThan(10);
    });

    test('ghost size matches real player size at 270° board rotation', async ({ page }) => {
        await page.evaluate(() => { AppState.players[0].number = 7; });
        const playerId = await setupChildBoardWithIntermediate(page);

        await page.evaluate(() => App.rotateBoard(-90));
        await page.waitForTimeout(300);
        expect(await page.evaluate(() => AppState.boardRotation)).toBe(270);

        await page.evaluate(() => {
            Players.render();
            Animations.renderParentPaths();
        });
        await page.waitForTimeout(150);

        const sizes = await page.evaluate((id) => {
            const real = document.getElementById(id);
            const ghost = document.querySelector('.ghost-player');
            const realBB = real.getBoundingClientRect();
            const ghostBB = ghost.getBoundingClientRect();
            return {
                realWidth: realBB.width, realHeight: realBB.height,
                ghostWidth: ghostBB.width, ghostHeight: ghostBB.height,
            };
        }, playerId);

        console.log('Sizes at 270°:', sizes);
        expect(Math.abs(sizes.ghostWidth - sizes.realWidth)).toBeLessThan(2);
        expect(Math.abs(sizes.ghostHeight - sizes.realHeight)).toBeLessThan(2);
    });

    test('ghost size matches real player size at 90° board rotation', async ({ page }) => {
        // Set a clear number so we can identify the player.
        await page.evaluate(() => { AppState.players[0].number = 7; });
        const playerId = await setupChildBoardWithIntermediate(page);

        // Rotate to 90°.
        await page.evaluate(() => App.rotateBoard(90));
        await page.waitForTimeout(300);
        expect(await page.evaluate(() => AppState.boardRotation)).toBe(90);

        // Re-render so the ghosts pick up the new layout.
        await page.evaluate(() => {
            Players.render();
            Animations.renderParentPaths();
        });
        await page.waitForTimeout(150);

        const sizes = await page.evaluate((id) => {
            const real = document.getElementById(id);
            const ghost = document.querySelector('.ghost-player');
            const realBB = real.getBoundingClientRect();
            const ghostBB = ghost.getBoundingClientRect();
            return {
                realWidth: realBB.width,
                realHeight: realBB.height,
                ghostWidth: ghostBB.width,
                ghostHeight: ghostBB.height,
            };
        }, playerId);

        console.log('Sizes at 90°:', sizes);

        // Ghost should be the same visual size as the real player (within 2px).
        expect(Math.abs(sizes.ghostWidth - sizes.realWidth)).toBeLessThan(2);
        expect(Math.abs(sizes.ghostHeight - sizes.realHeight)).toBeLessThan(2);
    });

    test('dragging ghost right at 180° decreases board.x (matches mouse direction visually)', async ({ page }) => {
        const playerId = await setupChildBoardWithIntermediate(page);
        await rotateBoardTo180(page);

        const initial = await page.evaluate(({ playerId }) => {
            const ints = AppState.pathIntermediates[`player-${playerId}`];
            return { x: ints[0].x, y: ints[0].y };
        }, { playerId });

        const ghostSelector = `#ghost-player-${playerId}-0`;
        const ghost = page.locator(ghostSelector);
        await expect(ghost).toBeVisible({ timeout: 3000 });

        // First click to select the ghost.  Wait > 300ms so the second press
        // is not interpreted as a double-click (which would open the path
        // context menu instead of starting a drag).
        await ghost.click();
        await page.waitForTimeout(400);

        const ghostAfterSelect = page.locator(ghostSelector);
        await expect(ghostAfterSelect).toBeVisible({ timeout: 3000 });
        const box = await ghostAfterSelect.boundingBox();
        const startX = box.x + box.width / 2;
        const startY = box.y + box.height / 2;
        const endX = startX + 120;
        const endY = startY;

        await ghostAfterSelect.hover();
        await page.mouse.down();
        await page.mouse.move(endX, endY, { steps: 10 });
        await page.mouse.up();
        await page.waitForTimeout(150);

        const after = await page.evaluate(({ playerId }) => {
            const ints = AppState.pathIntermediates[`player-${playerId}`];
            return { x: ints[0].x, y: ints[0].y };
        }, { playerId });

        console.log('Ghost drag at 180°: initial', initial, '-> after', after);

        // At 180° rotation: visual screen-right corresponds to board -X direction.
        expect(after.x).toBeLessThan(initial.x);
        expect(Math.abs(after.y - initial.y)).toBeLessThan(80);
    });
});
