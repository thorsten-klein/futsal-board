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
     * Convert screen coordinates (e.clientX, e.clientY) to board coordinates,
     * accounting for board rotation and scale transformations.
     * @param {number} clientX - Screen X coordinate
     * @param {number} clientY - Screen Y coordinate
     * @returns {{x: number, y: number}} Board coordinates
     */
    screenToBoardCoords(clientX, clientY) {
        const canvas = AppState.canvas;
        const rotation = AppState.boardRotation || 0;

        // Get canvas visual rectangle
        const canvasRect = canvas.getBoundingClientRect();

        if (rotation === 0) {
            // No rotation: use canvasRect (already includes zoom) to scale screen
            // pixels back into canvas-internal pixels, then map to board coords.
            const sx = canvasRect.width / canvas.width;
            const sy = canvasRect.height / canvas.height;
            const canvasX = (clientX - canvasRect.left) / (sx || 1);
            const canvasY = (clientY - canvasRect.top) / (sy || 1);
            return Board.screenToBoard(canvasX, canvasY);
        }

        // With rotation: canvas has a CSS transform applied
        // boardToScreen returns coordinates in PRE-transform space (using canvas.width/height)
        // We need to convert from POST-transform screen coords to PRE-transform canvas coords

        const style = window.getComputedStyle(canvas);
        const transform = style.transform;

        if (transform === 'none') {
            const sx = canvasRect.width / canvas.width;
            const sy = canvasRect.height / canvas.height;
            const canvasX = (clientX - canvasRect.left) / (sx || 1);
            const canvasY = (clientY - canvasRect.top) / (sy || 1);
            return Board.screenToBoard(canvasX, canvasY);
        }

        // Parse the transform matrix and invert it
        const matrix = new DOMMatrix(transform);
        const inverse = matrix.inverse();

        // Get click position relative to canvas visual center (after transform)
        const visualCenterX = canvasRect.left + canvasRect.width / 2;
        const visualCenterY = canvasRect.top + canvasRect.height / 2;
        const relX = clientX - visualCenterX;
        const relY = clientY - visualCenterY;

        // Apply inverse transform to get coordinates relative to canvas center (before transform)
        const point = inverse.transformPoint(new DOMPoint(relX, relY));

        // Translate from center-relative to top-left relative using PRE-TRANSFORM dimensions
        const canvasX = point.x + canvas.width / 2;
        const canvasY = point.y + canvas.height / 2;

        // Convert to board coordinates
        return Board.screenToBoard(canvasX, canvasY);
    },

    /**
     * Convert board coordinates to screen (client) coordinates.
     * This is the inverse of screenToBoardCoords.
     * @param {number} boardX - Board X coordinate
     * @param {number} boardY - Board Y coordinate
     * @returns {{x: number, y: number}} Screen coordinates relative to board-container
     */
    boardToScreenCoords(boardX, boardY) {
        const canvas = AppState.canvas;
        const rotation = AppState.boardRotation || 0;
        const container = document.querySelector('.board-container');
        const containerRect = container.getBoundingClientRect();

        // Get canvas visual rectangle
        const canvasRect = canvas.getBoundingClientRect();

        if (rotation === 0) {
            // No rotation: scale canvas-internal pixels back up by canvasRect/canvas
            // ratio (which contains the zoom factor) before applying the container offset.
            const canvasPos = Board.boardToScreen(boardX, boardY);
            const sx = canvasRect.width / canvas.width;
            const sy = canvasRect.height / canvas.height;
            return {
                x: canvasPos.x * sx + (canvasRect.left - containerRect.left),
                y: canvasPos.y * sy + (canvasRect.top - containerRect.top)
            };
        }

        // With rotation: exact inverse of screenToBoardCoords
        // Step 1: Convert board to PRE-transform canvas coords (inverse of Board.screenToBoard)
        const canvasPos = Board.boardToScreen(boardX, boardY);

        const style = window.getComputedStyle(canvas);
        const transform = style.transform;

        if (transform === 'none') {
            const sx = canvasRect.width / canvas.width;
            const sy = canvasRect.height / canvas.height;
            return {
                x: canvasPos.x * sx + (canvasRect.left - containerRect.left),
                y: canvasPos.y * sy + (canvasRect.top - containerRect.top)
            };
        }

        // Step 2: Parse the transform matrix (forward, not inverse)
        const matrix = new DOMMatrix(transform);

        // Step 3: Translate to center-relative using PRE-transform dimensions
        const relX = canvasPos.x - canvas.width / 2;
        const relY = canvasPos.y - canvas.height / 2;

        // Step 4: Apply FORWARD transform
        const point = matrix.transformPoint(new DOMPoint(relX, relY));

        // Step 5: Translate to container-relative screen coords
        const visualCenterX = canvasRect.left - containerRect.left + canvasRect.width / 2;
        const visualCenterY = canvasRect.top - containerRect.top + canvasRect.height / 2;

        return {
            x: point.x + visualCenterX,
            y: point.y + visualCenterY
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

            // Convert screen coordinates to board coordinates, accounting for rotation
            const boardCoords = Utils.screenToBoardCoords(e.clientX, e.clientY);

            const raw = Utils.clampToBoardBounds(
                boardCoords.x - AppState.dragOffset.x,
                boardCoords.y - AppState.dragOffset.y
            );

            entity.x = raw.x;
            entity.y = raw.y;
            AppState.updatePositionDisplay(raw.x, raw.y, entity, type);

            const el = document.getElementById(entity.id);
            const rect = AppState.canvas.getBoundingClientRect();
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
                        const boardRotation = AppState.boardRotation || 0;

                        // When board is rotated, players-layer has a transform, so we can't just add offsets
                        // Use getBoundingClientRect() instead
                        if (boardRotation !== 0) {
                            const rect = element.getBoundingClientRect();
                            const containerRect = boardContainer.getBoundingClientRect();

                            if (rect.width === 0 || rect.height === 0) {
                                return;
                            }

                            debugBox.style.left = (rect.left - containerRect.left) + 'px';
                            debugBox.style.top = (rect.top - containerRect.top) + 'px';
                            debugBox.style.width = rect.width + 'px';
                            debugBox.style.height = rect.height + 'px';
                            debugBox.style.transform = 'none';
                            debugBox.style.transformOrigin = '';
                            boardContainer.appendChild(debugBox);
                            return;
                        }

                        // At 0° rotation: add players-layer and board-area offsets
                        const playersLayer = document.getElementById('players-layer');
                        const boardArea = document.getElementById('board-area');
                        const playersLeft = playersLayer ? (parseFloat(playersLayer.style.left) || 0) : 0;
                        const playersTop = playersLayer ? (parseFloat(playersLayer.style.top) || 0) : 0;
                        const areaLeft = boardArea ? (parseFloat(boardArea.style.left) || 0) : 0;
                        const areaTop = boardArea ? (parseFloat(boardArea.style.top) || 0) : 0;
                        const elemLeft = parseFloat(element.style.left) || 0;
                        const elemTop = parseFloat(element.style.top) || 0;

                        // Get width and height - use style if available, otherwise getAttribute
                        let width = parseFloat(element.style.width) || parseFloat(element.getAttribute('width'));
                        let height = parseFloat(element.style.height) || parseFloat(element.getAttribute('height'));
                        let left = playersLeft + areaLeft + elemLeft;
                        let top = playersTop + areaTop + elemTop;
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
                        // For players, balls, plates, and non-rotated items
                        const boardRotation = AppState.boardRotation || 0;

                        // When board is rotated, use getBoundingClientRect for accurate positioning
                        if (boardRotation !== 0) {
                            const rect = element.getBoundingClientRect();
                            const containerRect = boardContainer.getBoundingClientRect();

                            if (rect.width === 0 || rect.height === 0) {
                                return;
                            }

                            debugBox.style.left = (rect.left - containerRect.left) + 'px';
                            debugBox.style.top = (rect.top - containerRect.top) + 'px';
                            debugBox.style.width = rect.width + 'px';
                            debugBox.style.height = rect.height + 'px';

                            // Apply elliptical border for ball and plate circles
                            if (objectType === 'ball' || objectType === 'plate') {
                                debugBox.style.borderRadius = '50%';
                            }
                        } else {
                            // At 0° rotation, use bounding rect
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

                            // Apply elliptical border for ball and plate circles
                            if (objectType === 'ball' || objectType === 'plate') {
                                debugBox.style.borderRadius = '50%';
                            }
                        }
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
                const boardRotation = AppState.boardRotation || 0;

                // When board is rotated, players-layer has a transform, so we can't just add offsets
                // Use getBoundingClientRect() instead
                if (boardRotation !== 0) {
                    const rect = element.getBoundingClientRect();
                    const containerRect = boardContainer.getBoundingClientRect();

                    if (rect.width === 0 || rect.height === 0) {
                        return;
                    }

                    debugBox.style.left = (rect.left - containerRect.left) + 'px';
                    debugBox.style.top = (rect.top - containerRect.top) + 'px';
                    debugBox.style.width = rect.width + 'px';
                    debugBox.style.height = rect.height + 'px';
                    debugBox.style.transform = 'none';
                    debugBox.style.transformOrigin = '';
                    return;
                }

                // At 0° rotation: add players-layer and board-area offsets
                const playersLayer = document.getElementById('players-layer');
                const boardArea = document.getElementById('board-area');
                const playersLeft = playersLayer ? (parseFloat(playersLayer.style.left) || 0) : 0;
                const playersTop = playersLayer ? (parseFloat(playersLayer.style.top) || 0) : 0;
                const areaLeft = boardArea ? (parseFloat(boardArea.style.left) || 0) : 0;
                const areaTop = boardArea ? (parseFloat(boardArea.style.top) || 0) : 0;
                const elemLeft = parseFloat(element.style.left) || 0;
                const elemTop = parseFloat(element.style.top) || 0;

                // Get width and height - use style if available, otherwise getAttribute
                let width = parseFloat(element.style.width) || parseFloat(element.getAttribute('width'));
                let height = parseFloat(element.style.height) || parseFloat(element.getAttribute('height'));
                let left = playersLeft + areaLeft + elemLeft;
                let top = playersTop + areaTop + elemTop;
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
        if (typeof Zoom !== 'undefined') Zoom.init();

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
        this.setupBoardRotationControls();
        this.setupModalObserver();

        // Apply any saved board rotation BEFORE initial render
        // This ensures the scale factor is set correctly when elements are first rendered
        this.updateBoardVisualRotation();

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
        // This fixes initial positioning issues and ensures scale factor is correct for loaded rotation
        requestAnimationFrame(() => {
            Board.resize();
            this.updateBoardVisualRotation(); // Re-apply rotation with correct scale factor
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

        // Restore persisted sidebar visibility.
        // The inline <head> script already hid the toolbar via html.sidebar-hidden;
        // now JS takes over and removes that class.
        document.documentElement.classList.remove('sidebar-hidden');
        let sidebarVisible = localStorage.getItem('sidebarVisible') !== 'false';
        if (!sidebarVisible) {
            toolbar.classList.add('hidden');
            if (resizeIcon) resizeIcon.style.display = 'none';
        }

        toggleBtn.addEventListener('click', () => {
            sidebarVisible = !sidebarVisible;
            localStorage.setItem('sidebarVisible', sidebarVisible);
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

                // Update dimension labels to reflect current board orientation.
                // At 90°/270° the export is portrait, so swap width × height in labels.
                const portrait = (AppState.boardRotation === 90 || AppState.boardRotation === 270);
                screenshotMenu.querySelectorAll('.context-menu-item[data-width][data-height]').forEach(item => {
                    const nW = parseInt(item.dataset.width);
                    const nH = parseInt(item.dataset.height);
                    const dW = portrait ? nH : nW;
                    const dH = portrait ? nW : nH;
                    for (const node of item.childNodes) {
                        if (node.nodeType === Node.TEXT_NODE && node.textContent.includes('×')) {
                            node.textContent = node.textContent.replace(/\d+×\d+/, `${dW}×${dH}`);
                        }
                    }
                });

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

    /**
     * Shared screenshot canvas builder used by exportScreenshot and
     * copyScreenshotToClipboard.
     *
     * Renders every board layer in the board's NATIVE coordinate space
     * (targetWidth × targetHeight, landscape for a standard board), then
     * rotates the resulting canvas to match the current board rotation.
     *
     * Why we strip CSS transforms before rendering:
     *   updateBoardVisualRotation() applies an inline
     *   `rotate(Ndeg) scale(sf)` to every layer element.  When those
     *   elements are serialised (SVG) or captured (html-to-image) the CSS
     *   transform is included, which shifts/rotates/scales all content in
     *   the export canvas.  By setting transform:'none' on each clone we
     *   obtain pixel-perfect native-space output and then apply the board
     *   rotation ourselves via a single canvas transform at the end.
     *
     * Individual per-entity counter-rotations (cones, text, player numbers)
     * are left intact so the final rotated canvas shows them exactly as they
     * appear on screen.
     *
     * Returns the final HTMLCanvasElement (dimensions depend on rotation).
     */
    async _buildScreenshotCanvas(targetWidth, targetHeight) {
        // Ensure html-to-image is available
        if (typeof htmlToImage === 'undefined') {
            const script = document.createElement('script');
            script.src = 'ext/html-to-image.js';
            document.head.appendChild(script);
            await new Promise((resolve, reject) => {
                script.onload = resolve;
                script.onerror = reject;
            });
        }

        // w × h = native board dimensions (always landscape for a standard board)
        const w = targetWidth;
        const h = targetHeight;

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

        // Helper: clone an SVG layer, strip the CSS rotation/scale that
        // updateBoardVisualRotation() applied, resize to native dims, and
        // stamp onto the export canvas.
        const drawSvgLayer = async (svgEl) => {
            if (!svgEl) return;
            const clone = svgEl.cloneNode(true);
            clone.setAttribute('width',  String(w));
            clone.setAttribute('height', String(h));
            clone.setAttribute('xmlns',  'http://www.w3.org/2000/svg');
            clone.style.transform       = 'none';
            clone.style.transformOrigin = '';
            const svgStr = new XMLSerializer().serializeToString(clone);
            const dataUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgStr);
            ctx.drawImage(await loadImg(dataUrl), 0, 0, w, h);
        };

        // ── Layer 1: parquet background ───────────────────────────────────────
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

        // ── Layer 2: court SVG (strip CSS transform before serialising) ───────
        {
            const courtEl = document.getElementById('court-svg');
            const courtClone = courtEl.cloneNode(true);
            courtClone.style.transform       = 'none';
            courtClone.style.transformOrigin = '';
            const svgText = new XMLSerializer().serializeToString(courtClone);
            const sized = svgText.replace(
                /(<svg\b[^>]*?)(\s*\/>|>)/,
                `$1 width="${w}" height="${h}"$2`
            );
            const courtUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(sized);
            ctx.globalAlpha = 0.8;
            ctx.drawImage(await loadImg(courtUrl), 0, 0, w, h);
            ctx.globalAlpha = 1;
        }

        // ── Layer 3: in-progress drawings (strip CSS transform) ───────────────
        await drawSvgLayer(document.getElementById('drawing-layer'));

        // ── Layer 4: completed paths / arrows (strip CSS transform) ───────────
        await drawSvgLayer(document.getElementById('paths-layer'));

        // ── Layer 5: players, balls, plates, elements, shapes (DOM) ──────────
        // We clone the players-layer with its CSS transform stripped so
        // html-to-image captures entities in native board-space coordinates.
        // Individual entity counter-rotations (cones, text, etc.) are preserved
        // because they are inline styles on child elements, not on the layer.
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

            const wrapper = document.createElement('div');
            wrapper.style.cssText = 'position:fixed;top:0;left:0;width:0;height:0;overflow:hidden;';

            const layerClone = playersLayer.cloneNode(true);
            layerClone.style.position       = 'absolute';
            layerClone.style.left           = '0';
            layerClone.style.top            = '0';
            layerClone.style.width          = playersLayer.style.width;
            layerClone.style.height         = playersLayer.style.height;
            layerClone.style.transform      = 'none';   // strip board rotation/scale
            layerClone.style.transformOrigin = '';

            // Remove selection handles (rotation and resize) so they don't appear
            // in the exported screenshot when an entity is currently selected.
            layerClone.querySelectorAll('.rotation-handle, .resize-handle').forEach(el => el.remove());

            // Remove element SVGs from the clone: html-to-image inlines computed
            // styles on SVG children (including display:none on <defs>/<pattern>),
            // which breaks url(#id) pattern references and causes element SVGs to
            // render incorrectly. We draw element SVGs separately below.
            layerClone.querySelectorAll('.element-svg').forEach(el => el.remove());

            // Chrome's SVG-as-image rasterisation (used inside html-to-image)
            // shrinks a flex container with a text-bearing child to roughly
            // half its explicit CSS width — the .player flex box collapses
            // and the number renders off-centre.  SVG <text> rendering also
            // depends on glyph metrics, so digits like "1" can drift a few
            // pixels off the body centre.  Cleanest fix: STRIP every
            // .player-number from the clone (so .player keeps its dimensions
            // with no in-flow text child) and re-draw the numbers directly
            // onto the export canvas with ctx.fillText after the entity
            // canvas is composited.  fillText with textAlign/textBaseline
            // gives glyph-aware centring that's font-independent.
            //
            // Collect each player's number + position + style here while we
            // still have the clone — we'll draw them after entityCanvas is
            // stamped onto the export.
            const numberDraws = [];
            layerClone.querySelectorAll('.player').forEach(playerDiv => {
                const numSpan = playerDiv.querySelector('.player-number');
                if (!numSpan || !numSpan.textContent) return;

                const playerW = parseFloat(playerDiv.style.width) || 0;
                const playerH = parseFloat(playerDiv.style.height) || 0;
                const playerL = parseFloat(playerDiv.style.left)  || 0;
                const playerT = parseFloat(playerDiv.style.top)   || 0;
                if (!playerW || !playerH) {
                    numSpan.remove();
                    return;
                }

                // Read the on-screen number colour from the LIVE span (the
                // clone's inline style copies it).  Fall back to white.
                const color = numSpan.style.color || '#ffffff';

                // Font px on-screen — players.js sets the .player's own
                // font-size to playerSize * 0.6.
                const fontSizeStr = playerDiv.style.fontSize || `${playerW * 0.6}px`;
                const fontPx = parseFloat(fontSizeStr) || (playerW * 0.6);

                numberDraws.push({
                    text:   numSpan.textContent,
                    layerX: playerL + playerW / 2,
                    layerY: playerT + playerH / 2,
                    fontPx,
                    color,
                });

                // Drop the span so html-to-image doesn't render it (and so the
                // flex layout doesn't collapse the .player).
                numSpan.remove();
            });

            wrapper.appendChild(layerClone);
            document.body.appendChild(wrapper);

            // Force pixelRatio:1.  Without this, html-to-image multiplies the
            // canvas dimensions by window.devicePixelRatio — so on a Windows /
            // HiDPI screen with DPR 1.25 / 1.5 / 2 the entityCanvas comes out at
            // (w * dpr) × (h * dpr) instead of w × h.  Drawing that oversized
            // canvas onto the w × h export at (0, 0) clips its bottom-right
            // quadrants away and shifts every entity into the upper-left,
            // making a centre-of-board player land in the bottom-right of the
            // export.  Locking pixelRatio:1 makes the entityCanvas exactly
            // w × h so positions match.  We also pass explicit width/height to
            // drawImage as a belt-and-braces guard.
            const entityCanvas = await htmlToImage.toCanvas(layerClone, {
                ...opts,
                canvasWidth:  w,
                canvasHeight: h,
                pixelRatio:   1,
            });

            document.body.removeChild(wrapper);
            ctx.drawImage(entityCanvas, 0, 0, w, h);

            // ── Draw player numbers directly on the export canvas ───────────────
            // The .player-number spans were stripped from the clone above so
            // html-to-image rendered the bodies WITHOUT numbers.  Now draw
            // each number with fillText (textAlign:'center' + textBaseline:
            // 'middle') so centring uses Canvas2D's font metrics — pixel-
            // perfect regardless of digit ("1", "7", etc.) and DPR.
            const liveLayerW = parseFloat(playersLayer.style.width)  || w;
            const liveLayerH = parseFloat(playersLayer.style.height) || h;
            const numScaleX = w / liveLayerW;
            const numScaleY = h / liveLayerH;
            if (numberDraws.length) {
                ctx.save();
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                for (const n of numberDraws) {
                    const fs = n.fontPx * numScaleX;
                    ctx.font = `700 ${fs}px -apple-system, BlinkMacSystemFont, ` +
                        `"Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif`;
                    ctx.fillStyle = n.color;
                    ctx.fillText(n.text, n.layerX * numScaleX, n.layerY * numScaleY);
                }
                ctx.restore();
            }

            // ── Draw element SVGs (goals, cones, etc.) as SVG images ─────────────
            // html-to-image cannot reliably render inline SVGs that contain <defs>
            // with pattern/gradient references. We render each element SVG directly
            // onto the export canvas by serialising it to a blob URL, stripping the
            // CSS positioning/transform (which we apply via canvas transforms), and
            // drawing it at the scaled position.
            const liveW = parseFloat(playersLayer.style.width)  || w;
            const liveH = parseFloat(playersLayer.style.height) || h;
            const esX = w / liveW;   // export scale X
            const esY = h / liveH;   // export scale Y

            const elementSvgs = playersLayer.querySelectorAll('.element-svg');
            for (const svgEl of elementSvgs) {
                const leftPx = parseFloat(svgEl.style.left)  || 0;
                const topPx  = parseFloat(svgEl.style.top)   || 0;
                const svgW   = parseFloat(svgEl.getAttribute('width'))  || 0;
                const svgH   = parseFloat(svgEl.getAttribute('height')) || 0;
                if (!svgW || !svgH) continue;

                // Parse CSS transform: translate(tx,ty) rotate(deg)
                const tr = svgEl.style.transform || '';
                const tMatch = tr.match(/translate\((-?[\d.]+)px,\s*(-?[\d.]+)px\)/);
                const rMatch = tr.match(/rotate\((-?[\d.]+)deg\)/);
                const tx     = tMatch ? parseFloat(tMatch[1]) : 0;
                const ty     = tMatch ? parseFloat(tMatch[2]) : 0;
                const rotDeg = rMatch ? parseFloat(rMatch[1]) : 0;

                // Clone the SVG and strip CSS positioning/transform so the SVG
                // renders its content at (0,0) within its own viewport.
                const clone = svgEl.cloneNode(true);
                clone.removeAttribute('style');
                clone.setAttribute('width',  svgW);
                clone.setAttribute('height', svgH);
                // Remove the bgRect (transparent hit-area) — not needed for rendering
                const bgRect = clone.querySelector('rect[fill="transparent"]');
                if (bgRect) bgRect.remove();

                const svgStr = new XMLSerializer().serializeToString(clone);
                // Use a data URI (not createObjectURL) to avoid interfering with
                // external interceptors that hook URL.createObjectURL.
                const svgDataUri = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgStr);

                await new Promise((resolve) => {
                    const img = new Image();
                    img.onload = () => {
                        // The CSS position (leftPx, topPx) is the pivot (transform-origin
                        // in players-layer space). The translate (tx,ty) offsets the SVG
                        // top-left from that pivot. Scale both to export coordinates.
                        const pivotX = leftPx * esX;
                        const pivotY = topPx  * esY;
                        ctx.save();
                        ctx.translate(pivotX, pivotY);
                        ctx.rotate(rotDeg * Math.PI / 180);
                        ctx.drawImage(img, tx * esX, ty * esY, svgW * esX, svgH * esY);
                        ctx.restore();
                        resolve();
                    };
                    img.onerror = () => resolve();
                    img.src = svgDataUri;
                });
            }
        }

        // ── Apply board rotation to produce the final output canvas ───────────
        // exportCanvas is in native board orientation (e.g. landscape 4500×2500).
        // Rotating it gives the same visual result as the CSS transform shown on
        // screen, including all counter-rotated entity transforms.
        const rotation = AppState.boardRotation || 0;
        if (rotation === 0) {
            return exportCanvas;
        }

        const portrait = rotation === 90 || rotation === 270;
        const outW = portrait ? h : w;   // e.g. 2500 at 90°
        const outH = portrait ? w : h;   // e.g. 4500 at 90°

        const finalCanvas = document.createElement('canvas');
        finalCanvas.width  = outW;
        finalCanvas.height = outH;
        const fc = finalCanvas.getContext('2d');

        if (rotation === 90) {
            fc.translate(outW, 0);
            fc.rotate(Math.PI / 2);
        } else if (rotation === 180) {
            fc.translate(outW, outH);
            fc.rotate(Math.PI);
        } else { // 270
            fc.translate(0, outH);
            fc.rotate(-Math.PI / 2);
        }
        fc.drawImage(exportCanvas, 0, 0, w, h);
        return finalCanvas;
    },

    // Export screenshot with specified dimensions
    async exportScreenshot(targetWidth, targetHeight) {
        try {
            if (!document.getElementById('board-canvas')) {
                Utils.showMessage('Board not found', 'Export Error');
                return;
            }

            const finalCanvas = await this._buildScreenshotCanvas(targetWidth, targetHeight);
            const outW = finalCanvas.width;
            const outH = finalCanvas.height;

            const blob = await new Promise(resolve => finalCanvas.toBlob(resolve, 'image/png'));
            const url  = URL.createObjectURL(blob);
            const a    = document.createElement('a');
            a.href = url;

            const boardName    = AppState.boards.find(b => b.id === AppState.currentBoardId)?.name || 'Board';
            const workbookName = AppState.workbookName || 'Futsal';
            const timestamp    = new Date().toISOString().slice(0, 10);
            a.download = `${workbookName}-${boardName}-${timestamp}.png`;

            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            Utils.showToast(`Screenshot exported (${outW}×${outH})`, 'success');

        } catch (error) {
            console.error('Screenshot export failed:', error);
            Utils.showMessage('Failed to export screenshot: ' + error.message, 'Export Error');
        }
    },

    // Copy screenshot to clipboard with specified dimensions
    async copyScreenshotToClipboard(targetWidth, targetHeight) {
        try {
            if (!navigator.clipboard || !navigator.clipboard.write) {
                Utils.showMessage('Clipboard API not supported in this browser', 'Copy Error');
                return;
            }
            if (!document.getElementById('board-canvas')) {
                Utils.showMessage('Board not found', 'Copy Error');
                return;
            }

            const finalCanvas = await this._buildScreenshotCanvas(targetWidth, targetHeight);
            const outW = finalCanvas.width;
            const outH = finalCanvas.height;

            const blob = await new Promise(resolve => finalCanvas.toBlob(resolve, 'image/png'));

            await navigator.clipboard.write([
                new ClipboardItem({ 'image/png': blob })
            ]);

            Utils.showToast(`Copied to clipboard (${outW}×${outH})`, 'success');

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

            // Update the current angle display
            const angleDisplay = document.getElementById('board-angle-display');
            if (angleDisplay) {
                angleDisplay.textContent = `Current Rotation: ${AppState.boardRotation || 0}°`;
            }

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
                } else if (item.dataset.action === 'rotate-left') {
                    this.rotateBoard(-90);
                } else if (item.dataset.action === 'rotate-right') {
                    this.rotateBoard(90);
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

    // Update the visual rotation of all board layers
    updateBoardVisualRotation() {
        const courtSvg = document.getElementById('court-svg');
        const boardCanvas = document.getElementById('board-canvas');
        const pathsLayer = document.getElementById('paths-layer');
        const drawingLayer = document.getElementById('drawing-layer');
        const playersLayer = document.getElementById('players-layer');
        const rotation = AppState.boardRotation || 0;

        // Use the scale factor calculated by Board.resize()
        // This is already stored in AppState.boardRotationScaleFactor
        // We don't recalculate here to avoid getBoundingClientRect() zoom issues
        const scaleFactor = AppState.boardRotationScaleFactor || 1;
        const zoom = AppState.boardZoom || 1;
        const panX = AppState.boardPanX || 0;
        const panY = AppState.boardPanY || 0;

        // Rotate ALL layers together (court SVG, board canvas, drawings, and players-layer).
        // NOTE: paths-layer is a child of players-layer, so it INHERITS the rotation/scale
        // from its ancestor — applying the transform to it directly would double-apply.
        // Zoom is multiplied into the centered scale() so screenToBoardCoords can still
        // invert it via DOMMatrix.inverse().  Pan is applied via left/top below (NOT via
        // translate() inside the matrix) — that keeps the matrix purely rotate*scale and
        // preserves the existing "transform-origin center" math.
        const transform = `rotate(${rotation}deg) scale(${scaleFactor * zoom})`;
        const layers = [courtSvg, boardCanvas, drawingLayer, playersLayer];
        layers.forEach(layer => {
            if (layer) {
                layer.style.transformOrigin = 'center center';
                layer.style.transform = transform;
                // Reset any prior pan, then add fresh pan to the layout offset stashed on the element.
                const baseLeft = parseFloat(layer.dataset.baseLeft || '0');
                const baseTop = parseFloat(layer.dataset.baseTop || '0');
                layer.style.left = (baseLeft + panX) + 'px';
                layer.style.top = (baseTop + panY) + 'px';
            }
        });

        // Note: Individual non-rotatable elements (cones, poles, balls, plates) and text
        // apply counter-rotation to stay upright within the rotated coordinate system.
        // Element positions are mathematically rotated in the rotateBoard() function.
    },

    // Rotate the board by the given angle (90 or -90 degrees)
    rotateBoard(angleDegrees) {
        // Initialize rotation property for elements that don't have it yet
        AppState.elements.forEach(element => {
            if (Elements && Elements.supportsRotation && Elements.supportsRotation(element.type)) {
                if (element.rotation === undefined) {
                    element.rotation = AppState.boardRotation || 0;
                }
            }
        });

        // Update board rotation
        AppState.boardRotation = ((AppState.boardRotation + angleDegrees) % 360 + 360) % 360;

        // Resize canvas to account for new rotation scale factor
        if (typeof Board !== 'undefined' && Board.resize) {
            Board.resize();
        }

        // Update visual rotation of court
        this.updateBoardVisualRotation();

        // Board center point
        const centerX = AppState.boardWidth / 2;
        const centerY = AppState.boardHeight / 2;

        // Convert angle to radians
        const angleRad = (angleDegrees * Math.PI) / 180;
        const cosAngle = Math.cos(angleRad);
        const sinAngle = Math.sin(angleRad);

        // Helper function to rotate a point around the center
        const rotatePoint = (x, y) => {
            const dx = x - centerX;
            const dy = y - centerY;
            return {
                x: centerX + dx * cosAngle - dy * sinAngle,
                y: centerY + dx * sinAngle + dy * cosAngle
            };
        };

        // Players don't need rotation updates during board rotation
        // They maintain their intrinsic rotation and the rendering code applies
        // counter-rotation to keep labels upright: -(player.rotation + boardRotation)
        AppState.players.forEach(player => {
            player._explicitlySet = true;
        });

        // Balls and plates don't need coordinate rotation - layer transform handles it
        // Just mark balls as explicitly set to preserve user-placed balls
        AppState.balls.forEach(ball => {
            ball._explicitlySet = true;
        });

        // Plates also don't need coordinate rotation
        // (no changes needed for plates)

        // Elements (goals, ladders, etc.) don't need rotation updates
        // They maintain their intrinsic rotation and apply counter-rotation in rendering
        // to maintain screen orientation regardless of board rotation
        // (Non-rotatable elements like cones and poles also get counter-rotation in elements.js)

        // DO NOT update element.rotation during board rotation - it should maintain the user-set value

        // Shapes don't need rotation updates during board rotation
        // The shape.rotation property maintains the user-set rotation value
        // and the rendering applies it directly (shapes rotate with the board like physical objects)

        // DO NOT update shape.rotation during board rotation - it should maintain the user-set value

        // Path intermediates also don't need coordinate rotation - paths-layer transform handles it
        // (no changes needed for path intermediates)

        // Save and re-render
        AppState.saveCurrentBoard();
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

        // Restore rotation handles after render
        if (typeof Players !== 'undefined' && Players.updateRotationHandle) {
            Players.updateRotationHandle();
        }
        if (typeof Shapes !== 'undefined' && Shapes.updateHandles) {
            Shapes.updateHandles();
        }
        if (typeof Elements !== 'undefined' && Elements.updateRotationHandle) {
            Elements.updateRotationHandle();
        }

        // Update rotation display in settings tab
        this.updateBoardRotationDisplay();
    },

    // Update board rotation display in settings tab
    updateBoardRotationDisplay() {
        const rotationDisplay = document.getElementById('board-rotation-display');
        if (rotationDisplay) {
            rotationDisplay.textContent = `${AppState.boardRotation || 0}°`;
        }
    },

    // Setup board rotation controls in settings tab
    setupBoardRotationControls() {
        const btnRotateLeft = document.getElementById('btn-rotate-left');
        const btnRotateRight = document.getElementById('btn-rotate-right');
        const btnResetRotation = document.getElementById('btn-reset-rotation');

        // Initialize display
        this.updateBoardRotationDisplay();

        // Rotate left button - reuses existing rotateBoard function
        if (btnRotateLeft) {
            btnRotateLeft.addEventListener('click', () => {
                this.rotateBoard(-90);
            });
        }

        // Rotate right button - reuses existing rotateBoard function
        if (btnRotateRight) {
            btnRotateRight.addEventListener('click', () => {
                this.rotateBoard(90);
            });
        }

        // Reset rotation button
        if (btnResetRotation) {
            btnResetRotation.addEventListener('click', () => {
                // Simply reset board rotation to 0
                // Element, player, and shape rotations maintain their intrinsic values
                // and the rendering code applies appropriate transforms
                AppState.boardRotation = 0;

                // Resize canvas to account for rotation change
                if (typeof Board !== 'undefined' && Board.resize) {
                    Board.resize();
                }

                // Update visual rotation
                this.updateBoardVisualRotation();

                // Save and re-render
                AppState.saveCurrentBoard();
                AppState.saveToLocalStorage();
                this.render();

                // Update display
                this.updateBoardRotationDisplay();
            });
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
