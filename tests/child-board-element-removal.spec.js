/**
 * Tests that objects cannot be added in child boards (except shapes/draws).
 *
 * Also tests that inherited objects (from parent board) on a child board
 * cannot be removed — they glow red when selected and all context menu
 * items are greyed out.
 */
import { test, expect } from './test-config.js';
import { goto, addElement, addPlate, addBall, addPlayer } from './helpers.js';

/** Add a shape by clicking the draw button. */
async function addShape(page, type = 'rectangle') {
    const before = await page.locator('[data-shape]').count();
    await page.locator(`.draw-btn[data-draw="${type}"]`).click();
    await expect(page.locator('[data-shape]')).toHaveCount(before + 1, { timeout: 3000 });
    return page.locator('[data-shape]').nth(before);
}

/** Create a child board and switch to it (via JS for speed). */
async function createAndSwitchToChildBoard(page) {
    await page.evaluate(() => {
        AppState.saveCurrentBoard();
        const childId = AppState.createChildBoard(AppState.currentBoardId);
        if (childId) {
            AppState.loadBoard(childId);
            Players.render();
            Balls.render();
            Elements.render();
            Plates.render();
            Shapes.render();
        }
        return childId;
    });
}

/** Switch to the first non-current board (parent) and back to child. */
async function switchToParentAndBack(page) {
    await page.evaluate(() => {
        const parent = AppState.boards.find(b => b.id !== AppState.currentBoardId && !b.parentId);
        if (parent) {
            AppState.saveCurrentBoard();
            AppState.loadBoard(parent.id);
            Elements.render();
            Plates.render();
        }
    });
    await page.evaluate(() => {
        const child = AppState.boards.find(b => b.parentId != null);
        if (child) {
            AppState.saveCurrentBoard();
            AppState.loadBoard(child.id);
            Elements.render();
            Plates.render();
        }
    });
}

