/**
 * Comprehensive selection-interaction tests.
 *
 * Covers:
 * - Each entity type can be added to the board
 * - Clicking an entity selects it (correct CSS class applied)
 * - Clicking a second entity selects it AND deselects the first
 *   → tested for every combination of the 4 entity types
 * - Clicking empty board area deselects the current selection
 * - Double-clicking an entity opens its context menu
 * - Right-clicking an entity opens its context menu
 * - Clicking the board after a context menu is open closes it
 */
import { test, expect } from './test-config.js';
import { goto, addBall, addPlate, addElement } from './helpers.js';

// ─── helpers ────────────────────────────────────────────────────────────────

/** Add a rectangle shape via the draw toolbar and return its locator. */
async function addShape(page) {
    const before = await page.locator('[data-shape]').count();
    await page.locator('.draw-btn[data-draw="rectangle"]').click();
    await expect(page.locator('[data-shape]')).toHaveCount(before + 1, { timeout: 3000 });
    return page.locator('[data-shape]').nth(before);
}

/** Centre coordinates of a locator's bounding box. */
async function centre(locator) {
    const bb = await locator.boundingBox();
    return { x: bb.x + bb.width / 2, y: bb.y + bb.height / 2 };
}

/** Click an empty spot on the board canvas (top-left corner, away from entities). */
async function clickEmptyBoard(page) {
    // Use .board-container at position (10,10) — same approach as working selection tests.
    // Goals are at ~5% from left/right edges so (10,10) from the container top-left is safe.
    await page.locator('.board-container').click({ position: { x: 10, y: 10 } });
    await page.waitForTimeout(100);
}

// ─── Entity descriptors ──────────────────────────────────────────────────────

/**
 * Returns a descriptor for each entity type.
 * add(page) → adds one entity and returns its locator.
 * selectedClass → CSS class applied when selected.
 * note (optional) → known limitation comment attached to failing cross-type tests.
 */
const ENTITIES = (page) => [
    {
        name: 'ball',
        add: () => addBall(page),
        selectedClass: 'ball-selected',
    },
    {
        name: 'plate',
        add: () => addPlate(page),
        selectedClass: 'plate-selected',
    },
    {
        name: 'element',
        add: () => addElement(page, 'cone'),
        selectedClass: 'element-selected',
    },
    {
        name: 'shape',
        add: () => addShape(page),
        selectedClass: 'shape-selected',
    },
];

// ─── Adding entities ─────────────────────────────────────────────────────────

test.describe('Adding each entity type', () => {
    test.beforeEach(async ({ page }) => { await goto(page); });

    test('ball template click adds a ball', async ({ page }) => {
        const before = await page.locator('[data-ball]').count();
        await addBall(page);
        await expect(page.locator('[data-ball]')).toHaveCount(before + 1);
    });

    test('plate template click adds a plate', async ({ page }) => {
        const before = await page.locator('[data-plate]').count();
        await addPlate(page);
        await expect(page.locator('[data-plate]')).toHaveCount(before + 1);
    });

    test('element button click adds a cone', async ({ page }) => {
        const before = await page.locator('#players-layer [data-element]').count();
        await addElement(page, 'cone');
        await expect(page.locator('#players-layer [data-element]')).toHaveCount(before + 1);
    });

    test('element button click adds a goal', async ({ page }) => {
        const before = await page.locator('#players-layer [data-element]').count();
        await addElement(page, 'goal');
        await expect(page.locator('#players-layer [data-element]')).toHaveCount(before + 1);
    });

    test('element button click adds a pole', async ({ page }) => {
        const before = await page.locator('#players-layer [data-element]').count();
        await addElement(page, 'pole');
        await expect(page.locator('#players-layer [data-element]')).toHaveCount(before + 1);
    });

    test('shape button click adds a rectangle shape', async ({ page }) => {
        const before = await page.locator('[data-shape]').count();
        await addShape(page);
        await expect(page.locator('[data-shape]')).toHaveCount(before + 1);
    });

    test('shape button click adds a line shape', async ({ page }) => {
        const before = await page.locator('[data-shape]').count();
        await page.locator('.draw-btn[data-draw="line"]').click();
        await expect(page.locator('[data-shape]')).toHaveCount(before + 1, { timeout: 3000 });
    });

    test('shape button click adds an ellipse shape', async ({ page }) => {
        const before = await page.locator('[data-shape]').count();
        await page.locator('.draw-btn[data-draw="ellipse"]').click();
        await expect(page.locator('[data-shape]')).toHaveCount(before + 1, { timeout: 3000 });
    });
});

// ─── Single-click selects ────────────────────────────────────────────────────

test.describe('Clicking an entity selects it', () => {
    for (const entityName of ['ball', 'plate', 'element', 'shape']) {
        test(`clicking a ${entityName} applies the selected CSS class`, async ({ page }) => {
            await goto(page);
            const entities = ENTITIES(page);
            const { add, selectedClass } = entities.find(e => e.name === entityName);

            const entity = await add();
            await expect(entity).not.toHaveClass(new RegExp(selectedClass));

            await entity.click();
            await expect(entity).toHaveClass(new RegExp(selectedClass), { timeout: 2000 });
        });
    }
});

// ─── Clicking second entity of same type ────────────────────────────────────

