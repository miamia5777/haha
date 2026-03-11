// ═══════════════════════════════════════════════
// Five Roads Canvas Renderer
// Translated from ui/game_screen.py road widgets
// ═══════════════════════════════════════════════

class RoadsCanvas {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.history = [];
    this.stats = { total: 0, B: 0, P: 0, T: 0, BP: 0, PP: 0 };
    this.nextDerived = { B: [], P: [] };

    this.isSimulating = false;
    this.originalHistory = null;
    this._simTimer = null;

    // Create canvases
    this._createLayout();

    window.addEventListener('resize', () => this._resizeAll());
    // Defer initial resize to after DOM layout
    requestAnimationFrame(() => this._resizeAll());
  }

  _createLayout() {
    this.container.innerHTML = '';
    this.container.style.display = 'flex';
    this.container.style.flexDirection = 'column';
    this.container.style.gap = '0px';

    // Stats bar
    this.statsBar = document.createElement('div');
    this.statsBar.className = 'roads-stats-bar';
    this.container.appendChild(this.statsBar);

    // Roads area
    const roadsArea = document.createElement('div');
    roadsArea.className = 'roads-area';
    roadsArea.style.display = 'flex';
    roadsArea.style.flex = '1';
    roadsArea.style.gap = '1px';
    roadsArea.style.minHeight = '0';
    roadsArea.style.background = 'rgba(50,40,40,0.2)'; // Grid lines color
    roadsArea.style.padding = '1px'; // Border around

    // Left: Bead road (35%)
    const beadWrap = document.createElement('div');
    beadWrap.style.flex = '35';
    beadWrap.style.position = 'relative';
    this.beadCanvas = document.createElement('canvas');
    this.beadCanvas.style.width = '100%';
    this.beadCanvas.style.height = '100%';
    beadWrap.appendChild(this.beadCanvas);
    roadsArea.appendChild(beadWrap);

    // Right column (65%)
    const rightCol = document.createElement('div');
    rightCol.style.flex = '65';
    rightCol.style.display = 'flex';
    rightCol.style.flexDirection = 'column';
    rightCol.style.gap = '1px';
    rightCol.style.minHeight = '0';

    // Top Right: Big road (60% height)
    const bigWrap = document.createElement('div');
    bigWrap.style.flex = '60';
    bigWrap.style.position = 'relative';
    bigWrap.style.minHeight = '0';
    this.bigRoadCanvas = document.createElement('canvas');
    this.bigRoadCanvas.style.width = '100%';
    this.bigRoadCanvas.style.height = '100%';
    bigWrap.appendChild(this.bigRoadCanvas);
    rightCol.appendChild(bigWrap);

    // Bottom Right: Derived roads row (40% height)
    const derivedRow = document.createElement('div');
    derivedRow.style.flex = '40';
    derivedRow.style.display = 'flex';
    derivedRow.style.gap = '1px';
    derivedRow.style.minHeight = '0';

    this.bigEyeCanvas = document.createElement('canvas');
    this.smallRoadCanvas = document.createElement('canvas');
    this.cockroachCanvas = document.createElement('canvas');

    [this.bigEyeCanvas, this.smallRoadCanvas, this.cockroachCanvas].forEach(c => {
      const wrap = document.createElement('div');
      wrap.style.flex = '1';
      wrap.style.position = 'relative';
      wrap.style.minHeight = '0';
      c.style.width = '100%';
      c.style.height = '100%';
      wrap.appendChild(c);
      derivedRow.appendChild(wrap);
    });

    rightCol.appendChild(derivedRow);
    roadsArea.appendChild(rightCol);
    this.container.appendChild(roadsArea);
  }

  _resizeCanvas(canvas) {
    const parent = canvas.parentElement;
    if (!parent) return;
    const dpr = window.devicePixelRatio || 1;
    const w = parent.clientWidth;
    const h = parent.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, w, h };
  }

  _resizeAll() {
    this._drawAll();
  }

  updateData(history) {
    if (!this.isSimulating) {
      this.history = history;
    }
    this._updateStats();
    this._drawAll();
  }

  simulateOutcome(winner) {
    if (this._simTimer) clearTimeout(this._simTimer);
    if (this._animFrame) cancelAnimationFrame(this._animFrame);
    
    // Save original if not already simulating
    if (!this.isSimulating) {
      this.originalHistory = [...this.history];
    }
    
    this.isSimulating = true;
    this.history = [...this.originalHistory, [winner, false, false]];
    this._updateStats();

    // Start render loop for blinking
    const animLoop = () => {
      if (!this.isSimulating) return;
      this._drawAll();
      this._animFrame = requestAnimationFrame(animLoop);
    };
    this._animFrame = requestAnimationFrame(animLoop);

    // Revert after 3 seconds
    this._simTimer = setTimeout(() => {
      this.isSimulating = false;
      cancelAnimationFrame(this._animFrame);
      this.history = [...this.originalHistory];
      this._updateStats();
      this._drawAll();
      this._simTimer = null;
    }, 3000);
  }

  _updateStats() {
    this.stats = { total: this.history.length, B: 0, P: 0, T: 0, BP: 0, PP: 0 };
    for (const h of this.history) {
      const w = h[0];
      if (w === 'B') this.stats.B++;
      else if (w === 'P') this.stats.P++;
      else this.stats.T++;
      if (h[1]) this.stats.BP++;
      if (h[2]) this.stats.PP++;
    }

    this.nextDerived.B = this._predictNext('B');
    this.nextDerived.P = this._predictNext('P');
    this._renderStatsBar();
  }

  _predictNext(mockWinner) {
    const mockHistory = [...this.history, [mockWinner, false, false]];
    const { columns } = buildBigRoad(mockHistory);
    const dr1 = buildDerivedRoad(columns, 1);
    const dr2 = buildDerivedRoad(columns, 2);
    const dr3 = buildDerivedRoad(columns, 3);
    return [
      dr1.length ? dr1[dr1.length - 1] : 'R',
      dr2.length ? dr2[dr2.length - 1] : 'R',
      dr3.length ? dr3[dr3.length - 1] : 'R',
    ];
  }

  _renderStatsBar() {
    const s = this.stats;
    const nd = this.nextDerived;
    this.statsBar.innerHTML = `
      <div class="stats-items">
        <span class="stat-item"><span class="stat-dot stat-total">◉</span>${s.total}</span>
        <span class="stat-item"><span class="stat-dot stat-banker">🔴</span>${s.B}</span>
        <span class="stat-item"><span class="stat-dot stat-player">🔵</span>${s.P}</span>
        <span class="stat-item"><span class="stat-dot stat-tie">🟢</span>${s.T}</span>
      </div>
      <div class="stats-buttons">
        <button class="ask-road-btn" id="btn-ask-banker">
          <span class="ask-dots">
            <span class="ask-dot-hollow" style="border-color:${nd.B[0] === 'R' ? COLORS.BANKER_RED_LIGHT : COLORS.PLAYER_BLUE_LIGHT}"></span>
            <span class="ask-dot-solid" style="background:${nd.B[1] === 'R' ? COLORS.BANKER_RED_LIGHT : COLORS.PLAYER_BLUE_LIGHT}"></span>
            <span class="ask-dot-slash" style="color:${nd.B[2] === 'R' ? COLORS.BANKER_RED_LIGHT : COLORS.PLAYER_BLUE_LIGHT}">/</span>
          </span>
          <span>庄问路</span>
        </button>
        <button class="ask-road-btn" id="btn-ask-player">
          <span class="ask-dots">
            <span class="ask-dot-hollow" style="border-color:${nd.P[0] === 'R' ? COLORS.BANKER_RED_LIGHT : COLORS.PLAYER_BLUE_LIGHT}"></span>
            <span class="ask-dot-solid" style="background:${nd.P[1] === 'R' ? COLORS.BANKER_RED_LIGHT : COLORS.PLAYER_BLUE_LIGHT}"></span>
            <span class="ask-dot-slash" style="color:${nd.P[2] === 'R' ? COLORS.BANKER_RED_LIGHT : COLORS.PLAYER_BLUE_LIGHT}">/</span>
          </span>
          <span>闲问路</span>
        </button>
        <button class="ask-road-btn" id="btn-good-road">好路投注</button>
      </div>
    `;
  }

  _drawAll() {
    this._drawBeadRoad();
    this._drawBigRoad();
    this._drawDerivedRoad(this.bigEyeCanvas, 1, '大眼仔');
    this._drawDerivedRoad(this.smallRoadCanvas, 2, '小路');
    this._drawDerivedRoad(this.cockroachCanvas, 3, '甲由路');
  }

  // ── Bead Road (珠盘路) ──
  _drawBeadRoad() {
    const info = this._resizeCanvas(this.beadCanvas);
    if (!info) return;
    const { ctx, w, h } = info;

    ctx.fillStyle = 'rgba(10,6,6,0.94)';
    ctx.fillRect(0, 0, w, h);

    const rows = 6;
    const cols = Math.max(Math.floor(w / (h / rows)), 6);
    const cell = Math.min(w / cols, h / rows);

    // Grid
    ctx.strokeStyle = 'rgba(50,40,40,0.2)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= cols; i++) {
      ctx.beginPath();
      ctx.moveTo(i * cell, 0);
      ctx.lineTo(i * cell, rows * cell);
      ctx.stroke();
    }
    for (let j = 0; j <= rows; j++) {
      ctx.beginPath();
      ctx.moveTo(0, j * cell);
      ctx.lineTo(cols * cell, j * cell);
      ctx.stroke();
    }

    const data = this.history.map(h => (Array.isArray(h) ? h[0] : h));
    for (let idx = 0; idx < data.length; idx++) {
      const col = Math.floor(idx / rows);
      const row = idx % rows;
      if (col >= cols) break;

      const cx = col * cell + cell / 2;
      const cy = row * cell + cell / 2;
      const radius = cell / 2 - 2;
      const val = data[idx];

      let color, cn;
      if (val === 'B') { color = COLORS.BANKER_RED; cn = '庄'; }
      else if (val === 'P') { color = COLORS.PLAYER_BLUE; cn = '闲'; }
      else { color = COLORS.TIE_GREEN; cn = '和'; }

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#fff';
      ctx.font = `bold ${Math.max(Math.floor(cell * 0.4), 5)}px "PingFang SC", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(cn, cx, cy);
    }
  }

  // ── Big Road (大路) ──
  _drawBigRoad() {
    const info = this._resizeCanvas(this.bigRoadCanvas);
    if (!info) return;
    const { ctx, w, h } = info;

    ctx.fillStyle = 'rgba(10,6,6,0.94)';
    ctx.fillRect(0, 0, w, h);

    const rows = 6; // Logical rows for dragon tail
    const displayRows = 6; // Reverted back to 6 visual rows
    const cellH = h / displayRows; 
    const cellW = cellH;
    const cols = Math.max(Math.floor(w / cellW), 10);

    // Grid
    ctx.strokeStyle = 'rgba(50,40,40,0.2)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= cols; i++) {
      const x = i * cellW;
      if (x <= w) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
    }
    for (let j = 0; j <= displayRows; j++) {
      const y = j * cellH;
      if (y <= h) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
    }

    const { columns, ties } = buildBigRoad(this.history);
    if (!columns.length) return;

    // Is the very last item in the very last column the simulated one?
    const lastColIdx = columns.length - 1;
    const lastRowIdx = columns[lastColIdx].length - 1;

    const positions = {};
    let drawCol = 0;

    // Only show last N columns that fit
    const startCol = 0;
    for (let colIdx = startCol; colIdx < columns.length; colIdx++) {
      const column = columns[colIdx];
      for (let rowIdx = 0; rowIdx < column.length; rowIdx++) {
        let r = rowIdx;
        let c = drawCol;

        // Dragon tail
        if (r >= rows) {
          r = rows - 1;
          c = drawCol + (rowIdx - rows + 1);
        }
        if (c >= cols) continue;

        const cx = c * cellW + cellW / 2;
        const cy = r * cellH + cellH / 2;
        const radius = Math.min(cellW, cellH) / 2 - 4; // Keep circle slightly smaller relative to cell

        const color = column[rowIdx] === 'B' ? COLORS.BANKER_RED_LIGHT : COLORS.PLAYER_BLUE_LIGHT;
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;

        let alpha = 1;
        if (this.isSimulating && colIdx === lastColIdx && rowIdx === lastRowIdx) {
          alpha = 0.4 + 0.6 * Math.sin(Date.now() / 150); // Blink effect
        }
        
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;

        positions[`${colIdx},${rowIdx}`] = [cx, cy];
      }
      const overflow = Math.max(0, column.length - rows);
      drawCol += 1 + overflow;
    }

    // Tie markers
    for (const [ci, ri] of ties) {
      const key = `${ci},${ri}`;
      if (positions[key]) {
        const [cx, cy] = positions[key];
        const r = Math.min(cellW, cellH) / 2 - 1;
        
        let alpha = 1;
        if (this.isSimulating && ci === lastColIdx && ri === lastRowIdx) {
          alpha = 0.4 + 0.6 * Math.sin(Date.now() / 150);
        }

        ctx.strokeStyle = COLORS.TIE_GREEN_LIGHT;
        ctx.lineWidth = 2;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.moveTo(cx - r * 0.5, cy - r * 0.7);
        ctx.lineTo(cx + r * 0.5, cy + r * 0.7);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }
  }

  // ── Derived Roads (大眼仔/小路/甲由路) ──
  _drawDerivedRoad(canvas, cycle, label) {
    const info = this._resizeCanvas(canvas);
    if (!info) return;
    const { ctx, w, h } = info;

    ctx.fillStyle = 'rgba(10,6,6,0.94)';
    ctx.fillRect(0, 0, w, h);

    const rows = 6;
    const cell = Math.min(w / Math.max(Math.floor(w / (h / rows)), 6), h / rows);
    const cols = Math.max(Math.floor(w / cell), 4);

    // Grid
    ctx.strokeStyle = 'rgba(50,40,40,0.16)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= cols; i++) {
      const x = i * cell;
      if (x <= w) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
    }
    for (let j = 0; j <= rows; j++) {
      ctx.beginPath();
      ctx.moveTo(0, j * cell);
      ctx.lineTo(cols * cell, j * cell);
      ctx.stroke();
    }

    const { columns } = buildBigRoad(this.history);
    const roadData = buildDerivedRoad(columns, cycle);

    if (!roadData.length) {
      ctx.fillStyle = 'rgba(60,50,50,1)';
      ctx.font = '7px "PingFang SC", sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(label, 3, 2);
      return;
    }

    let col = 0, row = 0, lastVal = null;
    for (let i = 0; i < roadData.length; i++) {
      const val = roadData[i];
      if (lastVal !== null && val !== lastVal) {
        col++;
        row = 0;
      } else if (lastVal !== null && val === lastVal) {
        row++;
      }

      if (row >= rows) {
        row = rows - 1;
        col++;
      }
      if (col >= cols) break; // Don't draw if beyond canvas

      const cx = col * cell + cell / 2;
      const cy = row * cell + cell / 2;
      const radius = cell / 2 - 2;

      const color = val === 'R' ? COLORS.BANKER_RED_LIGHT : COLORS.PLAYER_BLUE_LIGHT;
      ctx.fillStyle = color;

      let alpha = 1;
      // If simulating, strictly blink ONLY the very last item in the array
      if (this.isSimulating && i === roadData.length - 1) {
         alpha = 0.4 + 0.6 * Math.sin(Date.now() / 150);
      }

      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      lastVal = val;
    }
  }
}

window.RoadsCanvas = RoadsCanvas;
