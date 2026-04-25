// Plates module - handles plate elements (always draggable, no selection needed)
const Plates = {
    layer: null,
    plateSvgs: {},
    plateColors: [
        { name: 'White', color: '#FFFFFF' },
        { name: 'Black', color: '#000000' },
        { name: 'Yellow', color: '#FFD700' },
        { name: 'Green', color: '#2ecc71' },
        { name: 'Red', color: '#E74C3C' },
        { name: 'Blue', color: '#3498DB' },
        { name: 'Orange', color: '#FF6B35' }
    ],

    /** Sets up plate DOM layer, drag/drop, and context-menu event listeners. */
    init() {
        this.layer = document.getElementById('board-area');
        this.contextMenuPlate = null;
        this.setupPlateContainer();
        this.setupInteractions();
        this.setupContextMenu();
        // Update plate template sizes to match board scale
        this.updatePlateTemplatesSizes();
    },

    // Update plate template sizes to match board scale
    updatePlateTemplatesSizes() {
        const canvasRect = AppState.canvas.getBoundingClientRect();
        const scaleX = canvasRect.width / AppState.boardWidth;

        // Plate diameter is 60cm (radius 30cm * 2)
        const size = Math.max(30 * scaleX * 2, 30); // minimum 30px for visibility

        document.querySelectorAll('.plate-template svg').forEach(svg => {
            svg.setAttribute('width', size);
            svg.setAttribute('height', size);
        });
    },

    // Setup plate container with draggable templates
    setupPlateContainer() {
        const container = document.getElementById('plate-container');
        const boardContainer = document.querySelector('.board-container');

        this.plateColors.forEach((plateColor, index) => {
            // Wrap SVG in a div to make dragging more reliable
            const wrapper = document.createElement('div');
            wrapper.classList.add('plate-template');
            wrapper.draggable = true;
            wrapper.title = plateColor.name + ' Plate';
            wrapper.dataset.platecolor = plateColor.color;

            const svg = this.createPlateTemplate(plateColor.color);
            wrapper.appendChild(svg);

            // Track if dragging is happening
            let isDragging = false;

            // Drag start
            wrapper.addEventListener('dragstart', (e) => {
                isDragging = true;
                e.dataTransfer.effectAllowed = 'copy';
                e.dataTransfer.setData('text/plain', plateColor.color);
                e.dataTransfer.setData('plateColor', plateColor.color);

                // Set drag image centered at cursor (half width/height as offset)
                const halfSize = parseInt(svg.getAttribute('width')) / 2;
                e.dataTransfer.setDragImage(svg, halfSize, halfSize);
            });

            wrapper.addEventListener('dragend', (e) => {
                // Reset dragging flag after a short delay
                setTimeout(() => { isDragging = false; }, 100);
            });

            // Click event to add plate at free position
            wrapper.addEventListener('click', (e) => {
                if (isDragging) return; // Don't trigger if user was dragging
                if (e.detail === 0) return; // Ignore programmatic clicks

                // Can't add plates in child boards
                if (AppState.isChildBoard()) {
                    Utils.showMessage('Plates can only be added on parent boards. Only shapes/draws can be added on child boards.', 'Cannot Add Plate');
                    return;
                }

                const freePos = AppState.findFreePosition(250);
                AppState.addPlate(plateColor.color, freePos.x, freePos.y);

                // saveToHistory already called by saveToLocalStorage in addPlate
                Plates.render();
            });

            container.appendChild(wrapper);
        });

        // Setup drop zone on board
        const handleBoardDragOver = (e) => {
            // Check if this is a plate being dragged by checking for plateColor data type
            const hasPlateData = e.dataTransfer.types.includes('platecolor');

            if (hasPlateData) {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'copy';
                const canvasRect = AppState.canvas.getBoundingClientRect();
                const boardX = (e.clientX - canvasRect.left) * (AppState.boardWidth / canvasRect.width);
                const boardY = (e.clientY - canvasRect.top) * (AppState.boardHeight / canvasRect.height);
                AppState.updatePositionDisplay(boardX, boardY, null, 'plate');
            }
        };

        const handleBoardDragLeave = (e) => {
            if (!e.relatedTarget || !boardContainer.contains(e.relatedTarget)) {
                AppState.hidePositionDisplay();
            }
        };

        const handleBoardDrop = (e) => {
            const plateColor = e.dataTransfer.getData('plateColor') ||
                             e.dataTransfer.getData('text/plain');


            // Check if it's a valid plate color
            const validColors = ['#FFFFFF', '#000000', '#FFD700', '#2ecc71', '#E74C3C', '#3498DB', '#FF6B35'];
            if (plateColor && validColors.includes(plateColor) && e.dataTransfer.types.includes('platecolor')) {
                e.preventDefault();
                e.stopPropagation();

                // Can't add plates in child boards
                if (AppState.isChildBoard()) {
                    AppState.hidePositionDisplay();
                    Utils.showMessage('Plates can only be added on parent boards. Only shapes/draws can be added on child boards.', 'Cannot Add Plate');
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


                // Create plate at drop position
                AppState.addPlate(plateColor, boardX, boardY);
                this.render();
            }
        };

        boardContainer.addEventListener('dragover', handleBoardDragOver, true);
        boardContainer.addEventListener('dragleave', handleBoardDragLeave, true);
        boardContainer.addEventListener('drop', handleBoardDrop, true);
    },

    // Create plate template SVG (sized to match board appearance)
    createPlateTemplate(color) {
        // Calculate size based on board scale
        const canvasRect = AppState.canvas.getBoundingClientRect();
        const scaleX = canvasRect.width / AppState.boardWidth;

        // Plate diameter is 60cm (radius 30cm * 2)
        const size = Math.max(30 * scaleX * 2, 30); // minimum 30px for visibility

        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', size);
        svg.setAttribute('height', size);
        svg.setAttribute('viewBox', '0 0 100 100');

        const content = this.createPlateSVG(color);
        svg.innerHTML = content;

        return svg;
    },

    // Setup plate interactions (always draggable)
    setupInteractions() {
        this.layer.addEventListener('mousedown', (e) => {
            if (AppState.currentTool !== 'select') return;

            // Find the plate ID by traversing up the DOM tree
            const plateId = Utils.findEntityId(e.target, this.layer, 'plate');

            if (plateId) {
                const plate = AppState.getPlate(plateId);
                if (plate) {
                    // Check if plate is already selected
                    if (AppState.selectedPlate && AppState.selectedPlate.id === plate.id) {
                        // Don't allow dragging if locked or inherited
                        if (plate.inherited) return;

                        // Already selected, prepare to drag
                        AppState.draggedPlate = plate;
                        AppState.updatePositionDisplay(plate.x, plate.y, plate, 'plate');

                        const rect = AppState.canvas.getBoundingClientRect();
                        const scaleX = AppState.boardWidth / rect.width;
                        const scaleY = AppState.boardHeight / rect.height;

                        AppState.dragOffset = {
                            x: (e.clientX - rect.left) * scaleX - plate.x,
                            y: (e.clientY - rect.top) * scaleY - plate.y
                        };
                    } else {
                        // Not selected yet, just select it (allowed even if locked)
                        AppState.selectedPlate = plate;
                        AppState.selectedElement = null;
                        AppState.selectedPlayer = null;
                        AppState.selectedBall = null;
                        AppState.selectedShape = null;
                        AppState.selectedPath = null;
                        AppState.selectedGhost = null;
                        AppState.updatePositionDisplay(plate.x, plate.y, plate, 'plate');

                        this.render(); // Re-render to show selection
                        if (typeof Elements !== 'undefined') {
                            Elements.render();
                        }
                        if (typeof Players !== 'undefined') {
                            Players.render();
                        }
                        if (typeof Balls !== 'undefined') {
                            Balls.render();
                        }
                        if (typeof Shapes !== 'undefined') {
                            Shapes.render();
                        }
                        if (typeof Animations !== 'undefined') {
                            Animations.renderParentPaths();
                        }
                    }

                    e.preventDefault();
                    e.stopPropagation();
                }
            } else {
                // Clicked on empty space - deselect plate
                if (AppState.selectedPlate) {
                    AppState.selectedPlate = null;
                    if (!AppState.selectedElement && !AppState.selectedPlayer && !AppState.selectedBall) {
                        AppState.hidePositionDisplay();
                    }
                    this.render();
                }
            }
        });

        Utils.setupEntityDrag({
            dragKey: 'draggedPlate',
            selectedKey: 'selectedPlate',
            type: 'plate',
            updateDOM(el, x, y, pxW, pxH) {
                const pxX = x * (pxW / AppState.boardWidth);
                const pxY = y * (pxH / AppState.boardHeight);
                const w = 60 * (pxW / AppState.boardWidth);
                const h = 60 * (pxH / AppState.boardHeight);
                el.style.left = pxX + 'px';
                el.style.top  = pxY + 'px';
                el.style.transform = `translate(${-w/2}px, ${-h/2}px)`;
            }
        });

        // Context menu for plates (right-click)
        this.layer.addEventListener('contextmenu', (e) => {
            const plateId = Utils.findEntityId(e.target, this.layer, 'plate');

            if (plateId) {
                e.preventDefault();
                const plate = AppState.getPlate(plateId);
                if (plate) {
                    this.showContextMenu(e.clientX, e.clientY, plate);
                }
            }
        });

        // Context menu for plates (double-click)
        this.layer.addEventListener('dblclick', (e) => {
            const plateId = Utils.findEntityId(e.target, this.layer, 'plate');

            if (plateId) {
                e.preventDefault();
                const plate = AppState.getPlate(plateId);
                if (plate) {
                    this.showContextMenu(e.clientX, e.clientY, plate);
                }
            }
        });

        // Touch events are globally converted to mouse events in app.js
    },

    // Setup context menu handlers
    setupContextMenu() {
        // Menu click handling is done in showContextMenu by temporarily replacing handlers
    },

    // Show context menu
    showContextMenu(x, y, plate) {
        // Set menu open time for Elements module's mouseup handler
        if (typeof Elements !== 'undefined') {
            Elements.menuOpenTime = Date.now();
            Elements.menuVisible = true;
        }

        this.contextMenuPlate = plate;
        const menu = document.getElementById('element-context-menu');

        // Clear other contexts
        if (typeof Elements !== 'undefined') {
            Elements.contextMenuElement = null;
        }
        if (typeof Balls !== 'undefined') {
            Balls.contextMenuBall = null;
        }

        // Remove custom menu items added by other modules
        const customItems = menu.querySelectorAll('[data-action="name"], [data-action="number"], [data-action="edit-text"], [data-action="size"], [data-action="reset"]');
        customItems.forEach(item => item.remove());

        // Clone menu first for modifications
        const menuCopy = menu.cloneNode(true);
        menu.parentNode.replaceChild(menuCopy, menu);

        // Hide lock menu item (feature removed)
        const lockItem = menuCopy.querySelector('[data-action="lock"]');
        if (lockItem) {
            lockItem.style.display = 'none';
        }

        // Disable menu items if inherited
        const menuItems = menuCopy.querySelectorAll('.context-menu-item');
        menuItems.forEach(item => {
            if (plate.inherited) {
                item.classList.add('disabled');
            } else {
                item.classList.remove('disabled');
            }
        });

        // Position menu and ensure it stays within viewport
        menuCopy.classList.remove('hidden');

        Utils.positionContextMenu(menuCopy, x, y);

        menuCopy.addEventListener('click', (e) => {
            const item = e.target.closest('.context-menu-item');
            if (!item || !this.contextMenuPlate) return;

            // Always hide menu first, even if item is disabled
            menuCopy.classList.add('hidden');
            menuCopy.style.display = 'none';
            const plate = this.contextMenuPlate;
            this.contextMenuPlate = null;

            // Restore Elements menu handler
            if (typeof Elements !== 'undefined') {
                Elements.setupContextMenu();
            }

            // Don't execute if item is disabled
            if (item.classList.contains('disabled')) {
                return;
            }

            const action = item.dataset.action;

            switch (action) {
                case 'remove':
                    // Can't remove inherited plates
                    if (plate.inherited) return;
                    AppState.removePlate(plate.id);
                    this.render();
                    break;
                case 'position':
                    this.showPositionDialog(plate);
                    break;
                case 'color':
                    this.showColorDialog(plate);
                    break;
            }
        });

        // Hide menu when clicking outside or losing focus
        const hideHandler = () => {
            menuCopy.classList.add('hidden');
            menuCopy.style.display = 'none';
            document.removeEventListener('click', hideHandler);
            window.removeEventListener('blur', hideHandler);
        };
        setTimeout(() => {
            document.addEventListener('click', hideHandler);
            window.addEventListener('blur', hideHandler);
        }, 0);
    },

    // Show position dialog
    showPositionDialog(plate) {
        // Don't show dialog if locked or inherited
        if (plate.inherited) return;

        this.contextMenuPlate = plate;

        // Convert board coordinates to pitch coordinates
        const pitchX = Math.round(plate.x - AppState.pitchOffsetX);
        const pitchY = Math.round(plate.y - AppState.pitchOffsetY);

        document.getElementById('element-pos-x').value = pitchX;
        document.getElementById('element-pos-y').value = pitchY;

        // Hide rotation group for plates
        const rotationGroup = document.getElementById('rotation-group');
        rotationGroup.style.display = 'none';

        // Store initial values for rounding logic
        if (typeof Elements !== 'undefined') {
            Elements.positionInitialValues = { x: pitchX, y: pitchY };
        }

        // Override the confirm button handler temporarily
        const confirmBtn = document.getElementById('btn-confirm-position');
        const newConfirmBtn = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);

        newConfirmBtn.addEventListener('click', () => {
            const pitchX = parseInt(document.getElementById('element-pos-x').value);
            const pitchY = parseInt(document.getElementById('element-pos-y').value);

            if (isNaN(pitchX) || isNaN(pitchY)) {
                Utils.showMessage('Please enter valid numbers for X and Y position.', 'Invalid Position');
                return;
            }

            plate.x = Math.max(0, Math.min(AppState.boardWidth, pitchX + AppState.pitchOffsetX));
            plate.y = Math.max(0, Math.min(AppState.boardHeight, pitchY + AppState.pitchOffsetY));

            AppState.updatePositionDisplay(plate.x, plate.y, plate, 'plate');
            AppState.saveToLocalStorage();
            this.render();

            document.getElementById('element-position-modal').classList.add('hidden');

            // Restore original handler
            if (typeof Elements !== 'undefined') {
                Elements.setupContextMenu();
            }
        });

        Utils.openModal('element-position-modal');
    },

    // Show color dialog
    showColorDialog(plate) {
        // Don't show dialog if locked or inherited
        if (plate.inherited) return;

        this.contextMenuPlate = plate;

        const currentColor = plate.color || '#39d353';
        document.getElementById('element-color-picker').value = currentColor;

        // Override the confirm button handler temporarily
        const confirmBtn = document.getElementById('btn-confirm-color');
        const newConfirmBtn = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);

        newConfirmBtn.addEventListener('click', () => {
            const color = document.getElementById('element-color-picker').value;
            plate.color = color;

            AppState.saveToLocalStorage();
            this.render();

            document.getElementById('element-color-modal').classList.add('hidden');

            // Restore original handler if needed
            if (typeof Elements !== 'undefined') {
                Elements.setupContextMenu();
            }
        });

        Utils.openModal('element-color-modal');
    },

    /** Clears and re-creates all plate DOM elements from AppState.plates. */
    render() {
        // Safety check: don't render if layer is not initialized yet
        if (!this.layer) {
            return;
        }


        // Clear ALL plate SVGs from the DOM (not just tracked ones)
        this.layer.querySelectorAll('.plate-svg').forEach(svg => {
            svg.remove();
        });
        this.plateSvgs = {};

        // Render each plate
        AppState.plates.forEach(plate => {
            if (plate.visible) {
                this.renderPlate(plate);
            }
        });

    },

    // Render individual plate
    renderPlate(plate) {
        const svg = this.createPlateElementSvg(plate);
        if (svg) {
            this.layer.appendChild(svg);
            this.plateSvgs[plate.id] = svg;
        } else {
            console.error('Failed to create SVG for plate:', plate);
        }
    },

    // Create SVG for plate on board
    createPlateElementSvg(plate) {
        const canvasRect = AppState.canvas.getBoundingClientRect();

        // Scale based on actual rendered canvas size
        const scaleX = canvasRect.width / AppState.boardWidth;
        const scaleY = canvasRect.height / AppState.boardHeight;

        // Position relative to players-layer (which is already positioned to match canvas)
        const x = plate.x * scaleX;
        const y = plate.y * scaleY;

        // 30cm radius * 2 = 60cm diameter
        const width = 30 * scaleX * 2;
        const height = 30 * scaleY * 2;

        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('class', 'plate-svg');

        // Add inherited class if this plate is inherited from parent
        if (plate.inherited) {
            svg.classList.add('plate-inherited');
        }

        // Add selected class if this plate is selected
        if (AppState.selectedPlate && AppState.selectedPlate.id === plate.id) {
            svg.classList.add('plate-selected');
        }

        svg.setAttribute('viewBox', '0 0 100 100');
        svg.style.position = 'absolute';
        svg.style.left = x + 'px';
        svg.style.top = y + 'px';
        svg.style.overflow = 'visible';
        svg.style.pointerEvents = 'all';
        svg.style.cursor = 'default';
        svg.style.setProperty('cursor', 'default', 'important');
        svg.style.touchAction = 'none';
        svg.setAttribute('width', width);
        svg.setAttribute('height', height);
        svg.style.transform = `translate(${-width/2}px, ${-height/2}px)`;
        svg.id = plate.id; // Use ID for fast lookup, consistent with players
        svg.dataset.plate = plate.id; // Keep data attribute for compatibility

        // Add transparent background rect for clickability
        const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        bgRect.setAttribute('x', '0');
        bgRect.setAttribute('y', '0');
        bgRect.setAttribute('width', '100');
        bgRect.setAttribute('height', '100');
        bgRect.setAttribute('fill', 'transparent');
        bgRect.style.pointerEvents = 'all';

        const content = this.createPlateSVG(plate.color);
        svg.innerHTML = content;
        svg.insertBefore(bgRect, svg.firstChild);

        return svg;
    },

    // SVG content for plate with color (based on user's provided SVG)
    createPlateSVG(color) {
        // User provided: outer circle r=25, inner circle r=4
        // Scaled for 60 radius (2.4x): outer r=60, inner r=10 (rounded)
        // Normalized to viewBox 100x100: outer r=40, inner r=6.5 (adjusted for visibility)
        return `
            <g>
                <circle cx="50" cy="50" r="40" fill="${color}" stroke="black" stroke-width="2.5"></circle>
                <circle cx="50" cy="50" r="6.5" fill="black" stroke="none"></circle>
            </g>
        `;
    }
};
