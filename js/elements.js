// Elements module - handles field elements (ball, cone, flag, goal, ladder)
const Elements = {
    layer: null,
    elementSvgs: {},

    // Element anchor points (as fractions of width/height: 0.5 = center)
    // These define where the element's "center" is for positioning
    elementAnchors: {
        'cone': { x: 0.5, y: 0.9 },       // Center of base ellipse (cx=50/100, cy=90/100)
        'goal': { x: 1, y: 0.5 },         // Goal line (right edge) at vertical center
        'small-goal': { x: 1, y: 0.5 },   // Goal line (right edge) at vertical center
        'pole': { x: 0.5, y: 0.9 },       // Center of base ellipse (cx=45/90, cy=270/300)
        'ladder': { x: 0.5, y: 0.5 },     // Geometric center
        'rebounce': { x: 0.5, y: 0.5 },    // Geometric center
        'small-wall': { x: 0.5, y: 0.5 }, // Geometric center
        'big-wall': { x: 0.5, y: 0.5 },   // Geometric center
        'small-hurdle': { x: 0.5, y: 0.5 } // Geometric center
    },

    // Get anchor point for element type
    getAnchor(type) {
        return this.elementAnchors[type] || { x: 0.5, y: 0.5 };
    },

    /** Sets up element DOM layer, drag/drop, and context-menu event listeners. */
    init() {
        this.layer = document.getElementById('board-area');
        this.contextMenuElement = null;
        this.rotationHandle = null;
        this.isRotating = false;
        this.setupElementButtons();
        this.setupInteractions();
        this.setupContextMenu();
        this.setupPositionDialog();
        this.setupRotationHandling();
    },

    // Update element button preview sizes to match board scale
    updateElementButtonSizes() {
        const canvasRect = AppState.canvas.getBoundingClientRect();
        const scaleX = canvasRect.width / AppState.boardWidth;
        const scaleY = canvasRect.height / AppState.boardHeight;

        document.querySelectorAll('.element-btn').forEach(btn => {
            const elementType = btn.dataset.element;
            const svg = btn.querySelector('svg');

            if (!svg) return;

            let width, height;
            switch (elementType) {
                case 'cone':
                    // 100cm x 120cm
                    width = 100 * scaleX;
                    height = 120 * scaleY;
                    break;
                case 'goal':
                    // 100cm x 300cm
                    width = 100 * scaleX;
                    height = 300 * scaleY;
                    break;
                case 'small-goal':
                    // 50cm x 100cm
                    width = 50 * scaleX;
                    height = 100 * scaleY;
                    break;
                case 'pole':
                    // 90cm x 300cm
                    width = 90 * scaleX;
                    height = 300 * scaleY;
                    break;
                case 'ladder':
                    // 100cm x 600cm (vertical)
                    width = 100 * scaleX;
                    height = 600 * scaleY;
                    break;
                case 'rebounce':
                    // 50cm x 400cm
                    width = 50 * scaleX;
                    height = 400 * scaleY;
                    break;
                case 'small-wall':
                    // 50cm x 100cm
                    width = 50 * scaleX;
                    height = 100 * scaleY;
                    break;
                case 'big-wall':
                    // 50cm x 200cm
                    width = 50 * scaleX;
                    height = 200 * scaleY;
                    break;
                case 'small-hurdle':
                    // 100cm x 60cm
                    width = 100 * scaleX;
                    height = 60 * scaleY;
                    break;
                case 'ball-box':
                    // 150cm x 150cm
                    width = 150 * scaleX;
                    height = 150 * scaleY;
                    break;
            }

            if (width && height) {
                svg.setAttribute('width', width);
                svg.setAttribute('height', height);
            }
        });
    },

    // Setup element buttons
    setupElementButtons() {
        const boardContainer = document.querySelector('.board-container');

        // Update sizes initially
        this.updateElementButtonSizes();

        document.querySelectorAll('.element-btn').forEach(btn => {
            // Make button draggable
            btn.draggable = true;

            // Track if dragging is happening
            let isDragging = false;

            // Store element type on drag start
            btn.addEventListener('dragstart', (e) => {
                isDragging = true;
                const elementType = btn.dataset.element;
                e.dataTransfer.effectAllowed = 'copy';
                e.dataTransfer.setData('elementType', elementType);

                // Create a custom drag image whose cursor hotspot aligns with the
                // element's anchor point so there is no visual jump on drop.
                const dragImage = btn.querySelector('svg').cloneNode(true);
                dragImage.style.position = 'absolute';
                dragImage.style.top = '-1000px';
                document.body.appendChild(dragImage);
                const imgW = parseFloat(dragImage.getAttribute('width') || '0');
                const imgH = parseFloat(dragImage.getAttribute('height') || '0');
                const anchor = this.getAnchor(elementType);
                e.dataTransfer.setDragImage(dragImage, imgW * anchor.x || 20, imgH * anchor.y || 20);
                setTimeout(() => document.body.removeChild(dragImage), 0);
            });

            btn.addEventListener('dragend', (e) => {
                // Reset dragging flag after a short delay
                setTimeout(() => { isDragging = false; }, 100);
            });

            // Keep click functionality as fallback
            btn.addEventListener('click', () => {
                if (isDragging) return; // Don't trigger if user was dragging

                // Can't add elements in child boards
                if (AppState.isChildBoard()) {
                    Utils.showMessage('Elements can only be added on parent boards. Only shapes/draws can be added on child boards.', 'Cannot Add Element');
                    return;
                }

                const elementType = btn.dataset.element;
                this.createElementAtCenter(elementType);
            });
        });

        // Setup drop zone on board
        boardContainer.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
            boardContainer.classList.add('drag-over');
            const canvasRect = AppState.canvas.getBoundingClientRect();
            const boardX = (e.clientX - canvasRect.left) * (AppState.boardWidth / canvasRect.width);
            const boardY = (e.clientY - canvasRect.top) * (AppState.boardHeight / canvasRect.height);
            AppState.updatePositionDisplay(boardX, boardY, null, 'element');
        });

        boardContainer.addEventListener('dragleave', (e) => {
            if (e.target === boardContainer) {
                boardContainer.classList.remove('drag-over');
                AppState.hidePositionDisplay();
            }
        });

        boardContainer.addEventListener('drop', (e) => {
            e.preventDefault();
            boardContainer.classList.remove('drag-over');

            const elementType = e.dataTransfer.getData('elementType');

            if (elementType) {
                // Can't add elements in child boards
                if (AppState.isChildBoard()) {
                    AppState.hidePositionDisplay();
                    Utils.showMessage('Elements can only be added on parent boards. Only shapes/draws can be added on child boards.', 'Cannot Add Element');
                    return;
                }

                // Get drop position relative to board
                const canvasRect = AppState.canvas.getBoundingClientRect();
                const scaleX = AppState.boardWidth / canvasRect.width;
                const scaleY = AppState.boardHeight / canvasRect.height;

                let boardX = (e.clientX - canvasRect.left) * scaleX;
                let boardY = (e.clientY - canvasRect.top) * scaleY;

                // Keep within board bounds
                boardX = Math.max(0, Math.min(AppState.boardWidth, boardX));
                boardY = Math.max(0, Math.min(AppState.boardHeight, boardY));


                // Create element at drop position
                const element = AppState.addElement(elementType, boardX, boardY);

                this.render();
            }
        });

        boardContainer.addEventListener('dragend', () => {
            boardContainer.classList.remove('drag-over');
        });
    },

    // Create element at center of board
    createElementAtCenter(type) {
        // Find a free position on the board
        const freePos = AppState.findFreePosition(250);

        AppState.addElement(type, freePos.x, freePos.y);
        // saveToHistory already called by saveToLocalStorage in addElement
        this.render();
    },

    // Setup element interactions
    setupInteractions() {
        this.layer.addEventListener('mousedown', (e) => {
            if (AppState.currentTool !== 'select') return;

            // Find the element ID by traversing up the DOM tree
            const elementId = Utils.findEntityId(e.target, this.layer, 'element');

            if (elementId) {
                // In touch mode, when overlays overlap, only handle if THIS overlay is on top
                if (document.body.classList.contains('touch-mode')) {
                    const topElement = document.elementFromPoint(e.clientX, e.clientY);
                    // If the top element is a touch overlay but NOT this element's overlay, don't handle this click
                    if (topElement && topElement.classList.contains('touch-overlay') && topElement.dataset.element !== elementId) {
                        return;
                    }
                }

                const element = AppState.getElement(elementId);
                if (element) {
                    const isTouchMode = document.body.classList.contains('touch-mode');
                    const isAlreadySelected = AppState.selectedElement && AppState.selectedElement.id === element.id;

                    // Select the element if not already selected (allowed even if inherited)
                    if (!isAlreadySelected) {
                        AppState.selectedElement = element;
                        AppState.selectedPlayer = null;
                        AppState.selectedBall = null;
                        AppState.selectedPlate = null;
                        AppState.selectedShape = null;
                        AppState.selectedPath = null;
                        AppState.selectedGhost = null;
                        AppState.updatePositionDisplay(element.x, element.y, element, 'element');

                        // Render in consistent order: shapes(25) first, then players/balls/plates/elements(30)
                        // Last rendered is on top in DOM, so elements are on top when same z-index
                        if (typeof Shapes !== 'undefined') Shapes.render();
                        if (typeof Players !== 'undefined') Players.render();
                        if (typeof Balls !== 'undefined') Balls.render();
                        if (typeof Plates !== 'undefined') Plates.render();
                        this.render(); // Elements last - on top in DOM order
                        if (typeof Animations !== 'undefined') Animations.renderParentPaths();
                    }

                    // Start drag: immediately in touch mode, or on second tap in desktop
                    // Inherited elements cannot be dragged
                    if (!element.inherited && (isTouchMode || isAlreadySelected)) {
                        // Clear all other drag states to prevent cross-entity drag interference
                        AppState.draggedShape = null;
                        AppState.draggedPlayer = null;
                        AppState.draggedBall = null;
                        AppState.draggedPlate = null;
                        AppState.draggedElement = element;
                        AppState.updatePositionDisplay(element.x, element.y, element, 'element');

                        // Calculate drag offset to prevent jump when dragging from edge
                        // Use screenToBoardCoords to account for rotation
                        // In touch mode, when clicking on an overlay, use the element's anchor point (element.x, element.y)
                        // because the drag calculation in setupEntityDrag updates the element position (anchor point)
                        const boardCoords = Utils.screenToBoardCoords(e.clientX, e.clientY);
                        AppState.dragOffset = {
                            x: boardCoords.x - element.x,
                            y: boardCoords.y - element.y
                        };
                    }

                    e.preventDefault();
                    e.stopPropagation();
                }
            } else {
                // Clicked on empty space - deselect element but don't interfere with other selections
                // Don't deselect if click missed the rotation handle slightly (always)
                // or missed the element body in touch mode
                if (AppState.selectedElement && (
                    Utils.isNearElement(e.clientX, e.clientY, this.rotationHandle) ||
                    (document.body.classList.contains('touch-mode') &&
                     Utils.isNearElement(e.clientX, e.clientY, document.getElementById(AppState.selectedElement.id), 30))
                )) return;

                if (AppState.selectedElement) {
                    AppState.selectedElement = null;
                    if (!AppState.selectedPlayer && !AppState.selectedBall && !AppState.selectedPlate) {
                        AppState.hidePositionDisplay();
                    }
                    this.render();
                }
            }
        });

        Utils.setupEntityDrag({
            dragKey: 'draggedElement',
            selectedKey: 'selectedElement',
            type: 'element',
            updateDOM: (el, x, y, pxW, pxH) => {
                // Use canvas dimensions (not getBoundingClientRect) to match initial positioning
                const canvasWidth = AppState.canvas.width;
                const canvasHeight = AppState.canvas.height;
                const pixelScaleX = canvasWidth / AppState.boardWidth;
                const pixelScaleY = canvasHeight / AppState.boardHeight;

                el.style.left = (x * pixelScaleX) + 'px';
                el.style.top  = (y * pixelScaleY) + 'px';
                // rotation/anchor transform is maintained from original render

                // Update touch overlay position if it exists
                if (document.body.classList.contains('touch-mode')) {
                    const overlay = this.layer.querySelector(`.touch-overlay[data-element="${el.dataset.element}"]`);
                    // Calculate geometrical center position for the overlay
                    const element = AppState.getElement(el.dataset.element);
                    if (element) {
                        const center = this.getGeometricalCenter(element);
                        overlay.style.left = (center.x * pixelScaleX) + 'px';
                        overlay.style.top  = (center.y * pixelScaleY) + 'px';
                    }
                }

                // Update debug box position during drag
                if (typeof Utils !== 'undefined') {
                    Utils.updateDebugBox(el.dataset.element, 'element');
                }
            },
            afterMove: () => {
                if (!this.isRotating) this.updateRotationHandlePosition();
            }
        });

        // Context menu for elements (right-click)
        this.layer.addEventListener('contextmenu', (e) => {
            // Find the element ID by traversing up the DOM tree
            const elementId = Utils.findEntityId(e.target, this.layer, 'element');

            if (elementId) {
                e.preventDefault();
                const element = AppState.getElement(elementId);
                if (element) {
                    this.showContextMenu(e.clientX, e.clientY, element);
                }
            }
        });

        // Context menu for elements (double-click)
        this.layer.addEventListener('dblclick', (e) => {
            // Find the element ID by traversing up the DOM tree
            const elementId = Utils.findEntityId(e.target, this.layer, 'element');

            if (elementId) {
                e.preventDefault();
                const element = AppState.getElement(elementId);
                if (element) {
                    this.showContextMenu(e.clientX, e.clientY, element);
                }
            }
        });

        // Touch events are globally converted to mouse events in app.js
    },

    // Setup context menu
    setupContextMenu() {
        const menu = document.getElementById('element-context-menu');

        // Hide menu when clicking outside
        document.addEventListener('click', (e) => {
            const freshMenu = document.getElementById('element-context-menu');
            if (!freshMenu) return;

            // Don't close if menu was just opened (prevents double-tap click from closing it)
            const timeSinceOpen = Date.now() - (this.menuOpenTime || 0);
            if (timeSinceOpen < 300) {
                return;
            }

            // Don't clear contextMenuElement if clicking on a modal (position or color modals)
            const positionModal = document.getElementById('element-position-modal');
            const colorModal = document.getElementById('element-color-modal');
            const isClickingModal = (positionModal && positionModal.contains(e.target)) ||
                                   (colorModal && colorModal.contains(e.target));

            // Only hide if not clicking on the menu itself
            if (!freshMenu.contains(e.target)) {
                this.menuVisible = false;
                freshMenu.classList.add('hidden');
                freshMenu.style.display = 'none';
                this.menuCloseTime = Date.now();

                // Only clear contextMenuElement if not clicking on a modal
                if (!isClickingModal) {
                    this.contextMenuElement = null;
                }
            }
        });

        // Hide menu on mouseup (for touch compatibility)
        const handleMouseUp = (e) => {
            // Get fresh reference to menu (in case it was re-rendered)
            const freshMenu = document.getElementById('element-context-menu');
            if (!freshMenu) return;

            // Don't close menu if it was just opened (prevents double-tap from immediately closing it)
            const timeSinceOpen = Date.now() - (this.menuOpenTime || 0);

            if (timeSinceOpen < 300) {
                return;
            }

            // Only hide if not clicking on the menu itself
            if (!freshMenu.contains(e.target)) {
                this.menuVisible = false;
                freshMenu.classList.add('hidden');
                freshMenu.style.display = 'none';
                this.menuCloseTime = Date.now();
                // Don't clear contextMenuElement here - let modals handle it
            } else {
            }
        };

        document.addEventListener('mouseup', handleMouseUp);

        // Hide menu when window loses focus
        window.addEventListener('blur', () => {
            const freshMenu = document.getElementById('element-context-menu');
            if (!freshMenu) return;
            this.menuVisible = false;
            freshMenu.classList.add('hidden');
            freshMenu.style.display = 'none';
            this.menuCloseTime = Date.now();
            this.contextMenuElement = null;
        });

        // Handle menu item clicks
        menu.addEventListener('click', (e) => {
            const item = e.target.closest('.context-menu-item');
            if (!item || !this.contextMenuElement) return;

            // Always hide menu first, even if item is disabled
            this.menuVisible = false;
            menu.classList.add('hidden');
            menu.style.display = 'none';
            const element = this.contextMenuElement;
            this.contextMenuElement = null;

            // Don't execute if item is disabled
            if (item.classList.contains('disabled')) {
                return;
            }

            const action = item.dataset.action;

            switch (action) {
                case 'remove':
                    // Can't remove inherited elements
                    if (element.inherited) return;
                    // Clear rotation handle first
                    if (this.rotationHandle) {
                        this.rotationHandle.remove();
                        this.rotationHandle = null;
                    }
                    // Clear selection
                    AppState.selectedElement = null;
                    AppState.hidePositionDisplay();
                    AppState.removeElement(element.id);
                    this.render();
                    break;
                case 'position':
                    this.showPositionDialog(element);
                    break;
                case 'color':
                    this.showColorDialog(element);
                    break;
                case 'lock':
                    element.locked = !element.locked;
                    AppState.saveToLocalStorage();
                    this.render();
                    break;
            }
        });

        // Color dialog
        document.getElementById('btn-cancel-color').addEventListener('click', () => {
            document.getElementById('element-color-modal').classList.add('hidden');

            // Clear context element to allow reopening context menu
            this.contextMenuElement = null;
        });

        document.getElementById('btn-confirm-color').addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent event from bubbling to document click handler
            this.applyColor();
        });

        // Color presets
        document.querySelectorAll('.color-preset').forEach(preset => {
            preset.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent event from bubbling to document click handler
                const color = preset.dataset.color;
                document.getElementById('element-color-picker').value = color;
            });
        });
    },

    // Setup position dialog (called once from init)
    setupPositionDialog() {
        // Position dialog
        document.getElementById('btn-cancel-position').addEventListener('click', () => {
            document.getElementById('element-position-modal').classList.add('hidden');

            // Clear context element to allow reopening context menu
            this.contextMenuElement = null;

            // Restore rotation handle display
            if (this.rotationHandle) {
                this.rotationHandle.style.display = '';
            }
        });

        document.getElementById('btn-confirm-position').addEventListener('click', () => {
            this.applyPosition();
        });

        // Position/Size increment/decrement buttons
        this.positionInitialValues = { x: null, y: null, rotation: null };
        this.sizeInitialValues = { width: null, height: null };
        this.updatingFromButton = false; // Flag to prevent 'input' event from overwriting button logic

        document.querySelectorAll('.position-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const action = btn.dataset.action;
                const field = btn.dataset.field;

                // Determine input ID based on field
                let inputId, initialValues, increment, roundValue, fieldKey;

                if (field === 'rotation') {
                    inputId = 'element-rotation';
                    initialValues = this.positionInitialValues;
                    fieldKey = 'rotation';
                    increment = 15;
                    roundValue = 15;
                } else if (field === 'width' || field === 'height') {
                    inputId = `shape-${field}`;
                    initialValues = this.sizeInitialValues;
                    fieldKey = field;
                    increment = 50;
                    roundValue = 50;
                } else if (field === 'size-modal-width' || field === 'size-modal-height') {
                    // Size modal buttons - use the field as-is since it already includes 'size-modal-'
                    inputId = field;
                    initialValues = this.sizeInitialValues;
                    // Extract the actual field name (width or height) for initialValues lookup
                    fieldKey = field.replace('size-modal-', '');
                    increment = 50;
                    roundValue = 50;
                } else if (field === 'shape-x' || field === 'shape-y') {
                    // Shape position modal X/Y buttons
                    const axis = field.replace('shape-', '');
                    inputId = `position-modal-${axis}`;
                    initialValues = this.positionInitialValues;
                    fieldKey = field; // Use 'shape-x' or 'shape-y' to match positionInitialValues keys
                    increment = 50;
                    roundValue = 50;
                } else if (field === 'shape-rotation') {
                    // Shape position modal rotation buttons
                    inputId = 'position-modal-rotation';
                    initialValues = this.positionInitialValues;
                    fieldKey = field; // Use 'shape-rotation' to match positionInitialValues key
                    increment = 15;
                    roundValue = 15;
                } else {
                    inputId = `element-pos-${field}`;
                    initialValues = this.positionInitialValues;
                    fieldKey = field;
                    increment = 50;
                    roundValue = 50;
                }

                const input = document.getElementById(inputId);
                if (!input) return;

                let currentValue = parseInt(input.value) || 0;
                let initialValue = initialValues[fieldKey];

                // If user manually changed the value, update initialValue to reflect that
                if (initialValue !== null && initialValue !== currentValue) {
                    initialValues[fieldKey] = currentValue;
                    initialValue = currentValue;
                }

                const isFirstAdjustment = initialValue !== null && initialValue === currentValue;

                if (isFirstAdjustment) {
                    // Round to next increment boundary (use +1/-1 to ensure we always move away)
                    if (action === 'increase') {
                        currentValue = Math.ceil((currentValue + 1) / roundValue) * roundValue;
                    } else {
                        currentValue = Math.floor((currentValue - 1) / roundValue) * roundValue;
                    }

                    // Mark that we've done the first adjustment by setting to null
                    initialValues[fieldKey] = null;
                } else {
                    // Increment/decrement by increment value
                    if (action === 'increase') {
                        currentValue += increment;
                    } else {
                        currentValue -= increment;
                    }
                }

                // Keep rotation in 0-360 range
                if (field === 'rotation' || field === 'shape-rotation') {
                    currentValue = ((currentValue % 360) + 360) % 360;
                }

                // Set flag to prevent 'input' event from overwriting our initial values
                this.updatingFromButton = true;
                input.value = currentValue;
                this.updatingFromButton = false;
            });
        });

        // Listen for manual input changes to update initial values
        ['element-pos-x', 'element-pos-y', 'element-rotation'].forEach(inputId => {
            const input = document.getElementById(inputId);
            if (input) {
                input.addEventListener('input', () => {
                    if (this.updatingFromButton) return; // Skip if button is updating
                    const field = inputId === 'element-rotation' ? 'rotation' : inputId.replace('element-pos-', '');
                    this.positionInitialValues[field] = parseInt(input.value) || 0;
                });
            }
        });

        // Listen for manual size input changes to update initial values
        ['shape-width', 'shape-height'].forEach(inputId => {
            const input = document.getElementById(inputId);
            if (input) {
                input.addEventListener('input', () => {
                    if (this.updatingFromButton) return; // Skip if button is updating
                    const field = inputId.replace('shape-', '');
                    this.sizeInitialValues[field] = parseInt(input.value) || 0;
                    // Sync to the other modal
                    const otherInput = document.getElementById(`size-modal-${field}`);
                    if (otherInput) otherInput.value = input.value;
                });
            }
        });

        // Also listen to size-modal inputs and sync back
        ['size-modal-width', 'size-modal-height'].forEach(inputId => {
            const input = document.getElementById(inputId);
            if (input) {
                input.addEventListener('input', () => {
                    if (this.updatingFromButton) return; // Skip if button is updating
                    const field = inputId.replace('size-modal-', '');
                    this.sizeInitialValues[field] = parseInt(input.value) || 0;
                    // Sync to the other modal
                    const otherInput = document.getElementById(`shape-${field}`);
                    if (otherInput) otherInput.value = input.value;
                });
            }
        });

        // Listen for manual shape position input changes to update initial values
        ['position-modal-x', 'position-modal-y', 'position-modal-rotation'].forEach(inputId => {
            const input = document.getElementById(inputId);
            if (input) {
                input.addEventListener('input', () => {
                    if (this.updatingFromButton) return; // Skip if button is updating
                    let field;
                    if (inputId === 'position-modal-x') {
                        field = 'shape-x';
                    } else if (inputId === 'position-modal-y') {
                        field = 'shape-y';
                    } else {
                        field = 'shape-rotation';
                    }
                    this.positionInitialValues[field] = parseInt(input.value) || 0;
                });
            }
        });
    },

    // Show context menu
    showContextMenu(x, y, element) {

        // Don't open menu if it was just closed (prevents double-tap from reopening immediately after closing)
        // Only check this if we're opening for a different element or if enough time has passed
        const timeSinceClose = Date.now() - (this.menuCloseTime || 0);
        const sameElement = this.contextMenuElement && element && this.contextMenuElement.id === element.id;
        if (timeSinceClose < 200 && sameElement) {
            return;
        }

        // Record when menu was opened (for touch tap detection)
        this.menuOpenTime = Date.now();
        this.menuVisible = true;

        this.contextMenuElement = element;
        const menu = document.getElementById('element-context-menu');

        // Remove custom menu items added by other modules
        const customItems = menu.querySelectorAll('[data-action="name"], [data-action="number"], [data-action="edit-text"], [data-action="size"], [data-action="reset"]');
        customItems.forEach(item => item.remove());

        // Hide lock menu item (feature removed)
        const lockItem = menu.querySelector('[data-action="lock"]');
        if (lockItem) {
            lockItem.style.display = 'none';
        }

        // Hide color menu item for non-colorable elements
        const colorItem = menu.querySelector('[data-action="color"]');
        if (colorItem) {
            const colorableTypes = ['cone', 'ladder', 'pole', 'small-hurdle', 'ball-box'];
            if (colorableTypes.includes(element.type)) {
                colorItem.style.display = '';
            } else {
                colorItem.style.display = 'none';
            }
        }

        // Disable menu items if inherited
        const menuItems = menu.querySelectorAll('.context-menu-item');
        menuItems.forEach(item => {
            if (element.inherited) {
                item.classList.add('disabled');
            } else {
                item.classList.remove('disabled');
            }
        });

        // Position menu and ensure it stays within viewport
        // Get fresh reference to menu
        const freshMenu = document.getElementById('element-context-menu');

        freshMenu.classList.remove('hidden');

        Utils.positionContextMenu(freshMenu, x, y);
    },

    // Show position dialog
    showPositionDialog(element) {
        // Don't show dialog if locked or inherited
        if (element.inherited) return;

        this.contextMenuElement = element;

        // Hide rotation handle while modal is open
        if (this.rotationHandle) {
            this.rotationHandle.style.display = 'none';
        }

        // Convert board coordinates to pitch coordinates (0,0 = top-left of pitch)
        const pitchX = Math.round(element.x - AppState.pitchOffsetX);
        const pitchY = Math.round(element.y - AppState.pitchOffsetY);
        const rotation = Math.round(element.rotation || 0);

        document.getElementById('element-pos-x').value = pitchX;
        document.getElementById('element-pos-y').value = pitchY;
        document.getElementById('element-rotation').value = rotation;

        // Show/hide rotation group based on element type
        const rotationGroup = document.getElementById('rotation-group');
        if (this.supportsRotation(element.type)) {
            rotationGroup.style.display = 'block';
        } else {
            rotationGroup.style.display = 'none';
        }

        // Store initial values for rounding logic
        this.positionInitialValues = { x: pitchX, y: pitchY, rotation: rotation };

        Utils.openModal('element-position-modal');
    },

    // Apply position
    applyPosition() {
        if (!this.contextMenuElement) return;

        const pitchX = parseInt(document.getElementById('element-pos-x').value);
        const pitchY = parseInt(document.getElementById('element-pos-y').value);
        const rotation = parseInt(document.getElementById('element-rotation').value);

        if (isNaN(pitchX) || isNaN(pitchY)) {
            Utils.showMessage('Please enter valid numbers for X and Y position.', 'Invalid Position');
            return;
        }

        // Convert pitch coordinates back to board coordinates
        this.contextMenuElement.x = Math.max(0, Math.min(AppState.boardWidth, pitchX + AppState.pitchOffsetX));
        this.contextMenuElement.y = Math.max(0, Math.min(AppState.boardHeight, pitchY + AppState.pitchOffsetY));

        // Update rotation if element supports it
        if (this.supportsRotation(this.contextMenuElement.type)) {
            this.contextMenuElement.rotation = ((rotation % 360) + 360) % 360;
        }

        // Update position display with new coordinates
        AppState.updatePositionDisplay(this.contextMenuElement.x, this.contextMenuElement.y, this.contextMenuElement, 'element');

        AppState.saveToLocalStorage();
        this.render();

        document.getElementById('element-position-modal').classList.add('hidden');

        // Clear context element
        this.contextMenuElement = null;

        // Restore rotation handle display
        if (this.rotationHandle) {
            this.rotationHandle.style.display = '';
        }
    },

    // Show color dialog
    showColorDialog(element) {
        // Don't show dialog if locked or inherited
        if (element.inherited) return;

        // Only allow color for certain element types
        const colorableTypes = ['cone', 'ladder', 'pole', 'small-hurdle', 'ball-box'];
        if (!colorableTypes.includes(element.type)) {
            return;
        }

        this.contextMenuElement = element;

        const currentColor = element.color || '#ff6b35';
        document.getElementById('element-color-picker').value = currentColor;

        Utils.openModal('element-color-modal');
    },

    // Apply color
    applyColor() {
        if (!this.contextMenuElement) return;

        const color = document.getElementById('element-color-picker').value;
        this.contextMenuElement.color = color;

        AppState.saveToLocalStorage();
        this.render();

        document.getElementById('element-color-modal').classList.add('hidden');

        // Clear context element
        this.contextMenuElement = null;
    },

    /** Clears and re-creates all element DOM elements from AppState.elements. */
    render() {
        // Safety check: don't render if layer is not initialized yet
        if (!this.layer) {
            return;
        }

        // Prevent recursive rendering - if we're already rendering, skip
        if (this._isRendering) {
            return;
        }
        this._isRendering = true;

        // Initialize rotation property for rotatable elements that don't have it
        AppState.elements.forEach(element => {
            if (this.supportsRotation && this.supportsRotation(element.type)) {
                if (element.rotation === undefined) {
                    element.rotation = AppState.boardRotation || 0;
                }
            }
        });

        // Clear ALL element SVGs and touch overlays from the DOM (not just tracked ones)
        this.layer.querySelectorAll('.element-svg').forEach(svg => {
            svg.remove();
        });
        this.layer.querySelectorAll('.touch-overlay[data-element]').forEach(el => el.remove());
        this.elementSvgs = {};

        // Remove debug boxes for elements
        document.querySelectorAll('.debug-tolerance-box[data-debug-type="element"]').forEach(box => box.remove());

        // Render each element
        AppState.elements.forEach(element => {
            if (element.visible) {
                this.renderElement(element);
            }
        });


        // Update rotation handle if an element is selected
        this.updateRotationHandle();

        // Reset rendering flag
        this._isRendering = false;
    },

    // Get element dimensions in board units (cm)
    getElementDimensions(type) {
        const dimensions = {
            'cone': { width: 100, height: 120 },
            'goal': { width: 100, height: 300 },
            'small-goal': { width: 50, height: 100 },
            'pole': { width: 90, height: 300 },
            'ladder': { width: 100, height: 600 },
            'rebounce': { width: 50, height: 400 },
            'small-wall': { width: 50, height: 100 },
            'big-wall': { width: 50, height: 200 },
            'small-hurdle': { width: 100, height: 60 },
            'ball-box': { width: 150, height: 150 }
        };
        return dimensions[type] || { width: 100, height: 100 };
    },

    // Calculate geometrical center position from anchor position
    getGeometricalCenter(element) {
        const anchor = this.getAnchor(element.type);
        const dimensions = this.getElementDimensions(element.type);
        const rotation = (element.rotation || 0) * Math.PI / 180;

        // Offset from anchor to geometrical center (in board units)
        const offsetX = (0.5 - anchor.x) * dimensions.width;
        const offsetY = (0.5 - anchor.y) * dimensions.height;

        // Apply rotation to the offset
        const rotatedOffsetX = offsetX * Math.cos(rotation) - offsetY * Math.sin(rotation);
        const rotatedOffsetY = offsetX * Math.sin(rotation) + offsetY * Math.cos(rotation);

        return {
            x: element.x + rotatedOffsetX,
            y: element.y + rotatedOffsetY
        };
    },

    // Render individual element
    renderElement(element) {
        const svg = this.createElementSvg(element);
        if (svg) {
            this.layer.appendChild(svg);
            this.elementSvgs[element.id] = svg;

            // DEBUG: Show bounding box for element
            if (typeof Utils !== 'undefined') {
                Utils.showDebugBox(element.id, 'element');
            }

            // Add a larger transparent hit area in touch mode
            if (document.body.classList.contains('touch-mode')) {
                // Use canvas attribute dimensions (like Board.boardToScreen)
                const canvasWidth = AppState.canvas.width;
                const canvasHeight = AppState.canvas.height;
                const scaleX = canvasWidth / AppState.boardWidth;
                const scaleY = canvasHeight / AppState.boardHeight;
                const scale = Math.min(scaleX, scaleY);

                // Position overlay at geometrical center, not anchor point
                const center = this.getGeometricalCenter(element);
                // Position using Board.boardToScreen approach
                const x = center.x * scale;
                const y = center.y * scale;

                const overlay = document.createElement('div');
                overlay.className = 'touch-overlay';
                overlay.style.left = x + 'px';
                overlay.style.top = y + 'px';
                // Fixed 60px circular overlay for easier touch selection
                // (same as balls, plates, and players)
                // Element overlay = visual z-index + 100 (integers only)
                const elementOverlayZIndex = {
                    'cone': '130',          // 30 + 100
                    'ladder': '131',        // 31 + 100
                    'rebounce': '132',      // 32 + 100
                    'big-wall': '133',      // 33 + 100
                    'small-wall': '133',    // 33 + 100
                    'small-goal': '134',    // 34 + 100
                    'goal': '135',          // 35 + 100
                    'pole': '136',          // 36 + 100
                    'small-hurdle': '137',  // 37 + 100
                    'ball-box': '130'       // 30 + 100
                };
                overlay.style.zIndex = elementOverlayZIndex[element.type] || '130';
                overlay.style.pointerEvents = 'auto';
                overlay.dataset.element = element.id;

                // Keep pointer events enabled on overlay even when selected
                // The rotation handle has a higher z-index (1001) so it will receive clicks

                this.layer.appendChild(overlay);
            }
        } else {
            console.error('Failed to create SVG for element:', element);
        }
    },

    // Create SVG for element
    createElementSvg(element) {
        // Calculate scale for element sizing (maintains constant visual size across rotations)
        const canvasWidth = AppState.canvas.width || 1000;
        const canvasHeight = AppState.canvas.height || 556;
        const boardRotationScale = AppState.boardRotationScaleFactor || 1;

        // Calculate scales for positioning and sizing
        const posScaleX = canvasWidth / AppState.boardWidth;
        const posScaleY = canvasHeight / AppState.boardHeight;
        const canvasScale = Math.min(posScaleX, posScaleY);

        // Position using Board.boardToScreen approach (multiply by respective scale)
        // Use posScaleX and posScaleY separately, not the minimum
        const x = element.x * posScaleX;
        const y = element.y * posScaleY;

        // For size, use reference scale (from 0° rotation) directly
        // This makes elements scale proportionally with the board layer
        // When board is scaled down (e.g., 0.556 at 90°), elements also appear proportionally smaller
        const referenceScale = AppState.referenceScale || canvasScale;
        let scale = referenceScale;

        // For elements that use separate X/Y scales (cones, poles)
        // Use the same reference scale for both to maintain uniform sizing
        const scaleX = referenceScale;
        const scaleY = referenceScale;

        // Ensure scale is valid
        if (!scale || isNaN(scale) || scale <= 0) {
            console.error('Invalid scale calculated:', scale);
            scale = 0.2;
        }

        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('class', 'element-svg');

        // Add inherited class if this element is inherited from parent
        if (element.inherited) {
            svg.classList.add('element-inherited');
        }

        // Add selected class if this element is selected
        if (AppState.selectedElement && AppState.selectedElement.id === element.id) {
            svg.classList.add('element-selected');
        }

        svg.setAttribute('viewBox', '0 0 100 100');
        svg.style.position = 'absolute';
        svg.style.left = x + 'px';
        svg.style.top = y + 'px';

        svg.style.overflow = 'visible';
        svg.style.pointerEvents = 'all';
        svg.style.touchAction = 'none';

        // Set z-index based on element type (integers only)
        const elementZIndex = {
            'cone': '30',           // Base element
            'ladder': '31',
            'rebounce': '32',
            'big-wall': '33',
            'small-wall': '33',
            'small-goal': '34',
            'goal': '35',
            'pole': '36',
            'small-hurdle': '37',
            'ball-box': '30'        // Same as cone
        };
        svg.style.zIndex = elementZIndex[element.type] || '30';

        // Always show default cursor on board elements
        svg.style.cursor = 'default';

        svg.id = element.id; // Use ID for fast lookup, consistent with players
        svg.dataset.element = element.id; // Keep data attribute for compatibility

        // Add a transparent rect to ensure the entire SVG area is clickable
        const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        bgRect.setAttribute('x', '0');
        bgRect.setAttribute('y', '0');
        bgRect.setAttribute('width', '100');
        bgRect.setAttribute('height', '100');
        bgRect.setAttribute('fill', 'transparent');
        bgRect.style.pointerEvents = 'all';

        let content;
        let width, height;
        const anchor = this.getAnchor(element.type);
        const rotation = element.rotation || 0;

        switch (element.type) {
            case 'cone':
                // 100cm x 120cm
                width = 100 * scaleX;
                height = 120 * scaleY;
                content = this.createCone(element.color);
                svg.setAttribute('width', width);
                svg.setAttribute('height', height);
                // Cones are non-rotatable - counter-rotate to stay upright in rotated board-area
                const coneCounterRotation = -(AppState.boardRotation || 0);
                svg.style.transform = `translate(${-width * anchor.x}px, ${-height * anchor.y}px) rotate(${coneCounterRotation}deg)`;
                svg.style.transformOrigin = `${width * anchor.x}px ${height * anchor.y}px`;
                break;
            case 'goal':
                // 100cm x 300cm
                width = 100 * scale;
                height = 300 * scale;
                content = this.createGoal();
                svg.setAttribute('viewBox', '0 0 100 300');
                svg.setAttribute('width', width);
                svg.setAttribute('height', height);
                // Rotatable element: rotation is relative to board, rotates with board
                svg.style.transform = `translate(${-width * anchor.x}px, ${-height * anchor.y}px) rotate(${rotation}deg)`;
                svg.style.transformOrigin = `${width * anchor.x}px ${height * anchor.y}px`;
                break;
            case 'small-goal':
                // 50cm x 100cm
                width = 50 * scale;
                height = 100 * scale;
                content = this.createSmallGoal();
                svg.setAttribute('viewBox', '0 0 50 100');
                svg.setAttribute('width', width);
                svg.setAttribute('height', height);
                // Rotatable element: rotation is relative to board, rotates with board
                svg.style.transform = `translate(${-width * anchor.x}px, ${-height * anchor.y}px) rotate(${rotation}deg)`;
                svg.style.transformOrigin = `${width * anchor.x}px ${height * anchor.y}px`;
                break;
            case 'pole':
                // 90cm x 300cm
                width = 90 * scale;
                height = 300 * scale;
                content = this.createPole(element.color);
                svg.setAttribute('viewBox', '0 0 90 300');
                svg.setAttribute('width', width);
                svg.setAttribute('height', height);
                // Poles are non-rotatable - counter-rotate to stay upright in rotated board-area
                const poleCounterRotation = -(AppState.boardRotation || 0);
                svg.style.transform = `translate(${-width * anchor.x}px, ${-height * anchor.y}px) rotate(${poleCounterRotation}deg)`;
                svg.style.transformOrigin = `${width * anchor.x}px ${height * anchor.y}px`;
                break;
            case 'ladder':
                // 100 x 600 units
                width = 100 * scale;
                height = 600 * scale;
                content = this.createLadder(element.color);
                svg.setAttribute('viewBox', '0 0 100 600');
                svg.setAttribute('width', width);
                svg.setAttribute('height', height);
                // Rotatable element: rotation is relative to board, rotates with board
                svg.style.transform = `translate(${-width * anchor.x}px, ${-height * anchor.y}px) rotate(${rotation}deg)`;
                svg.style.transformOrigin = `${width * anchor.x}px ${height * anchor.y}px`;
                break;
            case 'rebounce':
                // 50cm x 400cm
                width = 50 * scale;
                height = 400 * scale;
                content = this.createRebounce(element.color);
                svg.setAttribute('viewBox', '0 0 50 400');
                svg.setAttribute('width', width);
                svg.setAttribute('height', height);
                // Rotatable element: rotation is relative to board, rotates with board
                svg.style.transform = `translate(${-width * anchor.x}px, ${-height * anchor.y}px) rotate(${rotation}deg)`;
                svg.style.transformOrigin = `${width * anchor.x}px ${height * anchor.y}px`;
                break;
            case 'small-wall':
                // 50cm x 100cm
                width = 50 * scale;
                height = 100 * scale;
                content = this.createSmallWall(element.color);
                svg.setAttribute('viewBox', '0 0 50 100');
                svg.setAttribute('width', width);
                svg.setAttribute('height', height);
                // Rotatable element: rotation is relative to board, rotates with board
                svg.style.transform = `translate(${-width * anchor.x}px, ${-height * anchor.y}px) rotate(${rotation}deg)`;
                svg.style.transformOrigin = `${width * anchor.x}px ${height * anchor.y}px`;
                break;
            case 'big-wall':
                // 50cm x 200cm
                width = 50 * scale;
                height = 200 * scale;
                content = this.createBigWall(element.color);
                svg.setAttribute('viewBox', '0 0 50 200');
                svg.setAttribute('width', width);
                svg.setAttribute('height', height);
                // Rotatable element: rotation is relative to board, rotates with board
                svg.style.transform = `translate(${-width * anchor.x}px, ${-height * anchor.y}px) rotate(${rotation}deg)`;
                svg.style.transformOrigin = `${width * anchor.x}px ${height * anchor.y}px`;
                break;
            case 'small-hurdle':
                // 100cm x 60cm
                width = 100 * scale;
                height = 60 * scale;
                content = this.createSmallHurdle(element.color);
                svg.setAttribute('viewBox', '0 0 100 60');
                svg.setAttribute('width', width);
                svg.setAttribute('height', height);
                // Rotatable element: rotation is relative to board, rotates with board
                svg.style.transform = `translate(${-width * anchor.x}px, ${-height * anchor.y}px) rotate(${rotation}deg)`;
                svg.style.transformOrigin = `${width * anchor.x}px ${height * anchor.y}px`;
                break;
            case 'ball-box':
                // 150cm x 150cm
                width = 150 * scale;
                height = 150 * scale;
                content = this.createBallBox(element.color);
                svg.setAttribute('viewBox', '0 0 150 150');
                svg.setAttribute('width', width);
                svg.setAttribute('height', height);
                svg.style.transform = `translate(${-width * anchor.x}px, ${-height * anchor.y}px) rotate(${rotation}deg)`;
                svg.style.transformOrigin = `${width * anchor.x}px ${height * anchor.y}px`;
                break;
        }

        if (content) {
            // First set the content
            svg.innerHTML = content;
            // Then prepend the background rect
            svg.insertBefore(bgRect, svg.firstChild);
        }

        return svg;
    },

    // SVG content for cone (25cm wide x 30cm tall)
    createCone(color) {
        color = color || '#ff6b35';
        const darkerColor = this.darkenColor(color, 20);
        return `
            <g>
                <polygon points="50,10 20,90 80,90" fill="${color}" stroke="#000" stroke-width="3"/>
                <ellipse cx="50" cy="90" rx="30" ry="8" fill="${darkerColor}" stroke="#000" stroke-width="2"/>
            </g>
        `;
    },

    // SVG content for goal (100 wide x 300 high)
    createGoal() {
        return `
            <defs>
                <pattern id="goal-net" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                    <path d="M 0 0 L 20 20 M 20 0 L 0 20" stroke="#999" stroke-width="1" fill="none"/>
                </pattern>
            </defs>
            <g>
                <rect x="0" y="0" width="100" height="300" fill="url(#goal-net)" stroke="#777777" stroke-width="4"></rect>
                <line x1="100" y1="0" x2="100" y2="300" stroke-width="5" stroke="white"></line>
                <line x1="100" y1="0" x2="100" y2="300" stroke="red" stroke-dasharray="20" stroke-width="6"></line>
            </g>
        `;
    },

    // SVG content for small goal
    createSmallGoal() {
        return `
            <defs>
                <pattern id="goal-net-small" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse">
                    <path d="M 0 0 L 10 10 M 10 0 L 0 10" stroke="#999" stroke-width="1" fill="none"/>
                </pattern>
            </defs>
            <g>
                <rect x="0" y="0" width="50" height="100" fill="url(#goal-net-small)" stroke="#777777" stroke-width="3"></rect>
                <line x1="50" y1="0" x2="50" y2="100" stroke-width="4" stroke="white"></line>
                <line x1="50" y1="0" x2="50" y2="100" stroke="red" stroke-dasharray="15" stroke-width="5"></line>
            </g>
        `;
    },

    // SVG content for pole
    createPole(color) {
        color = color || 'yellow';
        return `
            <g>
                <ellipse cx="45" cy="270" rx="38" ry="18" fill="${color}" stroke="black" stroke-width="4"></ellipse>
                <rect x="37.5" y="30" width="15" height="240" fill="${color}" stroke="black" stroke-width="4"></rect>
            </g>
        `;
    },

    // Helper: darken a color
    darkenColor(color, percent) {
        const num = parseInt(color.replace('#', ''), 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) - amt;
        const G = (num >> 8 & 0x00FF) - amt;
        const B = (num & 0x0000FF) - amt;
        return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
            (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
            (B < 255 ? B < 1 ? 0 : B : 255))
            .toString(16).slice(1);
    },

    // SVG content for ladder (100 x 600 units = 100cm x 6m, vertical, 10 rungs)
    createLadder(color) {
        color = color || '#f39c12';
        return `
            <g stroke="${color}" stroke-width="8" fill="none">
                <line x1="10" y1="10" x2="10" y2="590"/>
                <line x1="90" y1="10" x2="90" y2="590"/>
                <line x1="10" y1="40" x2="90" y2="40"/>
                <line x1="10" y1="100" x2="90" y2="100"/>
                <line x1="10" y1="160" x2="90" y2="160"/>
                <line x1="10" y1="220" x2="90" y2="220"/>
                <line x1="10" y1="280" x2="90" y2="280"/>
                <line x1="10" y1="340" x2="90" y2="340"/>
                <line x1="10" y1="400" x2="90" y2="400"/>
                <line x1="10" y1="460" x2="90" y2="460"/>
                <line x1="10" y1="520" x2="90" y2="520"/>
                <line x1="10" y1="580" x2="90" y2="580"/>
            </g>
        `;
    },

    // SVG content for rebounce board (50 x 400 units = 50cm x 4m)
    createRebounce(color) {
        color = color || '#d4a574'; // Wooden color
        const darkerWood = this.darkenColor(color, 15);
        return `
            <g>
                <rect x="0" y="0" width="50" height="400" fill="${color}" stroke="${darkerWood}" stroke-width="4" rx="3"/>
                <rect x="5" y="5" width="40" height="390" fill="none" stroke="#8B6F47" stroke-width="2" stroke-dasharray="20,10" opacity="0.4"/>
            </g>
        `;
    },

    // SVG content for small wall (50 x 100 units = 50cm x 1m)
    createSmallWall(color) {
        color = color || '#8B6F47'; // Brown
        const darkerColor = this.darkenColor(color, 15);
        return `
            <g>
                <rect x="0" y="0" width="50" height="100" fill="${color}" stroke="${darkerColor}" stroke-width="3"/>
                <rect x="5" y="5" width="40" height="90" fill="none" stroke="#d4a574" stroke-width="1.5" opacity="0.3"/>
            </g>
        `;
    },

    // SVG content for big wall (50 x 200 units = 50cm x 2m)
    createBigWall(color) {
        color = color || '#8B6F47'; // Brown
        const darkerColor = this.darkenColor(color, 15);
        return `
            <g>
                <rect x="0" y="0" width="50" height="200" fill="${color}" stroke="${darkerColor}" stroke-width="3"/>
                <rect x="5" y="5" width="40" height="190" fill="none" stroke="#d4a574" stroke-width="1.5" opacity="0.3"/>
                <line x1="5" y1="100" x2="45" y2="100" stroke="#d4a574" stroke-width="1" opacity="0.4"/>
            </g>
        `;
    },

    // SVG content for small hurdle (100 x 40 units = 100cm x 40cm)
    createSmallHurdle(color) {
        color = color || '#f1c40f'; // Yellow
        const darkerColor = this.darkenColor(color, 20);
        return `
            <g>
                <rect x="15" y="10" width="8" height="28" fill="${color}" stroke="#000" stroke-width="2" rx="2"/>
                <rect x="77" y="10" width="8" height="28" fill="${color}" stroke="#000" stroke-width="2" rx="2"/>
                <rect x="10" y="5" width="80" height="12" fill="${color}" stroke="#000" stroke-width="2" rx="3"/>
            </g>
        `;
    },

    // SVG content for ball box (150 x 150 units = 150cm x 150cm square with 6 balls)
    createBallBox(color) {
        color = color || '#ffffff'; // White for balls by default
        const ballColor = color; // Use the element color for balls

        // Create ball SVG using the same structure as in balls.js
        // Ball size: 60cm diameter (same as regular balls), scale = 0.063 (60/952)
        const createBall = (cx, cy, ballColor) => {
            return `
                <g transform="translate(${cx - 30}, ${cy - 30}) scale(0.063, 0.063)">
                    <circle r="476" cx="476" cy="476" fill="${ballColor}" />
                    <path d="M813 139A475 475 0 000 476a474 474 0 00476 476 474 474 0 00476-476 474 474 0 00-139-337zm-600-31l12-10a457 457 0 01370-60c-14 6-33 18-65 45a393 393 0 00-182 22c-31 11-55 23-71 33l-74-25c3 1 8-4 10-5zm433 119l-81 222-196 37-161-166c11-76 63-143 63-143s34-25 88-44a403 403 0 01174-20l113 114zM39 460c-5 32-6 66-3 100l-9-20a451 451 0 0136-252c-3 30-2 61 0 85-11 28-19 57-24 87zm40 173a418 418 0 018-239c33-28 77-44 101-52l158 164-16 179-155 52c-39-29-72-68-96-104zm470 260c-34 22-121 28-157 29a451 451 0 01-200-92c0-1-4-49-4-66l156-52 181 78 25 103h-1zm300-158c-27 38-59 75-98 102-36 25-85 34-128 41-3 1-44 8-45 6l-25-103 128-132 168-15 8 89-8 12zm3-135l-2 3-168 16-90-158 82-223 115 7a366 366 0 01118 169 434 434 0 01-55 186zm60-250a396 396 0 00-108-131c-5-25-19-65-57-107l2 2 7 5a459 459 0 01156 230v1z"
                          fill="#000" opacity="1"/>
                </g>
            `;
        };

        // Messy ball positions (not in a grid, overlapping slightly for a realistic pile)
        return `
            <g>
                <rect x="5" y="5" width="140" height="140" fill="none" stroke="#8B4513" stroke-width="4" rx="3"/>
                ${createBall(55, 40, ballColor)}
                ${createBall(95, 55, ballColor)}
                ${createBall(40, 80, ballColor)}
                ${createBall(80, 90, ballColor)}
                ${createBall(110, 100, ballColor)}
                ${createBall(60, 115, ballColor)}
            </g>
        `;
    },

    // Check if element type supports rotation
    supportsRotation(type) {
        return ['goal', 'small-goal', 'ladder', 'rebounce', 'small-wall', 'big-wall', 'small-hurdle'].includes(type);
    },

    // Setup rotation handling
    setupRotationHandling() {
        document.addEventListener('mousemove', (e) => {
            if (this.isRotating && AppState.selectedElement) {
                e.preventDefault();
                this.handleRotationMove(e);
            }
        });

        document.addEventListener('mouseup', () => {
            if (this.isRotating) {
                this.isRotating = false;
                AppState.saveToLocalStorage();
                AppState.hidePositionDisplay();
            }
        });
    },

    // Update rotation handle position (lightweight - just moves it, doesn't recreate)
    updateRotationHandlePosition() {
        if (!this.rotationHandle || !AppState.selectedElement) return;

        const element = AppState.selectedElement;

        // Get element's geometrical center (accounts for anchor and element rotation)
        const centerBoardPos = this.getGeometricalCenter(element);

        // Use Board.boardToScreen to properly convert element center to canvas coordinates
        const centerPos = Board.boardToScreen(centerBoardPos.x, centerBoardPos.y);

        const elementBoardHalfHeights = {
            'ladder': 300, 'rebounce': 200, 'big-wall': 100, 'small-wall': 50, 'small-hurdle': 30
        };
        const halfH = elementBoardHalfHeights[element.type];

        // Calculate handle distance, accounting for board rotation scale factor
        const referenceScale = AppState.referenceScale;
        const scaleFactor = AppState.boardRotationScaleFactor || 1;
        const handleDistance = (halfH ? halfH * referenceScale + 20 : 50) / scaleFactor;
        const rotationRad = (element.rotation || 0) * Math.PI / 180;

        // Calculate handle angle relative to element
        let handleAngle;
        if (element.type === 'goal' || element.type === 'small-goal') {
            handleAngle = rotationRad + Math.PI;
        } else {
            handleAngle = rotationRad - Math.PI / 2;
        }

        // Calculate handle offset - no board rotation compensation needed since
        // the handle is inside board-area which is already rotated by CSS transform
        const handleX = centerPos.x + Math.cos(handleAngle) * handleDistance;
        const handleY = centerPos.y + Math.sin(handleAngle) * handleDistance;

        const handleSize = 28;
        this.rotationHandle.style.left = (handleX - handleSize / 2) + 'px';
        this.rotationHandle.style.top = (handleY - handleSize / 2) + 'px';
    },

    // Update rotation handle position
    updateRotationHandle() {
        // Remove existing handle
        if (this.rotationHandle) {
            this.rotationHandle.remove();
            this.rotationHandle = null;
        }

        // Only show handle if an element is selected, supports rotation, and is not locked
        if (AppState.selectedElement && this.supportsRotation(AppState.selectedElement.type) && !AppState.selectedElement.inherited) {
            const element = AppState.selectedElement;

            // Get element's geometrical center (accounts for anchor and element rotation)
            const centerBoardPos = this.getGeometricalCenter(element);

            // Use Board.boardToScreen to properly convert element center to canvas coordinates
            const centerPos = Board.boardToScreen(centerBoardPos.x, centerBoardPos.y);
            const centerX = centerPos.x;
            const centerY = centerPos.y;

            const elementBoardHalfHeights = {
                'ladder': 300, 'rebounce': 200, 'big-wall': 100, 'small-wall': 50, 'small-hurdle': 30
            };
            const halfH = elementBoardHalfHeights[element.type];

            // Calculate handle distance, accounting for board rotation scale factor
            const referenceScale = AppState.referenceScale;
            const scaleFactor = AppState.boardRotationScaleFactor || 1;
            const handleDistance = (halfH ? halfH * referenceScale + 20 : 50) / scaleFactor;
            const rotationRad = (element.rotation || 0) * Math.PI / 180;

            let handleAngle;
            if (element.type === 'goal' || element.type === 'small-goal') {
                handleAngle = rotationRad + Math.PI;
            } else {
                handleAngle = rotationRad - Math.PI / 2;
            }

            // Calculate handle offset - no board rotation compensation needed since
            // the handle is inside board-area which is already rotated by CSS transform
            const offsetX = Math.cos(handleAngle) * handleDistance;
            const offsetY = Math.sin(handleAngle) * handleDistance;

            const handleX = centerX + offsetX;
            const handleY = centerY + offsetY;

            const handleSize = 28;

            // Create rotation handle
            this.rotationHandle = document.createElement('div');
            this.rotationHandle.className = 'rotation-handle';
            this.rotationHandle.style.width = handleSize + 'px';
            this.rotationHandle.style.height = handleSize + 'px';
            this.rotationHandle.style.zIndex = '1001';

            // Position handle in canvas coordinates - will be rotated by board-area transform
            this.rotationHandle.style.left = (handleX - handleSize / 2) + 'px';
            this.rotationHandle.style.top = (handleY - handleSize / 2) + 'px';

            // Add event listener
            this.rotationHandle.addEventListener('mousedown', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.isRotating = true;
                AppState.draggedElement = null;
                AppState.updatePositionDisplay(element.x, element.y, element, 'element');
            });

            // Append to board-area (same as players) so it rotates with the board transform
            this.layer.appendChild(this.rotationHandle);
        }
    },

    // Handle rotation movement
    handleRotationMove(e) {
        const element = AppState.selectedElement;
        if (!element) return;

        // Get element's geometrical center in board coordinates
        const centerBoardPos = this.getGeometricalCenter(element);

        // Get mouse position in board coordinates (properly accounts for board rotation via DOMMatrix)
        const mouseBoardPos = Utils.screenToBoardCoords(e.clientX, e.clientY);

        // Calculate angle from center to mouse in board coordinate space
        const angle = Math.atan2(mouseBoardPos.y - centerBoardPos.y, mouseBoardPos.x - centerBoardPos.x);
        let degrees = angle * 180 / Math.PI;

        // DEBUG
        if (AppState.debugCoords) {
            console.log('handleRotationMove:', {
                centerBoard: centerBoardPos,
                mouseBoard: mouseBoardPos,
                rawAngle: degrees,
                boardRotation: AppState.boardRotation
            });
        }

        // Adjust based on handle position for different element types
        if (element.type === 'goal' || element.type === 'small-goal') {
            // Handle is behind (180° offset), so subtract 180° to get element rotation
            degrees = degrees - 180;
        } else {
            // Handle is perpendicular (-90° offset), so add 90° to get element rotation
            degrees = degrees + 90;
        }

        // Normalize to 0-360
        element.rotation = ((degrees % 360) + 360) % 360;

        // Update display
        AppState.updatePositionDisplay(element.x, element.y, element, 'element');

        // Update SVG transform directly without full re-render
        const elementSvg = document.getElementById(element.id);
        if (elementSvg) {
            // Get element dimensions and anchor - use referenceScale for consistency
            const scale = AppState.referenceScale;
            const anchor = this.getAnchor(element.type);
            let width, height;

            switch (element.type) {
                case 'cone':
                    width = 100 * scale;
                    height = 120 * scale;
                    break;
                case 'goal':
                    width = 100 * scale;
                    height = 300 * scale;
                    break;
                case 'small-goal':
                    width = 50 * scale;
                    height = 100 * scale;
                    break;
                case 'pole':
                    width = 90 * scale;
                    height = 300 * scale;
                    break;
                case 'ladder':
                    width = 100 * scale;
                    height = 600 * scale;
                    break;
                case 'rebounce':
                    width = 50 * scale;
                    height = 400 * scale;
                    break;
                case 'small-wall':
                    width = 50 * scale;
                    height = 100 * scale;
                    break;
                case 'big-wall':
                    width = 50 * scale;
                    height = 200 * scale;
                    break;
                case 'small-hurdle':
                    width = 100 * scale;
                    height = 60 * scale;
                    break;
                default:
                    width = 100 * scale;
                    height = 100 * scale;
            }

            // Update rotation with correct transform
            elementSvg.style.transform = `translate(${-width * anchor.x}px, ${-height * anchor.y}px) rotate(${element.rotation}deg)`;
            elementSvg.style.transformOrigin = `${width * anchor.x}px ${height * anchor.y}px`;
        }

        // Update touch overlay position during rotation (if in touch mode)
        if (document.body.classList.contains('touch-mode')) {
            const overlay = this.layer.querySelector(`.touch-overlay[data-element="${element.id}"]`);
            if (overlay) {
                // Calculate new geometrical center after rotation and convert to canvas coordinates
                const center = this.getGeometricalCenter(element);
                const centerPos = Board.boardToScreen(center.x, center.y);
                overlay.style.left = centerPos.x + 'px';
                overlay.style.top = centerPos.y + 'px';
            }
        }

        // Update debug box during rotation
        if (typeof Utils !== 'undefined') {
            Utils.updateDebugBox(element.id, 'element');
        }

        // Update rotation handle position
        this.updateRotationHandlePosition();
    }
};
