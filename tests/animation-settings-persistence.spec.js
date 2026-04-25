/**
 * Animation settings persistence tests — verify that all animation settings
 * are stored in the workbook (localStorage) and in the undo/redo history.
 */
import { test, expect } from './test-config.js';
import { goto } from './helpers.js';

// All animation settings that must be persisted, paired with a non-default
// value used to confirm they were actually saved/restored.
const SETTINGS = [
    { key: 'animationDuration',              nonDefault: 3000   },
    { key: 'animationFPS',                   nonDefault: 25     },
    { key: 'animationShowPaths',             nonDefault: false  },
    { key: 'animationShowAllPaths',          nonDefault: true   },
    { key: 'animationShowAllGhosts',         nonDefault: true   },
    { key: 'animationShowPathsAnimation',    nonDefault: false  },
    { key: 'animationShowGhostsBoard',       nonDefault: false  },
    { key: 'animationShowGhostsAnimation',   nonDefault: true   },
    { key: 'animationShowPathLabels',        nonDefault: false  },
    { key: 'animationShowPathLabelsAnimation', nonDefault: false },
    { key: 'animationRemovePathAfterFrame',  nonDefault: false  },
    { key: 'animationRepeat',               nonDefault: true   },
    { key: 'animationCropVideo',            nonDefault: false  },
    { key: 'showOnlyChangedObjects',        nonDefault: true   },
];

test.describe('Animation Settings Persistence', () => {
    test.beforeEach(async ({ page }) => {
        await goto(page);
    });

    test('all animation settings survive a workbook save and reload', async ({ page }) => {
        const result = await page.evaluate((settings) => {
            // Apply every non-default value.
            for (const { key, nonDefault } of settings) {
                AppState[key] = nonDefault;
            }

            // Persist to localStorage.
            AppState.saveToLocalStorage();

            // Reset all settings to a sentinel value so we can detect a real restore.
            for (const { key } of settings) {
                AppState[key] = '__RESET__';
            }

            // Reload from localStorage — simulates reopening the app.
            AppState.loadFromLocalStorage();

            // Collect actual vs expected.
            return settings.map(({ key, nonDefault }) => ({
                key,
                expected: nonDefault,
                actual: AppState[key],
            }));
        }, SETTINGS);

        for (const { key, expected, actual } of result) {
            expect(actual, `${key} should be restored from workbook`).toStrictEqual(expected);
        }
    });

    test('animation settings are tracked in undo history and can be undone', async ({ page }) => {
        // Pick one representative setting from each category (numeric + boolean).
        const result = await page.evaluate(() => {
            // Record defaults as the initial history baseline.
            AppState.saveToLocalStorage();

            const before = {
                animationFPS: AppState.animationFPS,
                animationDuration: AppState.animationDuration,
                animationRepeat: AppState.animationRepeat,
                animationCropVideo: AppState.animationCropVideo,
            };

            // Change all four settings.
            AppState.animationFPS = 25;
            AppState.animationDuration = 3000;
            AppState.animationRepeat = !before.animationRepeat;
            AppState.animationCropVideo = !before.animationCropVideo;

            // Save — pushes a new history entry.
            AppState.saveToLocalStorage();

            // Undo should revert to the original values.
            AppState.undo();

            return {
                before,
                afterUndo: {
                    animationFPS: AppState.animationFPS,
                    animationDuration: AppState.animationDuration,
                    animationRepeat: AppState.animationRepeat,
                    animationCropVideo: AppState.animationCropVideo,
                },
            };
        });

        expect(result.afterUndo.animationFPS, 'animationFPS should be undone').toBe(result.before.animationFPS);
        expect(result.afterUndo.animationDuration, 'animationDuration should be undone').toBe(result.before.animationDuration);
        expect(result.afterUndo.animationRepeat, 'animationRepeat should be undone').toBe(result.before.animationRepeat);
        expect(result.afterUndo.animationCropVideo, 'animationCropVideo should be undone').toBe(result.before.animationCropVideo);
    });
});
