// Utility functions
const Utils = {
    // Show a message modal instead of alert()
    showMessage(message, title = 'Message') {
        const modal = document.getElementById('message-modal');
        const titleEl = document.getElementById('message-modal-title');
        const textEl = document.getElementById('message-modal-text');
        const okBtn = document.getElementById('btn-message-modal-ok');

        if (!modal || !titleEl || !textEl || !okBtn) return;

        titleEl.textContent = title;
        textEl.textContent = message;
        modal.classList.remove('hidden');
        okBtn.focus();

        // Setup OK button handler
        const handleOk = () => {
            modal.classList.add('hidden');
            okBtn.removeEventListener('click', handleOk);
        };

        okBtn.addEventListener('click', handleOk);

        // Close on Escape key
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                modal.classList.add('hidden');
                okBtn.removeEventListener('click', handleOk);
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);
    },

    // Show a toast notification
    showToast(message, type = 'info', duration = 3000) {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        container.appendChild(toast);

        // Trigger animation
        setTimeout(() => toast.classList.add('show'), 10);

        // Auto-dismiss
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    },

    // Show a confirmation modal (returns Promise<boolean>)
    showConfirm(message, title = 'Confirm') {
        return new Promise((resolve) => {
            const modal = document.getElementById('confirm-modal');
            const titleEl = document.getElementById('confirm-modal-title');
            const textEl = document.getElementById('confirm-modal-text');
            const okBtn = document.getElementById('btn-confirm-modal-ok');
            const cancelBtn = document.getElementById('btn-confirm-modal-cancel');

            if (!modal || !titleEl || !textEl || !okBtn || !cancelBtn) {
                resolve(false);
                return;
            }

            titleEl.textContent = title;
            textEl.textContent = message;
            modal.classList.remove('hidden');
            cancelBtn.focus();

            // Setup handlers
            const handleOk = () => {
                modal.classList.add('hidden');
                cleanup();
                resolve(true);
            };

            const handleCancel = () => {
                modal.classList.add('hidden');
                cleanup();
                resolve(false);
            };

            const handleEscape = (e) => {
                if (e.key === 'Escape') {
                    modal.classList.add('hidden');
                    cleanup();
                    resolve(false);
                }
            };

            const cleanup = () => {
                okBtn.removeEventListener('click', handleOk);
                cancelBtn.removeEventListener('click', handleCancel);
                document.removeEventListener('keydown', handleEscape);
            };

            okBtn.addEventListener('click', handleOk);
            cancelBtn.addEventListener('click', handleCancel);
            document.addEventListener('keydown', handleEscape);
        });
    },

    // Show a prompt modal (returns Promise<string|null>)
    showPrompt(message, title = 'Input', defaultValue = '') {
        return new Promise((resolve) => {
            const modal = document.getElementById('prompt-modal');
            const titleEl = document.getElementById('prompt-modal-title');
            const labelEl = document.getElementById('prompt-modal-label');
            const inputEl = document.getElementById('prompt-modal-input');
            const okBtn = document.getElementById('btn-prompt-modal-ok');
            const cancelBtn = document.getElementById('btn-prompt-modal-cancel');

            if (!modal || !titleEl || !labelEl || !inputEl || !okBtn || !cancelBtn) {
                resolve(null);
                return;
            }

            titleEl.textContent = title;
            labelEl.textContent = message;
            inputEl.value = defaultValue;
            modal.classList.remove('hidden');
            inputEl.focus();
            inputEl.select();

            // Setup handlers
            const handleOk = () => {
                const value = inputEl.value.trim();
                modal.classList.add('hidden');
                cleanup();
                resolve(value || null);
            };

            const handleCancel = () => {
                modal.classList.add('hidden');
                cleanup();
                resolve(null);
            };

            const handleEscape = (e) => {
                if (e.key === 'Escape') {
                    modal.classList.add('hidden');
                    cleanup();
                    resolve(null);
                }
            };

            const handleEnter = (e) => {
                if (e.key === 'Enter') {
                    handleOk();
                }
            };

            const cleanup = () => {
                okBtn.removeEventListener('click', handleOk);
                cancelBtn.removeEventListener('click', handleCancel);
                inputEl.removeEventListener('keypress', handleEnter);
                document.removeEventListener('keydown', handleEscape);
            };

            okBtn.addEventListener('click', handleOk);
            cancelBtn.addEventListener('click', handleCancel);
            inputEl.addEventListener('keypress', handleEnter);
            document.addEventListener('keydown', handleEscape);
        });
    },

    /**
     * Hides all rotation handles (for shapes and elements).
     * Called when any modal is opened.
     */
    hideAllRotationHandles() {
        // Hide shape rotation handles
        if (typeof Shapes !== 'undefined' && Shapes.rotationHandle) {
            Shapes.rotationHandle.style.display = 'none';
        }

        // Hide element rotation handles
        if (typeof Elements !== 'undefined' && Elements.rotationHandle) {
            Elements.rotationHandle.style.display = 'none';
        }
    },

    /**
     * Restores rotation handles if no modals are currently open.
     * Called when a modal is closed.
     */
    restoreRotationHandles() {
        // Check if any modal is still open
        const modals = document.querySelectorAll('.modal:not(.hidden)');
        if (modals.length > 0) {
            // At least one modal is still open, keep handles hidden
            return;
        }

        // No modals open, restore rotation handles
        if (typeof Shapes !== 'undefined' && Shapes.rotationHandle) {
            Shapes.rotationHandle.style.display = '';
        }

        if (typeof Elements !== 'undefined' && Elements.rotationHandle) {
            Elements.rotationHandle.style.display = '';
        }
    },

    /**
     * Opens a modal by removing the 'hidden' class and focusing the first focusable element.
     * Automatically hides rotation handles when modal opens.
     * @param {string} id - The modal element's ID.
     */
    openModal(id) {
        const modal = document.getElementById(id);
        if (!modal) return;
        modal.classList.remove('hidden');

        // Hide all rotation handles when any modal opens
        this.hideAllRotationHandles();

        const focusable = modal.querySelector('input, select, textarea, button');
        if (focusable) focusable.focus();
    },

    /**
     * Positions a context menu element near (x, y) while keeping it within viewport bounds.
     * Must be called after the menu is already inserted into the DOM (display:block) so
     * getBoundingClientRect() returns real dimensions.
     * @param {HTMLElement} menu - The context menu element to position.
     * @param {number} x - Desired left position in client pixels.
     * @param {number} y - Desired top position in client pixels.
     */
    positionContextMenu(menu, x, y) {
        menu.style.display = 'block';
        menu.style.left = '0px';
        menu.style.top = '0px';

        const menuRect = menu.getBoundingClientRect();
        const menuWidth = menuRect.width;
        const menuHeight = menuRect.height;
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        let adjustedX = x;
        let adjustedY = y;

        if (x + menuWidth > viewportWidth) { adjustedX = viewportWidth - menuWidth - 5; }
        if (adjustedX < 5) { adjustedX = 5; }
        if (y + menuHeight > viewportHeight) { adjustedY = viewportHeight - menuHeight - 5; }
        if (adjustedY < 5) { adjustedY = 5; }

        menu.style.left = adjustedX + 'px';
        menu.style.top = adjustedY + 'px';
    },

    /**
     * Clamps board coordinates to the valid board area.
     * @param {number} x
     * @param {number} y
     * @returns {{ x: number, y: number }}
     */
    clampToBoardBounds(x, y) {
        return {
            x: Math.max(0, Math.min(AppState.boardWidth, x)),
            y: Math.max(0, Math.min(AppState.boardHeight, y))
        };
    },

    /**
     * Traverses the DOM up from `target` to `layer` looking for an element with
     * `dataset[dataKey]` set. Returns the dataset value, or null if not found.
     * Replaces the identical while-loop in every mousedown / context-menu handler.
     * @param {EventTarget} target
     * @param {Element} layer
     * @param {string} dataKey  e.g. 'ball', 'plate', 'element', 'shape'
     * @returns {string|null}
     */
    findEntityId(target, layer, dataKey) {
        while (target && target !== layer) {
            if (target.dataset && target.dataset[dataKey]) return target.dataset[dataKey];
            target = target.parentElement;
        }
        return null;
    },

    /**
     * Returns true when (clientX, clientY) lands close enough to a DOM element's
     * center that a "missed click" should not deselect the selected entity.
     * extraTolerance adds pixels beyond the element's own half-width.
     */
    isNearElement(clientX, clientY, domEl, extraTolerance = 20) {
        if (!domEl) return false;
        const rect = domEl.getBoundingClientRect();
        const dist = Math.sqrt(
            Math.pow(clientX - (rect.left + rect.width  / 2), 2) +
            Math.pow(clientY - (rect.top  + rect.height / 2), 2)
        );
        return dist <= Math.max(rect.width / 2, 10) + extraTolerance;
    },

    /**
     * Registers the document-level `mousemove` and `mouseup` listeners that
     * implement drag-to-move for a single entity type. Call this once from init().
     *
     * @param {object} config
     * @param {string}   config.dragKey       AppState key for the dragged entity ('draggedBall' etc.)
     * @param {string}   config.selectedKey   AppState key for the selected entity ('selectedBall' etc.)
     * @param {string}   config.type          Type string passed to updatePositionDisplay ('ball' etc.)
     * @param {Function} config.updateDOM     (el, x, y, pxW, pxH) → updates the element's CSS position.
     *                                        pxW / pxH are rect.width / rect.height of the canvas.
     * @param {Function} [config.afterMove]   (entity) → optional hook called after position update.
     * @param {Function} [config.onDrop]      (entity) → optional hook called just before clear on mouseup.
     */
    setupEntityDrag(config) {
        const { dragKey, selectedKey, type, updateDOM, afterMove, onDrop } = config;

        document.addEventListener('mousemove', (e) => {
            const entity = AppState[dragKey];
            if (!entity || AppState.currentTool !== 'select') return;

            const rect = AppState.canvas.getBoundingClientRect();
            const scaleX = AppState.boardWidth  / rect.width;
            const scaleY = AppState.boardHeight / rect.height;

            const raw = Utils.clampToBoardBounds(
                (e.clientX - rect.left) * scaleX - AppState.dragOffset.x,
                (e.clientY - rect.top)  * scaleY - AppState.dragOffset.y
            );

            entity.x = raw.x;
            entity.y = raw.y;
            AppState.updatePositionDisplay(raw.x, raw.y, entity, type);

            const el = document.getElementById(entity.id);
            if (el) updateDOM(el, raw.x, raw.y, rect.width, rect.height);

            if (afterMove) afterMove(entity);
            e.preventDefault();
        });

        document.addEventListener('mouseup', () => {
            const entity = AppState[dragKey];
            if (!entity) return;

            if (onDrop) onDrop(entity);
            AppState.saveToLocalStorage();

            const selected = AppState[selectedKey];
            AppState[dragKey] = null;
            if (selected && selected.id === entity.id) {
                AppState.updatePositionDisplay(entity.x, entity.y, entity, type);
            } else {
                AppState.hidePositionDisplay();
            }
        });
    },

    // DEBUG: Show bounding box for an element
    showDebugBox(elementId, objectType = 'unknown', entityData = null) {
        // Only show debug boxes if debug mode is enabled
        if (!AppState.debugMode) return;

        // Use double requestAnimationFrame to ensure element is fully rendered
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                const element = document.getElementById(elementId);
                const boardContainer = document.querySelector('.board-container');

                if (element && boardContainer) {
                    const debugBox = document.createElement('div');
                    debugBox.className = 'debug-tolerance-box';
                    debugBox.dataset.debugType = objectType;
                    debugBox.dataset.debugId = elementId;
                    debugBox.style.position = 'absolute';
                    debugBox.style.border = '3px solid yellow';
                    debugBox.style.backgroundColor = 'rgba(255, 255, 0, 0.1)';
                    debugBox.style.pointerEvents = 'none';
                    debugBox.style.zIndex = '9999';
                    debugBox.style.boxSizing = 'border-box';

                    // Apply elliptical border for ellipse and circle shapes
                    if (entityData && (entityData.type === 'ellipse' || entityData.type === 'circle')) {
                        debugBox.style.borderRadius = '50%';
                    }

                    // For elements/shapes that can rotate, copy exact position and transform
                    if (element.style.transform && (objectType === 'shape' || objectType === 'element')) {
                        // element.style.left/top are relative to #board-area, but the debug box
                        // is in .board-container — add the board-area offset to correct for this
                        const boardArea = document.getElementById('board-area');
                        const areaLeft = boardArea ? (parseFloat(boardArea.style.left) || 0) : 0;
                        const areaTop = boardArea ? (parseFloat(boardArea.style.top) || 0) : 0;
                        const elemLeft = parseFloat(element.style.left) || 0;
                        const elemTop = parseFloat(element.style.top) || 0;

                        // Get width and height - use style if available, otherwise getAttribute
                        let width = parseFloat(element.style.width) || parseFloat(element.getAttribute('width'));
                        let height = parseFloat(element.style.height) || parseFloat(element.getAttribute('height'));
                        let left = areaLeft + elemLeft;
                        let top = areaTop + elemTop;
                        let transform = element.style.transform;
                        let transformOrigin = element.style.transformOrigin;

                        // For text shapes, use actual text bounding box without padding
                        if (entityData && entityData.type === 'text') {
                            const textElement = element.querySelector('text');
                            if (textElement) {
                                try {
                                    const bbox = textElement.getBBox();

                                    // Get fontSize-based viewBox dimensions
                                    const fontSize = entityData.fontSize || 48;
                                    const svgViewBoxWidth = fontSize * 3;
                                    const svgViewBoxHeight = fontSize * 1.5;

                                    // Scale factor from viewBox to canvas coordinates
                                    const svgScaleX = width / svgViewBoxWidth;
                                    const svgScaleY = height / svgViewBoxHeight;

                                    const textWidth = bbox.width * svgScaleX;
                                    const textHeight = bbox.height * svgScaleY;

                                    const overlayWidth = textWidth;
                                    const overlayHeight = textHeight * 0.8;

                                    // Calculate Y offset - center the smaller box on the text
                                    const textTopInViewBox = bbox.y;
                                    const textCenterInViewBox = bbox.y + bbox.height / 2;
                                    const textCenterInCanvas = textCenterInViewBox * svgScaleY;
                                    const svgCenterInCanvas = height / 2;
                                    const overlayYOffset = textCenterInCanvas - svgCenterInCanvas;

                                    width = overlayWidth;
                                    height = overlayHeight;
                                    top = areaTop + elemTop + overlayYOffset;

                                    // Adjust transform to account for new dimensions
                                    const widthHalf = overlayWidth / 2;
                                    const heightHalf = overlayHeight / 2;
                                    const rotation = entityData.rotation || 0;
                                    transform = `translate(${-widthHalf}px, ${-heightHalf}px) rotate(${rotation}deg)`;
                                    transformOrigin = `${widthHalf}px ${heightHalf}px`;
                                } catch (e) {
                                    // Fallback to default if getBBox fails
                                }
                            }
                        }

                        debugBox.style.left = left + 'px';
                        debugBox.style.top = top + 'px';
                        debugBox.style.width = width + 'px';
                        debugBox.style.height = height + 'px';
                        debugBox.style.transform = transform;
                        debugBox.style.transformOrigin = transformOrigin;
                    } else {
                        // For players, balls, plates, and non-rotated items, use bounding rect
                        const rect = element.getBoundingClientRect();
                        const containerRect = boardContainer.getBoundingClientRect();

                        // Skip if element has zero size (not visible)
                        if (rect.width === 0 || rect.height === 0) {
                            return;
                        }

                        debugBox.style.left = (rect.left - containerRect.left) + 'px';
                        debugBox.style.top = (rect.top - containerRect.top) + 'px';
                        debugBox.style.width = rect.width + 'px';
                        debugBox.style.height = rect.height + 'px';
                    }

                    boardContainer.appendChild(debugBox);
                }
            });
        });
    },

    // DEBUG: Update debug box position for an element (called during drag)
    updateDebugBox(elementId, objectType = 'unknown') {
        // Only update if debug mode is enabled
        if (!AppState.debugMode) return;

        const element = document.getElementById(elementId);
        const boardContainer = document.querySelector('.board-container');
        const debugBox = boardContainer?.querySelector(`.debug-tolerance-box[data-debug-id="${elementId}"][data-debug-type="${objectType}"]`);

        if (element && debugBox && boardContainer) {
            // For shapes and elements that can rotate, copy exact positioning and transform
            if (element.style.transform && (objectType === 'shape' || objectType === 'element')) {
                // element.style.left/top are relative to #board-area, but the debug box
                // is in .board-container — add the board-area offset to correct for this
                const boardArea = document.getElementById('board-area');
                const areaLeft = boardArea ? (parseFloat(boardArea.style.left) || 0) : 0;
                const areaTop = boardArea ? (parseFloat(boardArea.style.top) || 0) : 0;
                const elemLeft = parseFloat(element.style.left) || 0;
                const elemTop = parseFloat(element.style.top) || 0;

                // Get width and height - use style if available, otherwise getAttribute
                let width = parseFloat(element.style.width) || parseFloat(element.getAttribute('width'));
                let height = parseFloat(element.style.height) || parseFloat(element.getAttribute('height'));
                let left = areaLeft + elemLeft;
                let top = areaTop + elemTop;
                let transform = element.style.transform;
                let transformOrigin = element.style.transformOrigin;

                // For text shapes, use actual text bounding box without padding
                if (objectType === 'shape') {
                    const shape = AppState.getShape(elementId);
                    if (shape && shape.type === 'text') {
                        const textElement = element.querySelector('text');
                        if (textElement) {
                            try {
                                const bbox = textElement.getBBox();

                                // Get fontSize-based viewBox dimensions
                                const fontSize = shape.fontSize || 48;
                                const svgViewBoxWidth = fontSize * 3;
                                const svgViewBoxHeight = fontSize * 1.5;

                                // Scale factor from viewBox to canvas coordinates
                                const svgScaleX = width / svgViewBoxWidth;
                                const svgScaleY = height / svgViewBoxHeight;

                                const textWidth = bbox.width * svgScaleX;
                                const textHeight = bbox.height * svgScaleY;

                                const overlayWidth = textWidth;
                                const overlayHeight = textHeight * 0.8;

                                // Calculate Y offset - center the smaller box on the text
                                const textTopInViewBox = bbox.y;
                                const textCenterInViewBox = bbox.y + bbox.height / 2;
                                const textCenterInCanvas = textCenterInViewBox * svgScaleY;
                                const svgCenterInCanvas = height / 2;
                                const overlayYOffset = textCenterInCanvas - svgCenterInCanvas;

                                width = overlayWidth;
                                height = overlayHeight;
                                top = areaTop + elemTop + overlayYOffset;

                                // Adjust transform to account for new dimensions
                                const widthHalf = overlayWidth / 2;
                                const heightHalf = overlayHeight / 2;
                                const rotation = shape.rotation || 0;
                                transform = `translate(${-widthHalf}px, ${-heightHalf}px) rotate(${rotation}deg)`;
                                transformOrigin = `${widthHalf}px ${heightHalf}px`;
                            } catch (e) {
                                // Fallback to default if getBBox fails
                            }
                        }
                    }
                }

                debugBox.style.left = left + 'px';
                debugBox.style.top = top + 'px';
                debugBox.style.width = width + 'px';
                debugBox.style.height = height + 'px';
                debugBox.style.transform = transform;
                debugBox.style.transformOrigin = transformOrigin;
            } else {
                // For players, balls, plates, and non-rotated items, use bounding rect
                const rect = element.getBoundingClientRect();
                const containerRect = boardContainer.getBoundingClientRect();

                debugBox.style.left = (rect.left - containerRect.left) + 'px';
                debugBox.style.top = (rect.top - containerRect.top) + 'px';
                debugBox.style.width = rect.width + 'px';
                debugBox.style.height = rect.height + 'px';
            }
        }
    }
};

