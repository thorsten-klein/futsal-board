// Board zoom + pan module.
//
// - Top-right buttons step by AppState.boardZoomStep (zoom toward container center).
// - Ctrl + mouse wheel zooms toward the cursor.
// - Middle-mouse-button drag pans.
// - Two-finger touch pinches to zoom and pans together.
//
// Zoom is multiplied into the per-layer CSS scale() inside
// App.updateBoardVisualRotation(); pan is applied by adding (panX, panY) to each
// layer's base left/top so it stays out of the CSS transform matrix.  That way
// the existing screen<->board coordinate math (which inverts the CSS matrix
// around the canvas centre) keeps working: zoom rides inside the matrix and
// the matrix stays a pure rotate*scale.

const Zoom = {
    init() {
        this.setupButtons();
        this.setupWheel();
        this.setupMouseDrag();
        this.setupTouch();
        this.apply(); // ensure buttons reflect initial state
    },

    // --- core ---

    /** Re-apply zoom + pan to the DOM and refresh the buttons' disabled state. */
    apply() {
        // The single authoritative writer of the layer CSS transform / position
        // is App.updateBoardVisualRotation — call through it so rotation and zoom
        // never fall out of sync.
        if (typeof App !== 'undefined' && App.updateBoardVisualRotation) {
            App.updateBoardVisualRotation();
        }
        this._refreshButtons();
    },

    _refreshButtons() {
        const inBtn = document.getElementById('btn-zoom-in');
        const outBtn = document.getElementById('btn-zoom-out');
        if (inBtn) inBtn.disabled = AppState.boardZoom >= AppState.boardZoomMax - 1e-6;
        if (outBtn) outBtn.disabled = AppState.boardZoom <= AppState.boardZoomMin + 1e-6;
    },

    _clampZoom(z) {
        return Math.max(AppState.boardZoomMin, Math.min(AppState.boardZoomMax, z));
    },

    /**
     * Zoom to `newZoom` while keeping the container-relative point
     * (anchorX, anchorY) — i.e. the point under the cursor — locked in place.
     * If anchor is omitted, zooms around the container centre.
     */
    setZoom(newZoom, anchorX = null, anchorY = null) {
        const old = AppState.boardZoom;
        const z = this._clampZoom(newZoom);
        if (Math.abs(z - old) < 1e-6) return;

        const container = document.querySelector('.board-container');
        const rect = container.getBoundingClientRect();
        const cx = anchorX !== null ? anchorX : rect.width / 2;
        const cy = anchorY !== null ? anchorY : rect.height / 2;

        // Each layer is laid out at (baseLeft + panX, baseTop + panY) and CSS-scaled
        // by `scaleFactor * zoom` around its own centre.  When pan = 0 the layer is
        // centred in the container (Board.resize sets baseLeft = (containerW - layerW)/2),
        // so the layer's "natural centre" in container coordinates is the container centre.
        // For cursor-anchored zoom we keep the point under the cursor on the same board
        // pixel — equivalent to keeping its distance from the layer centre invariant
        // after multiplying by k = z/old:
        //   (cx - newLayerCenter) = k * (cx - oldLayerCenter)
        // → pan_new = cx - k*(cx - naturalCenter - pan_old) - naturalCenter
        const k = z / old;
        const naturalCenterX = rect.width / 2;
        const naturalCenterY = rect.height / 2;
        AppState.boardPanX = cx - k * (cx - naturalCenterX - AppState.boardPanX) - naturalCenterX;
        AppState.boardPanY = cy - k * (cy - naturalCenterY - AppState.boardPanY) - naturalCenterY;
        AppState.boardZoom = z;
        this._constrainPan();
        this.apply();
    },

    setPan(panX, panY) {
        AppState.boardPanX = panX;
        AppState.boardPanY = panY;
        this._constrainPan();
        this.apply();
    },

    /** At zoom=1 there is nothing to pan toward, so snap pan back to 0. */
    _constrainPan() {
        if (AppState.boardZoom <= AppState.boardZoomMin + 1e-6) {
            AppState.boardPanX = 0;
            AppState.boardPanY = 0;
        }
    },

    zoomIn(anchorX = null, anchorY = null) {
        this.setZoom(AppState.boardZoom * AppState.boardZoomStep, anchorX, anchorY);
    },

    zoomOut(anchorX = null, anchorY = null) {
        this.setZoom(AppState.boardZoom / AppState.boardZoomStep, anchorX, anchorY);
    },

    // --- buttons ---

    setupButtons() {
        const inBtn = document.getElementById('btn-zoom-in');
        const outBtn = document.getElementById('btn-zoom-out');
        if (inBtn) inBtn.addEventListener('click', (e) => { e.stopPropagation(); this.zoomIn(); });
        if (outBtn) outBtn.addEventListener('click', (e) => { e.stopPropagation(); this.zoomOut(); });
    },

    // --- wheel ---

    setupWheel() {
        const container = document.querySelector('.board-container');
        if (!container) return;
        container.addEventListener('wheel', (e) => {
            if (!e.ctrlKey) return; // Only zoom when Ctrl is held
            e.preventDefault();
            const rect = container.getBoundingClientRect();
            const ax = e.clientX - rect.left;
            const ay = e.clientY - rect.top;
            // Smaller factor than the button step for finer wheel control.
            const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
            this.setZoom(AppState.boardZoom * factor, ax, ay);
        }, { passive: false });
    },

    // --- middle-mouse-button drag pan ---

    setupMouseDrag() {
        const container = document.querySelector('.board-container');
        if (!container) return;

        let panning = false;
        let lastX = 0, lastY = 0;

        container.addEventListener('mousedown', (e) => {
            if (e.button !== 1) return; // middle button only
            panning = true;
            lastX = e.clientX;
            lastY = e.clientY;
            container.classList.add('panning');
            e.preventDefault();
        });

        // Listen on window so we don't lose mouseup outside the container.
        window.addEventListener('mousemove', (e) => {
            if (!panning) return;
            const dx = e.clientX - lastX;
            const dy = e.clientY - lastY;
            lastX = e.clientX;
            lastY = e.clientY;
            this.setPan(AppState.boardPanX + dx, AppState.boardPanY + dy);
        });

        window.addEventListener('mouseup', (e) => {
            if (!panning) return;
            if (e.button !== 1 && e.button !== undefined) return;
            panning = false;
            container.classList.remove('panning');
        });
    },

    // --- two-finger touch: pinch-to-zoom + pan ---

    setupTouch() {
        const container = document.querySelector('.board-container');
        if (!container) return;

        let active = false;
        let startDist = 0;
        let startZoom = 1;
        let lastMidX = 0, lastMidY = 0;

        const midpoint = (t1, t2, rect) => ({
            x: ((t1.clientX + t2.clientX) / 2) - rect.left,
            y: ((t1.clientY + t2.clientY) / 2) - rect.top,
        });

        const distance = (t1, t2) => {
            const dx = t1.clientX - t2.clientX;
            const dy = t1.clientY - t2.clientY;
            return Math.hypot(dx, dy);
        };

        container.addEventListener('touchstart', (e) => {
            if (e.touches.length !== 2) return;
            const rect = container.getBoundingClientRect();
            active = true;
            startDist = distance(e.touches[0], e.touches[1]);
            startZoom = AppState.boardZoom;
            const m = midpoint(e.touches[0], e.touches[1], rect);
            lastMidX = m.x;
            lastMidY = m.y;
            e.preventDefault();
        }, { passive: false });

        container.addEventListener('touchmove', (e) => {
            if (!active) return;
            if (e.touches.length !== 2) { active = false; return; }
            e.preventDefault();
            const rect = container.getBoundingClientRect();
            const m = midpoint(e.touches[0], e.touches[1], rect);

            // Pan with the midpoint delta.
            const dx = m.x - lastMidX;
            const dy = m.y - lastMidY;
            AppState.boardPanX += dx;
            AppState.boardPanY += dy;
            lastMidX = m.x;
            lastMidY = m.y;

            // Pinch zoom relative to the midpoint (same anchor math as setZoom).
            const d = distance(e.touches[0], e.touches[1]);
            if (startDist > 0) {
                const target = this._clampZoom(startZoom * (d / startDist));
                if (Math.abs(target - AppState.boardZoom) > 1e-6) {
                    const k = target / AppState.boardZoom;
                    const ncX = rect.width / 2;
                    const ncY = rect.height / 2;
                    AppState.boardPanX = m.x - k * (m.x - ncX - AppState.boardPanX) - ncX;
                    AppState.boardPanY = m.y - k * (m.y - ncY - AppState.boardPanY) - ncY;
                    AppState.boardZoom = target;
                }
            }
            this._constrainPan();
            this.apply();
        }, { passive: false });

        const endTouch = () => { active = false; };
        container.addEventListener('touchend', endTouch);
        container.addEventListener('touchcancel', endTouch);
    },
};
