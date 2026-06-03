// Shapes module - handles drawable shapes (line, arrow, rectangle, circle, ellipse)
const Shapes = {
    layer: null,
    shapeSvgs: {},
    contextMenuShape: null,
    rotationHandle: null,
    resizeHandles: [],
    isRotating: false,
    isResizing: false,
    resizeDirection: null,
    resizeCornerOffset: null,
    // Rotation drag state: initial values captured at mousedown
    rotationDragInitialAngle: null,
    rotationDragInitialShapeRotation: null,

    /** Sets up the shape drawing layer, tool handlers, and context-menu event listeners. */
    init() {
        this.layer = document.getElementById('board-area');
        this.setupDrawButtons();
        this.setupInteractions();
        this.setupRotationHandling();
        this.setupContextMenu();
        this.setupKeyboardShortcuts();
    },

    // Setup keyboard shortcuts
    setupKeyboardShortcuts() {
        // Delete key handling is now in app.js to handle all object types
    },

    // Setup draw button click handlers
    setupDrawButtons() {
        const boardContainer = document.querySelector('.board-container');
        let dragPreviewShape = null;
        let currentDragType = null;
        const self = this;

        document.querySelectorAll('.draw-btn').forEach(btn => {
            // Make button draggable
            btn.draggable = true;

            // Track if dragging is happening
            let isDragging = false;

            // Store shape type on drag start
            btn.addEventListener('dragstart', (e) => {
                isDragging = true;
                const shapeType = btn.dataset.draw;
                currentDragType = shapeType;
                e.dataTransfer.effectAllowed = 'copy';
                e.dataTransfer.setData('shapeType', shapeType);

                // Create an invisible drag image (we show our custom preview instead)
                const dragImage = document.createElement('div');
                dragImage.style.position = 'absolute';
                dragImage.style.top = '-1000px';
                dragImage.style.width = '1px';
                dragImage.style.height = '1px';
                document.body.appendChild(dragImage);
                e.dataTransfer.setDragImage(dragImage, 0, 0);
                setTimeout(() => document.body.removeChild(dragImage), 0);
            });

            btn.addEventListener('dragend', () => {
                currentDragType = null;
                if (dragPreviewShape) {
                    dragPreviewShape.remove();
                    dragPreviewShape = null;
                }
                // Reset dragging flag after a short delay
                setTimeout(() => { isDragging = false; }, 100);
            });

            // Add click functionality to create at free position
            btn.addEventListener('click', () => {
                if (isDragging) return; // Don't trigger if user was dragging

                const shapeType = btn.dataset.draw;
                self.addShapeAtCenter(shapeType);
            });
        });

        // Note: dragover event is shared with elements, so we don't add it here
        // The board already has a dragover handler that accepts all drops

        // Show preview while dragging over board
        boardContainer.addEventListener('dragover', (e) => {
            const hasShapeType = e.dataTransfer.types.includes('shapetype');
            if (hasShapeType && currentDragType) {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'copy';

                // Create or update preview shape
                const canvasRect = AppState.canvas.getBoundingClientRect();
                const scaleX = canvasRect.width / AppState.boardWidth;
                const scaleY = canvasRect.height / AppState.boardHeight;

                const screenX = e.clientX - canvasRect.left;
                const screenY = e.clientY - canvasRect.top;

                // Update or create preview
                if (!dragPreviewShape) {
                    dragPreviewShape = self.createDragPreview(currentDragType, screenX, screenY, scaleX, scaleY);
                } else {
                    dragPreviewShape.style.left = screenX + 'px';
                    dragPreviewShape.style.top = screenY + 'px';
                }

                const boardX = screenX / scaleX;
                const boardY = screenY / scaleY;
                AppState.updatePositionDisplay(boardX, boardY, null, 'shape');
            }
        });

        boardContainer.addEventListener('dragleave', (e) => {
            if (e.target === boardContainer && dragPreviewShape) {
                dragPreviewShape.remove();
                dragPreviewShape = null;
            }
            if (e.target === boardContainer) {
                AppState.hidePositionDisplay();
            }
        });

        boardContainer.addEventListener('drop', (e) => {
            const shapeType = e.dataTransfer.getData('shapeType');

            if (shapeType) {
                e.preventDefault();

                // Remove preview
                if (dragPreviewShape) {
                    dragPreviewShape.remove();
                    dragPreviewShape = null;
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

                // Create shape at drop position
                this.addShapeAtPosition(shapeType, boardX, boardY);
            }
        });
    },

    // Create a visual preview during drag
    createDragPreview(shapeType, screenX, screenY, scaleX, scaleY) {
        // Determine preview size based on shape type
        let width = 200;
        let height = 200;

        if (shapeType === 'rectangle') {
            width = 300;
            height = 200;
        } else if (shapeType === 'ellipse') {
            width = 200;
            height = 200;
        } else if (shapeType === 'line' || shapeType === 'arrow') {
            width = 400;
            height = 0;
        } else if (shapeType === 'text') {
            const defaultFontSize = 48;
            width = defaultFontSize * 3;   // 144
            height = defaultFontSize * 1.5;  // 72
        }

        const screenWidth = width * scaleX;
        const screenHeight = height * scaleY;

        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.style.position = 'absolute';
        svg.style.left = screenX + 'px';
        svg.style.top = screenY + 'px';
        svg.style.pointerEvents = 'none';
        svg.style.zIndex = '999';
        svg.style.opacity = '0.5';
        svg.style.overflow = 'visible';
        svg.style.transform = 'translate(-50%, -50%)';

        let content = '';
        const color = '#000000';
        const fillColor = 'rgba(0, 0, 0, 0.15)';

        // Adjust stroke width for board rotation scale factor
        const scaleFactor = AppState.boardRotationScaleFactor || 1;
        const lineStrokeWidth = 2 / scaleFactor;
        const shapeStrokeWidth = 3 / scaleFactor;

        if (shapeType === 'line' || shapeType === 'arrow') {
            svg.setAttribute('viewBox', `-${width/2} -10 ${width} 20`);
            svg.setAttribute('width', screenWidth);
            svg.setAttribute('height', 20 * scaleY);

            if (shapeType === 'line') {
                content = `<rect x="${-width/2}" y="-10" width="${width}" height="20" fill="transparent" pointer-events="none"/><line x1="${-width/2}" y1="0" x2="${width/2}" y2="0" stroke="${color}" stroke-width="${lineStrokeWidth}" fill="none" vector-effect="non-scaling-stroke" pointer-events="none"/>`;
            } else {
                content = `
                    <rect x="${-width/2}" y="-10" width="${width}" height="20" fill="transparent" pointer-events="none"/>
                    <defs>
                        <marker id="arrowhead-preview" markerWidth="10" markerHeight="10" refX="10" refY="5" orient="auto">
                            <polygon points="0,0 10,5 0,10" fill="${color}"/>
                        </marker>
                    </defs>
                    <line x1="${-width/2}" y1="0" x2="${width/2}" y2="0" stroke="${color}" stroke-width="${lineStrokeWidth}" fill="none" marker-end="url(#arrowhead-preview)" vector-effect="non-scaling-stroke" pointer-events="none"/>
                `;
            }
        } else {
            // Use actual dimensions for viewBox to ensure consistent coordinates
            const viewBoxWidth = width;
            const viewBoxHeight = height;
            svg.setAttribute('viewBox', `0 0 ${viewBoxWidth} ${viewBoxHeight}`);
            svg.setAttribute('width', screenWidth);
            svg.setAttribute('height', screenHeight);

            if (shapeType === 'rectangle') {
                const margin = 5;
                const rectX = margin;
                const rectY = margin;
                const rectWidth = width - (margin * 2);
                const rectHeight = height - (margin * 2);
                content = `<rect x="${rectX}" y="${rectY}" width="${rectWidth}" height="${rectHeight}" fill="${fillColor}" stroke="${color}" stroke-width="${shapeStrokeWidth}" vector-effect="non-scaling-stroke" pointer-events="none"/>`;
            } else if (shapeType === 'ellipse') {
                const margin = 5;
                const cx = width / 2;
                const cy = height / 2;
                const rx = (width / 2) - margin;
                const ry = (height / 2) - margin;
                content = `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fillColor}" stroke="${color}" stroke-width="${shapeStrokeWidth}" vector-effect="non-scaling-stroke" pointer-events="none"/>`;
            } else if (shapeType === 'text') {
                const cx = width / 2;
                const cy = height / 2;
                content = `<text x="${cx}" y="${cy + 5}" text-anchor="middle" font-size="48" font-weight="bold" fill="${color}" pointer-events="none">Text</text>`;
            }
        }

        svg.innerHTML = content;
        this.layer.appendChild(svg);
        return svg;
    },

    // Add a new shape at position 1000,1000 (click fallback)
    addShapeAtCenter(type) {
        // Find a free position on the board
        const freePos = AppState.findFreePosition(250);
        this.addShapeAtPosition(type, freePos.x, freePos.y);
    },

    // Add a new shape at a specific position (drag-and-drop)
    addShapeAtPosition(type, x, y) {
        // Default sizes (in board units - cm)
        let width = 200;
        let height = 200;

        if (type === 'rectangle') {
            width = 300;
            height = 200;
        } else if (type === 'ellipse') {
            width = 200;
            height = 200;
        } else if (type === 'line' || type === 'arrow') {
            width = 400;
            height = 0; // Lines don't have height
        } else if (type === 'text') {
            const defaultFontSize = 48;
            width = defaultFontSize * 3;   // 144
            height = defaultFontSize * 1.5;  // 72
        }

        const shape = {
            id: `shape-${AppState.nextShapeId++}`,
            type: type,
            x: x,
            y: y,
            width: width,
            height: height,
            rotation: 0,
            color: (type === 'line' || type === 'arrow' || type === 'text') ? 'black' : '#3498db',
            fillColor: type === 'rectangle' || type === 'circle' || type === 'ellipse' ? 'rgba(52, 152, 219, 0.3)' : 'none',
            strokeWidth: type === 'line' || type === 'arrow' ? 2 : 3,
            visible: true,
            inherited: false
        };

        // For text type, add text property and show text modal
        if (type === 'text') {
            shape.text = 'Text';
            shape.fontSize = 48;
            shape.color = 'black';
            // Ensure width and height match the fontSize-based proportions
            shape.width = shape.fontSize * 3;   // 144
            shape.height = shape.fontSize * 1.5;  // 72

            AppState.shapes.push(shape);
            AppState.saveToLocalStorage();
            this.render();

            // Show text modal immediately
            this.showTextDialog(shape);
        } else {
            AppState.shapes.push(shape);
            AppState.saveToLocalStorage();
            this.render();
        }
    },

    // Show text dialog
    showTextDialog(shape) {
        this.contextMenuShape = shape;

        document.getElementById('text-modal-input').value = shape.text || '';

        const confirmBtn = document.getElementById('btn-text-modal-ok');
        const newConfirmBtn = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);

        const cancelBtn = document.getElementById('btn-text-modal-cancel');
        const newCancelBtn = cancelBtn.cloneNode(true);
        cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);

        newConfirmBtn.addEventListener('click', () => {
            const text = document.getElementById('text-modal-input').value;
            if (shape.inherited) {
                shape.inherited = false;
            }
            shape.text = text;
            AppState.saveToLocalStorage();
            this.render();
            document.getElementById('text-modal').classList.add('hidden');

            if (typeof Elements !== 'undefined') {
                Elements.setupContextMenu();
            }
        });

        newCancelBtn.addEventListener('click', () => {
            document.getElementById('text-modal').classList.add('hidden');
        });

        Utils.openModal('text-modal');
        document.getElementById('text-modal-input').focus();
    },

    // Setup interactions (select, drag)
    setupInteractions() {
        this.layer.addEventListener('mousedown', (e) => {
            if (AppState.currentTool !== 'select') return;

            let shapeId = Utils.findEntityId(e.target, this.layer, 'shape');

            // If clicking on a shape-drag-handle (line/arrow transparent rect), get shapeId from parent SVG
            if (!shapeId && e.target.classList && e.target.classList.contains('shape-drag-handle')) {
                const parentSvg = e.target.parentElement;
                if (parentSvg && parentSvg.dataset) {
                    shapeId = parentSvg.dataset.shape;
                }
            }

            if (shapeId) {
                // In touch mode, when overlays overlap, only handle if THIS overlay is on top
                if (document.body.classList.contains('touch-mode')) {
                    const topElement = document.elementFromPoint(e.clientX, e.clientY);
                    // If the top element is a touch overlay but NOT this shape's overlay, don't handle this click
                    if (topElement && topElement.classList.contains('touch-overlay') && topElement.dataset.shape !== shapeId) {
                        return;
                    }
                }

                const shape = AppState.getShape(shapeId);
                if (shape) {
                    // If shape was found via tolerance (not direct hit), stop event propagation
                    // to prevent board.js from clearing the selection
                    const isDirectHit = Utils.findEntityId(e.target, this.layer, 'shape');
                    if (!isDirectHit) {
                        e.stopPropagation();
                    }

                    const isTouchMode = document.body.classList.contains('touch-mode');
                    const isAlreadySelected = AppState.selectedShape && AppState.selectedShape === shape.id;

                    // In touch mode: immediately start drag on first click (skip two-click workflow)
                    // In desktop mode: start drag only on second click (already selected)
                    if (isTouchMode || isAlreadySelected) {
                        // Locked shapes cannot be dragged
                        if (shape.locked) return;
                        // Clear all other drag states to prevent cross-entity drag interference
                        AppState.draggedElement = null;
                        AppState.draggedPlayer = null;
                        AppState.draggedBall = null;
                        AppState.draggedPlate = null;
                        // Prepare to drag
                        AppState.draggedShape = shape;
                        AppState.updatePositionDisplay(shape.x, shape.y, shape, 'shape');

                        // Calculate drag offset to prevent jump when dragging from edge
                        // Use screenToBoardCoords to account for rotation
                        const boardCoords = Utils.screenToBoardCoords(e.clientX, e.clientY);
                        AppState.dragOffset = {
                            x: boardCoords.x - shape.x,
                            y: boardCoords.y - shape.y
                        };
                    }

                    // Select the shape (if not already selected)
                    if (!isAlreadySelected) {
                        AppState.selectedShape = shape.id;
                        AppState.selectedElement = null;
                        AppState.selectedPlayer = null;
                        AppState.selectedBall = null;
                        AppState.selectedPlate = null;
                        AppState.updatePositionDisplay(shape.x, shape.y, shape, 'shape');

                        // Render in consistent order: shapes(25) first, then players/balls/plates/elements(30)
                        // Last rendered is on top in DOM, so elements are on top when same z-index
                        this.render();
                        if (typeof Players !== 'undefined') {
                            Players.render();
                        }
                        if (typeof Balls !== 'undefined') {
                            Balls.render();
                        }
                        if (typeof Plates !== 'undefined') {
                            Plates.render();
                        }
                        if (typeof Elements !== 'undefined') {
                            Elements.render();
                        }
                    }

                    e.preventDefault();
                    e.stopPropagation();
                }
            } else {
                // Clicked on empty space - deselect shape
                if (AppState.selectedShape) {
                    AppState.selectedShape = null;
                    if (!AppState.selectedElement && !AppState.selectedPlayer && !AppState.selectedBall && !AppState.selectedPlate) {
                        AppState.hidePositionDisplay();
                    }
                    this.render();
                }
            }
        });

        Utils.setupEntityDrag({
            dragKey: 'draggedShape',
            selectedKey: 'selectedShape',
            type: 'shape',
            updateDOM: (el, x, y, pxW, pxH) => {
                // Use canvas dimensions (not getBoundingClientRect) to match initial positioning
                const canvasWidth = AppState.canvas.width;
                const canvasHeight = AppState.canvas.height;
                const pixelScaleX = canvasWidth / AppState.boardWidth;
                const pixelScaleY = canvasHeight / AppState.boardHeight;

                el.style.left = (x * pixelScaleX) + 'px';
                el.style.top  = (y * pixelScaleY) + 'px';
                // rotation transform is maintained from original render

                // Update touch overlay position if it exists
                if (document.body.classList.contains('touch-mode')) {
                    const overlay = this.layer.querySelector(`.touch-overlay[data-shape="${el.dataset.shape}"]`);
                    if (overlay) {
                        const yOffset = parseFloat(overlay.dataset.yOffset || '0');
                        overlay.style.left = (x * pixelScaleX) + 'px';
                        overlay.style.top  = (y * pixelScaleY + yOffset) + 'px';
                    }
                }

                // Update debug box position during drag
                if (typeof Utils !== 'undefined') {
                    Utils.updateDebugBox(el.dataset.shape, 'shape');
                }
            },
            afterMove: () => {
                if (!this.isRotating && !this.isResizing) this.updateHandlesPosition();
            },
            onDrop(shape) {
                if (shape.inherited) shape.inherited = false;
            }
        });

        // Context menu (right-click)
        this.layer.addEventListener('contextmenu', (e) => {
            const shapeId = Utils.findEntityId(e.target, this.layer, 'shape');

            if (shapeId) {
                e.preventDefault();
                const shape = AppState.getShape(shapeId);
                if (shape) {
                    this.showContextMenu(e.clientX, e.clientY, shape);
                }
            }
        });

        // Double-click for context menu
        this.layer.addEventListener('dblclick', (e) => {
            const shapeId = Utils.findEntityId(e.target, this.layer, 'shape');

            if (shapeId) {
                e.preventDefault();
                const shape = AppState.getShape(shapeId);
                if (shape) {
                    this.showContextMenu(e.clientX, e.clientY, shape);
                }
            }
        });

        // Touch events are globally converted to mouse events in app.js
    },

    // Setup rotation handling
    setupRotationHandling() {
        document.addEventListener('mousemove', (e) => {
            if (this.isRotating && AppState.selectedShape) {
                e.preventDefault();
                const _sel = AppState.getShape(AppState.selectedShape);
                // Don't allow rotation of locked shapes
                if (_sel && _sel.locked) {
                    return;
                }
                // Make inherited shape local when rotating it
                if (_sel && _sel.inherited) {
                    _sel.inherited = false;
                }
                this.handleRotationMove(e);
            } else if (this.isResizing && AppState.selectedShape) {
                e.preventDefault();
                const _sel = AppState.getShape(AppState.selectedShape);
                // Don't allow resizing of locked shapes
                if (_sel && _sel.locked) {
                    return;
                }
                // Make inherited shape local when resizing it
                if (_sel && _sel.inherited) {
                    _sel.inherited = false;
                }
                this.handleResizeMove(e);
            }
        });

        document.addEventListener('mouseup', () => {
            if (this.isRotating) {
                this.isRotating = false;
                this.rotationDragInitialAngle = null;
                this.rotationDragInitialShapeRotation = null;
                AppState.saveToLocalStorage();
                AppState.hidePositionDisplay();
            }
            if (this.isResizing) {
                this.isResizing = false;
                this.resizeDirection = null;
                this.resizeCornerOffset = null;
                // Clear text resize initial state
                this.initialTextFontSize = null;
                this.initialTextHandleDistance = null;
                AppState.saveToLocalStorage();
            }
        });
    },

    // Handle rotation movement
    handleRotationMove(e) {
        const shape = AppState.getShape(AppState.selectedShape);
        if (!shape) return;

        // Get mouse position in board coordinates (properly accounts for board rotation via DOMMatrix)
        const mouseBoardPos = Utils.screenToBoardCoords(e.clientX, e.clientY);

        // Compute the angle from the shape centre to the current mouse position.
        const currentAngle = Math.atan2(mouseBoardPos.y - shape.y, mouseBoardPos.x - shape.x);

        if (this.rotationDragInitialAngle !== null) {
            // Delta approach: apply the angular change since mousedown to the
            // initial shape rotation.  This prevents the shape from jumping when
            // the drag starts because the rotation handle is not directly below
            // the mouse cursor.
            let delta = currentAngle - this.rotationDragInitialAngle;
            // Wrap delta to [-π, π] to avoid 360° flips
            while (delta > Math.PI)  delta -= 2 * Math.PI;
            while (delta < -Math.PI) delta += 2 * Math.PI;

            const degrees = this.rotationDragInitialShapeRotation + delta * 180 / Math.PI;
            shape.rotation = ((degrees % 360) + 360) % 360;
        } else {
            // Fallback (no initial angle recorded): absolute angle
            const degrees = (currentAngle * 180 / Math.PI) + 90;
            shape.rotation = ((degrees % 360) + 360) % 360;
        }

        // Update display
        AppState.updatePositionDisplay(shape.x, shape.y, shape, 'shape');

        // Update SVG transform directly without full re-render
        const shapeSvg = document.getElementById(shape.id);
        if (shapeSvg) {
            const referenceScale = AppState.referenceScale;
            const width = shape.width * referenceScale;
            const height = shape.height * referenceScale;

            // Update rotation based on shape type
            if (shape.type === 'line' || shape.type === 'arrow') {
                const lineH = parseFloat(shapeSvg.getAttribute('height') || '0');
                shapeSvg.style.transform = `translate(${-width/2}px, ${-lineH/2}px) rotate(${shape.rotation}deg)`;
                shapeSvg.style.transformOrigin = `${width/2}px ${lineH/2}px`;
            } else {
                // Text rotates with the board. Additionally flip 180° if the net rotation
                // would make text read right-to-left (cos of net angle < 0).
                let svgRotation = shape.rotation;
                if (shape.type === 'text') {
                    const net = ((shape.rotation || 0) + (AppState.boardRotation || 0)) * Math.PI / 180;
                    if (Math.cos(net) < 0) svgRotation += 180;
                }
                shapeSvg.style.transform = `translate(${-width/2}px, ${-height/2}px) rotate(${svgRotation}deg)`;
                shapeSvg.style.transformOrigin = `${width/2}px ${height/2}px`;
            }
        }

        // Update touch overlay rotation if it exists
        if (document.body.classList.contains('touch-mode')) {
            const overlay = this.layer.querySelector(`.touch-overlay[data-shape="${shape.id}"]`);
            if (overlay) {
                const overlayWidth = parseFloat(overlay.style.width);
                const overlayHeight = parseFloat(overlay.style.height);
                overlay.style.transform = `translate(${-overlayWidth/2}px, ${-overlayHeight/2}px) rotate(${shape.rotation}deg)`;
                overlay.style.transformOrigin = `${overlayWidth/2}px ${overlayHeight/2}px`;
            }
        }

        // Update debug box during rotation
        if (typeof Utils !== 'undefined') {
            Utils.updateDebugBox(shape.id, 'shape');
        }

        // Update handles position
        this.updateHandlesPosition();
    },

    // Handle resize movement
    handleResizeMove(e) {
        const shape = AppState.getShape(AppState.selectedShape);
        if (!shape || !this.resizeDirection) return;

        // Use screenToBoardCoords to correctly account for board rotation (CSS transform)
        const boardPos = Utils.screenToBoardCoords(e.clientX, e.clientY);
        const mouseX = boardPos.x;
        const mouseY = boardPos.y;

        // For lines and arrows, move only one end
        if (shape.type === 'line' || shape.type === 'arrow') {
            const rotation = (shape.rotation || 0) * Math.PI / 180;

            // Calculate the fixed end (opposite to the handle)
            const fixedEndX = shape.x - Math.cos(rotation) * (shape.width / 2);
            const fixedEndY = shape.y - Math.sin(rotation) * (shape.width / 2);

            // The moving end is where the mouse is
            const movingEndX = mouseX;
            const movingEndY = mouseY;

            // Calculate new center (midpoint between fixed and moving ends)
            const newCenterX = (fixedEndX + movingEndX) / 2;
            const newCenterY = (fixedEndY + movingEndY) / 2;

            // Calculate new width (distance between the two ends)
            const newWidth = Math.sqrt(
                Math.pow(movingEndX - fixedEndX, 2) +
                Math.pow(movingEndY - fixedEndY, 2)
            );

            // Calculate new rotation (angle from fixed to moving end)
            const newRotation = Math.atan2(
                movingEndY - fixedEndY,
                movingEndX - fixedEndX
            ) * 180 / Math.PI;

            // Update shape
            shape.x = newCenterX;
            shape.y = newCenterY;
            shape.width = Math.max(50, newWidth);
            shape.rotation = newRotation;
        } else if (shape.type === 'rectangle' || shape.type === 'ellipse') {
            // For rectangles and ellipses, resize from edge midpoint or corner
            if (this.resizeCornerOffset) {
                // mouseX/mouseY from screenToBoardCoords are already in board space (unrotated)
                // so we only need the shape's rotation, not board rotation
                const rotation = (shape.rotation || 0) * Math.PI / 180;

                if (this.resizeDirection === 'corner') {
                    // Corner resize: scale both width and height from opposite corner
                    const offsetX = this.resizeCornerOffset.x;
                    const offsetY = this.resizeCornerOffset.y;

                    // Fixed corner is opposite to the dragged corner (use shape rotation)
                    const fixedCornerX = shape.x - Math.cos(rotation) * offsetX + Math.sin(rotation) * offsetY;
                    const fixedCornerY = shape.y - Math.sin(rotation) * offsetX - Math.cos(rotation) * offsetY;

                    const dx = mouseX - fixedCornerX;
                    const dy = mouseY - fixedCornerY;

                    // Use rotation for mouse projections.
                    // Clamp each axis so the dragged corner cannot cross the fixed corner.
                    // offsetX/Y give the sign that indicates which corner is being dragged.
                    const minSize = 50;
                    const rawW = dx * Math.cos(rotation) + dy * Math.sin(rotation);
                    const rawH = -dx * Math.sin(rotation) + dy * Math.cos(rotation);
                    const clampedW = offsetX > 0 ? Math.max(minSize, rawW) : Math.min(-minSize, rawW);
                    const clampedH = offsetY > 0 ? Math.max(minSize, rawH) : Math.min(-minSize, rawH);

                    const newWidth = Math.abs(clampedW);
                    const newHeight = Math.abs(clampedH);

                    const centerOffsetX = clampedW / 2;
                    const centerOffsetY = clampedH / 2;

                    // Use shape rotation for positioning
                    shape.x = fixedCornerX + Math.cos(rotation) * centerOffsetX - Math.sin(rotation) * centerOffsetY;
                    shape.y = fixedCornerY + Math.sin(rotation) * centerOffsetX + Math.cos(rotation) * centerOffsetY;
                    shape.width = newWidth;
                    shape.height = newHeight;
                } else if (this.resizeDirection === 'horizontal') {
                    // Horizontal resize: change width only
                    // Calculate which edge is fixed (opposite to the one being dragged)
                    const isRightEdge = this.resizeCornerOffset.x > 0;
                    const fixedEdgeOffset = isRightEdge ? -shape.width / 2 : shape.width / 2;

                    // Fixed edge position in world coordinates
                    const fixedEdgeX = shape.x + Math.cos(rotation) * fixedEdgeOffset;
                    const fixedEdgeY = shape.y + Math.sin(rotation) * fixedEdgeOffset;

                    // Project mouse position onto the width axis (from fixed edge)
                    // Use rotation to account for board rotation
                    const dx = mouseX - fixedEdgeX;
                    const dy = mouseY - fixedEdgeY;
                    const distanceAlongWidth = dx * Math.cos(rotation) + dy * Math.sin(rotation);

                    // Clamp: preserve direction so the dragged edge cannot cross the fixed edge.
                    // isRightEdge=true → distance must be positive (≥ min); false → negative (≤ -min).
                    const clampedWidth = isRightEdge
                        ? Math.max(50, distanceAlongWidth)
                        : Math.min(-50, distanceAlongWidth);
                    const newWidth = Math.abs(clampedWidth);
                    const centerOffset = clampedWidth / 2;

                    shape.x = fixedEdgeX + Math.cos(rotation) * centerOffset;
                    shape.y = fixedEdgeY + Math.sin(rotation) * centerOffset;
                    shape.width = newWidth;
                } else if (this.resizeDirection === 'vertical') {
                    // Vertical resize: change height only
                    // Calculate which edge is fixed (opposite to the one being dragged)
                    const isBottomEdge = this.resizeCornerOffset.y > 0;
                    const fixedEdgeOffset = isBottomEdge ? -shape.height / 2 : shape.height / 2;

                    // Fixed edge position in world coordinates
                    const fixedEdgeX = shape.x - Math.sin(rotation) * fixedEdgeOffset;
                    const fixedEdgeY = shape.y + Math.cos(rotation) * fixedEdgeOffset;

                    // Project mouse position onto the height axis (from fixed edge)
                    // Use rotation to account for board rotation
                    const dx = mouseX - fixedEdgeX;
                    const dy = mouseY - fixedEdgeY;
                    const distanceAlongHeight = -dx * Math.sin(rotation) + dy * Math.cos(rotation);

                    // Clamp: preserve direction so the dragged edge cannot cross the fixed edge.
                    // isBottomEdge=true → distance must be positive (≥ min); false → negative (≤ -min).
                    const clampedHeight = isBottomEdge
                        ? Math.max(50, distanceAlongHeight)
                        : Math.min(-50, distanceAlongHeight);
                    const newHeight = Math.abs(clampedHeight);
                    const centerOffset = clampedHeight / 2;

                    shape.x = fixedEdgeX - Math.sin(rotation) * centerOffset;
                    shape.y = fixedEdgeY + Math.cos(rotation) * centerOffset;
                    shape.height = newHeight;
                }
            }
        } else {
            // For other shapes (text, circle), use distance-based resizing
            const dx = mouseX - shape.x;
            const dy = mouseY - shape.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (this.resizeDirection === 'text') {
                // For text, use initial state to calculate smooth scale factor
                if (this.initialTextFontSize && this.initialTextHandleDistance) {
                    // Use boardToScreenCoords to correctly compute the shape center in screen
                    // space, accounting for the board's CSS rotation transform.
                    const container = document.querySelector('.board-container');
                    const containerRect = container.getBoundingClientRect();
                    const centerPos = Utils.boardToScreenCoords(shape.x, shape.y);
                    const shapeCenterScreenX = containerRect.left + centerPos.x;
                    const shapeCenterScreenY = containerRect.top  + centerPos.y;

                    const mouseDx = e.clientX - shapeCenterScreenX;
                    const mouseDy = e.clientY - shapeCenterScreenY;
                    const currentMouseDistance = Math.sqrt(mouseDx * mouseDx + mouseDy * mouseDy);

                    // Scale factor is ratio of current mouse distance to initial handle distance
                    const scaleFactor = currentMouseDistance / this.initialTextHandleDistance;

                    // Apply scale to initial font size
                    const newFontSize = Math.max(12, Math.min(500, this.initialTextFontSize * scaleFactor));

                    // Update font size and maintain proper aspect ratio (2:1)
                    shape.fontSize = newFontSize;
                    shape.width = newFontSize * 3;  // viewBox width = fontSize * 3
                    shape.height = newFontSize * 1.5; // viewBox height = fontSize * 1.5
                } else {
                    // Fallback to simple distance-based resizing if initial state not captured
                    const newFontSize = Math.max(12, Math.min(500, distance / 4));
                    shape.fontSize = newFontSize;
                    shape.width = newFontSize * 3;
                    shape.height = newFontSize * 1.5;
                }
            } else if (this.resizeDirection === 'horizontal' || this.resizeDirection === 'both') {
                shape.width = Math.max(50, distance * 2);
            }
            if (this.resizeDirection === 'vertical' || this.resizeDirection === 'both') {
                shape.height = Math.max(50, distance * 2);
            }

            // For circles, keep width and height equal
            if (shape.type === 'circle') {
                shape.height = shape.width;
            }
        }

        // Update SVG directly without full re-render.
        // Use canvas.width/height (natural pre-CSS-transform dimensions) for position
        // scale factors – getBoundingClientRect() returns post-transform visual
        // dimensions that have width/height swapped at 90°/270° board rotation.
        // Size uses referenceScale (same as createShapeSvg) so shapes scale uniformly.
        const shapeSvg = document.getElementById(shape.id);
        if (shapeSvg) {
            const posScaleX = AppState.canvas.width  / AppState.boardWidth;
            const posScaleY = AppState.canvas.height / AppState.boardHeight;
            const referenceScale = AppState.referenceScale || Math.min(posScaleX, posScaleY);

            const x      = shape.x      * posScaleX;
            const y      = shape.y      * posScaleY;
            const width  = shape.width  * referenceScale;
            const height = shape.height * referenceScale;

            // Update SVG position
            shapeSvg.style.left = x + 'px';
            shapeSvg.style.top = y + 'px';

            // Update dimensions, transform, and content based on shape type
            if (shape.type === 'line' || shape.type === 'arrow') {
                const lineH = Math.max(20 * referenceScale, 20);
                shapeSvg.setAttribute('width', width);
                shapeSvg.setAttribute('height', lineH);
                shapeSvg.setAttribute('viewBox', `-${shape.width/2} -10 ${shape.width} 20`);
                shapeSvg.style.transform = `translate(${-width/2}px, ${-lineH/2}px) rotate(${shape.rotation || 0}deg)`;
                shapeSvg.style.transformOrigin = `${width/2}px ${lineH/2}px`;

                // Update line/arrow element
                const lineElement = shapeSvg.querySelector('line');
                if (lineElement) {
                    lineElement.setAttribute('x1', -shape.width/2);
                    lineElement.setAttribute('x2', shape.width/2);
                }
            } else {
                // Use actual shape dimensions for viewBox to ensure stable coordinates
                let viewBoxWidth = shape.width;
                let viewBoxHeight = shape.height;

                // For text shapes, use a viewBox based on fontSize for proper proportions
                if (shape.type === 'text') {
                    const fontSize = shape.fontSize || 48;
                    viewBoxWidth = fontSize * 3;
                    viewBoxHeight = fontSize * 1.5;
                }

                shapeSvg.setAttribute('viewBox', `0 0 ${viewBoxWidth} ${viewBoxHeight}`);
                shapeSvg.setAttribute('width', width);
                shapeSvg.setAttribute('height', height);

                // Text rotates with the board. Additionally flip 180° if the net rotation
                // would make text read right-to-left (cos of net angle < 0).
                let svgRotation = shape.rotation || 0;
                if (shape.type === 'text') {
                    const net = ((shape.rotation || 0) + (AppState.boardRotation || 0)) * Math.PI / 180;
                    if (Math.cos(net) < 0) svgRotation += 180;
                }
                shapeSvg.style.transform = `translate(${-width/2}px, ${-height/2}px) rotate(${svgRotation}deg)`;
                shapeSvg.style.transformOrigin = `${width/2}px ${height/2}px`;

                // Update shape content elements using actual shape dimensions
                const margin = 5;
                if (shape.type === 'rectangle') {
                    // Get the visible rect (second rect element, first is transparent hit area)
                    const rectElements = shapeSvg.querySelectorAll('rect');
                    const rectElement = rectElements[1] || rectElements[0];
                    if (rectElement) {
                        rectElement.setAttribute('x', margin);
                        rectElement.setAttribute('y', margin);
                        rectElement.setAttribute('width', shape.width - (margin * 2));
                        rectElement.setAttribute('height', shape.height - (margin * 2));
                    }
                } else if (shape.type === 'ellipse') {
                    const ellipseElement = shapeSvg.querySelector('ellipse');
                    if (ellipseElement) {
                        const cx = shape.width / 2;
                        const cy = shape.height / 2;
                        const rx = (shape.width / 2) - margin;
                        const ry = (shape.height / 2) - margin;
                        ellipseElement.setAttribute('cx', cx);
                        ellipseElement.setAttribute('cy', cy);
                        ellipseElement.setAttribute('rx', rx);
                        ellipseElement.setAttribute('ry', ry);
                    }
                } else if (shape.type === 'circle') {
                    const circleElement = shapeSvg.querySelector('circle');
                    if (circleElement) {
                        const cx = shape.width / 2;
                        const cy = shape.height / 2;
                        const r = (shape.width / 2) - margin;
                        circleElement.setAttribute('cx', cx);
                        circleElement.setAttribute('cy', cy);
                        circleElement.setAttribute('r', r);
                    }
                } else if (shape.type === 'text') {
                    const textElement = shapeSvg.querySelector('text');
                    if (textElement) {
                        const fontSize = shape.fontSize || 48;
                        const cx = fontSize * 1.5;  // Half of viewBox width (fontSize * 3)
                        const cy = fontSize * 0.75;      // Half of viewBox height (fontSize * 1.5)
                        textElement.setAttribute('x', cx);
                        textElement.setAttribute('y', cy + 5);
                        textElement.setAttribute('font-size', fontSize);
                    }

                    // Update text overlay if in touch mode
                    if (document.body.classList.contains('touch-mode')) {
                        const overlay = this.layer.querySelector(`.touch-overlay[data-shape="${shape.id}"]`);
                        if (overlay && shapeSvg) {
                            try {
                                const bbox = textElement.getBBox();

                                const paddingHorizontal = 20;
                                const paddingTop = 8;
                                const paddingBottom = 10;

                                // Get fontSize-based viewBox dimensions
                                const fontSize = shape.fontSize || 48;
                                const svgViewBoxWidth = fontSize * 3;
                                const svgViewBoxHeight = fontSize * 1.5;

                                // Scale factor from viewBox to canvas coordinates (based on shape dimensions)
                                const svgScaleX = width / svgViewBoxWidth;
                                const svgScaleY = height / svgViewBoxHeight;

                                const textWidth = bbox.width * svgScaleX;
                                const textHeight = bbox.height * svgScaleY;

                                const overlayWidth = textWidth + paddingHorizontal * 2;
                                const overlayHeight = textHeight + paddingTop + paddingBottom;

                                overlay.style.width = overlayWidth + 'px';
                                overlay.style.height = overlayHeight + 'px';

                                // Calculate offset using SVG coordinates
                                const textTopInViewBox = bbox.y;
                                const textTopInCanvas = textTopInViewBox * svgScaleY;
                                const svgCenterInCanvas = height / 2;
                                // Position overlay top at textTop - paddingTop for proper padding
                                const overlayCenter = textTopInCanvas - paddingTop + overlayHeight / 2;
                                const overlayYOffset = overlayCenter - svgCenterInCanvas;

                                overlay.style.left = x + 'px';
                                overlay.style.top = (y + overlayYOffset) + 'px';
                                overlay.style.transform = `translate(${-overlayWidth/2}px, ${-overlayHeight/2}px) rotate(${shape.rotation || 0}deg)`;
                                overlay.style.transformOrigin = `${overlayWidth/2}px ${overlayHeight/2}px`;
                            } catch (e) {
                                // Ignore errors during resize
                            }
                        }
                    }
                }
            }

            // Update touch overlay for non-text shapes (text overlay is updated above)
            if (document.body.classList.contains('touch-mode') && shape.type !== 'text') {
                const overlay = this.layer.querySelector(`.touch-overlay[data-shape="${shape.id}"]`);
                if (overlay) {
                    const canvasRect = AppState.canvas.getBoundingClientRect();
                    const pixelScaleX = canvasRect.width / AppState.boardWidth;
                    const pixelScaleY = canvasRect.height / AppState.boardHeight;

                    const x = shape.x * pixelScaleX;
                    const y = shape.y * pixelScaleY;
                    let width = shape.width * pixelScaleX;
                    let height = shape.height * pixelScaleY;

                    // For lines/arrows, use the visual height with minimum touch area
                    if (shape.type === 'line' || shape.type === 'arrow') {
                        height = Math.max(20, 20 * pixelScaleY);
                    } else {
                        // For rectangles, circles, ellipses: add tolerance padding
                        const tolerancePadding = 28;
                        width += tolerancePadding;
                        height += tolerancePadding;
                    }

                    overlay.style.left = x + 'px';
                    overlay.style.top = y + 'px';
                    overlay.style.width = width + 'px';
                    overlay.style.height = height + 'px';
                    overlay.style.transform = `translate(${-width/2}px, ${-height/2}px) rotate(${shape.rotation || 0}deg)`;
                    overlay.style.transformOrigin = `${width/2}px ${height/2}px`;
                }
            }
        }

        // Update debug box during resize
        if (typeof Utils !== 'undefined' && AppState.selectedShape) {
            const shape = AppState.getShape(AppState.selectedShape);
            if (shape) {
                Utils.updateDebugBox(shape.id, 'shape');
            }
        }

        // Update handles position
        this.updateHandlesPosition();
    },

    // Update rotation and resize handles
    // Update handles position (lightweight - just moves them, doesn't recreate)
    updateHandlesPosition() {
        if (!AppState.selectedShape) return;

        const shape = AppState.getShape(AppState.selectedShape);
        if (!shape) return;

        const canvasWidth = AppState.canvas.width;
        const canvasHeight = AppState.canvas.height;
        const posScaleX = canvasWidth / AppState.boardWidth;
        const posScaleY = canvasHeight / AppState.boardHeight;
        const positionScale = Math.min(posScaleX, posScaleY);

        const referenceScale = AppState.referenceScale || positionScale;
        const scaleX = referenceScale;
        const scaleY = referenceScale;

        // Convert shape center from board to canvas (pre-CSS-transform) coordinates.
        // Board.boardToScreen uses separate X/Y scales, so it is correct at any board rotation.
        const boardCenter = Board.boardToScreen(shape.x, shape.y);
        const centerX = boardCenter.x;
        const centerY = boardCenter.y;

        // Update rotation handle if it exists
        if (this.rotationHandle) {
            const centerPos = boardCenter;

            const handleDistance = ((shape.height || 0) / 2 * scaleY + 50) / (AppState.boardRotationScaleFactor || 1);
            const rotation = (shape.rotation || 0) * Math.PI / 180;

            // For text: flip handle offset by π if net rotation is right-to-left.
            const boardRotRad = (AppState.boardRotation || 0) * Math.PI / 180;
            const netRad = rotation + boardRotRad;
            const textFlip = (shape.type === 'text' && Math.cos(netRad) < 0) ? Math.PI : 0;
            const rotHandleAngle = (rotation - Math.PI / 2) + textFlip;

            const handleX = centerPos.x + Math.cos(rotHandleAngle) * handleDistance;
            const handleY = centerPos.y + Math.sin(rotHandleAngle) * handleDistance;

            const handleSize = 28;
            this.rotationHandle.style.left = (handleX - handleSize / 2) + 'px';
            this.rotationHandle.style.top = (handleY - handleSize / 2) + 'px';
        }

        // Update resize handles if they exist
        if (this.resizeHandles.length > 0) {
            const rotation = (shape.rotation || 0) * Math.PI / 180;

            // After 90° or 270° board rotation, visual dimensions are swapped
            const boardRotDeg = AppState.boardRotation || 0;
            let widthHalf, heightHalf;
            if (boardRotDeg === 90 || boardRotDeg === 270) {
                // Swap: visual width comes from shape height, visual height from shape width
                widthHalf = (shape.height / 2) * scaleY;
                heightHalf = (shape.width / 2) * scaleX;
            } else {
                widthHalf = (shape.width / 2) * scaleX;
                heightHalf = (shape.height / 2) * scaleY;
            }

            const handleSize = Math.max(15 * scaleX, 10);

            // Inverse board rotation so offsets counteract the CSS transform on board-area
            const boardRotation = -(AppState.boardRotation || 0) * Math.PI / 180;

            if (shape.type === 'line' || shape.type === 'arrow') {
                // Right handle only — at the arrowhead end.
                // No inverse-board-rotation compensation: both the SVG and the handle live
                // inside board-area and are subject to the same CSS transform.
                if (this.resizeHandles[0]) {
                    const lineHalf = (shape.width / 2) * scaleX;
                    const offsetX = Math.cos(rotation) * lineHalf;
                    const offsetY = Math.sin(rotation) * lineHalf;

                    const rightX = centerX + offsetX;
                    const rightY = centerY + offsetY;
                    this.resizeHandles[0].style.left = (rightX - handleSize / 2) + 'px';
                    this.resizeHandles[0].style.top = (rightY - handleSize / 2) + 'px';
                    this.resizeHandles[0].style.cursor = this.resizeCursorForAngle(offsetX, offsetY);
                }
            } else if (shape.type === 'circle') {
                // Single handle for circle
                if (this.resizeHandles[0]) {
                    let offsetX = Math.cos(rotation) * widthHalf;
                    let offsetY = Math.sin(rotation) * widthHalf;

                    // Apply inverse board rotation to counter the CSS transform
                    if (boardRotation !== 0) {
                        const rotatedOffsetX = offsetX * Math.cos(boardRotation) - offsetY * Math.sin(boardRotation);
                        const rotatedOffsetY = offsetX * Math.sin(boardRotation) + offsetY * Math.cos(boardRotation);
                        offsetX = rotatedOffsetX;
                        offsetY = rotatedOffsetY;
                    }

                    const rightX = centerX + offsetX;
                    const rightY = centerY + offsetY;
                    this.resizeHandles[0].style.left = (rightX - handleSize / 2) + 'px';
                    this.resizeHandles[0].style.top = (rightY - handleSize / 2) + 'px';
                    this.resizeHandles[0].style.cursor = this.resizeCursorForAngle(offsetX, offsetY);
                }
            } else if (shape.type === 'text') {
                // Text handle: position at right side of text, vertically centered
                if (this.resizeHandles[0]) {
                    const svg = this.shapeSvgs[shape.id];

                    // The handle follows text. Flip 180° if net rotation is right-to-left.
                    const netRotDeg = (shape.rotation || 0) + (AppState.boardRotation || 0);
                    const shouldFlip = Math.cos(netRotDeg * Math.PI / 180) < 0;
                    const totalRotDeg = (shape.rotation || 0) + (shouldFlip ? 180 : 0);
                    const totalRot = totalRotDeg * Math.PI / 180;
                    const cosR = Math.cos(totalRot);
                    const sinR = Math.sin(totalRot);

                    // Default fallback: right edge of shape bounding box
                    let rawOffX = widthHalf;
                    let rawOffY = 0;

                    if (svg) {
                        const textElement = svg.querySelector('text');
                        if (textElement) {
                            try {
                                const bbox = textElement.getBBox();

                                // getBBox() may return a zero-size rect immediately after DOM
                                // insertion.  Guard against this so the fallback widthHalf is used.
                                if (bbox.width > 0) {
                                    // Get SVG viewBox dimensions
                                    const svgViewBox = svg.getAttribute('viewBox').split(' ');
                                    const svgViewBoxWidth = parseFloat(svgViewBox[2]);
                                    const svgViewBoxHeight = parseFloat(svgViewBox[3]);

                                    // Scale factor from viewBox to canvas
                                    const width = shape.width * scaleX;
                                    const height = shape.height * scaleY;
                                    const svgScaleX = width / svgViewBoxWidth;
                                    const svgScaleY = height / svgViewBoxHeight;

                                    // Right-center point offset from SVG center (in viewBox coords → canvas pixels)
                                    rawOffX = (bbox.x + bbox.width - svgViewBoxWidth / 2) * svgScaleX;
                                    rawOffY = (bbox.y + bbox.height / 2 - svgViewBoxHeight / 2) * svgScaleY;
                                }
                            } catch (e) {
                                // Fallback to shape.width
                            }
                        }
                    }

                    const offsetX = rawOffX * cosR - rawOffY * sinR;
                    const offsetY = rawOffX * sinR + rawOffY * cosR;

                    const rightX = centerX + offsetX;
                    const rightY = centerY + offsetY;
                    this.resizeHandles[0].style.left = (rightX - handleSize / 2) + 'px';
                    this.resizeHandles[0].style.top = (rightY - handleSize / 2) + 'px';
                    this.resizeHandles[0].style.cursor = this.resizeCursorForAngle(offsetX, offsetY);
                }
            } else {
                // Rectangle and ellipse: 4 edge handles only (2 horizontal, 2 vertical)
                // After inverse rotation, vertical handles swap: +height becomes -Y (top), -height becomes +Y (bottom)
                const allHandlePositions = [
                    { x: widthHalf, y: 0 },
                    { x: -widthHalf, y: 0 },
                    { x: 0, y: -heightHalf },  // Top (negative Y)
                    { x: 0, y: heightHalf }     // Bottom (positive Y)
                ];

                allHandlePositions.forEach((pos, i) => {
                    if (this.resizeHandles[i]) {
                        let offsetX = Math.cos(rotation) * pos.x - Math.sin(rotation) * pos.y;
                        let offsetY = Math.sin(rotation) * pos.x + Math.cos(rotation) * pos.y;

                        // Apply inverse board rotation to counter the CSS transform
                        if (boardRotation !== 0) {
                            const rotatedOffsetX = offsetX * Math.cos(boardRotation) - offsetY * Math.sin(boardRotation);
                            const rotatedOffsetY = offsetX * Math.sin(boardRotation) + offsetY * Math.cos(boardRotation);
                            offsetX = rotatedOffsetX;
                            offsetY = rotatedOffsetY;
                        }

                        const hx = centerX + offsetX;
                        const hy = centerY + offsetY;
                        this.resizeHandles[i].style.left = (hx - handleSize / 2) + 'px';
                        this.resizeHandles[i].style.top = (hy - handleSize / 2) + 'px';
                        this.resizeHandles[i].style.cursor = this.resizeCursorForAngle(offsetX, offsetY);
                    }
                });
            }
        }
    },

    updateHandles() {
        // Remove existing handles
        if (this.rotationHandle) {
            this.rotationHandle.remove();
            this.rotationHandle = null;
        }
        this.resizeHandles.forEach(handle => handle.remove());
        this.resizeHandles = [];

        // Resize handles are fully tracked in this.resizeHandles array above; no orphan cleanup needed.

        // Only show handles if a shape is selected
        if (AppState.selectedShape && AppState.currentTool === 'select') {
            const shape = AppState.getShape(AppState.selectedShape);
            if (!shape) return;

            // Don't show handles for locked shapes in child boards
            if (shape.locked) {
                return;
            }

            // Convert shape center from board to canvas coordinates
            const centerPos = Board.boardToScreen(shape.x, shape.y);
            const centerX = centerPos.x;
            const centerY = centerPos.y;

            // Rotation handle - use referenceScale for consistent sizing
            const referenceScale = AppState.referenceScale;
            const handleDistance = ((shape.height || 0) / 2 * referenceScale + 50) / (AppState.boardRotationScaleFactor || 1);
            const rotation = (shape.rotation || 0) * Math.PI / 180;

            // For text: flip rotation handle by π if net rotation is right-to-left.
            const boardRotRad = (AppState.boardRotation || 0) * Math.PI / 180;
            const netRad2 = rotation + boardRotRad;
            const textFlip2 = (shape.type === 'text' && Math.cos(netRad2) < 0) ? Math.PI : 0;
            const rotHandleAngle = (rotation - Math.PI / 2) + textFlip2;

            const offsetX = Math.cos(rotHandleAngle) * handleDistance;
            const offsetY = Math.sin(rotHandleAngle) * handleDistance;

            const handleX = centerX + offsetX;
            const handleY = centerY + offsetY;

            const handleSize = 28;

            this.rotationHandle = document.createElement('div');
            this.rotationHandle.className = 'rotation-handle';
            this.rotationHandle.style.width = handleSize + 'px';
            this.rotationHandle.style.height = handleSize + 'px';

            // Position handle in canvas coordinates - will be rotated by board-area transform
            this.rotationHandle.style.left = (handleX - handleSize / 2) + 'px';
            this.rotationHandle.style.top = (handleY - handleSize / 2) + 'px';

            this.rotationHandle.addEventListener('mousedown', (e) => {
                e.preventDefault();
                e.stopPropagation();
                // Clear any drag state to prevent interference
                AppState.draggedShape = null;
                AppState.dragOffset = null;
                this.isRotating = true;

                // Record the starting angle (center → mouse in board coords) and
                // current shape rotation so handleRotationMove can apply a delta
                // instead of an absolute angle – this prevents the shape jumping.
                const s = AppState.getShape(AppState.selectedShape);
                if (s) {
                    const startPos = Utils.screenToBoardCoords(e.clientX, e.clientY);
                    this.rotationDragInitialAngle = Math.atan2(startPos.y - s.y, startPos.x - s.x);
                    this.rotationDragInitialShapeRotation = s.rotation || 0;
                }

                AppState.updatePositionDisplay(shape.x, shape.y, shape, 'shape');
            });

            // Append to board-area (same as players and elements) so it rotates with the board transform
            this.layer.appendChild(this.rotationHandle);

            // Resize handles
            this.createResizeHandles(shape, centerX, centerY, referenceScale, referenceScale);

            // getBBox() on text SVGs returns zero immediately after DOM insertion.
            // Schedule a second updateHandlesPosition() so the text handle is
            // repositioned once the browser has laid out the SVG content.
            if (shape.type === 'text') {
                requestAnimationFrame(() => this.updateHandlesPosition());
            }
        }
    },

    // Create resize handles
    createResizeHandles(shape, centerX, centerY, scaleX, scaleY) {
        const handleSize = Math.max(15 * scaleX, 10);

        // After 90° or 270° board rotation, visual dimensions are swapped
        // so we need to swap width/height scales
        const boardRotDeg = AppState.boardRotation || 0;
        let widthHalf, heightHalf;
        if (boardRotDeg === 90 || boardRotDeg === 270) {
            // Swap: visual width comes from shape height, visual height from shape width
            widthHalf = (shape.height / 2) * scaleY;
            heightHalf = (shape.width / 2) * scaleX;
        } else {
            widthHalf = (shape.width / 2) * scaleX;
            heightHalf = (shape.height / 2) * scaleY;
        }

        const rotation = (shape.rotation || 0) * Math.PI / 180;
        // Apply inverse board rotation to counter the CSS transform
        const boardRotation = -(AppState.boardRotation || 0) * Math.PI / 180;

        // For lines and arrows, only horizontal resize.
        // Lines have no shape.height, so the dimension-swap at 90°/270° (widthHalf = shape.height/2)
        // yields NaN.  Always use shape.width/2 (the actual half-length) here.
        if (shape.type === 'line' || shape.type === 'arrow') {
            // Right handle — at the arrow-head end (positive side of the shape's own rotation).
            // Both the SVG element and this handle live inside board-area, which inherits the
            // same CSS transform from players-layer.  No inverse-board-rotation compensation
            // is needed: the canvas-space offset places the handle at the arrowhead regardless
            // of board rotation, because both are subject to the same CSS transform.
            const lineHalf = (shape.width / 2) * scaleX;
            const offsetX = Math.cos(rotation) * lineHalf;
            const offsetY = Math.sin(rotation) * lineHalf;

            const rightX = centerX + offsetX;
            const rightY = centerY + offsetY;

            const rightHandle = this.createResizeHandle(
                rightX, rightY, handleSize, 'horizontal', null,
                this.resizeCursorForAngle(offsetX, offsetY));
            this.resizeHandles.push(rightHandle);
            this.layer.appendChild(rightHandle);
        } else if (shape.type === 'circle') {
            // Circle: one handle for uniform scaling
            let offsetX = Math.cos(rotation) * widthHalf;
            let offsetY = Math.sin(rotation) * widthHalf;

            // Apply inverse board rotation to counter the CSS transform
            if (boardRotation !== 0) {
                const rotatedOffsetX = offsetX * Math.cos(boardRotation) - offsetY * Math.sin(boardRotation);
                const rotatedOffsetY = offsetX * Math.sin(boardRotation) + offsetY * Math.cos(boardRotation);
                offsetX = rotatedOffsetX;
                offsetY = rotatedOffsetY;
            }

            const rightX = centerX + offsetX;
            const rightY = centerY + offsetY;

            const handle = this.createResizeHandle(
                rightX, rightY, handleSize, 'both', null,
                this.resizeCursorForAngle(offsetX, offsetY));
            this.resizeHandles.push(handle);
            this.layer.appendChild(handle);
        } else if (shape.type === 'text') {
            // Text: one handle for font size scaling at right side of text.
            // Handle follows text. Flip 180° if net rotation is right-to-left.
            const svg = this.shapeSvgs[shape.id];

            const netRotDeg2 = (shape.rotation || 0) + (AppState.boardRotation || 0);
            const shouldFlip2 = Math.cos(netRotDeg2 * Math.PI / 180) < 0;
            const totalRotDeg = (shape.rotation || 0) + (shouldFlip2 ? 180 : 0);
            const totalRot = totalRotDeg * Math.PI / 180;
            const cosR = Math.cos(totalRot);
            const sinR = Math.sin(totalRot);

            let rawOffX = widthHalf;
            let rawOffY = 0;

            if (svg) {
                const textElement = svg.querySelector('text');
                if (textElement) {
                    try {
                        const bbox = textElement.getBBox();

                        // getBBox() may return a zero-size rect if the SVG hasn't been
                        // laid out by the browser yet (e.g. immediately after DOM insertion).
                        // Guard against this so the fallback widthHalf is used instead.
                        if (bbox.width > 0) {
                            // Get SVG viewBox dimensions
                            const svgViewBox = svg.getAttribute('viewBox').split(' ');
                            const svgViewBoxWidth = parseFloat(svgViewBox[2]);
                            const svgViewBoxHeight = parseFloat(svgViewBox[3]);

                            // Scale factor from viewBox to canvas
                            const width = shape.width * scaleX;
                            const height = shape.height * scaleY;
                            const svgScaleX = width / svgViewBoxWidth;
                            const svgScaleY = height / svgViewBoxHeight;

                            // Right-center point offset from SVG center (in viewBox coords → canvas pixels)
                            rawOffX = (bbox.x + bbox.width - svgViewBoxWidth / 2) * svgScaleX;
                            rawOffY = (bbox.y + bbox.height / 2 - svgViewBoxHeight / 2) * svgScaleY;
                        }
                    } catch (e) {
                        // Fallback to shape.width
                    }
                }
            }

            const offsetX = rawOffX * cosR - rawOffY * sinR;
            const offsetY = rawOffX * sinR + rawOffY * cosR;

            // NO additional board rotation compensation needed since handles are inside
            // board-area which is already CSS-rotated
            const rightX = centerX + offsetX;
            const rightY = centerY + offsetY;

            const handle = this.createResizeHandle(
                rightX, rightY, handleSize, 'text', null,
                this.resizeCursorForAngle(offsetX, offsetY));
            this.resizeHandles.push(handle);
            this.layer.appendChild(handle);
        } else {
            // Rectangle and ellipse: 4 edge midpoint handles only (2 horizontal, 2 vertical)
            // After inverse rotation, vertical handles swap: +height becomes -Y (top), -height becomes +Y (bottom)
            // At 90°/270° rotation, the visual edges map to different board-space edges:
            // - Visual horizontal edges (x=±widthHalf) map to vertical board edges (offsetY=±height/2)
            // - Visual vertical edges (y=±heightHalf) map to horizontal board edges (offsetX=±width/2)
            // At 90°/270° rotation, the visual edges map to different board-space edges
            // We need to explicitly set the board-space offset and direction for each handle
            let edgeConfigs;
            if (boardRotDeg === 90) {
                // At 90° clockwise rotation with rotation fix:
                // Vertical resize handles need offsetY flipped from the geometric mapping
                // Horizontal resize handles use the correct geometric mapping
                edgeConfigs = [
                    { visualX: widthHalf, visualY: 0, boardOffsetX: 0, boardOffsetY: -shape.height / 2, dir: 'vertical' },
                    { visualX: -widthHalf, visualY: 0, boardOffsetX: 0, boardOffsetY: shape.height / 2, dir: 'vertical' },
                    { visualX: 0, visualY: -heightHalf, boardOffsetX: -shape.width / 2, boardOffsetY: 0, dir: 'horizontal' },
                    { visualX: 0, visualY: heightHalf, boardOffsetX: shape.width / 2, boardOffsetY: 0, dir: 'horizontal' }
                ];
            } else if (boardRotDeg === 270) {
                // At 270° clockwise rotation (90° counter-clockwise):
                // Visual right → Board top (offsetY=-height/2, vertical resize)
                // Visual left → Board bottom (offsetY=+height/2, vertical resize)
                // Visual top → Board left (offsetX=-width/2, horizontal resize)
                // Visual bottom → Board right (offsetX=+width/2, horizontal resize)
                edgeConfigs = [
                    { visualX: widthHalf, visualY: 0, boardOffsetX: 0, boardOffsetY: -shape.height / 2, dir: 'vertical' },
                    { visualX: -widthHalf, visualY: 0, boardOffsetX: 0, boardOffsetY: shape.height / 2, dir: 'vertical' },
                    { visualX: 0, visualY: -heightHalf, boardOffsetX: -shape.width / 2, boardOffsetY: 0, dir: 'horizontal' },
                    { visualX: 0, visualY: heightHalf, boardOffsetX: shape.width / 2, boardOffsetY: 0, dir: 'horizontal' }
                ];
            } else if (boardRotDeg === 180) {
                // At 180° the board is flipped: visual right = board left, visual top = board bottom.
                // Negate all boardOffset values so the correct (opposite) edge stays fixed.
                edgeConfigs = [
                    { visualX: widthHalf, visualY: 0, boardOffsetX: -shape.width / 2, boardOffsetY: 0, dir: 'horizontal' },
                    { visualX: -widthHalf, visualY: 0, boardOffsetX: shape.width / 2, boardOffsetY: 0, dir: 'horizontal' },
                    { visualX: 0, visualY: -heightHalf, boardOffsetX: 0, boardOffsetY: shape.height / 2, dir: 'vertical' },
                    { visualX: 0, visualY: heightHalf, boardOffsetX: 0, boardOffsetY: -shape.height / 2, dir: 'vertical' }
                ];
            } else {
                // 0°: visual edges = board edges
                edgeConfigs = [
                    { visualX: widthHalf, visualY: 0, boardOffsetX: shape.width / 2, boardOffsetY: 0, dir: 'horizontal' },
                    { visualX: -widthHalf, visualY: 0, boardOffsetX: -shape.width / 2, boardOffsetY: 0, dir: 'horizontal' },
                    { visualX: 0, visualY: -heightHalf, boardOffsetX: 0, boardOffsetY: -shape.height / 2, dir: 'vertical' },
                    { visualX: 0, visualY: heightHalf, boardOffsetX: 0, boardOffsetY: shape.height / 2, dir: 'vertical' }
                ];
            }

            edgeConfigs.forEach(config => {
                // Step 1: Rotate by shape rotation
                let offsetX = Math.cos(rotation) * config.visualX - Math.sin(rotation) * config.visualY;
                let offsetY = Math.sin(rotation) * config.visualX + Math.cos(rotation) * config.visualY;

                // Step 2: Apply inverse board rotation for visual positioning
                if (boardRotation !== 0) {
                    const rotatedOffsetX = offsetX * Math.cos(boardRotation) - offsetY * Math.sin(boardRotation);
                    const rotatedOffsetY = offsetX * Math.sin(boardRotation) + offsetY * Math.cos(boardRotation);
                    offsetX = rotatedOffsetX;
                    offsetY = rotatedOffsetY;
                }

                const edgeX = centerX + offsetX;
                const edgeY = centerY + offsetY;

                const handle = this.createResizeHandle(edgeX, edgeY, handleSize, config.dir,
                    { x: config.boardOffsetX, y: config.boardOffsetY },
                    this.resizeCursorForAngle(offsetX, offsetY));
                this.resizeHandles.push(handle);
                this.layer.appendChild(handle);
            });
        }
    },

    // Map a visual offset (dx, dy) from the shape centre to a CSS resize cursor.
    // Cursors are bidirectional, so we normalise the angle to [0°, 180°).
    resizeCursorForAngle(dx, dy) {
        let deg = Math.atan2(dy, dx) * 180 / Math.PI;
        deg = ((deg % 180) + 180) % 180; // normalise to [0, 180)
        if (deg < 22.5 || deg >= 157.5) return 'ew-resize';
        if (deg < 67.5)  return 'nwse-resize';
        if (deg < 112.5) return 'ns-resize';
        return 'nesw-resize';
    },

    // Create a single resize handle
    createResizeHandle(x, y, size, direction, cornerOffset, cursor = 'nwse-resize') {
        const handle = document.createElement('div');
        handle.className = 'resize-handle';
        handle.style.position = 'absolute';
        handle.style.width = size + 'px';
        handle.style.height = size + 'px';
        handle.style.left = (x - size / 2) + 'px';
        handle.style.top = (y - size / 2) + 'px';
        handle.style.background = '#3498db';
        handle.style.border = '2px solid white';
        handle.style.borderRadius = '3px';
        handle.style.cursor = cursor;
        handle.style.zIndex = '1001';
        handle.style.pointerEvents = 'all';
        handle.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.4)';
        handle.style.touchAction = 'none';

        handle.addEventListener('mousedown', (e) => {
            e.preventDefault();
            e.stopPropagation();
            // Clear any drag state to prevent interference
            AppState.draggedShape = null;
            AppState.dragOffset = null;
            this.isResizing = true;
            this.resizeDirection = direction;
            this.resizeCornerOffset = cornerOffset || null;

            // For text resize, capture initial state to prevent jumps
            if (direction === 'text' && AppState.selectedShape) {
                const shape = AppState.getShape(AppState.selectedShape);
                if (shape && shape.type === 'text') {
                    // Store initial font size
                    this.initialTextFontSize = shape.fontSize || 48;

                    // Calculate initial handle distance from the shape center in screen
                    // space.  Use boardToScreenCoords so the center is correct even when
                    // the board is rotated (getBoundingClientRect() returns post-transform
                    // visual dimensions that are swapped at 90°/270° rotation).
                    const container = document.querySelector('.board-container');
                    const containerRect = container.getBoundingClientRect();
                    const centerPos = Utils.boardToScreenCoords(shape.x, shape.y);
                    const shapeCenterX = containerRect.left + centerPos.x;
                    const shapeCenterY = containerRect.top  + centerPos.y;

                    const handleRect = e.target.getBoundingClientRect();
                    const handleCenterX = handleRect.left + handleRect.width  / 2;
                    const handleCenterY = handleRect.top  + handleRect.height / 2;

                    const dx = handleCenterX - shapeCenterX;
                    const dy = handleCenterY - shapeCenterY;
                    this.initialTextHandleDistance = Math.sqrt(dx * dx + dy * dy);
                }
            }
        });

        return handle;
    },

    // Setup context menu
    setupContextMenu() {
        // Menu handling is done in showContextMenu
    },

    // Show context menu
    showContextMenu(x, y, shape) {
        // Set menu open time for Elements module's mouseup handler
        if (typeof Elements !== 'undefined') {
            Elements.menuOpenTime = Date.now();
            Elements.menuVisible = true;
        }

        this.contextMenuShape = shape;
        const menu = document.getElementById('element-context-menu');

        // Clear other contexts
        if (typeof Elements !== 'undefined') {
            Elements.contextMenuElement = null;
        }
        if (typeof Players !== 'undefined') {
            Players.contextMenuPlayer = null;
        }
        if (typeof Balls !== 'undefined') {
            Balls.contextMenuBall = null;
        }
        if (typeof Plates !== 'undefined') {
            Plates.contextMenuPlate = null;
        }

        // Remove custom menu items added by other modules before cloning
        const customItems = menu.querySelectorAll('[data-action="name"], [data-action="number"], [data-action="reset"]');
        customItems.forEach(item => item.remove());

        // Clone menu first for modifications
        const menuCopy = menu.cloneNode(true);
        menu.parentNode.replaceChild(menuCopy, menu);

        // Remove hidden class first (but don't position yet - need to add items first)
        menuCopy.classList.remove('hidden');
        menuCopy.style.display = '';

        // Show lock menu item and set text based on current state
        const lockItem = menuCopy.querySelector('[data-action="lock"]');
        if (lockItem) {
            lockItem.style.display = '';
            // Update lock item text based on locked state
            const isLocked = shape.locked;
            const lockText = isLocked ? 'Unlock' : 'Lock';
            const lockIcon = lockItem.querySelector('svg');
            lockItem.innerHTML = `
                ${lockIcon ? lockIcon.outerHTML : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>'}
                ${lockText}
            `;

            // Unlock is always enabled when shape is locked
            // (no need to disable it anywhere)
        }

        // Add "Set Text" menu item for text and ellipse shapes
        if ((shape.type === 'text' || shape.type === 'ellipse') && !menuCopy.querySelector('[data-action="edit-text"]')) {
            const colorItem = menuCopy.querySelector('[data-action="color"]');
            if (colorItem) {
                const editTextItem = document.createElement('div');
                editTextItem.className = 'context-menu-item';
                editTextItem.dataset.action = 'edit-text';
                editTextItem.innerHTML = `
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                    Set Text
                `;
                colorItem.parentNode.insertBefore(editTextItem, colorItem.nextSibling);
            }
        }

        // Add "Set Size" menu item after "Set Position"
        if (!menuCopy.querySelector('[data-action="size"]')) {
            const positionItem = menuCopy.querySelector('[data-action="position"]');
            if (positionItem) {
                const sizeItem = document.createElement('div');
                sizeItem.className = 'context-menu-item';
                sizeItem.dataset.action = 'size';
                sizeItem.innerHTML = `
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 16V8a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2z"></path>
                    </svg>
                    Set Size
                `;
                positionItem.parentNode.insertBefore(sizeItem, positionItem.nextSibling);
            }
        }

        // Add "Reset to Parent" menu item for child boards
        const isChildBoard = AppState.isChildBoard();
        if (isChildBoard && AppState.parentShapePositions[shape.id]) {
            const positionItem = menuCopy.querySelector('[data-action="position"]');
            if (positionItem && !menuCopy.querySelector('[data-action="reset"]')) {
                const resetItem = document.createElement('div');
                resetItem.className = 'context-menu-item';
                resetItem.dataset.action = 'reset';
                resetItem.innerHTML = `
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="1 4 1 10 7 10"/>
                        <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
                    </svg>
                    Reset to Parent
                `;
                positionItem.parentNode.insertBefore(resetItem, positionItem.nextSibling);
            }
        }

        // Disable menu items based on shape state
        const menuItems = menuCopy.querySelectorAll('.context-menu-item');
        menuItems.forEach(item => {
            const action = item.dataset.action;
            if (shape.locked) {
                // Locked shapes - disable all except unlock
                if (action !== 'lock') {
                    item.classList.add('disabled');
                }
            } else if (action === 'reset') {
                // Disable reset if shape hasn't changed from parent
                const parentShape = AppState.parentShapePositions[shape.id];
                const isUnmodified = parentShape &&
                                     shape.x === parentShape.x &&
                                     shape.y === parentShape.y &&
                                     shape.width === parentShape.width &&
                                     shape.height === parentShape.height &&
                                     (shape.rotation || 0) === (parentShape.rotation || 0) &&
                                     shape.color === parentShape.color &&
                                     shape.fillColor === parentShape.fillColor &&
                                     shape.text === parentShape.text &&
                                     shape.fontSize === parentShape.fontSize;
                if (isUnmodified) {
                    item.classList.add('disabled');
                } else {
                    item.classList.remove('disabled');
                }
            } else {
                // Unlocked shapes (including inherited) - all items enabled
                item.classList.remove('disabled');
            }
        });

        // Position menu AFTER all items have been added to ensure correct height calculation
        Utils.positionContextMenu(menuCopy, x, y);

        menuCopy.addEventListener('click', (e) => {
            const item = e.target.closest('.context-menu-item');
            if (!item || !this.contextMenuShape) return;

            // Always hide menu first, even if item is disabled
            menuCopy.classList.add('hidden');
            menuCopy.style.display = 'none';
            const shape = this.contextMenuShape;
            this.contextMenuShape = null;

            if (typeof Elements !== 'undefined') {
                Elements.setupContextMenu();
            }

            if (item.classList.contains('disabled')) {
                return;
            }

            const action = item.dataset.action;

            switch (action) {
                case 'remove':
                    // Can't remove locked shapes
                    if (shape.locked) return;
                    // Explicitly remove handles first
                    if (this.rotationHandle) {
                        this.rotationHandle.remove();
                        this.rotationHandle = null;
                    }
                    this.resizeHandles.forEach(handle => handle.remove());
                    this.resizeHandles = [];
                    // Then clear selection
                    AppState.selectedShape = null;
                    AppState.hidePositionDisplay();
                    AppState.removeShape(shape.id);
                    this.render();
                    break;
                case 'position':
                    // Make inherited shape local when changing position
                    if (shape.inherited) {
                        shape.inherited = false;
                    }
                    this.showPositionDialog(shape);
                    break;
                case 'size':
                    // Make inherited shape local when changing size
                    if (shape.inherited) {
                        shape.inherited = false;
                    }
                    this.showSizeDialog(shape);
                    break;
                case 'color':
                    // Make inherited shape local when changing color
                    if (shape.inherited) {
                        shape.inherited = false;
                    }
                    this.showColorDialog(shape);
                    break;
                case 'edit-text':
                    // Make inherited shape local when changing text
                    if (shape.inherited) {
                        shape.inherited = false;
                    }
                    this.showTextDialog(shape);
                    break;
                case 'lock':
                    // Toggle lock state
                    shape.locked = !shape.locked;
                    AppState.saveToLocalStorage();
                    this.render();
                    break;
                case 'reset':
                    this.resetToParent(shape);
                    break;
            }
        });

        // Hide menu when clicking outside
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

    // Show color dialog
    showColorDialog(shape) {
        this.contextMenuShape = shape;

        const currentColor = shape.color || '#3498db';
        document.getElementById('shape-color-input').value = currentColor;

        const confirmBtn = document.getElementById('btn-color-modal-ok');
        const newConfirmBtn = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);

        const cancelBtn = document.getElementById('btn-color-modal-cancel');
        const newCancelBtn = cancelBtn.cloneNode(true);
        cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);

        newConfirmBtn.addEventListener('click', () => {
            const color = document.getElementById('shape-color-input').value;

            // Make inherited shape local when changing color
            if (shape.inherited) {
                shape.inherited = false;
            }

            shape.color = color;

            // Update fill color with transparency
            if (shape.type === 'rectangle' || shape.type === 'circle' || shape.type === 'ellipse') {
                const r = parseInt(color.substr(1, 2), 16);
                const g = parseInt(color.substr(3, 2), 16);
                const b = parseInt(color.substr(5, 2), 16);
                shape.fillColor = `rgba(${r}, ${g}, ${b}, 0.3)`;
            }

            AppState.saveToLocalStorage();
            this.render();

            document.getElementById('color-modal').classList.add('hidden');

            if (typeof Elements !== 'undefined') {
                Elements.setupContextMenu();
            }
        });

        newCancelBtn.addEventListener('click', () => {
            document.getElementById('color-modal').classList.add('hidden');
        });

        Utils.openModal('color-modal');
    },

    // Show position dialog
    showPositionDialog(shape) {
        this.contextMenuShape = shape;

        // Hide rotation handle while modal is open
        if (this.rotationHandle) {
            this.rotationHandle.style.display = 'none';
        }

        document.getElementById('position-modal-x').value = Math.round(shape.x);
        document.getElementById('position-modal-y').value = Math.round(shape.y);
        document.getElementById('position-modal-rotation').value = Math.round(shape.rotation || 0);

        // Store initial values for rounding logic
        if (typeof Elements !== 'undefined') {
            Elements.positionInitialValues = {
                'shape-x': Math.round(shape.x),
                'shape-y': Math.round(shape.y),
                'shape-rotation': Math.round(shape.rotation || 0),
                x: null,
                y: null,
                rotation: null
            };
        }

        const confirmBtn = document.getElementById('btn-position-modal-ok');
        const newConfirmBtn = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);

        const cancelBtn = document.getElementById('btn-position-modal-cancel');
        const newCancelBtn = cancelBtn.cloneNode(true);
        cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);

        newConfirmBtn.addEventListener('click', () => {
            const x = parseFloat(document.getElementById('position-modal-x').value);
            const y = parseFloat(document.getElementById('position-modal-y').value);
            const rotation = parseFloat(document.getElementById('position-modal-rotation').value);

            if (shape.inherited) {
                shape.inherited = false;
            }

            if (!isNaN(x)) shape.x = x;
            if (!isNaN(y)) shape.y = y;
            if (!isNaN(rotation)) shape.rotation = rotation;

            AppState.saveToLocalStorage();
            this.render();

            document.getElementById('position-modal').classList.add('hidden');

            // Restore rotation handle display
            if (this.rotationHandle) {
                this.rotationHandle.style.display = '';
            }

            if (typeof Elements !== 'undefined') {
                Elements.setupContextMenu();
            }
        });

        newCancelBtn.addEventListener('click', () => {
            document.getElementById('position-modal').classList.add('hidden');

            // Restore rotation handle display
            if (this.rotationHandle) {
                this.rotationHandle.style.display = '';
            }
        });

        Utils.openModal('position-modal');
    },

    // Show size dialog
    showSizeDialog(shape) {
        this.contextMenuShape = shape;

        // Hide rotation handle while modal is open
        if (this.rotationHandle) {
            this.rotationHandle.style.display = 'none';
        }

        // Populate BOTH modals (shape-size-modal and size-modal) for test compatibility
        const modal1 = document.getElementById('shape-size-modal');
        const modal2 = document.getElementById('size-modal');
        const heightGroup1 = document.getElementById('shape-height-group');
        const heightGroup2 = document.getElementById('size-modal-height-group');

        // Set values in both modals
        document.getElementById('shape-width').value = Math.round(shape.width);
        document.getElementById('size-modal-width').value = Math.round(shape.width);

        if (shape.type === 'rectangle' || shape.type === 'ellipse') {
            heightGroup1.style.display = 'block';
            heightGroup2.style.display = 'block';
            document.getElementById('shape-height').value = Math.round(shape.height);
            document.getElementById('size-modal-height').value = Math.round(shape.height);
        } else {
            heightGroup1.style.display = 'none';
            heightGroup2.style.display = 'none';
        }

        // Store initial values for rounding logic
        if (typeof Elements !== 'undefined') {
            Elements.sizeInitialValues = {
                width: Math.round(shape.width),
                height: Math.round(shape.height)
            };
        }

        // Setup handlers for shape-size-modal (original modal)
        const confirmBtn1 = document.getElementById('btn-confirm-shape-size');
        const newConfirmBtn1 = confirmBtn1.cloneNode(true);
        confirmBtn1.parentNode.replaceChild(newConfirmBtn1, confirmBtn1);

        const cancelBtn1 = document.getElementById('btn-cancel-shape-size');
        const newCancelBtn1 = cancelBtn1.cloneNode(true);
        cancelBtn1.parentNode.replaceChild(newCancelBtn1, cancelBtn1);

        // Setup handlers for size-modal (test-compatible modal)
        const confirmBtn2 = document.getElementById('btn-size-modal-ok');
        const newConfirmBtn2 = confirmBtn2.cloneNode(true);
        confirmBtn2.parentNode.replaceChild(newConfirmBtn2, confirmBtn2);

        const cancelBtn2 = document.getElementById('btn-size-modal-cancel');
        const newCancelBtn2 = cancelBtn2.cloneNode(true);
        cancelBtn2.parentNode.replaceChild(newCancelBtn2, cancelBtn2);

        const applySizeChange = () => {
            // Try to get values from either modal
            const width = parseFloat(document.getElementById('shape-width').value) ||
                         parseFloat(document.getElementById('size-modal-width').value);
            const height = parseFloat(document.getElementById('shape-height').value) ||
                          parseFloat(document.getElementById('size-modal-height').value);

            if (shape.inherited) {
                shape.inherited = false;
            }

            if (!isNaN(width)) shape.width = Math.max(50, width);
            if (!isNaN(height) && shape.type !== 'line' && shape.type !== 'arrow') {
                shape.height = Math.max(50, height);
            }

            if (shape.type === 'circle') {
                shape.height = shape.width;
            }

            AppState.saveToLocalStorage();
            this.render();

            modal1.classList.add('hidden');
            modal2.classList.add('hidden');

            // Restore rotation handle display
            if (this.rotationHandle) {
                this.rotationHandle.style.display = '';
            }

            if (typeof Elements !== 'undefined') {
                Elements.setupContextMenu();
            }
        };

        const cancelSizeChange = () => {
            modal1.classList.add('hidden');
            modal2.classList.add('hidden');

            // Restore rotation handle display
            if (this.rotationHandle) {
                this.rotationHandle.style.display = '';
            }
        };

        newConfirmBtn1.addEventListener('click', applySizeChange);
        newConfirmBtn2.addEventListener('click', applySizeChange);
        newCancelBtn1.addEventListener('click', cancelSizeChange);
        newCancelBtn2.addEventListener('click', cancelSizeChange);

        // Open only shape-size-modal
        Utils.openModal('shape-size-modal');
    },

    /** Clears and re-creates all shape SVG elements from AppState.shapes. */
    render() {
        if (!this.layer) {
            return;
        }

        // Clear ALL shape SVGs and touch overlays from the DOM
        this.layer.querySelectorAll('.shape-svg').forEach(svg => {
            svg.remove();
        });
        this.layer.querySelectorAll('.touch-overlay[data-shape]').forEach(el => el.remove());
        this.shapeSvgs = {};

        // Remove only shape debug boxes before rendering
        document.querySelectorAll('.debug-tolerance-box[data-debug-type="shape"]').forEach(box => box.remove());

        // Render each shape
        if (AppState.shapes) {
            AppState.shapes.forEach(shape => {
                if (shape.visible) {
                    this.renderShape(shape);
                    // DEBUG: Show bounding box for all shapes
                    this.showDebugBox(shape);
                }
            });
        }

        // Update handles if a shape is selected
        this.updateHandles();
    },

    // DEBUG: Show bounding box for a shape
    showDebugBox(shape) {
        if (typeof Utils !== 'undefined') {
            Utils.showDebugBox(shape.id, 'shape', shape);
        }
    },

    // Render individual shape
    renderShape(shape) {
        // Auto-correct text shape dimensions to match fontSize
        if (shape.type === 'text') {
            const fontSize = shape.fontSize || 48;
            const expectedWidth = fontSize * 3;
            const expectedHeight = fontSize * 1.5;

            // Update if dimensions don't match
            if (Math.abs(shape.width - expectedWidth) > 1 || Math.abs(shape.height - expectedHeight) > 1) {
                shape.width = expectedWidth;
                shape.height = expectedHeight;
                AppState.saveToLocalStorage();
            }
        }

        const svg = this.createShapeSvg(shape);
        if (svg) {
            this.layer.appendChild(svg);
            this.shapeSvgs[shape.id] = svg;

            // Add a larger transparent hit area in touch mode
            if (document.body.classList.contains('touch-mode')) {
                // Use canvas attribute dimensions (like Board.boardToScreen)
                const canvasWidth = AppState.canvas.width;
                const canvasHeight = AppState.canvas.height;
                const scaleX = canvasWidth / AppState.boardWidth;
                const scaleY = canvasHeight / AppState.boardHeight;
                const scale = Math.min(scaleX, scaleY);
                // Position using Board.boardToScreen approach
                const x = shape.x * scale;
                const y = shape.y * scale;
                // Sizes are scaled by referenceScale, which already accounts for rotation
                const referenceScale = AppState.referenceScale || scale;
                let width = shape.width * referenceScale;
                let height = shape.height * referenceScale;

                let overlayWidth, overlayHeight, overlayX, overlayY, overlayYOffset;

                // For text shapes, calculate overlay size based on actual text bounding box
                if (shape.type === 'text') {
                    const textElement = svg.querySelector('text');
                    if (textElement) {
                        try {
                            const bbox = textElement.getBBox();

                            const paddingHorizontal = 20;
                            const paddingTop = 8;
                            const paddingBottom = 10;

                            // Get fontSize-based viewBox dimensions
                            const fontSize = shape.fontSize || 48;
                            const svgViewBoxWidth = fontSize * 3;
                            const svgViewBoxHeight = fontSize * 1.5;

                            // Scale factor from viewBox to canvas coordinates (based on shape dimensions)
                            const svgScaleX = width / svgViewBoxWidth;
                            const svgScaleY = height / svgViewBoxHeight;

                            const textWidth = bbox.width * svgScaleX;
                            const textHeight = bbox.height * svgScaleY;

                            overlayWidth = textWidth + paddingHorizontal * 2;
                            overlayHeight = textHeight + paddingTop + paddingBottom;

                            // Calculate offset using SVG coordinates
                            const textTopInViewBox = bbox.y;
                            const textTopInCanvas = textTopInViewBox * svgScaleY;
                            const svgCenterInCanvas = height / 2;
                            // Position overlay top at textTop - paddingTop for proper padding
                            const overlayCenter = textTopInCanvas - paddingTop + overlayHeight / 2;
                            overlayYOffset = overlayCenter - svgCenterInCanvas;

                            overlayX = x;
                            overlayY = y + overlayYOffset;
                        } catch (e) {
                            // Fallback to simple padding if getBBox fails
                            overlayWidth = width + 4;
                            overlayHeight = height + 4;
                            overlayX = x;
                            overlayY = y;
                            overlayYOffset = 0;
                        }
                    } else {
                        // Fallback if text element not found
                        overlayWidth = width + 4;
                        overlayHeight = height + 4;
                        overlayX = x;
                        overlayY = y;
                        overlayYOffset = 0;
                    }
                } else {
                    // For non-text shapes, use shape dimensions with tolerance for easier tapping
                    // For lines/arrows, use the visual height with minimum touch area
                    if (shape.type === 'line' || shape.type === 'arrow') {
                        height = Math.max(20 * scaleY, 20);
                        // Touch overlay should be 28px bigger than the SVG box
                        overlayWidth = width + 28;
                        overlayHeight = height + 28;
                    } else {
                        // For rectangles, circles, ellipses: add tolerance padding
                        // 40px total padding = 20px on each side for easier touch selection
                        const tolerancePadding = 40; // pixels of extra touch area around shape
                        overlayWidth = width + tolerancePadding;
                        overlayHeight = height + tolerancePadding;
                    }
                    overlayX = x;
                    overlayY = y;
                    overlayYOffset = 0;
                }

                const overlay = document.createElement('div');
                overlay.className = 'touch-overlay';
                overlay.style.left = overlayX + 'px';
                overlay.style.top = overlayY + 'px';
                overlay.style.width = overlayWidth + 'px';
                overlay.style.height = overlayHeight + 'px';

                // Set border-radius based on shape type
                if (shape.type === 'circle') {
                    overlay.style.borderRadius = '50%';
                } else if (shape.type === 'ellipse') {
                    overlay.style.borderRadius = '50%';
                } else {
                    overlay.style.borderRadius = '0';
                }

                // Use pixel-based transform to match SVG positioning exactly
                overlay.style.transform = `translate(${-overlayWidth/2}px, ${-overlayHeight/2}px) rotate(${shape.rotation || 0}deg)`;
                overlay.style.transformOrigin = `${overlayWidth/2}px ${overlayHeight/2}px`;

                // Store yOffset for drag updates
                if (overlayYOffset) {
                    overlay.dataset.yOffset = overlayYOffset.toString();
                }

                // Shape overlay = visual z-index + 100 (integers only)
                const shapeOverlayZIndex = {
                    'rectangle': '111',  // 11 + 100
                    'circle': '112',     // 12 + 100 (ellipse uses circle type)
                    'line': '113',       // 13 + 100
                    'arrow': '114',      // 14 + 100
                    'text': '115'        // 15 + 100
                };
                overlay.style.zIndex = shapeOverlayZIndex[shape.type] || '111';
                overlay.style.pointerEvents = 'auto';
                overlay.dataset.shape = shape.id;
                this.layer.appendChild(overlay);
            }
        }
    },

    // Create SVG for shape
    createShapeSvg(shape) {
        const canvasWidth = AppState.canvas.width;
        const canvasHeight = AppState.canvas.height;

        // For POSITION, use Board.boardToScreen approach (just multiply by scale)
        // The canvas.width already accounts for rotation via Board.resize()
        const posScaleX = canvasWidth / AppState.boardWidth;
        const posScaleY = canvasHeight / AppState.boardHeight;

        const x = shape.x * posScaleX;
        const y = shape.y * posScaleY;

        // For SIZE, use reference scale directly
        // Shapes are in drawing-layer which is scaled by boardRotationScaleFactor
        // Using referenceScale makes shapes scale proportionally with the board
        const referenceScale = AppState.referenceScale || Math.min(posScaleX, posScaleY);
        const scaleX = referenceScale;
        const scaleY = referenceScale;

        // Adjust stroke width to compensate for CSS scale transform
        // When board is rotated, drawing-layer has a scale() transform applied
        // vector-effect="non-scaling-stroke" doesn't compensate for CSS transforms
        const scaleFactor = AppState.boardRotationScaleFactor || 1;
        const adjustedStrokeWidth = shape.strokeWidth / scaleFactor;

        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('class', 'shape-svg');

        if (shape.inherited) {
            svg.classList.add('shape-inherited');
        }

        // Add shape-locked class if shape is locked (anywhere)
        if (shape.locked) {
            svg.classList.add('shape-locked');
        }

        if (AppState.selectedShape && AppState.selectedShape === shape.id) {
            svg.classList.add('shape-selected');
        }

        svg.style.position = 'absolute';
        svg.style.overflow = 'visible';
        svg.style.cursor = 'default';
        svg.style.touchAction = 'none';
        svg.style.pointerEvents = 'auto';

        // Set z-index based on shape type (integers only)
        const shapeZIndex = {
            'rectangle': '11',  // Base shape
            'circle': '12',     // Ellipse is rendered as circle
            'line': '13',
            'arrow': '14',
            'text': '15'        // Highest shape
        };
        svg.style.zIndex = shapeZIndex[shape.type] || '11';

        svg.id = shape.id; // Use ID for fast lookup, consistent with other modules
        svg.dataset.shape = shape.id;

        const width = shape.width * scaleX;
        const height = shape.height * scaleY;
        const maxDim = Math.max(width, height);

        // Set viewBox and position based on shape type
        if (shape.type === 'line' || shape.type === 'arrow') {
            // Use at least 20px of screen height so the thin line is easy to grab.
            // The transparent drag handle rect below fills the entire SVG area.
            const lineH = Math.max(20 * scaleY, 20);
            svg.setAttribute('viewBox', `-${shape.width/2} -10 ${shape.width} 20`);
            svg.setAttribute('width', width);
            svg.setAttribute('height', lineH);
            svg.style.left = x + 'px';
            svg.style.top = y + 'px';
            svg.style.transform = `translate(${-width/2}px, ${-lineH/2}px) rotate(${shape.rotation || 0}deg)`;
            svg.style.transformOrigin = `${width/2}px ${lineH/2}px`;
        } else {
            // Use actual shape dimensions for viewBox to ensure stable coordinates
            let viewBoxWidth = shape.width;
            let viewBoxHeight = shape.height;

            // For text shapes, use a viewBox based on fontSize for proper proportions
            if (shape.type === 'text') {
                const fontSize = shape.fontSize || 48;
                viewBoxWidth = fontSize * 3;  // Proportional to font size
                viewBoxHeight = fontSize * 1.5;
            }

            svg.setAttribute('viewBox', `0 0 ${viewBoxWidth} ${viewBoxHeight}`);
            svg.setAttribute('width', width);
            svg.setAttribute('height', height);
            svg.style.left = x + 'px';
            svg.style.top = y + 'px';

            // Text rotates with the board. Additionally flip 180° if the net rotation
            // would make text read right-to-left (cos of net angle < 0).
            let shapeRotation = shape.rotation || 0;
            if (shape.type === 'text') {
                const boardRotation = AppState.boardRotation || 0;
                const net = (shapeRotation + boardRotation) * Math.PI / 180;
                if (Math.cos(net) < 0) shapeRotation += 180;
            }

            svg.style.transform = `translate(${-width/2}px, ${-height/2}px) rotate(${shapeRotation}deg)`;
            svg.style.transformOrigin = `${width/2}px ${height/2}px`;
        }

        // Calculate viewBox dimensions for non-line shapes
        // Use actual shape dimensions to ensure stable viewBox coordinates
        let viewBoxWidth, viewBoxHeight;
        if (shape.type !== 'line' && shape.type !== 'arrow') {
            viewBoxWidth = shape.width;
            viewBoxHeight = shape.height;
        }

        // Create shape content
        let content = '';
        switch (shape.type) {
            case 'line':
                content = `<rect x="${-shape.width/2}" y="-10" width="${shape.width}" height="20" fill="transparent" class="shape-drag-handle" pointer-events="all"/>
                <line x1="${-shape.width/2}" y1="0" x2="${shape.width/2}" y2="0" stroke="${shape.color}" stroke-width="${adjustedStrokeWidth}" fill="none" vector-effect="non-scaling-stroke" pointer-events="none"/>`;
                break;
            case 'arrow':
                content = `
                    <rect x="${-shape.width/2}" y="-10" width="${shape.width}" height="20" fill="transparent" class="shape-drag-handle" pointer-events="all"/>
                    <defs>
                        <marker id="arrowhead-${shape.id}" markerWidth="10" markerHeight="10" refX="10" refY="5" orient="auto">
                            <polygon points="0,0 10,5 0,10" fill="${shape.color}"/>
                        </marker>
                    </defs>
                    <line x1="${-shape.width/2}" y1="0" x2="${shape.width/2}" y2="0" stroke="${shape.color}" stroke-width="${adjustedStrokeWidth}" fill="none" marker-end="url(#arrowhead-${shape.id})" vector-effect="non-scaling-stroke" pointer-events="none"/>
                `;
                break;
            case 'rectangle': {
                const margin = 5;
                const rectX = margin;
                const rectY = margin;
                const rectWidth = shape.width - (margin * 2);
                const rectHeight = shape.height - (margin * 2);
                content = `<rect x="${rectX}" y="${rectY}" width="${rectWidth}" height="${rectHeight}" fill="${shape.fillColor}" stroke="${shape.color}" stroke-width="${adjustedStrokeWidth}" vector-effect="non-scaling-stroke" pointer-events="all"/>`;
                break;
            }
            case 'circle': {
                const margin = 5;
                const cx = shape.width / 2;
                const cy = shape.height / 2;
                const r = (shape.width / 2) - margin;
                content = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${shape.fillColor}" stroke="${shape.color}" stroke-width="${adjustedStrokeWidth}" vector-effect="non-scaling-stroke" pointer-events="all"/>`;
                break;
            }
            case 'ellipse': {
                const margin = 5;
                const cx = shape.width / 2;
                const cy = shape.height / 2;
                const rx = (shape.width / 2) - margin;
                const ry = (shape.height / 2) - margin;
                const ellipseText = shape.text ? `<text x="${cx}" y="${cy + 5}" text-anchor="middle" dominant-baseline="middle" font-size="16" font-weight="bold" fill="${shape.color}" pointer-events="all">${shape.text}</text>` : '';
                content = `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${shape.fillColor}" stroke="${shape.color}" stroke-width="${adjustedStrokeWidth}" vector-effect="non-scaling-stroke" pointer-events="all"/>${ellipseText}`;
                break;
            }
            case 'text': {
                const fontSize = shape.fontSize || 48;
                const text = shape.text || 'Text';
                // For text, use viewBox-based centering (viewBox is fontSize * 3 x fontSize * 1.5)
                const cx = fontSize * 1.5;  // Half of viewBox width
                const cy = fontSize * 0.75;      // Half of viewBox height

                // Create text element first to measure it
                const tempSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                const tempText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                tempText.setAttribute('x', cx);
                tempText.setAttribute('y', cy + 5);
                tempText.setAttribute('text-anchor', 'middle');
                tempText.setAttribute('dominant-baseline', 'middle');
                tempText.setAttribute('font-size', fontSize);
                tempText.setAttribute('font-weight', 'bold');
                tempText.textContent = text;
                tempSvg.appendChild(tempText);
                document.body.appendChild(tempSvg);

                let hitRect = '';
                try {
                    const bbox = tempText.getBBox();
                    // Use actual text bounds for hit area, reduced by 20% in height to match debug box
                    const hitHeight = bbox.height * 0.8;
                    const hitY = bbox.y + (bbox.height - hitHeight) / 2; // Center the smaller hit area
                    hitRect = `<rect x="${bbox.x}" y="${hitY}" width="${bbox.width}" height="${hitHeight}" fill="transparent" pointer-events="all"/>`;
                } catch (e) {
                    // Fallback to full viewBox if measurement fails
                    hitRect = `<rect x="0" y="0" width="${viewBoxWidth}" height="${viewBoxHeight}" fill="transparent" pointer-events="all"/>`;
                } finally {
                    document.body.removeChild(tempSvg);
                }

                content = `${hitRect}<text x="${cx}" y="${cy + 5}" text-anchor="middle" dominant-baseline="middle" font-size="${fontSize}" font-weight="bold" fill="${shape.color}" pointer-events="none">${text}</text>`;
                break;
            }
        }

        // For non-line/arrow shapes (except text which handles its own hit rect), prepend a transparent hit rect
        if (shape.type !== 'line' && shape.type !== 'arrow' && shape.type !== 'text') {
            const hitRect = `<rect x="0" y="0" width="${viewBoxWidth}" height="${viewBoxHeight}" fill="transparent" pointer-events="all"/>`;
            content = hitRect + content;
        }

        svg.innerHTML = content;
        return svg;
    },

    // Reset shape to parent state by removing from current board
    resetToParent(shape) {
        const parentShape = AppState.parentShapePositions[shape.id];
        if (!parentShape) {
            Utils.showMessage('No parent state available for this shape', 'Cannot Reset');
            return;
        }

        // Remove the shape from the current board so it falls back to parent's version
        const currentBoard = AppState.boards.find(b => b.id === AppState.currentBoardId);
        if (currentBoard) {
            currentBoard.shapes = (currentBoard.shapes || []).filter(s => s.id !== shape.id);
        }

        // Reload the board to refresh the inherited state
        AppState.loadBoard(AppState.currentBoardId);
        AppState.saveToLocalStorage();

        // Re-render all components
        this.render();
        if (typeof Elements !== 'undefined') {
            Elements.render();
        }
        if (typeof Players !== 'undefined') {
            Players.render();
        }
        if (typeof Balls !== 'undefined') {
            Balls.render();
        }
        if (typeof Plates !== 'undefined') {
            Plates.render();
        }
        if (typeof Animations !== 'undefined') {
            Animations.renderParentPaths();
        }
    }
};