test.describe('Same-type selection switching', () => {
    for (const entityName of ['ball', 'plate', 'element', 'shape']) {
        test(`selecting a second ${entityName} deselects the first`, async ({ page }) => {
            await goto(page);
            const entities = ENTITIES(page);
            const { add, selectedClass } = entities.find(e => e.name === entityName);

            const a = await add();
            const b = await add();

            await a.click();
            await expect(a).toHaveClass(new RegExp(selectedClass));
            await expect(b).not.toHaveClass(new RegExp(selectedClass));

            await b.click();
            await expect(b).toHaveClass(new RegExp(selectedClass), { timeout: 2000 });
            await expect(a).not.toHaveClass(new RegExp(selectedClass));
        });
    }
});

// ─── Cross-type selection switching ─────────────────────────────────────────
//
// For each ordered pair (A, B) of entity types:
//   1. Add entity of type A, click it → A selected
//   2. Add entity of type B, click it → B selected, A deselected
//
// Known limitation: when A is a shape and B is ball/plate/element, the shape
// CSS class is NOT removed because those modules do not call Shapes.render()
// after clearing AppState.selectedShape. Those combinations are annotated.

const CROSS_TYPE_PAIRS = [
    // A=ball
    ['ball',    'plate',   false],
    ['ball',    'element', false],
    ['ball',    'shape',   false],
    // A=plate
    ['plate',   'ball',    false],
    ['plate',   'element', false],
    ['plate',   'shape',   false],
    // A=element
    ['element', 'ball',    false],
    ['element', 'plate',   false],
    ['element', 'shape',   false],
    // A=shape (shape.render IS called by all entity selection handlers now)
    ['shape',   'ball',    false],
    ['shape',   'plate',   false],
    ['shape',   'element', false],
];

test.describe('Cross-type selection switching', () => {
    for (const [typeA, typeB] of CROSS_TYPE_PAIRS) {
        test(`${typeA} → ${typeB}: B is selected, A is deselected`, async ({ page }) => {
            await goto(page);
            const entities = ENTITIES(page);
            const descA = entities.find(e => e.name === typeA);
            const descB = entities.find(e => e.name === typeB);

            const a = await descA.add();
            await a.click();
            await expect(a).toHaveClass(new RegExp(descA.selectedClass));

            const b = await descB.add();
            await b.click();

            // B must be selected
            await expect(b).toHaveClass(new RegExp(descB.selectedClass), { timeout: 2000 });
            // A must be deselected
            await expect(a).not.toHaveClass(new RegExp(descA.selectedClass));
        });
    }
});

// ─── Board click deselects ───────────────────────────────────────────────────

test.describe('Clicking empty board area deselects', () => {
    for (const entityName of ['ball', 'plate', 'element', 'shape']) {
        test(`clicking empty board deselects a selected ${entityName}`, async ({ page }) => {
            await goto(page);
            const entities = ENTITIES(page);
            const { add, selectedClass } = entities.find(e => e.name === entityName);

            const entity = await add();
            await entity.click();
            await expect(entity).toHaveClass(new RegExp(selectedClass));

            await clickEmptyBoard(page);
            await expect(entity).not.toHaveClass(new RegExp(selectedClass), { timeout: 2000 });
        });
    }
});

// ─── Double-click opens context menu ────────────────────────────────────────

test.describe('Double-click opens context menu', () => {
    for (const entityName of ['ball', 'plate', 'element', 'shape']) {
        test(`double-click on ${entityName} shows context menu`, async ({ page }) => {
            await goto(page);
            const entities = ENTITIES(page);
            const { add } = entities.find(e => e.name === entityName);

            const entity = await add();
            await entity.dblclick();

            await expect(page.locator('.context-menu:not(.hidden)').first()).toBeVisible({ timeout: 2000 });

            // Close it
            await page.keyboard.press('Escape');
        });
    }
});

// ─── Right-click opens context menu ─────────────────────────────────────────

test.describe('Right-click opens context menu', () => {
    for (const entityName of ['ball', 'plate', 'element', 'shape']) {
        test(`right-click on ${entityName} shows context menu`, async ({ page }) => {
            await goto(page);
            const entities = ENTITIES(page);
            const { add } = entities.find(e => e.name === entityName);

            const entity = await add();
            await entity.click({ button: 'right' });

            await expect(page.locator('.context-menu:not(.hidden)').first()).toBeVisible({ timeout: 2000 });

            // Close it
            await page.keyboard.press('Escape');
        });
    }
});

// ─── Clicking board closes context menu ─────────────────────────────────────

test.describe('Clicking board closes context menu', () => {
    for (const entityName of ['ball', 'plate', 'element', 'shape']) {
        test(`clicking board after ${entityName} right-click closes menu`, async ({ page }) => {
            await goto(page);
            const entities = ENTITIES(page);
            const { add } = entities.find(e => e.name === entityName);

            const entity = await add();
            await entity.click({ button: 'right' });
            const menu = page.locator('.context-menu:not(.hidden)').first();
            await expect(menu).toBeVisible();

            // Wait past the 300ms "just opened" guard used in some context menus
            await page.waitForTimeout(350);

            await clickEmptyBoard(page);
            await expect(menu).toBeHidden({ timeout: 2000 });
        });
    }
});
