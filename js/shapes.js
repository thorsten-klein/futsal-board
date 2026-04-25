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
            width = 400;
            height = 100;
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

        if (shapeType === 'line' || shapeType === 'arrow') {
            svg.setAttribute('viewBox', `-${width/2} -10 ${width} 20`);
            svg.setAttribute('width', screenWidth);
            svg.setAttribute('height', 20 * scaleY);

            if (shapeType === 'line') {
                content = `<line x1="${-width/2}" y1="0" x2="${width/2}" y2="0" stroke="${color}" stroke-width="2" fill="none" vector-effect="non-scaling-stroke"/>`;
            } else {
                content = `
                    <defs>
                        <marker id="arrowhead-preview" markerWidth="10" markerHeight="10" refX="10" refY="5" orient="auto">
                            <polygon points="0,0 10,5 0,10" fill="${color}"/>
                        </marker>
                    </defs>
                    <line x1="${-width/2}" y1="0" x2="${width/2}" y2="0" stroke="${color}" stroke-width="2" fill="none" marker-end="url(#arrowhead-preview)" vector-effect="non-scaling-stroke"/>
                `;
            }
        } else {
            const maxDim = Math.max(screenWidth, screenHeight);
            svg.setAttribute('viewBox', '0 0 100 100');
            svg.setAttribute('width', maxDim);
            svg.setAttribute('height', maxDim);

            if (shapeType === 'rectangle') {
                const rectWidth = (screenWidth / maxDim) * 100;
                const rectHeight = (screenHeight / maxDim) * 100;
                const rectX = (100 - rectWidth) / 2;
                const rectY = (100 - rectHeight) / 2;
                content = `<rect x="${rectX}" y="${rectY}" width="${rectWidth}" height="${rectHeight}" fill="${fillColor}" stroke="${color}" stroke-width="3" vector-effect="non-scaling-stroke"/>`;
            } else if (shapeType === 'ellipse') {
                const ellipseRx = (screenWidth / maxDim) * 45;
                const ellipseRy = (screenHeight / maxDim) * 45;
                content = `<ellipse cx="50" cy="50" rx="${ellipseRx}" ry="${ellipseRy}" fill="${fillColor}" stroke="${color}" stroke-width="3" vector-effect="non-scaling-stroke"/>`;
            } else if (shapeType === 'text') {
                content = `<text x="50" y="55" text-anchor="middle" font-size="48" font-weight="bold" fill="${color}">Text</text>`;
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
            width = 400;
            height = 100;
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

            const shapeId = Utils.findEntityId(e.target, this.layer, 'shape');

            if (shapeId) {
                const shape = AppState.getShape(shapeId);
                if (shape) {
                    // Check if shape is already selected
                    if (AppState.selectedShape && AppState.selectedShape === shape.id) {
                        // Locked shapes cannot be dragged
                        if (shape.locked) return;
                        // Already selected, prepare to drag
                        AppState.draggedShape = shape;
                        AppState.updatePositionDisplay(shape.x, shape.y, shape, 'shape');

                        const rect = AppState.canvas.getBoundingClientRect();
                        const scaleX = AppState.boardWidth / rect.width;
                        const scaleY = AppState.boardHeight / rect.height;

                        AppState.dragOffset = {
                            x: (e.clientX - rect.left) * scaleX - shape.x,
                            y: (e.clientY - rect.top) * scaleY - shape.y
                        };
                    } else {
                        // Not selected yet, just select it
                        AppState.selectedShape = shape.id;
                        AppState.selectedElement = null;
                        AppState.selectedPlayer = null;
                        AppState.selectedBall = null;
                        AppState.selectedPlate = null;
                        AppState.updatePositionDisplay(shape.x, shape.y, shape, 'shape');

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
            updateDOM(el, x, y, pxW, pxH) {
                el.style.left = (x * (pxW / AppState.boardWidth))  + 'px';
                el.style.top  = (y * (pxH / AppState.boardHeight)) + 'px';
                // rotation transform is maintained from original render
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
                AppState.saveToLocalStorage();
                AppState.hidePositionDisplay();
            }
            if (this.isResizing) {
                this.isResizing = false;
                this.resizeDirection = null;
                this.resizeCornerOffset = null;
                AppState.saveToLocalStorage();
            }
        });
    },

    // Handle rotation movement
    handleRotationMove(e) {
        const shape = AppState.getShape(AppState.selectedShape);
        if (!shape) return;

        const canvasRect = AppState.canvas.getBoundingClientRect();
        const scaleX = canvasRect.width / AppState.boardWidth;
        const scaleY = canvasRect.height / AppState.boardHeight;

        const centerX = shape.x * scaleX;
        const centerY = shape.y * scaleY;

        const mouseX = e.clientX - canvasRect.left;
        const mouseY = e.clientY - canvasRect.top;

        // Calculate angle
        const angle = Math.atan2(mouseY - centerY, mouseX - centerX);
        const degrees = (angle * 180 / Math.PI) + 90;

        // Normalize to 0-360
        shape.rotation = ((degrees % 360) + 360) % 360;

        // Update display
        AppState.updatePositionDisplay(shape.x, shape.y, shape, 'shape');

        // Update SVG transform directly without full re-render
        const shapeSvg = document.getElementById(shape.id);
        if (shapeSvg) {
            const width = shape.width * scaleX;
            const height = shape.height * scaleY;

            // Update rotation based on shape type
            if (shape.type === 'line' || shape.type === 'arrow') {
                const lineH = parseFloat(shapeSvg.getAttribute('height') || '0');
                shapeSvg.style.transform = `translate(${-width/2}px, ${-lineH/2}px) rotate(${shape.rotation}deg)`;
                shapeSvg.style.transformOrigin = `${width/2}px ${lineH/2}px`;
            } else {
                const maxDim = Math.max(width, height);
                shapeSvg.style.transform = `translate(${-maxDim/2}px, ${-maxDim/2}px) rotate(${shape.rotation}deg)`;
                shapeSvg.style.transformOrigin = `${maxDim/2}px ${maxDim/2}px`;
            }
        }

        // Update handles position
        this.updateHandlesPosition();
    },

    // Handle resize movement
    handleResizeMove(e) {
        const shape = AppState.getShape(AppState.selectedShape);
        if (!shape || !this.resizeDirection) return;

        const rect = AppState.canvas.getBoundingClientRect();
        const scaleX = AppState.boardWidth / rect.width;
        const scaleY = AppState.boardHeight / rect.height;

        const mouseX = (e.clientX - rect.left) * scaleX;
        const mouseY = (e.clientY - rect.top) * scaleY;

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
                const rotation = (shape.rotation || 0) * Math.PI / 180;

                if (this.resizeDirection === 'corner') {
                    // Corner resize: scale both width and height from opposite corner
                    const offsetX = this.resizeCornerOffset.x;
                    const offsetY = this.resizeCornerOffset.y;

                    // Fixed corner is opposite to the dragged corner
                    const fixedCornerX = shape.x - Math.cos(rotation) * offsetX + Math.sin(rotation) * offsetY;
                    const fixedCornerY = shape.y - Math.sin(rotation) * offsetX - Math.cos(rotation) * offsetY;

                    const dx = mouseX - fixedCornerX;
                    const dy = mouseY - fixedCornerY;

                    const newWidth = Math.max(50, Math.abs(dx * Math.cos(rotation) + dy * Math.sin(rotation)));
                    const newHeight = Math.max(50, Math.abs(-dx * Math.sin(rotation) + dy * Math.cos(rotation)));

                    const centerOffsetX = (dx * Math.cos(rotation) + dy * Math.sin(rotation)) / 2;
                    const centerOffsetY = (-dx * Math.sin(rotation) + dy * Math.cos(rotation)) / 2;

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
                    const dx = mouseX - fixedEdgeX;
                    const dy = mouseY - fixedEdgeY;
                    const distanceAlongWidth = dx * Math.cos(rotation) + dy * Math.sin(rotation);

                    // New width and center
                    const newWidth = Math.max(50, Math.abs(distanceAlongWidth));
                    const centerOffset = (distanceAlongWidth >= 0 ? newWidth : -newWidth) / 2;

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
                    const dx = mouseX - fixedEdgeX;
                    const dy = mouseY - fixedEdgeY;
                    const distanceAlongHeight = -dx * Math.sin(rotation) + dy * Math.cos(rotation);

                    // New height and center
                    const newHeight = Math.max(50, Math.abs(distanceAlongHeight));
                    const centerOffset = (distanceAlongHeight >= 0 ? newHeight : -newHeight) / 2;

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
                // For text, adjust font size based on distance
                const newFontSize = Math.max(12, Math.min(200, distance / 4));
                shape.fontSize = newFontSize;
                shape.width = Math.max(100, distance * 2);
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

        // Update SVG directly without full re-render
        const shapeSvg = document.getElementById(shape.id);
        if (shapeSvg) {
            const canvasRect = AppState.canvas.getBoundingClientRect();
            const pixelScaleX = canvasRect.width / AppState.boardWidth;
            const pixelScaleY = canvasRect.height / AppState.boardHeight;

            const x = shape.x * pixelScaleX;
            const y = shape.y * pixelScaleY;
            const width = shape.width * pixelScaleX;
            const height = shape.height * pixelScaleY;

            // Update SVG position
            shapeSvg.style.left = x + 'px';
            shapeSvg.style.top = y + 'px';

            // Update dimensions, transform, and content based on shape type
            if (shape.type === 'line' || shape.type === 'arrow') {
                const lineH = Math.max(20 * pixelScaleY, 20);
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
                const maxDim = Math.max(width, height);
                shapeSvg.setAttribute('width', maxDim);
                shapeSvg.setAttribute('height', maxDim);
                shapeSvg.style.transform = `translate(${-maxDim/2}px, ${-maxDim/2}px) rotate(${shape.rotation || 0}deg)`;
                shapeSvg.style.transformOrigin = `${maxDim/2}px ${maxDim/2}px`;

                // Update shape content elements
                if (shape.type === 'rectangle') {
                    const rectElement = shapeSvg.querySelector('rect');
                    if (rectElement) {
                        const rectWidth = (width / maxDim) * 100;
                        const rectHeight = (height / maxDim) * 100;
                        const rectX = (100 - rectWidth) / 2;
                        const rectY = (100 - rectHeight) / 2;
                        rectElement.setAttribute('x', rectX);
                        rectElement.setAttribute('y', rectY);
                        rectElement.setAttribute('width', rectWidth);
                        rectElement.setAttribute('height', rectHeight);
                    }
                } else if (shape.type === 'ellipse') {
                    const ellipseElement = shapeSvg.querySelector('ellipse');
                    if (ellipseElement) {
                        const ellipseRx = (width / maxDim) * 45;
                        const ellipseRy = (height / maxDim) * 45;
                        ellipseElement.setAttribute('rx', ellipseRx);
                        ellipseElement.setAttribute('ry', ellipseRy);
                    }
                } else if (shape.type === 'text') {
                    const textElement = shapeSvg.querySelector('text');
                    if (textElement) {
                        textElement.setAttribute('font-size', shape.fontSize || 24);
                    }
                }
                // circle doesn't need content update - it's always r="45" in the viewBox
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
        const canvasRect = AppState.canvas.getBoundingClientRect();
        const scaleX = canvasRect.width / AppState.boardWidth;
        const scaleY = canvasRect.height / AppState.boardHeight;

        const centerX = shape.x * scaleX;
        const centerY = shape.y * scaleY;

        // Update rotation handle if it exists
        if (this.rotationHandle) {
            const handleDistanceInBoardUnits = 150;
            let handleDistance;
            if (shape.type === 'line' || shape.type === 'arrow') {
                handleDistance = handleDistanceInBoardUnits * scaleX;
            } else {
                handleDistance = (Math.max(shape.width, shape.height) / 2 + handleDistanceInBoardUnits) * scaleX;
            }
            const rotation = (shape.rotation || 0) * Math.PI / 180;

            const handleX = centerX + Math.cos(rotation - Math.PI / 2) * handleDistance;
            const handleY = centerY + Math.sin(rotation - Math.PI / 2) * handleDistance;

            const handleSize = Math.max(20 * scaleX, 15);

            this.rotationHandle.style.left = (handleX - handleSize / 2) + 'px';
            this.rotationHandle.style.top = (handleY - handleSize / 2) + 'px';
        }

        // Update resize handles if they exist
        if (this.resizeHandles.length > 0) {
            const rotation = (shape.rotation || 0) * Math.PI / 180;
            const widthHalf = (shape.width / 2) * scaleX;
            const heightHalf = (shape.height / 2) * scaleX;
            const handleSize = Math.max(15 * scaleX, 10);

            if (shape.type === 'line' || shape.type === 'arrow') {
                // Right handle only
                if (this.resizeHandles[0]) {
                    const rightX = centerX + Math.cos(rotation) * widthHalf;
                    const rightY = centerY + Math.sin(rotation) * widthHalf;
                    this.resizeHandles[0].style.left = (rightX - handleSize / 2) + 'px';
                    this.resizeHandles[0].style.top = (rightY - handleSize / 2) + 'px';
                }
            } else if (shape.type === 'circle' || shape.type === 'text') {
                // Single handle
                if (this.resizeHandles[0]) {
                    const rightX = centerX + Math.cos(rotation) * widthHalf;
                    const rightY = centerY + Math.sin(rotation) * widthHalf;
                    this.resizeHandles[0].style.left = (rightX - handleSize / 2) + 'px';
                    this.resizeHandles[0].style.top = (rightY - handleSize / 2) + 'px';
                }
            } else {
                // Rectangle and ellipse: 4 corner + 4 edge handles (mirrors createResizeHandles order)
                const allHandlePositions = [
                    { x: widthHalf, y: -heightHalf },
                    { x: widthHalf, y: heightHalf },
                    { x: -widthHalf, y: heightHalf },
                    { x: -widthHalf, y: -heightHalf },
                    { x: widthHalf, y: 0 },
                    { x: -widthHalf, y: 0 },
                    { x: 0, y: heightHalf },
                    { x: 0, y: -heightHalf }
                ];

                allHandlePositions.forEach((pos, i) => {
                    if (this.resizeHandles[i]) {
                        const hx = centerX + Math.cos(rotation) * pos.x - Math.sin(rotation) * pos.y;
                        const hy = centerY + Math.sin(rotation) * pos.x + Math.cos(rotation) * pos.y;
                        this.resizeHandles[i].style.left = (hx - handleSize / 2) + 'px';
                        this.resizeHandles[i].style.top = (hy - handleSize / 2) + 'px';
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

            const canvasRect = AppState.canvas.getBoundingClientRect();
            const scaleX = canvasRect.width / AppState.boardWidth;
            const scaleY = canvasRect.height / AppState.boardHeight;

            const centerX = shape.x * scaleX;
            const centerY = shape.y * scaleY;

            // Rotation handle
            const handleDistanceInBoardUnits = 150;
            // For lines and arrows, use fixed distance; for other shapes, add half the size
            let handleDistance;
            if (shape.type === 'line' || shape.type === 'arrow') {
                handleDistance = handleDistanceInBoardUnits * scaleX;
            } else {
                handleDistance = (Math.max(shape.width, shape.height) / 2 + handleDistanceInBoardUnits) * scaleX;
            }
            const rotation = (shape.rotation || 0) * Math.PI / 180;

            const handleX = centerX + Math.cos(rotation - Math.PI / 2) * handleDistance;
            const handleY = centerY + Math.sin(rotation - Math.PI / 2) * handleDistance;

            const handleSize = Math.max(20 * scaleX, 15);

            this.rotationHandle = document.createElement('div');
            this.rotationHandle.className = 'rotation-handle';
            this.rotationHandle.style.width = handleSize + 'px';
            this.rotationHandle.style.height = handleSize + 'px';
            this.rotationHandle.style.left = (handleX - handleSize / 2) + 'px';
            this.rotationHandle.style.top = (handleY - handleSize / 2) + 'px';

            this.rotationHandle.addEventListener('mousedown', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.isRotating = true;
                AppState.updatePositionDisplay(shape.x, shape.y, shape, 'shape');
            });

            this.layer.appendChild(this.rotationHandle);

            // Resize handles
            this.createResizeHandles(shape, centerX, centerY, scaleX);
        }
    },

    // Create resize handles
    createResizeHandles(shape, centerX, centerY, scaleX) {
        const handleSize = Math.max(15 * scaleX, 10);
        const widthHalf = (shape.width / 2) * scaleX;
        const heightHalf = (shape.height / 2) * scaleX;

        const rotation = (shape.rotation || 0) * Math.PI / 180;

        // For lines and arrows, only horizontal resize
        if (shape.type === 'line' || shape.type === 'arrow') {
            // Right handle
            const rightX = centerX + Math.cos(rotation) * widthHalf;
            const rightY = centerY + Math.sin(rotation) * widthHalf;

            const rightHandle = this.createResizeHandle(rightX, rightY, handleSize, 'horizontal');
            this.resizeHandles.push(rightHandle);
            this.layer.appendChild(rightHandle);
        } else if (shape.type === 'circle') {
            // Circle: one handle for uniform scaling
            const rightX = centerX + Math.cos(rotation) * widthHalf;
            const rightY = centerY + Math.sin(rotation) * widthHalf;

            const handle = this.createResizeHandle(rightX, rightY, handleSize, 'both');
            this.resizeHandles.push(handle);
            this.layer.appendChild(handle);
        } else if (shape.type === 'text') {
            // Text: one handle for font size scaling
            const rightX = centerX + Math.cos(rotation) * widthHalf;
            const rightY = centerY + Math.sin(rotation) * widthHalf;

            const handle = this.createResizeHandle(rightX, rightY, handleSize, 'text');
            this.resizeHandles.push(handle);
            this.layer.appendChild(handle);
        } else {
            // Rectangle and ellipse: 4 corner handles first, then 4 edge midpoint handles = 8 total
            // Corners first so that the first handle (.resize-handle:first) supports diagonal drag
            const edges = [
                { x: widthHalf, y: -heightHalf, dir: 'corner', offsetX: shape.width / 2, offsetY: -shape.height / 2 },
                { x: widthHalf, y: heightHalf, dir: 'corner', offsetX: shape.width / 2, offsetY: shape.height / 2 },
                { x: -widthHalf, y: heightHalf, dir: 'corner', offsetX: -shape.width / 2, offsetY: shape.height / 2 },
                { x: -widthHalf, y: -heightHalf, dir: 'corner', offsetX: -shape.width / 2, offsetY: -shape.height / 2 },
                { x: widthHalf, y: 0, dir: 'horizontal', offsetX: shape.width / 2, offsetY: 0 },
                { x: -widthHalf, y: 0, dir: 'horizontal', offsetX: -shape.width / 2, offsetY: 0 },
                { x: 0, y: heightHalf, dir: 'vertical', offsetX: 0, offsetY: shape.height / 2 },
                { x: 0, y: -heightHalf, dir: 'vertical', offsetX: 0, offsetY: -shape.height / 2 }
            ];

            edges.forEach(edge => {
                const edgeX = centerX + Math.cos(rotation) * edge.x - Math.sin(rotation) * edge.y;
                const edgeY = centerY + Math.sin(rotation) * edge.x + Math.cos(rotation) * edge.y;

                const handle = this.createResizeHandle(edgeX, edgeY, handleSize, edge.dir, { x: edge.offsetX, y: edge.offsetY });
                this.resizeHandles.push(handle);
                this.layer.appendChild(handle);
            });
        }
    },

    // Create a single resize handle
    createResizeHandle(x, y, size, direction, cornerOffset) {
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
        handle.style.cursor = 'nwse-resize';
        handle.style.zIndex = '1001';
        handle.style.pointerEvents = 'all';
        handle.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.4)';
        handle.style.touchAction = 'none';

        handle.addEventListener('mousedown', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.isResizing = true;
            this.resizeDirection = direction;
            this.resizeCornerOffset = cornerOffset || null;
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

        // Position menu and ensure it stays within viewport
        menuCopy.classList.remove('hidden');

        Utils.positionContextMenu(menuCopy, x, y);

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

        document.getElementById('position-modal-x').value = Math.round(shape.x);
        document.getElementById('position-modal-y').value = Math.round(shape.y);

        const confirmBtn = document.getElementById('btn-position-modal-ok');
        const newConfirmBtn = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);

        const cancelBtn = document.getElementById('btn-position-modal-cancel');
        const newCancelBtn = cancelBtn.cloneNode(true);
        cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);

        newConfirmBtn.addEventListener('click', () => {
            const x = parseFloat(document.getElementById('position-modal-x').value);
            const y = parseFloat(document.getElementById('position-modal-y').value);

            if (shape.inherited) {
                shape.inherited = false;
            }

            if (!isNaN(x)) shape.x = x;
            if (!isNaN(y)) shape.y = y;

            AppState.saveToLocalStorage();
            this.render();

            document.getElementById('position-modal').classList.add('hidden');

            if (typeof Elements !== 'undefined') {
                Elements.setupContextMenu();
            }
        });

        newCancelBtn.addEventListener('click', () => {
            document.getElementById('position-modal').classList.add('hidden');
        });

        Utils.openModal('position-modal');
    },

    // Show size dialog
    showSizeDialog(shape) {
        this.contextMenuShape = shape;

        const modal = document.getElementById('size-modal');
        const heightGroup = document.getElementById('size-modal-height-group');

        document.getElementById('size-modal-width').value = Math.round(shape.width);
        if (shape.type === 'rectangle' || shape.type === 'ellipse') {
            heightGroup.style.display = 'block';
            document.getElementById('size-modal-height').value = Math.round(shape.height);
        } else {
            heightGroup.style.display = 'none';
        }

        const confirmBtn = document.getElementById('btn-size-modal-ok');
        const newConfirmBtn = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);

        const cancelBtn = document.getElementById('btn-size-modal-cancel');
        const newCancelBtn = cancelBtn.cloneNode(true);
        cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);

        newConfirmBtn.addEventListener('click', () => {
            const width = parseFloat(document.getElementById('size-modal-width').value);
            const height = parseFloat(document.getElementById('size-modal-height').value);

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

            modal.classList.add('hidden');

            if (typeof Elements !== 'undefined') {
                Elements.setupContextMenu();
            }
        });

        newCancelBtn.addEventListener('click', () => {
            modal.classList.add('hidden');
        });

        Utils.openModal('size-modal');
    },

    /** Clears and re-creates all shape SVG elements from AppState.shapes. */
    render() {
        if (!this.layer) {
            return;
        }

        // Clear ALL shape SVGs from the DOM
        this.layer.querySelectorAll('.shape-svg').forEach(svg => {
            svg.remove();
        });
        this.shapeSvgs = {};

        // Render each shape
        if (AppState.shapes) {
            AppState.shapes.forEach(shape => {
                if (shape.visible) {
                    this.renderShape(shape);
                }
            });
        }

        // Update handles if a shape is selected
        this.updateHandles();
    },

    // Render individual shape
    renderShape(shape) {
        const svg = this.createShapeSvg(shape);
        if (svg) {
            this.layer.appendChild(svg);
            this.shapeSvgs[shape.id] = svg;
        }
    },

    // Create SVG for shape
    createShapeSvg(shape) {
        const canvasRect = AppState.canvas.getBoundingClientRect();
        const scaleX = canvasRect.width / AppState.boardWidth;
        const scaleY = canvasRect.height / AppState.boardHeight;

        const x = shape.x * scaleX;
        const y = shape.y * scaleY;

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
        svg.style.pointerEvents = 'all';
        svg.style.cursor = 'default';
        svg.style.touchAction = 'none';
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
            svg.setAttribute('viewBox', `0 0 100 100`);
            svg.setAttribute('width', maxDim);
            svg.setAttribute('height', maxDim);
            svg.style.left = x + 'px';
            svg.style.top = y + 'px';
            svg.style.transform = `translate(${-maxDim/2}px, ${-maxDim/2}px) rotate(${shape.rotation || 0}deg)`;
            svg.style.transformOrigin = `${maxDim/2}px ${maxDim/2}px`;
        }

        // Create shape content
        let content = '';
        switch (shape.type) {
            case 'line':
                content = `<rect x="${-shape.width/2}" y="-10" width="${shape.width}" height="20" fill="transparent" class="shape-drag-handle"/>
                <line x1="${-shape.width/2}" y1="0" x2="${shape.width/2}" y2="0" stroke="${shape.color}" stroke-width="${shape.strokeWidth}" fill="none" vector-effect="non-scaling-stroke"/>`;
                break;
            case 'arrow':
                content = `
                    <rect x="${-shape.width/2}" y="-10" width="${shape.width}" height="20" fill="transparent" class="shape-drag-handle"/>
                    <defs>
                        <marker id="arrowhead-${shape.id}" markerWidth="10" markerHeight="10" refX="10" refY="5" orient="auto">
                            <polygon points="0,0 10,5 0,10" fill="${shape.color}"/>
                        </marker>
                    </defs>
                    <line x1="${-shape.width/2}" y1="0" x2="${shape.width/2}" y2="0" stroke="${shape.color}" stroke-width="${shape.strokeWidth}" fill="none" marker-end="url(#arrowhead-${shape.id})" vector-effect="non-scaling-stroke"/>
                `;
                break;
            case 'rectangle':
                const rectWidth = (width / maxDim) * 100;
                const rectHeight = (height / maxDim) * 100;
                const rectX = (100 - rectWidth) / 2;
                const rectY = (100 - rectHeight) / 2;
                content = `<rect x="${rectX}" y="${rectY}" width="${rectWidth}" height="${rectHeight}" fill="${shape.fillColor}" stroke="${shape.color}" stroke-width="${shape.strokeWidth}" vector-effect="non-scaling-stroke"/>`;
                break;
            case 'circle':
                content = `<circle cx="50" cy="50" r="45" fill="${shape.fillColor}" stroke="${shape.color}" stroke-width="${shape.strokeWidth}" vector-effect="non-scaling-stroke"/>`;
                break;
            case 'ellipse': {
                const ellipseRx = (width / maxDim) * 45;
                const ellipseRy = (height / maxDim) * 45;
                const ellipseText = shape.text ? `<text x="50" y="55" text-anchor="middle" dominant-baseline="middle" font-size="16" font-weight="bold" fill="${shape.color}">${shape.text}</text>` : '';
                content = `<ellipse cx="50" cy="50" rx="${ellipseRx}" ry="${ellipseRy}" fill="${shape.fillColor}" stroke="${shape.color}" stroke-width="${shape.strokeWidth}" vector-effect="non-scaling-stroke"/>${ellipseText}`;
                break;
            }
            case 'text':
                const fontSize = shape.fontSize || 48;
                const text = shape.text || 'Text';
                content = `<text x="50" y="55" text-anchor="middle" font-size="${fontSize}" font-weight="bold" fill="${shape.color}">${text}</text>`;
                break;
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
