// Drawing management (arrows and lines)
const Drawings = {
    /** Attaches drawing layer event listeners for freehand path drawing. */
    init() {
        this.setupSVG();
        this.setupEventListeners();
        this.render();
    },

    // Setup SVG layer
    setupSVG() {
        const svg = document.getElementById('drawing-layer');

        // Create arrow marker
        const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
        marker.setAttribute('id', 'arrowhead');
        marker.setAttribute('markerWidth', '10');
        marker.setAttribute('markerHeight', '10');
        marker.setAttribute('refX', '9');
        marker.setAttribute('refY', '3');
        marker.setAttribute('orient', 'auto');

        const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        polygon.setAttribute('points', '0 0, 10 3, 0 6');
        polygon.setAttribute('fill', 'black');

        marker.appendChild(polygon);
        defs.appendChild(marker);
        svg.appendChild(defs);
    },

    // Setup event listeners
    setupEventListeners() {
        const boardContainer = document.querySelector('.board-container');

        boardContainer.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        document.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        document.addEventListener('mouseup', (e) => this.handleMouseUp(e));
    },

    // Handle mouse down
    handleMouseDown(e) {
        // Deselect element when clicking on board (if not on a drawing tool)
        if (AppState.currentTool === 'select' && AppState.selectedElement) {
            AppState.selectedElement = null;
            if (typeof Elements !== 'undefined') {
                Elements.render();
            }
        }

        if (AppState.currentTool !== 'arrow' && AppState.currentTool !== 'line') return;

        const pos = Board.getMousePos(e);
        AppState.drawingStart = pos;
        AppState.currentDrawing = {
            type: AppState.currentTool,
            x1: pos.x,
            y1: pos.y,
            x2: pos.x,
            y2: pos.y,
            color: 'black'
        };

        document.getElementById('drawing-layer').classList.add('drawing');
    },

    // Handle mouse move
    handleMouseMove(e) {
        if (!AppState.currentDrawing) return;

        const pos = Board.getMousePos(e);
        AppState.currentDrawing.x2 = pos.x;
        AppState.currentDrawing.y2 = pos.y;

        this.renderTemp();
    },

    // Handle mouse up
    handleMouseUp(e) {
        if (!AppState.currentDrawing) return;

        const distance = Math.sqrt(
            Math.pow(AppState.currentDrawing.x2 - AppState.currentDrawing.x1, 2) +
            Math.pow(AppState.currentDrawing.y2 - AppState.currentDrawing.y1, 2)
        );

        // Only add if distance is significant
        if (distance > 20) {
            AppState.drawings.push({ ...AppState.currentDrawing });
            AppState.saveToLocalStorage();
        }

        AppState.currentDrawing = null;
        AppState.drawingStart = null;

        document.getElementById('drawing-layer').classList.remove('drawing');

        this.render();
    },

    /** Redraws all SVG paths and arrows from AppState.drawings onto the drawing layer. */
    render() {
        const svg = document.getElementById('drawing-layer');

        // Safety check: don't render if SVG doesn't exist yet
        if (!svg) {
            return;
        }

        // Remove all paths except defs
        const paths = svg.querySelectorAll('path, line');
        paths.forEach(p => p.remove());

        // Draw all saved drawings
        AppState.drawings.forEach(drawing => {
            this.drawElement(drawing, false);
        });
    },

    // Render temporary drawing
    renderTemp() {
        this.render();

        if (AppState.currentDrawing) {
            this.drawElement(AppState.currentDrawing, true);
        }
    },

    // Draw a single element
    drawElement(drawing, isTemp) {
        const svg = document.getElementById('drawing-layer');
        const d = `M ${drawing.x1} ${drawing.y1} L ${drawing.x2} ${drawing.y2}`;

        const element = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        element.setAttribute('d', d);
        element.setAttribute('stroke', drawing.color);

        if (drawing.type === 'arrow') {
            element.setAttribute('class', isTemp ? 'arrow temp' : 'arrow');
            element.setAttribute('marker-end', 'url(#arrowhead)');
        } else {
            element.setAttribute('class', isTemp ? 'line temp' : 'line');
        }

        svg.appendChild(element);
    },

    // Clear all drawings
    clear() {
        AppState.drawings = [];
        AppState.saveToLocalStorage();
        this.render();
    }
};