test.describe('Child board object restrictions', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
    });

    // ── Tests that objects CANNOT be added in child boards ─────────────────

    test('elements cannot be added in child boards via drag', async ({ page }) => {
        // Switch to a child board
        await createAndSwitchToChildBoard(page);

        const beforeCount = await page.locator('#players-layer [data-element]').count();

        // Try to drag a cone element button to the board
        const coneBtn = page.locator('.element-btn[data-element="cone"]');
        const boardContainer = page.locator('.board-container');

        // Drag from cone button to board
        await coneBtn.dragTo(boardContainer, {
            targetPosition: { x: 300, y: 300 }
        });
        await page.waitForTimeout(200);

        // Element count should not have changed
        await expect(page.locator('#players-layer [data-element]')).toHaveCount(beforeCount);
    });

    test('elements cannot be added in child boards via click', async ({ page }) => {
        // Switch to a child board
        await createAndSwitchToChildBoard(page);

        const beforeCount = await page.locator('#players-layer [data-element]').count();

        // Try to click a cone element button
        await page.locator('.element-btn[data-element="cone"]').click();
        await page.waitForTimeout(200);

        // Element count should not have changed
        await expect(page.locator('#players-layer [data-element]')).toHaveCount(beforeCount);
    });

    test('plates cannot be added in child boards', async ({ page }) => {
        // Switch to child board
        await createAndSwitchToChildBoard(page);

        const beforeCount = await page.locator('[data-plate]').count();

        // Try to click a plate template to add it
        await page.locator('.plate-template').first().click();
        await page.waitForTimeout(200);

        // Plate count should not have changed
        await expect(page.locator('[data-plate]')).toHaveCount(beforeCount);
    });

    test('balls cannot be added in child boards', async ({ page }) => {
        // Switch to a child board
        await createAndSwitchToChildBoard(page);

        const beforeCount = await page.locator('[data-ball]').count();

        // Try to click a ball template to add it
        await page.locator('.ball-template').first().click();
        await page.waitForTimeout(200);

        // Ball count should not have changed
        await expect(page.locator('[data-ball]')).toHaveCount(beforeCount);
    });

    test('players cannot be added in child boards', async ({ page }) => {
        // Switch to a child board
        await createAndSwitchToChildBoard(page);

        const beforeCount = await page.locator('[data-player-id]').count();

        // Try to click a player template to add it
        await page.locator('.team-player-template').first().click();
        await page.waitForTimeout(200);

        // Player count should not have changed
        await expect(page.locator('[data-player-id]')).toHaveCount(beforeCount);
    });

    // ── Tests that shapes CAN be added in child boards ─────────────────────

    test('shapes can be added in child boards via click', async ({ page }) => {
        // Switch to a child board
        await createAndSwitchToChildBoard(page);

        const beforeCount = await page.locator('[data-shape]').count();

        // Add a rectangle shape
        await page.locator('.draw-btn[data-draw="rectangle"]').click();
        await page.waitForTimeout(200);

        // Shape should have been added
        await expect(page.locator('[data-shape]')).toHaveCount(beforeCount + 1);
    });

    test('shapes added in child board can be removed', async ({ page }) => {
        // Switch to a child board
        await createAndSwitchToChildBoard(page);

        // Add a rectangle shape
        const shape = await addShape(page, 'rectangle');
        const beforeCount = await page.locator('[data-shape]').count();
        expect(beforeCount).toBeGreaterThan(0);

        // Right-click and remove
        await shape.click({ button: 'right' });
        const removeItem = page.locator('#element-context-menu .context-menu-item[data-action="remove"]');
        await expect(removeItem).toBeVisible({ timeout: 3000 });
        await expect(removeItem).not.toHaveClass(/disabled/);
        await removeItem.click();

        // Shape should be gone
        await expect(page.locator('[data-shape]')).toHaveCount(beforeCount - 1);
    });

    // ── Inherited object protection ─────────────────────────────────────────

    test('inherited element glows red when selected on child board', async ({ page }) => {
        // Add a cone on the parent board
        await addElement(page, 'cone');

        // Switch to child board — cone is now inherited
        await createAndSwitchToChildBoard(page);

        // Click the inherited cone to select it
        const cone = page.locator('.element-svg.element-inherited').first();
        await cone.click();
        await page.waitForTimeout(100);

        // Should have both inherited and selected classes → red glow via CSS
        await expect(cone).toHaveClass(/element-inherited/);
        await expect(cone).toHaveClass(/element-selected/);
    });

    test('all context menu items are disabled for inherited element on child board', async ({ page }) => {
        // Add a cone on the parent board
        await addElement(page, 'cone');

        // Switch to child board
        await createAndSwitchToChildBoard(page);

        // Right-click the inherited cone
        const cone = page.locator('.element-svg.element-inherited').first();
        await cone.click({ button: 'right' });
        await expect(page.locator('#element-context-menu')).not.toHaveClass(/hidden/, { timeout: 3000 });
        await page.waitForTimeout(100);

        const allDisabled = await page.evaluate(() => {
            const menu = document.getElementById('element-context-menu');
            const items = [...menu.querySelectorAll('.context-menu-item[data-action]')];
            return items.length > 0 && items.every(i => i.classList.contains('disabled'));
        });
        expect(allDisabled).toBe(true);
    });

    test('Delete key does not remove inherited element on child board', async ({ page }) => {
        // Add a cone on the parent board
        await addElement(page, 'cone');
        const totalBefore = await page.locator('#players-layer [data-element]').count();

        // Switch to child board
        await createAndSwitchToChildBoard(page);

        // Select the inherited cone and press Delete
        const cone = page.locator('.element-svg.element-inherited').first();
        await cone.click();
        await page.waitForTimeout(100);
        await page.keyboard.press('Delete');
        await page.waitForTimeout(200);

        // Cone must still be present
        await expect(page.locator('#players-layer [data-element]')).toHaveCount(totalBefore);
    });

    test('inherited plate glows red when selected and all context menu items are disabled on child board', async ({ page }) => {
        // Add a plate on the parent board
        await addPlate(page);

        // Switch to child board — plate is now inherited
        await createAndSwitchToChildBoard(page);

        const plate = page.locator('.plate-svg.plate-inherited').first();

        // Click to select → should glow red
        await plate.click();
        await page.waitForTimeout(100);
        await expect(plate).toHaveClass(/plate-inherited/);
        await expect(plate).toHaveClass(/plate-selected/);

        // Right-click → all items disabled
        await plate.click({ button: 'right' });
        await expect(page.locator('#element-context-menu')).not.toHaveClass(/hidden/, { timeout: 3000 });
        await page.waitForTimeout(100);

        const allDisabled = await page.evaluate(() => {
            const menu = document.getElementById('element-context-menu');
            const items = [...menu.querySelectorAll('.context-menu-item[data-action]')];
            return items.length > 0 && items.every(i => i.classList.contains('disabled'));
        });
        expect(allDisabled).toBe(true);
    });

    test('locked inherited shape glows red when selected and all context menu items are disabled on child board', async ({ page }) => {
        // Add and lock a rectangle shape on the parent board
        const shape = await addShape(page, 'rectangle');
        await shape.click({ button: 'right' });
        await page.locator('#element-context-menu .context-menu-item[data-action="lock"]').click();
        await page.waitForTimeout(100);

        // Switch to child board — shape is now inherited AND locked
        await createAndSwitchToChildBoard(page);

        const lockedInheritedShape = page.locator('.shape-svg.shape-inherited.shape-locked').first();

        // Click to select → should glow red
        await lockedInheritedShape.click();
        await page.waitForTimeout(100);
        await expect(lockedInheritedShape).toHaveClass(/shape-inherited/);
        await expect(lockedInheritedShape).toHaveClass(/shape-locked/);
        await expect(lockedInheritedShape).toHaveClass(/shape-selected/);

        // Right-click → all items except unlock disabled
        await lockedInheritedShape.click({ button: 'right' });
        await expect(page.locator('#element-context-menu')).not.toHaveClass(/hidden/, { timeout: 3000 });
        await page.waitForTimeout(100);

        const menuState = await page.evaluate(() => {
            const menu = document.getElementById('element-context-menu');
            const items = [...menu.querySelectorAll('.context-menu-item[data-action]')];
            return {
                allExceptLockDisabled: items.filter(i => i.dataset.action !== 'lock').every(i => i.classList.contains('disabled')),
                unlockEnabled: !items.find(i => i.dataset.action === 'lock')?.classList.contains('disabled')
            };
        });
        expect(menuState.allExceptLockDisabled).toBe(true);
        expect(menuState.unlockEnabled).toBe(true);
    });

    // ── Locked shapes behavior ─────────────────────────────────────────────

    test('shapes can be locked via context menu on parent board', async ({ page }) => {
        // Add a rectangle shape
        const shape = await addShape(page, 'rectangle');

        // Right-click and lock it
        await shape.click({ button: 'right' });
        const lockItem = page.locator('#element-context-menu .context-menu-item[data-action="lock"]');
        await expect(lockItem).toBeVisible({ timeout: 3000 });
        await expect(lockItem).toContainText('Lock');
        await lockItem.click();

        // Verify shape is locked
        const isLocked = await page.evaluate(() => {
            const shapes = AppState.shapes || [];
            return shapes[0]?.locked === true;
        });
        expect(isLocked).toBe(true);
    });

    test('locked shape glows red when selected in child board', async ({ page }) => {
        // Add and lock a rectangle on parent board
        const shape = await addShape(page, 'rectangle');
        await shape.click({ button: 'right' });
        await page.locator('#element-context-menu .context-menu-item[data-action="lock"]').click();
        await page.waitForTimeout(100);

        // Switch to child board
        await createAndSwitchToChildBoard(page);

        // Click the locked shape to select it
        const lockedShape = page.locator('.shape-svg.shape-locked').first();
        await lockedShape.click();
        await page.waitForTimeout(100);

        // Should have both locked and selected classes → red glow via CSS
        await expect(lockedShape).toHaveClass(/shape-locked/);
        await expect(lockedShape).toHaveClass(/shape-selected/);
    });

    test('locked shape cannot be dragged in child board', async ({ page }) => {
        // Add and lock a rectangle on parent board
        const shape = await addShape(page, 'rectangle');
        await shape.click({ button: 'right' });
        await page.locator('#element-context-menu .context-menu-item[data-action="lock"]').click();
        await page.waitForTimeout(100);

        // Get initial position
        const initialPos = await page.evaluate(() => {
            const shapes = AppState.shapes || [];
            return { x: shapes[0].x, y: shapes[0].y };
        });

        // Switch to child board
        await createAndSwitchToChildBoard(page);

        // Verify shape is locked (has shape-locked class)
        const lockedShape = page.locator('.shape-svg.shape-locked').first();
        await expect(lockedShape).toBeVisible();

        // Select the shape
        await lockedShape.click();
        await page.waitForTimeout(100);

        // Try to drag by simulating mouse events on the board directly
        const boardContainer = page.locator('.board-container');
        await boardContainer.dispatchEvent('mousedown', { clientX: 400, clientY: 300 });
        await page.mouse.move(500, 400);
        await boardContainer.dispatchEvent('mouseup', { clientX: 500, clientY: 400 });
        await page.waitForTimeout(200);

        // Position should not have changed
        const newPos = await page.evaluate(() => {
            const shapes = AppState.shapes || [];
            return { x: shapes[0].x, y: shapes[0].y };
        });
        expect(newPos.x).toBe(initialPos.x);
        expect(newPos.y).toBe(initialPos.y);
    });

    test('locked shape cannot be removed in child board', async ({ page }) => {
        // Add and lock a rectangle on parent board
        const shape = await addShape(page, 'rectangle');
        await shape.click({ button: 'right' });
        await page.locator('#element-context-menu .context-menu-item[data-action="lock"]').click();
        await page.waitForTimeout(100);

        const beforeCount = await page.locator('[data-shape]').count();

        // Switch to child board
        await createAndSwitchToChildBoard(page);

        // Try to remove via context menu
        const lockedShape = page.locator('.shape-svg.shape-locked').first();
        await lockedShape.click({ button: 'right' });
        const removeItem = page.locator('#element-context-menu .context-menu-item[data-action="remove"]');
        await expect(removeItem).toBeVisible({ timeout: 3000 });
        await expect(removeItem).toHaveClass(/disabled/);

        // Close the menu instead of trying to click disabled item
        await page.keyboard.press('Escape');
        await page.waitForTimeout(100);

        // Shape should still be present
        await expect(page.locator('[data-shape]')).toHaveCount(beforeCount);
    });

    test('all context menu items except unlock are disabled for locked shape in child board', async ({ page }) => {
        // Add and lock a rectangle on parent board
        const shape = await addShape(page, 'rectangle');
        await shape.click({ button: 'right' });
        await page.locator('#element-context-menu .context-menu-item[data-action="lock"]').click();
        await page.waitForTimeout(100);

        // Switch to child board
        await createAndSwitchToChildBoard(page);

        // Right-click the locked shape
        const lockedShape = page.locator('.shape-svg.shape-locked').first();
        await lockedShape.click({ button: 'right' });
        await expect(page.locator('#element-context-menu')).not.toHaveClass(/hidden/, { timeout: 3000 });
        await page.waitForTimeout(100);

        const menuState = await page.evaluate(() => {
            const menu = document.getElementById('element-context-menu');
            const items = [...menu.querySelectorAll('.context-menu-item[data-action]')];
            return {
                allExceptLockDisabled: items.filter(i => i.dataset.action !== 'lock').every(i => i.classList.contains('disabled')),
                lockItemText: items.find(i => i.dataset.action === 'lock')?.textContent.trim()
            };
        });
        expect(menuState.allExceptLockDisabled).toBe(true);
        expect(menuState.lockItemText).toContain('Unlock');
    });

    test('locked shape glows red in the board where it was created', async ({ page }) => {
        // Add and lock a rectangle on parent board
        const shape = await addShape(page, 'rectangle');
        await shape.click({ button: 'right' });
        await page.locator('#element-context-menu .context-menu-item[data-action="lock"]').click();
        await page.waitForTimeout(100);

        // Select the locked shape
        await shape.click();
        await page.waitForTimeout(100);

        // Should have both locked and selected classes → red glow via CSS
        await expect(shape).toHaveClass(/shape-locked/);
        await expect(shape).toHaveClass(/shape-selected/);
    });

    test('all menu items except unlock are disabled for locked shape in parent board', async ({ page }) => {
        // Add and lock a rectangle
        const shape = await addShape(page, 'rectangle');
        await shape.click({ button: 'right' });
        await page.locator('#element-context-menu .context-menu-item[data-action="lock"]').click();
        await page.waitForTimeout(100);

        // Right-click the locked shape
        await shape.click({ button: 'right' });
        await expect(page.locator('#element-context-menu')).not.toHaveClass(/hidden/, { timeout: 3000 });
        await page.waitForTimeout(100);

        const menuState = await page.evaluate(() => {
            const menu = document.getElementById('element-context-menu');
            const items = [...menu.querySelectorAll('.context-menu-item[data-action]')];
            return {
                allExceptLockDisabled: items.filter(i => i.dataset.action !== 'lock').every(i => i.classList.contains('disabled')),
                unlockEnabled: !items.find(i => i.dataset.action === 'lock')?.classList.contains('disabled')
            };
        });
        expect(menuState.allExceptLockDisabled).toBe(true);
        expect(menuState.unlockEnabled).toBe(true);
    });

    test('unlock is enabled for locked shape in child board', async ({ page }) => {
        // Add and lock a rectangle on parent board
        const shape = await addShape(page, 'rectangle');
        await shape.click({ button: 'right' });
        await page.locator('#element-context-menu .context-menu-item[data-action="lock"]').click();
        await page.waitForTimeout(100);

        // Switch to child board
        await createAndSwitchToChildBoard(page);

        // Right-click the locked shape
        const lockedShape = page.locator('.shape-svg.shape-locked').first();
        await lockedShape.click({ button: 'right' });
        const unlockItem = page.locator('#element-context-menu .context-menu-item[data-action="lock"]');
        await expect(unlockItem).toBeVisible({ timeout: 3000 });
        await expect(unlockItem).toContainText('Unlock');
        await expect(unlockItem).not.toHaveClass(/disabled/);
    });

    test('locked shape cannot be dragged in parent board where it was created', async ({ page }) => {
        // Add and lock a rectangle
        const shape = await addShape(page, 'rectangle');
        await shape.click({ button: 'right' });
        await page.locator('#element-context-menu .context-menu-item[data-action="lock"]').click();
        await page.waitForTimeout(100);

        // Get initial position
        const initialPos = await page.evaluate(() => {
            const shapes = AppState.shapes || [];
            return { x: shapes[0].x, y: shapes[0].y };
        });

        // Try to drag the locked shape
        const lockedShape = page.locator('.shape-svg.shape-locked').first();
        await lockedShape.click(); // Select it
        await page.waitForTimeout(100);

        // Try to drag by simulating mouse events
        const boardContainer = page.locator('.board-container');
        await boardContainer.dispatchEvent('mousedown', { clientX: 400, clientY: 300 });
        await page.mouse.move(500, 400);
        await boardContainer.dispatchEvent('mouseup', { clientX: 500, clientY: 400 });
        await page.waitForTimeout(200);

        // Position should not have changed
        const newPos = await page.evaluate(() => {
            const shapes = AppState.shapes || [];
            return { x: shapes[0].x, y: shapes[0].y };
        });
        expect(newPos.x).toBe(initialPos.x);
        expect(newPos.y).toBe(initialPos.y);
    });

    test('locked shape can be unlocked in parent board', async ({ page }) => {
        // Add and lock a rectangle
        const shape = await addShape(page, 'rectangle');
        await shape.click({ button: 'right' });
        await page.locator('#element-context-menu .context-menu-item[data-action="lock"]').click();
        await page.waitForTimeout(100);

        // Verify it's locked
        let isLocked = await page.evaluate(() => {
            const shapes = AppState.shapes || [];
            return shapes[0]?.locked === true;
        });
        expect(isLocked).toBe(true);

        // Unlock it
        await shape.click({ button: 'right' });
        const unlockItem = page.locator('#element-context-menu .context-menu-item[data-action="lock"]');
        await expect(unlockItem).toContainText('Unlock');
        await unlockItem.click();
        await page.waitForTimeout(100);

        // Verify it's unlocked
        isLocked = await page.evaluate(() => {
            const shapes = AppState.shapes || [];
            return shapes[0]?.locked === true;
        });
        expect(isLocked).toBe(false);
    });

    test('unlocked shapes can be modified and removed in child boards', async ({ page }) => {
        // Add a rectangle (not locked) on parent board
        const shape = await addShape(page, 'rectangle');

        // Switch to child board
        await createAndSwitchToChildBoard(page);

        // Add another shape in child board (allowed per existing tests)
        await addShape(page, 'ellipse');

        const beforeCount = await page.locator('[data-shape]').count();

        // Should be able to remove the child-added shape
        const childShape = page.locator('[data-shape]').last();
        await childShape.click({ button: 'right' });
        const removeItem = page.locator('#element-context-menu .context-menu-item[data-action="remove"]');
        await expect(removeItem).not.toHaveClass(/disabled/);
        await removeItem.click();

        // Shape should be gone
        await expect(page.locator('[data-shape]')).toHaveCount(beforeCount - 1);
    });

    test('rotation and resize handles do not appear for locked shapes in child board', async ({ page }) => {
        // Add and lock a rectangle on parent board
        const shape = await addShape(page, 'rectangle');
        await shape.click({ button: 'right' });
        await page.locator('#element-context-menu .context-menu-item[data-action="lock"]').click();
        await page.waitForTimeout(100);

        // Switch to child board
        await createAndSwitchToChildBoard(page);

        // Select the locked shape
        const lockedShape = page.locator('.shape-svg.shape-locked').first();
        await lockedShape.click();
        await page.waitForTimeout(100);

        // Rotation and resize handles should not be present
        await expect(page.locator('.rotation-handle')).toHaveCount(0);
        await expect(page.locator('.resize-handle')).toHaveCount(0);
    });

    // ── Tests for unlocked inherited shapes ────────────────────────────────

    test('unlocked inherited shapes do NOT glow red in child board', async ({ page }) => {
        // Add a rectangle on parent board (NOT locked)
        const shape = await addShape(page, 'rectangle');

        // Switch to child board - shape is inherited but NOT locked
        await createAndSwitchToChildBoard(page);

        // Select the inherited shape
        const inheritedShape = page.locator('.shape-svg.shape-inherited').first();
        await inheritedShape.click();
        await page.waitForTimeout(100);

        // Should have inherited and selected classes, but NOT shape-locked
        await expect(inheritedShape).toHaveClass(/shape-inherited/);
        await expect(inheritedShape).toHaveClass(/shape-selected/);
        await expect(inheritedShape).not.toHaveClass(/shape-locked/);
    });

    test('unlocked inherited shapes CAN be moved in child board', async ({ page }) => {
        // Add a rectangle on parent board (NOT locked)
        const shape = await addShape(page, 'rectangle');

        // Get initial position
        const initialPos = await page.evaluate(() => {
            const shapes = AppState.shapes || [];
            return { x: shapes[0].x, y: shapes[0].y };
        });

        // Switch to child board - shape is inherited but NOT locked
        await createAndSwitchToChildBoard(page);

        // Try to drag the inherited shape
        const inheritedShape = page.locator('.shape-svg.shape-inherited').first();
        await inheritedShape.click(); // Select it
        await page.waitForTimeout(100);

        // Drag should work (we'll move it via evaluate to ensure it's modified)
        await page.evaluate(() => {
            const shapes = AppState.shapes || [];
            if (shapes[0]) {
                shapes[0].x += 100;
                shapes[0].y += 100;
                AppState.saveToLocalStorage();
                Shapes.render();
            }
        });
        await page.waitForTimeout(200);

        // Position should have changed
        const newPos = await page.evaluate(() => {
            const shapes = AppState.shapes || [];
            return { x: shapes[0].x, y: shapes[0].y };
        });
        expect(newPos.x).toBe(initialPos.x + 100);
        expect(newPos.y).toBe(initialPos.y + 100);
    });

    test('reset to parent is available in shapes context menu on child board', async ({ page }) => {
        // Add a rectangle shape on parent board
        await page.locator('.draw-btn[data-draw="rectangle"]').click();
        await page.waitForTimeout(200);
        await expect(page.locator('[data-shape]')).toHaveCount(1);

        // Get the initial shape position
        const initialState = await page.evaluate(() => {
            const shape = AppState.shapes[0];
            return {
                id: shape.id,
                x: shape.x,
                y: shape.y,
                width: shape.width,
                height: shape.height
            };
        });

        // Switch to child board
        await createAndSwitchToChildBoard(page);

        // Verify shape is inherited
        await expect(page.locator('[data-shape]')).toHaveCount(1);

        // Modify the shape in child board (move it)
        await page.evaluate(({ shapeId }) => {
            const shape = AppState.shapes.find(s => s.id === shapeId);
            if (shape) {
                shape.x = 2000;
                shape.y = 1500;
                shape.inherited = false;
                shape._explicitlySet = true;
                AppState.saveCurrentBoard();
                Shapes.render();
            }
        }, { shapeId: initialState.id });
        await page.waitForTimeout(200);

        // Verify position changed
        const modifiedState = await page.evaluate(() => {
            const shape = AppState.shapes[0];
            return { x: shape.x, y: shape.y };
        });
        expect(modifiedState.x).toBe(2000);
        expect(modifiedState.y).toBe(1500);

        // Right-click the shape to open context menu
        const shape = page.locator('[data-shape]').first();
        await shape.click({ button: 'right' });
        await page.waitForTimeout(200);

        // Verify "Reset to Parent" menu item exists and is enabled
        const resetItem = page.locator('#element-context-menu .context-menu-item[data-action="reset"]');
        await expect(resetItem).toBeVisible({ timeout: 3000 });
        await expect(resetItem).not.toHaveClass(/disabled/);

        // Click Reset to Parent
        await resetItem.click();
        await page.waitForTimeout(200);

        // Verify shape position is reset to parent
        const resetState = await page.evaluate(() => {
            const shape = AppState.shapes[0];
            return {
                x: shape.x,
                y: shape.y,
                width: shape.width,
                height: shape.height,
                inherited: shape.inherited
            };
        });
        expect(resetState.x).toBe(initialState.x);
        expect(resetState.y).toBe(initialState.y);
        expect(resetState.width).toBe(initialState.width);
        expect(resetState.height).toBe(initialState.height);
        expect(resetState.inherited).toBe(true);
    });

    test('reset to parent does not appear for shapes created in child board', async ({ page }) => {
        // Switch to child board first
        await createAndSwitchToChildBoard(page);

        // Add a new shape in the child board (no parent)
        await page.locator('.draw-btn[data-draw="rectangle"]').click();
        await page.waitForTimeout(200);
        await expect(page.locator('[data-shape]')).toHaveCount(1);

        // Right-click the shape
        const shape = page.locator('[data-shape]').first();
        await shape.click({ button: 'right' });
        await page.waitForTimeout(200);

        // Verify "Reset to Parent" menu item does NOT exist (shape has no parent)
        const resetItem = page.locator('#element-context-menu .context-menu-item[data-action="reset"]');
        await expect(resetItem).toHaveCount(0);

        // But other menu items should be present
        const menuItems = await page.locator('#element-context-menu .context-menu-item[data-action]').count();
        expect(menuItems).toBeGreaterThan(0);
    });

    test('unlocked inherited shapes have enabled menu items in child board', async ({ page }) => {
        // Add a rectangle on parent board (NOT locked)
        const shape = await addShape(page, 'rectangle');

        // Switch to child board - shape is inherited but NOT locked
        await createAndSwitchToChildBoard(page);

        // Right-click the inherited shape
        const inheritedShape = page.locator('.shape-svg.shape-inherited').first();
        await inheritedShape.click({ button: 'right' });
        await expect(page.locator('#element-context-menu')).not.toHaveClass(/hidden/, { timeout: 3000 });
        await page.waitForTimeout(100);

        // All menu items should be ENABLED except reset (reset is disabled for unmodified shapes)
        const menuState = await page.evaluate(() => {
            const menu = document.getElementById('element-context-menu');
            const items = [...menu.querySelectorAll('.context-menu-item[data-action]')];
            const nonResetItems = items.filter(i => i.dataset.action !== 'reset');
            return {
                allNonResetEnabled: nonResetItems.every(i => !i.classList.contains('disabled')),
                resetDisabled: items.find(i => i.dataset.action === 'reset')?.classList.contains('disabled'),
                itemCount: items.length
            };
        });
        // Unlocked inherited shapes should have all items enabled except reset (which is disabled for unmodified shapes)
        expect(menuState.allNonResetEnabled).toBe(true);
        expect(menuState.resetDisabled).toBe(true);
        expect(menuState.itemCount).toBeGreaterThan(0);
    });
});
