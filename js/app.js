// ═══════════════════════════════════════════════
// App Controller - Login & Lobby
// ═══════════════════════════════════════════════

const app = {
  currentScreen: 'login',

  showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id + '-screen').classList.add('active');
    this.currentScreen = id;
  },

  login() {
    this.showScreen('lobby');
    this._populateLobby();
  },

  logout() {
    this.showScreen('login');
  },

  _populateLobby() {
    const grid = document.getElementById('lobby-grid');
    if (grid.children.length > 0) return; // Already populated

    const prefixes = ['极速百家乐', '咪牌百家乐', '国际百家乐', 'VIP百家乐', '贵宾百家乐', '急速无佣'];
    const statuses = ['请下注 15s', '请下注 08s', '请下注 03s', '开牌中', '结算中', '洗牌中'];

    for (let idx = 0; idx < 20; idx++) {
      const tId = idx + 1;
      const tName = prefixes[Math.floor(Math.random() * prefixes.length)];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const online = Math.floor(Math.random() * 451) + 50;

      // Generate history
      const history = [];
      let current = Math.random() < 0.5 ? 'B' : 'P';
      const count = Math.floor(Math.random() * 46) + 20;
      for (let i = 0; i < count; i++) {
        const isBP = Math.random() < 0.1;
        const isPP = Math.random() < 0.1;
        if (Math.random() < 0.1) {
          history.push(['T', isBP, isPP]);
        } else {
          if (Math.random() < 0.35) current = current === 'P' ? 'B' : 'P';
          history.push([current, isBP, isPP]);
        }
      }

      const stats = {
        total: history.length,
        banker: history.filter(h => h[0] === 'B').length,
        player: history.filter(h => h[0] === 'P').length,
        tie: history.filter(h => h[0] === 'T').length,
      };

      // Trend
      const { columns } = buildBigRoad(history);
      let trend = '';
      if (columns.length > 0) {
        const lastCol = columns[columns.length - 1];
        if (lastCol.length >= 4) {
          trend = `${lastCol.length}连${lastCol[0] === 'B' ? '庄' : '闲'}`;
        } else if (columns.length >= 5 && columns.slice(-5).every(c => c.length === 1)) {
          trend = '单跳循环';
        } else if (stats.banker > stats.player + 10) {
          trend = '庄旺';
        } else if (stats.player > stats.banker + 10) {
          trend = '闲旺';
        }
      }

      // Status class
      let statusCls = 'other';
      if (status.includes('下注')) statusCls = 'betting';
      else if (status.includes('开牌')) statusCls = 'dealing';

      const card = document.createElement('div');
      card.className = 'table-card';
      card.innerHTML = `
        <div class="table-card-video">
          <div class="table-card-head">
            <span class="table-card-title">${tName} ${tId}</span>
            <span class="table-card-status ${statusCls}">${status}</span>
          </div>
          <span class="table-card-online">👤 ${online}</span>
          <div class="table-card-foot">
            <span class="table-card-limit">限红: 100~50K</span>
            <span class="table-card-trend">${trend}</span>
          </div>
        </div>
        <div class="table-card-roadmap">
          <canvas id="lobby-road-${tId}"></canvas>
        </div>
        <div class="table-card-stats">
          <span style="color:#8888aa">◉ ${stats.total}</span>
          <span style="color:#ff1133">🔴 ${stats.banker}</span>
          <span style="color:#1166ff">🔵 ${stats.player}</span>
          <span style="color:#11cc55">🟢 ${stats.tie}</span>
        </div>
      `;
      card.addEventListener('click', () => {
        game.enterTable(tId, history);
      });
      grid.appendChild(card);

      // Draw mini roadmap after append
      requestAnimationFrame(() => {
        this._drawMiniRoad(`lobby-road-${tId}`, history);
      });
    }
  },

  _drawMiniRoad(canvasId, history) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const parent = canvas.parentElement;
    const dpr = window.devicePixelRatio || 1;
    const w = parent.clientWidth;
    const h = parent.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, w, h);

    const { columns, ties } = buildBigRoad(history);
    if (!columns.length) return;

    const cols = 12, rows = 6;
    const cellW = w / cols;
    const cellH = h / rows;

    // Dots grid
    ctx.fillStyle = 'rgba(220,220,220,1)';
    for (let i = 1; i < cols; i++) {
      for (let j = 1; j < rows; j++) {
        ctx.beginPath();
        ctx.arc(i * cellW, j * cellH, 1, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const startCol = Math.max(0, columns.length - cols);
    const displayCols = columns.slice(startCol);

    let drawCol = 0;
    for (const column of displayCols) {
      for (let rowIdx = 0; rowIdx < column.length; rowIdx++) {
        let r = rowIdx;
        let c = drawCol;
        if (r >= rows) {
          r = rows - 1;
          c = drawCol + (rowIdx - rows + 1);
        }
        if (c >= cols) continue;

        const cx = c * cellW + cellW / 2;
        const cy = r * cellH + cellH / 2;
        const radius = Math.min(cellW, cellH) / 2 - 3;

        const color = column[rowIdx] === 'B' ? '#ff1133' : '#1166ff';
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.stroke();
      }
      const overflow = Math.max(0, column.length - rows);
      drawCol += 1 + overflow;
    }
  },
};

window.app = app;