// Main application initialization
const App = {
    _htmlToImageWarmed: false,      // true after first warm-up call to html-to-image

    // Initialize the application
    init() {
        // Initialize state
        AppState.init();

        // Setup global touch-to-mouse conversion FIRST
        this.setupTouchToMouse();

        // Initialize modules
        Board.init();
        Teams.init();
        Players.init();
        Balls.init();
        Plates.init();
        Elements.init();
        Shapes.init();
        Drawings.init();
        Animations.init();
        Storage.init();

        // Setup UI
        this.setupSidebarTabs();
        this.setupSidebarToggle();
        this.setupSidebarResize();
        this.setupTools();
        this.setupTouchMode();
        this.setupDebugMode();
        this.setupTouchBordersToggle();
        this.setupUndoRedo();
        this.setupPositionDisplay();
        this.setupCopyPaste();
        this.setupDelete();
        this.setupFullscreen();
        this.setupEscapeKey();
        this.setupScreenshot();
        this.setupBoardCanvasContextMenu();
        this.setupModalObserver();

        // Initial render
        this.render();

        // Update sidebar element sizes to match board scale
        if (typeof Teams !== 'undefined' && Teams.updatePlayerTemplatesSizes) {
            Teams.updatePlayerTemplatesSizes();
        }
        if (typeof Balls !== 'undefined' && Balls.updateBallTemplatesSizes) {
            Balls.updateBallTemplatesSizes();
        }
        if (typeof Plates !== 'undefined' && Plates.updatePlateTemplatesSizes) {
            Plates.updatePlateTemplatesSizes();
        }
        if (typeof Elements !== 'undefined' && Elements.updateElementButtonSizes) {
            Elements.updateElementButtonSizes();
        }

        // Save initial state to history
        AppState.saveToHistory();

        // Force a resize and re-render after DOM is fully laid out
        // This fixes initial positioning issues
        requestAnimationFrame(() => {
            Board.resize();
            this.render();

            // Ensure rotation handles are updated after initial layout
            requestAnimationFrame(() => {
                if (typeof Players !== 'undefined' && Players.updateRotationHandle) {
                    Players.updateRotationHandle();
                }
                if (typeof Elements !== 'undefined' && Elements.updateRotationHandle) {
                    Elements.updateRotationHandle();
                }
            });
        });
    },

    // Setup global touch-to-mouse event conversion
    setupTouchToMouse() {
        // Double-tap detection
        let lastTapTime = 0;
        let lastTapX = 0;
        let lastTapY = 0;
        let doubleTapJustFired = false; // Track if we just fired a double-tap
        const doubleTapThreshold = 300; // ms
        const doubleTapDistance = 30; // pixels

        // Helper function to check if element is interactive UI (button, input, etc.)
        const isInteractiveUI = (element) => {
            if (!element) return false;

            const tagName = element.tagName.toLowerCase();

            // Check if it's a button, input, select, or has button/clickable classes
            if (['button', 'input', 'select', 'textarea', 'a'].includes(tagName)) {
                return true;
            }

            // Check for clickable classes or closest interactive elements
            const interactiveClasses = [
                'btn', 'sidebar-tab', 'board-item', 'element-btn', 'draw-btn',
                'tool-btn', 'team-color-picker', 'workbook-name', 'board-name',
                'sidebar-toggle-btn', 'sidebar-resize-icon', 'team-remove-btn',
                'context-menu-item', 'board-expand-icon', 'color-preset',
                'breadcrumb-item'
            ];

            for (const className of interactiveClasses) {
                if (element.classList.contains(className) || element.closest(`.${className}`)) {
                    return true;
                }
            }

            // Check if it's inside the header or toolbar
            if (element.closest('.header') || element.closest('.toolbar')) {
                return true;
            }

            return false;
        };

        // Convert touchstart to mousedown
        document.addEventListener('touchstart', (e) => {
            if (e.touches.length === 0) return;

            const touch = e.touches[0];
            const target = document.elementFromPoint(touch.clientX, touch.clientY);

            // Only prevent default for non-interactive elements (canvas, players, etc.)
            // Let buttons and UI controls work normally
            if (!isInteractiveUI(target)) {
                e.preventDefault();
            }

            // Check for double-tap
            const currentTime = Date.now();
            const timeDiff = currentTime - lastTapTime;
            const distance = Math.sqrt(
                Math.pow(touch.clientX - lastTapX, 2) +
                Math.pow(touch.clientY - lastTapY, 2)
            );

            if (timeDiff < doubleTapThreshold && distance < doubleTapDistance) {
                // Double-tap detected! Dispatch dblclick event
                const dblClickEvent = new MouseEvent('dblclick', {
                    clientX: touch.clientX,
                    clientY: touch.clientY,
                    bubbles: true,
                    cancelable: true,
                    view: window
                });

                Object.defineProperty(dblClickEvent, 'target', {
                    value: target,
                    enumerable: true
                });

                if (target) {
                    target.dispatchEvent(dblClickEvent);
                }

                // Mark that we just fired a double-tap to prevent the touchend from triggering click
                doubleTapJustFired = true;

                // Reset tap tracking to prevent triple-tap
                lastTapTime = 0;
                lastTapX = 0;
                lastTapY = 0;
                return; // Don't dispatch mousedown for second tap
            }

            // Reset double-tap flag on new touch sequence
            doubleTapJustFired = false;

            // Record this tap for double-tap detection
            lastTapTime = currentTime;
            lastTapX = touch.clientX;
            lastTapY = touch.clientY;

            // Create synthetic mouse event
            const mouseEvent = new MouseEvent('mousedown', {
                clientX: touch.clientX,
                clientY: touch.clientY,
                bubbles: true,
                cancelable: true,
                view: window
            });

            // Set the target property (read-only, so use defineProperty)
            Object.defineProperty(mouseEvent, 'target', {
                value: target,
                enumerable: true
            });

            // Dispatch to the target element so it bubbles naturally
            if (target) {
                target.dispatchEvent(mouseEvent);
            }
        }, { passive: false });

        // Convert touchmove to mousemove
        document.addEventListener('touchmove', (e) => {
            if (e.touches.length === 0) return;

            const touch = e.touches[0];
            const target = document.elementFromPoint(touch.clientX, touch.clientY);

            // Only prevent default for non-interactive elements
            if (!isInteractiveUI(target)) {
                e.preventDefault();
            }

            // Create synthetic mouse event
            const mouseEvent = new MouseEvent('mousemove', {
                clientX: touch.clientX,
                clientY: touch.clientY,
                bubbles: true,
                cancelable: true,
                view: window
            });

            // Dispatch to document so all listeners receive it
            document.dispatchEvent(mouseEvent);
        }, { passive: false });

        // Convert touchend to mouseup
        document.addEventListener('touchend', (e) => {
            // If we just fired a double-tap, skip this touchend to prevent accidental clicks on the context menu
            if (doubleTapJustFired) {
                doubleTapJustFired = false; // Reset the flag
                e.preventDefault(); // Prevent any default behavior

                return; // Don't dispatch mouseup/click events
            }

            // Check if touch ended on an interactive element
            let touchEndTarget = null;
            let touch = null;
            if (e.changedTouches.length > 0) {
                touch = e.changedTouches[0];
                touchEndTarget = document.elementFromPoint(touch.clientX, touch.clientY);
            }

            // Only prevent default for non-interactive elements
            if (!isInteractiveUI(touchEndTarget)) {
                e.preventDefault();
            }

            // Create synthetic mouse event with position and target
            const mouseEvent = new MouseEvent('mouseup', {
                clientX: touch ? touch.clientX : 0,
                clientY: touch ? touch.clientY : 0,
                bubbles: true,
                cancelable: true,
                view: window
            });

            // Set the target property
            if (touchEndTarget) {
                Object.defineProperty(mouseEvent, 'target', {
                    value: touchEndTarget,
                    enumerable: true
                });
            }

            // Dispatch to document
            document.dispatchEvent(mouseEvent);
        }, { passive: false });

        // Convert touchcancel to mouseup (cleanup)
        document.addEventListener('touchcancel', (e) => {
            e.preventDefault();

            // Create synthetic mouse event
            const mouseEvent = new MouseEvent('mouseup', {
                bubbles: true,
                cancelable: true,
                view: window
            });

            document.dispatchEvent(mouseEvent);
        }, { passive: false });
    },

    // Setup sidebar tabs
    setupSidebarTabs() {
        const tabs = document.querySelectorAll('.sidebar-tab');
        const tabContents = document.querySelectorAll('.tab-content');

        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                // Remove active class from all tabs and contents
                tabs.forEach(t => t.classList.remove('active'));
                tabContents.forEach(tc => tc.classList.remove('active'));

                // Add active class to clicked tab
                tab.classList.add('active');

                // Show corresponding content
                const tabName = tab.dataset.tab;
                const content = document.getElementById(`tab-${tabName}`);
                if (content) {
                    content.classList.add('active');
                }
            });
        });
    },

    // Setup sidebar toggle
    setupSidebarToggle() {
        const toggleBtn = document.getElementById('btn-toggle-sidebar');
        const toolbar = document.querySelector('.toolbar');
        const resizeIcon = document.querySelector('.sidebar-resize-icon');
        let sidebarVisible = true;

        toggleBtn.addEventListener('click', () => {
            sidebarVisible = !sidebarVisible;
            if (sidebarVisible) {
                toolbar.classList.remove('hidden');
                if (resizeIcon) resizeIcon.style.display = 'flex';
            } else {
                toolbar.classList.add('hidden');
                if (resizeIcon) resizeIcon.style.display = 'none';
            }

            // Immediately recalculate positions after sidebar toggle
            // Use requestAnimationFrame to wait for DOM to update
            requestAnimationFrame(() => {
                Board.resize();
                Shapes.render();
                Plates.render();
                Elements.render();
                Balls.render();
                Players.render();
                Drawings.render();

                // Update sidebar preview sizes
                if (sidebarVisible && typeof Teams !== 'undefined' && Teams.updatePlayerTemplatesSizes) {
                    Teams.updatePlayerTemplatesSizes();
                }
                if (sidebarVisible && typeof Balls !== 'undefined' && Balls.updateBallTemplatesSizes) {
                    Balls.updateBallTemplatesSizes();
                }
                if (sidebarVisible && typeof Plates !== 'undefined' && Plates.updatePlateTemplatesSizes) {
                    Plates.updatePlateTemplatesSizes();
                }
                if (sidebarVisible && typeof Elements !== 'undefined' && Elements.updateElementButtonSizes) {
                    Elements.updateElementButtonSizes();
                }

                // Ensure rotation handles are updated after layout changes
                requestAnimationFrame(() => {
                    if (typeof Players !== 'undefined' && Players.updateRotationHandle) {
                        Players.updateRotationHandle();
                    }
                    if (typeof Elements !== 'undefined' && Elements.updateRotationHandle) {
                        Elements.updateRotationHandle();
                    }
                });
            });
        });
    },

    // Setup sidebar resize
    setupSidebarResize() {
        const resizeHandle = document.querySelector('.sidebar-resize-handle');
        const resizeIcon = document.querySelector('.sidebar-resize-icon');
        const toolbar = document.querySelector('.toolbar');
        let isResizing = false;
        let startX = 0;
        let startWidth = 0;

        // Function to update icon position
        const updateIconPosition = () => {
            if (resizeIcon) {
                resizeIcon.style.left = (toolbar.offsetWidth - 12) + 'px';
            }
        };

        // Load saved width from localStorage
        const savedWidth = localStorage.getItem('sidebarWidth');
        if (savedWidth) {
            toolbar.style.width = savedWidth + 'px';
        }

        // Set initial icon position
        updateIconPosition();

        const startResize = (e) => {
            isResizing = true;
            startX = e.clientX;
            startWidth = toolbar.offsetWidth;
            resizeHandle.classList.add('resizing');
            if (resizeIcon) resizeIcon.classList.add('resizing');
            document.body.style.cursor = 'ew-resize';
            document.body.style.userSelect = 'none';
            e.preventDefault();
        };

        resizeHandle.addEventListener('mousedown', startResize);
        if (resizeIcon) {
            resizeIcon.addEventListener('mousedown', startResize);
        }

        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;

            const diff = e.clientX - startX;
            const newWidth = startWidth + diff;

            // Apply min/max constraints
            const minWidth = 200;
            const maxWidth = 600;
            const clampedWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));

            toolbar.style.width = clampedWidth + 'px';
            updateIconPosition();

            // Trigger board resize to recalculate positions
            requestAnimationFrame(() => {
                Board.resize();
                Shapes.render();
                Plates.render();
                Elements.render();
                Balls.render();
                Players.render();
                Drawings.render();

                // Ensure rotation handles are updated after layout changes
                requestAnimationFrame(() => {
                    if (typeof Players !== 'undefined' && Players.updateRotationHandle) {
                        Players.updateRotationHandle();
                    }
                    if (typeof Elements !== 'undefined' && Elements.updateRotationHandle) {
                        Elements.updateRotationHandle();
                    }
                });
            });
        });

        document.addEventListener('mouseup', () => {
            if (isResizing) {
                isResizing = false;
                resizeHandle.classList.remove('resizing');
                if (resizeIcon) resizeIcon.classList.remove('resizing');
                document.body.style.cursor = '';
                document.body.style.userSelect = '';

                // Save width to localStorage
                localStorage.setItem('sidebarWidth', toolbar.offsetWidth);
                updateIconPosition();

                // Update sidebar preview sizes
                if (typeof Teams !== 'undefined' && Teams.updatePlayerTemplatesSizes) {
                    Teams.updatePlayerTemplatesSizes();
                }
                if (typeof Balls !== 'undefined' && Balls.updateBallTemplatesSizes) {
                    Balls.updateBallTemplatesSizes();
                }
                if (typeof Plates !== 'undefined' && Plates.updatePlateTemplatesSizes) {
                    Plates.updatePlateTemplatesSizes();
                }
                if (typeof Elements !== 'undefined' && Elements.updateElementButtonSizes) {
                    Elements.updateElementButtonSizes();
                }

                // Ensure rotation handles are updated after resize completes
                requestAnimationFrame(() => {
                    if (typeof Players !== 'undefined' && Players.updateRotationHandle) {
                        Players.updateRotationHandle();
                    }
                    if (typeof Elements !== 'undefined' && Elements.updateRotationHandle) {
                        Elements.updateRotationHandle();
                    }
                });
            }
        });
    },

    // Setup tool buttons
    setupTools() {
        // Always stay in select mode
        AppState.currentTool = 'select';
    },

    // Detect if device is touch-capable
    isTouchDevice() {
        // Check multiple indicators for better detection
        return (
            ('ontouchstart' in window) ||
            (navigator.maxTouchPoints > 0) ||
            (navigator.msMaxTouchPoints > 0) ||
            (window.matchMedia && window.matchMedia('(pointer: coarse)').matches)
        );
    },

    // Setup touch mode toggle
    setupTouchMode() {
        const btn = document.getElementById('btn-touch-mode');
        if (!btn) return;

        // Check if user has explicitly set a preference
        const savedPreference = localStorage.getItem('touchMode');

        if (savedPreference !== null) {
            // User has explicitly toggled touch mode before - respect their choice
            if (savedPreference === 'true') {
                document.body.classList.add('touch-mode');
                btn.classList.add('touch-active');
            }
        } else {
            // First time - auto-enable on touch devices
            if (this.isTouchDevice()) {
                document.body.classList.add('touch-mode');
                btn.classList.add('touch-active');
                localStorage.setItem('touchMode', 'true');
            }
        }

        btn.addEventListener('click', () => {
            const isActive = document.body.classList.toggle('touch-mode');
            btn.classList.toggle('touch-active', isActive);
            localStorage.setItem('touchMode', isActive);

            // Re-render so touch overlays appear/disappear
            Players.render();
            Balls.render();
            Plates.render();
            Elements.render();
            Shapes.render();
        });
    },

    setupDebugMode() {
        const checkbox = document.getElementById('show-svg-borders');
        if (!checkbox) return;

        // Restore saved preference
        if (localStorage.getItem('debugMode') === 'true') {
            AppState.debugMode = true;
            checkbox.checked = true;

            // Re-render to show debug boxes on page load
            setTimeout(() => {
                if (typeof Players !== 'undefined') Players.render();
                if (typeof Balls !== 'undefined') Balls.render();
                if (typeof Plates !== 'undefined') Plates.render();
                if (typeof Elements !== 'undefined') Elements.render();
                if (typeof Shapes !== 'undefined') Shapes.render();
            }, 100);
        }

        checkbox.addEventListener('change', () => {
            const isEnabled = checkbox.checked;
            AppState.debugMode = isEnabled;
            localStorage.setItem('debugMode', isEnabled);

            if (isEnabled) {
                // Re-render to show debug boxes
                if (typeof Players !== 'undefined') Players.render();
                if (typeof Balls !== 'undefined') Balls.render();
                if (typeof Plates !== 'undefined') Plates.render();
                if (typeof Elements !== 'undefined') Elements.render();
                if (typeof Shapes !== 'undefined') Shapes.render();
            } else {
                // Hide all debug boxes
                const boardContainer = document.querySelector('.board-container');
                if (boardContainer) {
                    boardContainer.querySelectorAll('.debug-tolerance-box').forEach(box => box.remove());
                }
            }
        });
    },

    setupTouchBordersToggle() {
        const checkbox = document.getElementById('show-touch-borders');
        if (!checkbox) return;

        // Restore saved preference
        if (localStorage.getItem('showTouchBorders') === 'true') {
            document.body.classList.add('show-touch-borders');
            checkbox.checked = true;
        }

        checkbox.addEventListener('change', () => {
            const isEnabled = checkbox.checked;
            document.body.classList.toggle('show-touch-borders', isEnabled);
            localStorage.setItem('showTouchBorders', isEnabled);

            // Re-render shapes to ensure borders appear/disappear
            if (typeof Shapes !== 'undefined') {
                Shapes.render();
            }
        });
    },

    // Setup undo/redo
    setupUndoRedo() {
        const undoBtn = document.getElementById('btn-undo');
        const redoBtn = document.getElementById('btn-redo');

        if (!undoBtn || !redoBtn) {
            console.error('Undo/Redo buttons not found!');
            return;
        }


        undoBtn.addEventListener('click', () => {
            AppState.undo();
        });

        redoBtn.addEventListener('click', () => {
            AppState.redo();
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Ctrl+Z / Cmd+Z for undo
            if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                AppState.undo();
            }
            // Ctrl+Shift+Z / Cmd+Shift+Z for redo
            else if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) {
                e.preventDefault();
                AppState.redo();
            }
            // Ctrl+Y / Cmd+Y for redo (alternative)
            else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
                e.preventDefault();
                AppState.redo();
            }
            // Ctrl+S / Cmd+S for save
            else if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                Storage.exportWorkbook(false);
            }
            // Ctrl+O / Cmd+O for open
            else if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
                e.preventDefault();
                Storage.importWorkbook();
            }
        });
    },

    // Setup position display click handler
    setupPositionDisplay() {
        const positionDisplay = document.getElementById('position-display');
        if (!positionDisplay) {
            console.error('Position display not found!');
            return;
        }

        positionDisplay.addEventListener('click', () => {
            if (AppState.currentDisplayType === 'element' && AppState.currentDisplayObject) {
                Elements.showPositionDialog(AppState.currentDisplayObject);
            } else if (AppState.currentDisplayType === 'player' && AppState.currentDisplayObject) {
                Players.showPositionDialog(AppState.currentDisplayObject);
            } else if (AppState.currentDisplayType === 'ball' && AppState.currentDisplayObject) {
                Balls.showPositionDialog(AppState.currentDisplayObject);
            } else if (AppState.currentDisplayType === 'plate' && AppState.currentDisplayObject) {
                Plates.showPositionDialog(AppState.currentDisplayObject);
            }
        });
    },

    // Update cursor based on tool
    updateCursor() {
        // Always in select mode
        const boardContainer = document.querySelector('.board-container');
        boardContainer.style.cursor = 'default';

        // Update element SVG cursors based on selection state
        document.querySelectorAll('.element-svg').forEach(svg => {
            const elementId = svg.dataset.element;
            const isSelected = AppState.selectedElement && AppState.selectedElement.id === elementId;

            if (isSelected) {
                svg.style.setProperty('cursor', 'default', 'important');
            } else {
                svg.style.setProperty('cursor', 'default', 'important');
            }
        });
    },

    // Setup copy/paste functionality
    setupCopyPaste() {
        let clipboard = null;

        document.addEventListener('keydown', (e) => {
            // Don't handle if typing in input field
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }

            // Copy (Ctrl+C or Cmd+C)
            if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
                e.preventDefault();

                // Determine what's selected and copy it
                if (AppState.selectedShape) {
                    clipboard = {
                        type: 'shape',
                        data: structuredClone(AppState.getShape(AppState.selectedShape))
                    };
                } else if (AppState.selectedElement) {
                    clipboard = {
                        type: 'element',
                        data: structuredClone(AppState.selectedElement)
                    };
                } else if (AppState.selectedBall) {
                    clipboard = {
                        type: 'ball',
                        data: structuredClone(AppState.selectedBall)
                    };
                } else if (AppState.selectedPlate) {
                    clipboard = {
                        type: 'plate',
                        data: structuredClone(AppState.selectedPlate)
                    };
                }
            }

            // Paste (Ctrl+V or Cmd+V)
            if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
                e.preventDefault();

                if (!clipboard) {
                    return;
                }

                // Paste with offset
                const offset = 50; // 50cm offset

                if (clipboard.type === 'shape') {
                    const newShape = structuredClone(clipboard.data);
                    newShape.id = `shape-${AppState.nextShapeId++}`;
                    newShape.x += offset;
                    newShape.y += offset;
                    newShape.inherited = false;

                    AppState.shapes.push(newShape);
                    AppState.selectedShape = newShape.id;
                    AppState.saveToLocalStorage();
                    Shapes.render();
                } else if (clipboard.type === 'element') {
                    const newElement = structuredClone(clipboard.data);
                    newElement.id = `element-${AppState.nextElementId++}`;
                    newElement.x += offset;
                    newElement.y += offset;
                    newElement.inherited = false;

                    AppState.elements.push(newElement);
                    AppState.selectedElement = newElement;
                    AppState.saveToLocalStorage();
                    Elements.render();
                } else if (clipboard.type === 'ball') {
                    const newBall = structuredClone(clipboard.data);
                    newBall.id = `ball-${AppState.nextBallId++}`;
                    newBall.x += offset;
                    newBall.y += offset;

                    AppState.balls.push(newBall);
                    AppState.selectedBall = newBall;
                    AppState.saveToLocalStorage();
                    Balls.render();
                } else if (clipboard.type === 'plate') {
                    const newPlate = structuredClone(clipboard.data);
                    newPlate.id = `plate-${AppState.nextPlateId++}`;
                    newPlate.x += offset;
                    newPlate.y += offset;
                    newPlate.inherited = false;

                    AppState.plates.push(newPlate);
                    AppState.selectedPlate = newPlate;
                    AppState.saveToLocalStorage();
                    Plates.render();
                }
            }
        });
    },

    // Setup delete functionality
    setupDelete() {
        document.addEventListener('keydown', (e) => {
            // Don't delete if typing in input field
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                return;
            }

            // Delete key removes selected object
            if (e.key === 'Delete') {
                e.preventDefault();

                // Check what's selected and delete it
                if (AppState.selectedShape) {
                    const _selShape = AppState.getShape(AppState.selectedShape);
                    if (_selShape && _selShape.inherited) return;
                    // Remove shape handles first
                    if (Shapes.rotationHandle) {
                        Shapes.rotationHandle.remove();
                        Shapes.rotationHandle = null;
                    }
                    Shapes.resizeHandles.forEach(handle => handle.remove());
                    Shapes.resizeHandles = [];

                    const shapeToRemoveId = AppState.selectedShape;
                    AppState.selectedShape = null;
                    AppState.hidePositionDisplay();
                    AppState.removeShape(shapeToRemoveId);
                    Shapes.render();
                } else if (AppState.selectedElement) {
                    if (AppState.selectedElement.inherited) return;
                    // Remove element handles first
                    if (Elements.rotationHandle) {
                        Elements.rotationHandle.remove();
                        Elements.rotationHandle = null;
                    }

                    const elementToRemove = AppState.selectedElement;
                    AppState.selectedElement = null;
                    AppState.hidePositionDisplay();
                    AppState.removeElement(elementToRemove.id);
                    Elements.render();
                } else if (AppState.selectedPlayer) {
                    if (AppState.isChildBoard()) return;
                    // Remove player rotation handle if present
                    if (Players.rotationHandle) {
                        Players.rotationHandle.remove();
                        Players.rotationHandle = null;
                    }

                    const playerToRemove = AppState.selectedPlayer;
                    AppState.selectedPlayer = null;
                    AppState.hidePositionDisplay();
                    AppState.removePlayer(playerToRemove.id);
                    Players.render();
                    Teams.render();
                } else if (AppState.selectedBall) {
                    if (AppState.isChildBoard()) return;
                    const ballToRemove = AppState.selectedBall;
                    AppState.selectedBall = null;
                    AppState.hidePositionDisplay();
                    AppState.removeBall(ballToRemove.id);
                    Balls.render();
                } else if (AppState.selectedPlate) {
                    if (AppState.selectedPlate.inherited) return;
                    const plateToRemove = AppState.selectedPlate;
                    AppState.selectedPlate = null;
                    AppState.hidePositionDisplay();
                    AppState.removePlate(plateToRemove.id);
                    Plates.render();
                }
            }
        });
    },

    // Setup fullscreen functionality
    setupFullscreen() {
        const fullscreenBtn = document.getElementById('btn-fullscreen');

        if (!fullscreenBtn) {
            console.error('Fullscreen button not found!');
            return;
        }

        const toggleFullscreen = async () => {
            if (!document.fullscreenElement) {
                // Enter fullscreen
                try {
                    await document.documentElement.requestFullscreen();

                    // Check if screen is in portrait mode (height > width)
                    // If yes, lock to landscape orientation
                    const isPortrait = window.screen.height > window.screen.width;

                    if (isPortrait && screen.orientation && screen.orientation.lock) {
                        try {
                            await screen.orientation.lock('landscape');
                        } catch (orientationErr) {
                            // Orientation lock might fail on some browsers/devices
                            // This is not critical, so we just ignore it
                        }
                    }
                } catch (err) {
                    console.error(`Error attempting to enable fullscreen: ${err.message}`);
                }
            } else {
                // Exit fullscreen
                try {
                    // Unlock orientation when exiting fullscreen
                    if (screen.orientation && screen.orientation.unlock) {
                        screen.orientation.unlock();
                    }
                    await document.exitFullscreen();
                } catch (err) {
                    console.error(`Error exiting fullscreen: ${err.message}`);
                }
            }
        };

        // Button click handler
        fullscreenBtn.addEventListener('click', toggleFullscreen);

        // Update button icon based on fullscreen state
        const updateFullscreenIcon = () => {
            const svg = fullscreenBtn.querySelector('svg');
            if (document.fullscreenElement) {
                // Exit fullscreen icon
                svg.innerHTML = '<path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/>';
                fullscreenBtn.title = 'Exit Fullscreen';
            } else {
                // Enter fullscreen icon
                svg.innerHTML = '<path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>';
                fullscreenBtn.title = 'Toggle Fullscreen';
            }
        };

        // Listen for fullscreen changes
        document.addEventListener('fullscreenchange', () => {
            updateFullscreenIcon();

            // Trigger resize to adjust board
            requestAnimationFrame(() => {
                Board.resize();
                Shapes.render();
                Plates.render();
                Elements.render();
                Balls.render();
                Players.render();
                Drawings.render();

                // Ensure rotation handles are updated after layout changes
                requestAnimationFrame(() => {
                    if (typeof Players !== 'undefined' && Players.updateRotationHandle) {
                        Players.updateRotationHandle();
                    }
                    if (typeof Elements !== 'undefined' && Elements.updateRotationHandle) {
                        Elements.updateRotationHandle();
                    }
                });
            });
        });

        // Keyboard shortcut (F11 or F key)
        document.addEventListener('keydown', (e) => {
            // F key for fullscreen (when not typing in input)
            if (e.key === 'f' && !e.ctrlKey && !e.metaKey && !e.altKey &&
                e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
                e.preventDefault();
                toggleFullscreen();
            }
        });
    },

    // Setup Escape key to close modals and context menus
    setupEscapeKey() {
        document.addEventListener('keydown', (e) => {
            if (e.key !== 'Escape') return;

            // First check context menus (higher priority)
            const contextMenus = [
                'file-menu',
                'element-context-menu',
                'path-context-menu',
                'board-context-menu',
                'board-canvas-context-menu'
            ];

            for (const menuId of contextMenus) {
                const menu = document.getElementById(menuId);
                if (menu && !menu.classList.contains('hidden')) {
                    menu.classList.add('hidden');
                    menu.style.display = 'none';
                    e.preventDefault();
                    return;
                }
            }

            // Then check modals
            const modals = [
                { id: 'element-position-modal', cancelBtn: 'btn-cancel-position' },
                { id: 'player-name-modal', cancelBtn: 'btn-cancel-player-name' },
                { id: 'player-number-modal', cancelBtn: 'btn-cancel-player-number' },
                { id: 'element-color-modal', cancelBtn: 'btn-cancel-color' },
                { id: 'shape-text-modal', cancelBtn: 'btn-cancel-shape-text' },
                { id: 'shape-size-modal', cancelBtn: 'btn-cancel-shape-size' },
                { id: 'color-modal', cancelBtn: 'btn-color-modal-cancel' },
                { id: 'size-modal', cancelBtn: 'btn-size-modal-cancel' },
                { id: 'position-modal', cancelBtn: 'btn-position-modal-cancel' },
                { id: 'text-modal', cancelBtn: 'btn-text-modal-cancel' },
                { id: 'workbook-name-modal', cancelBtn: 'btn-cancel-workbook-name' },
                { id: 'board-name-modal', cancelBtn: 'btn-cancel-board-name' },
                { id: 'confirm-new-workbook-modal', cancelBtn: 'btn-cancel-new-workbook' },
                { id: 'message-modal', cancelBtn: 'btn-message-modal-ok' }
            ];

            // Check each modal and close if visible
            for (const modal of modals) {
                const modalElement = document.getElementById(modal.id);
                if (modalElement && !modalElement.classList.contains('hidden')) {
                    // Trigger the cancel button click to ensure proper cleanup
                    const cancelBtn = document.getElementById(modal.cancelBtn);
                    if (cancelBtn) {
                        cancelBtn.click();
                    } else {
                        // Fallback: just hide the modal
                        modalElement.classList.add('hidden');
                    }
                    e.preventDefault();
                    return; // Only close one modal at a time
                }
            }

            // Exit fullscreen if active
            if (document.fullscreenElement) {
                document.exitFullscreen();
                e.preventDefault();
            }
        });
    },

    // Setup screenshot export
    setupScreenshot() {
        const screenshotBtn = document.getElementById('btn-screenshot');
        const screenshotMenu = document.getElementById('screenshot-menu');

        if (!screenshotBtn || !screenshotMenu) {
            console.error('Screenshot button or menu not found!');
            return;
        }

        // Toggle screenshot menu on button click
        screenshotBtn.addEventListener('click', (e) => {
            e.stopPropagation();

            if (screenshotMenu.classList.contains('hidden')) {
                // Show menu
                const rect = screenshotBtn.getBoundingClientRect();
                screenshotMenu.classList.remove('hidden');
                screenshotMenu.style.display = 'block';

                // Get menu dimensions after making it visible
                const menuRect = screenshotMenu.getBoundingClientRect();

                // Calculate position
                let left = rect.left;
                let top = rect.bottom + 5;

                // Ensure menu fits horizontally
                if (left + menuRect.width > window.innerWidth) {
                    left = window.innerWidth - menuRect.width - 10;
                }
                if (left < 10) {
                    left = 10;
                }

                // Ensure menu fits vertically
                if (top + menuRect.height > window.innerHeight) {
                    // Position above button instead
                    top = rect.top - menuRect.height - 5;
                }
                if (top < 10) {
                    top = 10;
                }

                screenshotMenu.style.left = left + 'px';
                screenshotMenu.style.top = top + 'px';
            } else {
                // Hide menu
                screenshotMenu.classList.add('hidden');
                screenshotMenu.style.display = 'none';
            }
        });

        // Hide menu when clicking outside or on other buttons
        document.addEventListener('click', (e) => {
            if (screenshotMenu.classList.contains('hidden')) return;

            // Don't close if clicking the screenshot button itself (handled by toggle)
            if (e.target === screenshotBtn || screenshotBtn.contains(e.target)) return;

            // Don't close if clicking inside the menu
            if (screenshotMenu.contains(e.target)) return;

            // Close menu for any other click
            screenshotMenu.classList.add('hidden');
            screenshotMenu.style.display = 'none';
        }, true); // Use capture phase to ensure we catch clicks before stopPropagation

        // Hide menu on window blur
        window.addEventListener('blur', () => {
            screenshotMenu.classList.add('hidden');
            screenshotMenu.style.display = 'none';
        });

        // Handle menu item clicks
        screenshotMenu.addEventListener('click', async (e) => {
            const item = e.target.closest('.context-menu-item');
            if (!item) return;

            const action = item.dataset.action;
            const width = parseInt(item.dataset.width);
            const height = parseInt(item.dataset.height);

            // Hide menu
            screenshotMenu.classList.add('hidden');
            screenshotMenu.style.display = 'none';

            // Handle action
            if (action === 'copy-to-clipboard') {
                await this.copyScreenshotToClipboard(width, height);
            } else {
                // Export with selected dimensions
                await this.exportScreenshot(width, height);
            }
        });
    },

    // Setup modal observer to automatically manage rotation handle visibility
    setupModalObserver() {
        // Observe all modals for class changes
        const modals = document.querySelectorAll('.modal');

        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    const target = mutation.target;
                    const isHidden = target.classList.contains('hidden');

                    // If a modal was just hidden, check if we should restore rotation handles
                    if (isHidden) {
                        // Small delay to ensure DOM is updated
                        setTimeout(() => Utils.restoreRotationHandles(), 10);
                    }
                }
            });
        });

        // Observe each modal for class changes
        modals.forEach(modal => {
            observer.observe(modal, { attributes: true, attributeFilter: ['class'] });
        });
    },

    // Export screenshot with specified dimensions
    async exportScreenshot(targetWidth, targetHeight) {
        try {
            const boardContainer = document.querySelector('.board-container');
            const boardCanvas   = document.getElementById('board-canvas');

            if (!boardCanvas || !boardContainer) {
                Utils.showMessage('Board not found', 'Export Error');
                return;
            }

            // Load html-to-image (needed for the entity layer)
            if (typeof htmlToImage === 'undefined') {
                const script = document.createElement('script');
                script.src = 'ext/html-to-image.js';
                document.head.appendChild(script);
                await new Promise((resolve, reject) => {
                    script.onload = resolve;
                    script.onerror = reject;
                });
            }

            // Use target dimensions for export
            const canvasRect = boardCanvas.getBoundingClientRect();
            const w = targetWidth;
            const h = targetHeight;
            const scale = w / canvasRect.width;

            const exportCanvas = document.createElement('canvas');
            exportCanvas.width  = w;
            exportCanvas.height = h;
            const ctx = exportCanvas.getContext('2d');

            // Helper: load any src into a resolved HTMLImageElement
            const loadImg = (src) => new Promise((resolve, reject) => {
                const img = new Image();
                img.onload  = () => resolve(img);
                img.onerror = reject;
                img.src = src;
            });

            // ── Helper: serialise an SVG layer and stamp it onto the canvas ──
            const drawSvgLayer = async (svgEl) => {
                if (!svgEl) return;
                const clone = svgEl.cloneNode(true);
                clone.setAttribute('width',  String(w));
                clone.setAttribute('height', String(h));
                clone.setAttribute('xmlns',  'http://www.w3.org/2000/svg');
                const svgStr = new XMLSerializer().serializeToString(clone);
                const dataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgStr);
                ctx.drawImage(await loadImg(dataUrl), 0, 0, w, h);
            };

            // ── Layer 1: parquet background ───────────────────────────────────
            // Inline SVG parquet tile — mirrors the CSS background-image, no fetch
            // needed so this works on file:// protocol too.
            ctx.fillStyle = '#d9a66a';
            ctx.fillRect(0, 0, w, h);
            {
                const parquetSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="120"><rect width="600" height="120" fill="#d9a66a"/><g stroke="#7a5832" stroke-width="0.6"><g fill="#e6bb7f"><rect x="0" y="0" width="300" height="12"/><rect x="300" y="0" width="300" height="12"/></g><g fill="#ebc996"><rect x="-40" y="12" width="300" height="12"/><rect x="260" y="12" width="300" height="12"/><rect x="560" y="12" width="300" height="12"/></g><g fill="#f0d7a8"><rect x="-120" y="24" width="300" height="12"/><rect x="180" y="24" width="300" height="12"/><rect x="480" y="24" width="300" height="12"/></g><g fill="#e4c08d"><rect x="-200" y="36" width="300" height="12"/><rect x="100" y="36" width="300" height="12"/><rect x="400" y="36" width="300" height="12"/></g><g fill="#efd3a3"><rect x="-80" y="48" width="300" height="12"/><rect x="220" y="48" width="300" height="12"/><rect x="520" y="48" width="300" height="12"/></g><g fill="#e9c894"><rect x="-160" y="60" width="300" height="12"/><rect x="140" y="60" width="300" height="12"/><rect x="440" y="60" width="300" height="12"/></g><g fill="#f2deb5"><rect x="-20" y="72" width="300" height="12"/><rect x="280" y="72" width="300" height="12"/></g><g fill="#e3c18c"><rect x="-100" y="84" width="300" height="12"/><rect x="200" y="84" width="300" height="12"/><rect x="500" y="84" width="300" height="12"/></g><g fill="#edd2a6"><rect x="-220" y="96" width="300" height="12"/><rect x="80" y="96" width="300" height="12"/><rect x="380" y="96" width="300" height="12"/></g><g fill="#e7c795"><rect x="-60" y="108" width="300" height="12"/><rect x="240" y="108" width="300" height="12"/><rect x="540" y="108" width="300" height="12"/></g></g></svg>`;
                const parquetUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(parquetSvg);
                try {
                    const parquetImg = await loadImg(parquetUrl);
                    // Match the CSS sizing: tile height = court height / 5
                    const tileH = Math.round(h / 5);
                    const tileW = tileH * 5;
                    let startX = ((w / 2 - tileW / 2) % tileW + tileW) % tileW - tileW;
                    let startY = ((h / 2 - tileH / 2) % tileH + tileH) % tileH - tileH;
                    for (let x = startX; x < w; x += tileW) {
                        for (let y = startY; y < h; y += tileH) {
                            ctx.drawImage(parquetImg, x, y, tileW, tileH);
                        }
                    }
                } catch (_) { /* keep solid colour fallback */ }
            }

            // ── Layer 2: court SVG ───────────────────────────────────────────
            // Serialize the inline <svg id="court-svg"> element directly —
            // no fetch() needed, so it works under file:// without any flags.
            // Inject explicit width/height so Chrome renders at full resolution.
            {
                const courtEl = document.getElementById('court-svg');
                const svgText = new XMLSerializer().serializeToString(courtEl);
                const sized = svgText.replace(
                    /(<svg\b[^>]*?)(\s*\/>|>)/,
                    `$1 width="${w}" height="${h}"$2`
                );
                const courtUrl = 'data:image/svg+xml;charset=utf-8,' +
                                 encodeURIComponent(sized);
                ctx.globalAlpha = 0.8;   // match CSS opacity on #court-svg
                ctx.drawImage(await loadImg(courtUrl), 0, 0, w, h);
                ctx.globalAlpha = 1;
            }

            // ── Layer 3: in-progress drawings ────────────────────────────────
            await drawSvgLayer(document.getElementById('drawing-layer'));

            // ── Layer 4: completed paths / arrows ────────────────────────────
            await drawSvgLayer(document.getElementById('paths-layer'));

            // ── Layer 5: players, balls, plates, elements, shapes (DOM) ──────
            // html-to-image is used only for this layer.  Entity elements use
            // only inline colours — no external URLs — so this works under
            // file:// without any fetch() calls.
            // On the first ever call, html-to-image's style-inlining produces a
            // nearly-transparent canvas because it hasn't yet cached the computed
            // CSS rules it needs.  A cheap low-res warm-up call fills that cache
            // so the high-res call immediately after renders correctly.
            const playersLayer = document.getElementById('players-layer');
            if (playersLayer) {
                const opts = {
                    backgroundColor: null,  // transparent background
                    skipFonts:       true,  // no @font-face → skip CSS fetch
                };
                if (!App._htmlToImageWarmed) {
                    await htmlToImage.toCanvas(playersLayer, { ...opts, pixelRatio: 0.1 });
                    App._htmlToImageWarmed = true;
                }

                // players-layer always covers the full container at (0,0).
                // board-area inside it is offset by (boardOffsetX, boardOffsetY)
                // to align with the canvas. We capture the full layer and crop
                // by the board-area offset so entities land at the right position.
                const entityCanvas = await htmlToImage.toCanvas(playersLayer, {
                    ...opts, pixelRatio: scale,
                });

                const boardArea  = document.getElementById('board-area');
                const cropX = Math.round(parseFloat(boardArea.style.left || '0') * scale);
                const cropY = Math.round(parseFloat(boardArea.style.top  || '0') * scale);
                ctx.drawImage(entityCanvas, cropX, cropY, w, h, 0, 0, w, h);
            }

            // ── Download as PNG ───────────────────────────────────────────────
            const blob = await new Promise(resolve => exportCanvas.toBlob(resolve, 'image/png'));
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;

            const boardName    = AppState.boards.find(b => b.id === AppState.currentBoardId)?.name || 'Board';
            const workbookName = AppState.workbookName || 'Futsal';
            const timestamp    = new Date().toISOString().slice(0, 10);
            a.download = `${workbookName}-${boardName}-${timestamp}.png`;

            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            Utils.showToast(`Screenshot exported (${w}×${h})`, 'success');

        } catch (error) {
            console.error('Screenshot export failed:', error);
            Utils.showMessage('Failed to export screenshot: ' + error.message, 'Export Error');
        }
    },

    // Copy screenshot to clipboard with specified dimensions
    async copyScreenshotToClipboard(targetWidth, targetHeight) {
        try {
            // Check if Clipboard API is supported
            if (!navigator.clipboard || !navigator.clipboard.write) {
                Utils.showMessage('Clipboard API not supported in this browser', 'Copy Error');
                return;
            }

            const boardContainer = document.querySelector('.board-container');
            const boardCanvas   = document.getElementById('board-canvas');

            if (!boardCanvas || !boardContainer) {
                Utils.showMessage('Board not found', 'Copy Error');
                return;
            }

            // Load html-to-image (needed for the entity layer)
            if (typeof htmlToImage === 'undefined') {
                const script = document.createElement('script');
                script.src = 'ext/html-to-image.js';
                document.head.appendChild(script);
                await new Promise((resolve, reject) => {
                    script.onload = resolve;
                    script.onerror = reject;
                });
            }

            // Use target dimensions for export
            const canvasRect = boardCanvas.getBoundingClientRect();
            const w = targetWidth;
            const h = targetHeight;
            const scale = w / canvasRect.width;

            const exportCanvas = document.createElement('canvas');
            exportCanvas.width  = w;
            exportCanvas.height = h;
            const ctx = exportCanvas.getContext('2d');

            // Helper: load any src into a resolved HTMLImageElement
            const loadImg = (src) => new Promise((resolve, reject) => {
                const img = new Image();
                img.onload  = () => resolve(img);
                img.onerror = reject;
                img.src = src;
            });

            // ── Helper: serialise an SVG layer and stamp it onto the canvas ──
            const drawSvgLayer = async (svgEl) => {
                if (!svgEl) return;
                const clone = svgEl.cloneNode(true);
                clone.setAttribute('width',  String(w));
                clone.setAttribute('height', String(h));
                clone.setAttribute('xmlns',  'http://www.w3.org/2000/svg');
                const svgStr = new XMLSerializer().serializeToString(clone);
                const dataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgStr);
                ctx.drawImage(await loadImg(dataUrl), 0, 0, w, h);
            };

            // ── Layer 1: parquet background ───────────────────────────────────
            ctx.fillStyle = '#d9a66a';
            ctx.fillRect(0, 0, w, h);
            {
                const parquetSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="120"><rect width="600" height="120" fill="#d9a66a"/><g stroke="#7a5832" stroke-width="0.6"><g fill="#e6bb7f"><rect x="0" y="0" width="300" height="12"/><rect x="300" y="0" width="300" height="12"/></g><g fill="#ebc996"><rect x="-40" y="12" width="300" height="12"/><rect x="260" y="12" width="300" height="12"/><rect x="560" y="12" width="300" height="12"/></g><g fill="#f0d7a8"><rect x="-120" y="24" width="300" height="12"/><rect x="180" y="24" width="300" height="12"/><rect x="480" y="24" width="300" height="12"/></g><g fill="#e4c08d"><rect x="-200" y="36" width="300" height="12"/><rect x="100" y="36" width="300" height="12"/><rect x="400" y="36" width="300" height="12"/></g><g fill="#efd3a3"><rect x="-80" y="48" width="300" height="12"/><rect x="220" y="48" width="300" height="12"/><rect x="520" y="48" width="300" height="12"/></g><g fill="#e9c894"><rect x="-160" y="60" width="300" height="12"/><rect x="140" y="60" width="300" height="12"/><rect x="440" y="60" width="300" height="12"/></g><g fill="#f2deb5"><rect x="-20" y="72" width="300" height="12"/><rect x="280" y="72" width="300" height="12"/></g><g fill="#e3c18c"><rect x="-100" y="84" width="300" height="12"/><rect x="200" y="84" width="300" height="12"/><rect x="500" y="84" width="300" height="12"/></g><g fill="#edd2a6"><rect x="-220" y="96" width="300" height="12"/><rect x="80" y="96" width="300" height="12"/><rect x="380" y="96" width="300" height="12"/></g><g fill="#e7c795"><rect x="-60" y="108" width="300" height="12"/><rect x="240" y="108" width="300" height="12"/><rect x="540" y="108" width="300" height="12"/></g></g></svg>`;
                const parquetUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(parquetSvg);
                try {
                    const parquetImg = await loadImg(parquetUrl);
                    const tileH = Math.round(h / 5);
                    const tileW = tileH * 5;
                    let startX = ((w / 2 - tileW / 2) % tileW + tileW) % tileW - tileW;
                    let startY = ((h / 2 - tileH / 2) % tileH + tileH) % tileH - tileH;
                    for (let x = startX; x < w; x += tileW) {
                        for (let y = startY; y < h; y += tileH) {
                            ctx.drawImage(parquetImg, x, y, tileW, tileH);
                        }
                    }
                } catch (_) { /* keep solid colour fallback */ }
            }

            // ── Layer 2: court SVG ───────────────────────────────────────────
            {
                const courtEl = document.getElementById('court-svg');
                const svgText = new XMLSerializer().serializeToString(courtEl);
                const sized = svgText.replace(
                    /(<svg\b[^>]*?)(\s*\/>|>)/,
                    `$1 width="${w}" height="${h}"$2`
                );
                const courtUrl = 'data:image/svg+xml;charset=utf-8,' +
                                 encodeURIComponent(sized);
                ctx.globalAlpha = 0.8;
                ctx.drawImage(await loadImg(courtUrl), 0, 0, w, h);
                ctx.globalAlpha = 1;
            }

            // ── Layer 3: in-progress drawings ────────────────────────────────
            await drawSvgLayer(document.getElementById('drawing-layer'));

            // ── Layer 4: completed paths / arrows ────────────────────────────
            await drawSvgLayer(document.getElementById('paths-layer'));

            // ── Layer 5: players, balls, plates, elements, shapes (DOM) ──────
            const playersLayer = document.getElementById('players-layer');
            if (playersLayer) {
                const opts = {
                    backgroundColor: null,
                    skipFonts:       true,
                };
                if (!App._htmlToImageWarmed) {
                    await htmlToImage.toCanvas(playersLayer, { ...opts, pixelRatio: 0.1 });
                    App._htmlToImageWarmed = true;
                }

                const entityCanvas = await htmlToImage.toCanvas(playersLayer, {
                    ...opts, pixelRatio: scale,
                });

                const boardArea  = document.getElementById('board-area');
                const cropX = Math.round(parseFloat(boardArea.style.left || '0') * scale);
                const cropY = Math.round(parseFloat(boardArea.style.top  || '0') * scale);
                ctx.drawImage(entityCanvas, cropX, cropY, w, h, 0, 0, w, h);
            }

            // ── Copy to clipboard ──────────────────────────────────────────────
            const blob = await new Promise(resolve => exportCanvas.toBlob(resolve, 'image/png'));

            await navigator.clipboard.write([
                new ClipboardItem({
                    'image/png': blob
                })
            ]);

            Utils.showToast(`Copied to clipboard (${w}×${h})`, 'success');

        } catch (error) {
            console.error('Copy to clipboard failed:', error);
            Utils.showMessage('Failed to copy to clipboard: ' + error.message, 'Copy Error');
        }
    },

    // Render all components
    // Setup right-click context menu on the board canvas (empty space)
    setupBoardCanvasContextMenu() {
        const boardContainer = document.querySelector('.board-container');
        if (!boardContainer) return;

        const hideCanvasMenu = () => {
            const active = document.getElementById('board-canvas-context-menu');
            if (active) {
            active.classList.add('hidden');
            active.style.display = 'none';
            }
        };

        // Track touch for long-press detection (mobile support)
        let touchTimer = null;
        let touchStartPos = null;

        const handleContextMenu = (e) => {
            // Only show when clicking empty board space (not on any entity)
            const onEntity = e.target.closest(
            '[data-player-id], [data-ball], [data-plate], [data-element], [data-shape], ' +
            '.player, .player-name, .player-arms-container, .rotation-handle, ' +
            '.ball-svg, .plate-svg, .element-svg, .shape-svg, ' +
            '.drawing-layer, .path-line, .context-menu'
            );
            if (onEntity) return;

            e.preventDefault();

            // Get fresh menu reference each time (fixes bug where menu becomes stale)
            const menu = document.getElementById('board-canvas-context-menu');
            if (!menu) return;

            // Refresh the menu's disabled state each time it's shown
            const resetItem = menu.querySelector('[data-action="reset-to-parent"]');
            if (resetItem) {
            if (AppState.isChildBoard()) {
                resetItem.classList.remove('disabled');
            } else {
                resetItem.classList.add('disabled');
            }
            }

            Utils.positionContextMenu(menu, e.clientX, e.clientY);
            menu.classList.remove('hidden');
            menu.style.display = '';

            // Remove old click listener if exists
            const oldClickHandler = menu._clickHandler;
            if (oldClickHandler) {
                menu.removeEventListener('click', oldClickHandler);
            }

            // Clean up any previous hideHandlers
            if (menu._cleanup) {
                menu._cleanup();
            }

            let hideHandler, cleanup;

            hideHandler = (ev) => {
                // Hide if clicking outside menu
                if (!ev.target || !menu.contains(ev.target)) {
                    menu.classList.add('hidden');
                    menu.style.display = 'none';
                    cleanup();
                }
            };

            cleanup = () => {
                document.removeEventListener('click', hideHandler, true);
                document.removeEventListener('mousedown', hideHandler, true);
                window.removeEventListener('blur', hideHandler);
                menu._cleanup = null;
            };

            menu._cleanup = cleanup;

            const clickHandler = (ev) => {
                const item = ev.target.closest('.context-menu-item');
                // Always close menu when clicking inside it (even on disabled items)
                menu.classList.add('hidden');
                menu.style.display = 'none';

                // Clean up outside-click listeners
                cleanup();

                // Don't execute action if no item or item is disabled
                if (!item || item.classList.contains('disabled')) return;

                if (item.dataset.action === 'reset-to-parent') {
                    this.resetBoardToParent();
                }
            };

            menu._clickHandler = clickHandler;
            menu.addEventListener('click', clickHandler);

            // mousedown fires before contextmenu, so attaching here is safe (won't catch the trigger event).
            // click/auxclick from right-click are different event types, also safe to attach immediately.
            document.addEventListener('click', hideHandler, true);
            document.addEventListener('mousedown', hideHandler, true);
            window.addEventListener('blur', hideHandler);
        };

        // Desktop: right-click
        boardContainer.addEventListener('contextmenu', handleContextMenu);

        // Mobile: long-press (touch and hold)
        boardContainer.addEventListener('touchstart', (e) => {
            // Only handle on empty board space
            const onEntity = e.target.closest(
                '[data-player-id], [data-ball], [data-plate], [data-element], [data-shape], ' +
                '.player, .player-name, .player-arms-container, .rotation-handle, ' +
                '.ball-svg, .plate-svg, .element-svg, .shape-svg, ' +
                '.drawing-layer, .path-line, .context-menu'
            );
            if (onEntity) return;

            const touch = e.touches[0];
            touchStartPos = { x: touch.clientX, y: touch.clientY };

            // Clear any existing timer
            if (touchTimer) {
                clearTimeout(touchTimer);
            }

            // Set timer for long-press (500ms)
            touchTimer = setTimeout(() => {
                // Trigger contextmenu event for long-press
                const contextMenuEvent = new MouseEvent('contextmenu', {
                    bubbles: true,
                    cancelable: true,
                    view: window,
                    clientX: touch.clientX,
                    clientY: touch.clientY,
                    button: 2
                });
                e.target.dispatchEvent(contextMenuEvent);
                touchTimer = null;
            }, 500);
        }, { passive: true });

        boardContainer.addEventListener('touchmove', (e) => {
            // Cancel long-press if finger moves too much
            if (touchTimer && touchStartPos) {
                const touch = e.touches[0];
                const deltaX = Math.abs(touch.clientX - touchStartPos.x);
                const deltaY = Math.abs(touch.clientY - touchStartPos.y);

                // Cancel if moved more than 10px
                if (deltaX > 10 || deltaY > 10) {
                    clearTimeout(touchTimer);
                    touchTimer = null;
                }
            }
        }, { passive: true });

        boardContainer.addEventListener('touchend', () => {
            // Cancel long-press on touch end (if it hasn't fired yet)
            if (touchTimer) {
                clearTimeout(touchTimer);
                touchTimer = null;
            }
        }, { passive: true });

        boardContainer.addEventListener('touchcancel', () => {
            // Cancel long-press on touch cancel
            if (touchTimer) {
                clearTimeout(touchTimer);
                touchTimer = null;
            }
        }, { passive: true });
    },

    // Reset current child board to match its parent exactly
    resetBoardToParent() {
        if (!AppState.isChildBoard()) return;

        const board = AppState.boards.find(b => b.id === AppState.currentBoardId);
        if (!board) return;

        // Clear all child-specific overrides stored for this board
        board.players = [];
        board.balls = [];
        board.drawings = [];
        board.elements = [];
        board.plates = [];
        board.shapes = [];
        board.pathIntermediates = {};

        // Reload FIRST so loadBoard sees the cleared data and re-applies parent inheritance.
        // saveToLocalStorage() calls saveCurrentBoard() internally, so it must run AFTER
        // loadBoard; otherwise saveCurrentBoard() would re-save the old in-memory state.
        AppState.loadBoard(AppState.currentBoardId);
        AppState.saveToLocalStorage();

        // Re-render all components
        Players.render();
        Balls.render();
        Elements.render();
        Plates.render();
        Shapes.render();
        Drawings.render();
        if (typeof Animations !== 'undefined') {
            Animations.renderParentPaths();
        }
    },

    render() {
        Board.draw();
        Teams.render();
        Shapes.render();
        Plates.render();
        Elements.render();
        Balls.render();
        Players.render();
        Drawings.render();
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});

// Handle window resize
window.addEventListener('resize', () => {
    Board.resize();
    Shapes.render();
    Plates.render();
    Elements.render();
    Balls.render();
    Players.render();
    Drawings.render();
    if (typeof Teams !== 'undefined' && Teams.updatePlayerTemplatesSizes) {
        Teams.updatePlayerTemplatesSizes();
    }
    if (typeof Balls !== 'undefined' && Balls.updateBallTemplatesSizes) {
        Balls.updateBallTemplatesSizes();
    }
    if (typeof Plates !== 'undefined' && Plates.updatePlateTemplatesSizes) {
        Plates.updatePlateTemplatesSizes();
    }
    if (typeof Elements !== 'undefined' && Elements.updateElementButtonSizes) {
        Elements.updateElementButtonSizes();
    }

    // Ensure rotation handles are updated after layout changes
    requestAnimationFrame(() => {
        if (typeof Players !== 'undefined' && Players.updateRotationHandle) {
            Players.updateRotationHandle();
        }
        if (typeof Elements !== 'undefined' && Elements.updateRotationHandle) {
            Elements.updateRotationHandle();
        }
    });
});
