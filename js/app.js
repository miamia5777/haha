// ═══════════════════════════════════════════════
// App Controller - Login & Lobby
// ═══════════════════════════════════════════════

const app = {
  currentScreen: 'login',

  activeTab: 'game',
  allTables: [],
  history: JSON.parse(localStorage.getItem('baccarat_history') || '[]'),
  
  // Filter state
  filterTypes: [
    { id: 'long_b', name: '长庄', icon: '🔴' },
    { id: 'long_p', name: '长闲', icon: '🔵' },
    { id: 'single_jump', name: '大路单跳', icon: '🔴🔵' },
    { id: '1b2p', name: '一庄两闲', icon: '🔴🔵🔵' },
    { id: '1p2b', name: '一闲两庄', icon: '🔵🔴🔴' },
    { id: 'long_to_jump', name: '长路转单跳', icon: '📏🤾' },
    { id: 'b_connect', name: '逢庄连', icon: '🔴🔗' },
    { id: 'p_connect', name: '逢闲连', icon: '🔵🔗' },
    { id: 'b_jump', name: '逢庄跳', icon: '🔴🤾' },
    { id: 'p_jump', name: '逢闲跳', icon: '🔵🤾' },
    { id: 'row_connect', name: '排排连', icon: '📊' }
  ],
  selectedFilters: ['long_b', 'long_p', 'single_jump'], // Default selection
  currentGameMode: 'all',

  showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id + '-screen').classList.add('active');
    this.currentScreen = id;
  },

  openFilter() {
    const modal = document.getElementById('filter-modal');
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('active'), 10);
    this._renderFilterOptions();
    this._updateSelectAllState();
  },

  closeFilter() {
    const modal = document.getElementById('filter-modal');
    modal.classList.remove('active');
    setTimeout(() => modal.style.display = 'none', 300);
  },

  _renderFilterOptions() {
    const container = document.getElementById('filter-options');
    container.innerHTML = '';
    
    this.filterTypes.forEach(type => {
      const isSelected = this.selectedFilters.includes(type.id);
      const opt = document.createElement('div');
      opt.className = `filter-option ${isSelected ? 'selected' : ''}`;
      opt.onclick = () => this.toggleFilter(type.id);
      
      opt.innerHTML = `
        <span class="option-name">${type.name}</span>
        <div class="option-preview">
          <span style="font-size: 24px;">${type.icon}</span>
        </div>
        <div class="option-checkbox"></div>
      `;
      container.appendChild(opt);
    });
  },

  toggleFilter(id) {
    if (this.selectedFilters.includes(id)) {
      this.selectedFilters = this.selectedFilters.filter(f => f !== id);
    } else {
      this.selectedFilters.push(id);
    }
    this._renderFilterOptions();
    this._updateSelectAllState();
  },

  toggleSelectAll(checked) {
    if (checked) {
      this.selectedFilters = this.filterTypes.map(f => f.id);
    } else {
      this.selectedFilters = [];
    }
    this._renderFilterOptions();
  },

  _updateSelectAllState() {
    const cb = document.getElementById('select-all-filters');
    cb.checked = this.selectedFilters.length === this.filterTypes.length;
  },

  applyFilter() {
    this.closeFilter();
    const label = document.querySelector('.active-filters-label');
    if (label) {
      if (this.selectedFilters.length === this.filterTypes.length) label.innerText = '全部好路';
      else if (this.selectedFilters.length === 0) label.innerText = '未选好路';
      else label.innerText = `筛选: ${this.selectedFilters.length}项`;
    }
    if (this.activeTab === 'good') {
      this.switchTab('good');
    }
  },

  setGameMode(mode) {
    this.currentGameMode = mode;
    document.querySelectorAll('.filter-chip').forEach(chip => {
      chip.classList.toggle('active', chip.id === `filter-game-${mode}`);
    });
    this.switchTab('game');
  },

  login() {
    this.showScreen('lobby');
    this._generateTables();
    this.switchTab('game');
  },

  logout() {
    this.showScreen('login');
  },

  switchTab(tabId) {
    this.activeTab = tabId;
    
    // Update Nav UI
    document.querySelectorAll('.nav-item').forEach(item => {
      const isMatch = item.getAttribute('onclick').includes(`'${tabId}'`);
      item.classList.toggle('active', isMatch);
    });
    
    // Update Tab Content UI
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.toggle('active', content.id === `tab-${tabId}`);
    });

    // Toggle Multi Betting Bar
    const multiBar = document.getElementById('multi-betting-bar');
    if (multiBar) {
      multiBar.style.display = (tabId === 'multi') ? 'flex' : 'none';
    }

    if (tabId === 'game') {
      this._generateTables(true); // Force refresh
      let filtered = this.allTables;
      if (this.currentGameMode === 'classic') {
        filtered = this.allTables.filter(t => t.tName.includes('国际') || t.tName.includes('咪牌') || t.tName.includes('贵宾'));
      } else if (this.currentGameMode === 'speed') {
        filtered = this.allTables.filter(t => t.tName.includes('极速') || t.tName.includes('急速'));
      }
      this._updateFilterCounts();
      this._renderTables(filtered, 'lobby-grid');
    } else if (tabId === 'good') {
      this._generateTables(true); // Force refresh
      const goodRoads = this.allTables.filter(t => {
        if (t.trend === '') return false;
        
        // Match selected filters
        return this.selectedFilters.some(fId => {
          if (fId === 'long_b' && t.trend.includes('连庄')) return true;
          if (fId === 'long_p' && t.trend.includes('连闲')) return true;
          if (fId === 'single_jump' && t.trend.includes('单跳')) return true;
          if (fId === '1b2p' && t.trend.includes('一庄两闲')) return true;
          if (fId === '1p2b' && t.trend.includes('一闲两庄')) return true;
          if (fId === 'row_connect' && t.trend.includes('排排连')) return true;
          // For other types, we'll allow if trend is not empty for demo
          if (['long_to_jump', 'b_connect', 'p_connect', 'b_jump', 'p_jump'].includes(fId)) return true;
          return false;
        });
      });
      this._renderTables(goodRoads, 'good-road-grid');
    } else if (tabId === 'multi') {
      this._generateTables(true);
      this._renderMultiTables(this.allTables, 'multi-table-grid');
    } else if (tabId === 'history') {
      this._populateHistory();
    }
  },

  _generateTables(force = false) {
    if (this.allTables.length > 0 && !force) return;
    this.allTables = []; // Clear existing

    const prefixes = ['极速百家乐', '咪牌百家乐', '国际百家乐', 'VIP百家乐', '贵宾百家乐', '急速无佣'];
    const statuses = ['请下注 15s', '请下注 08s', '请下注 03s', '开牌中', '结算中', '洗牌中'];

    for (let idx = 0; idx < 20; idx++) {
      const tId = idx + 1;
      const tName = prefixes[Math.floor(Math.random() * prefixes.length)];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const online = Math.floor(Math.random() * 451) + 50;

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

      const { columns } = buildBigRoad(history);
      let trend = '';
      if (columns.length > 0) {
        const lastCol = columns[columns.length - 1];
        if (lastCol.length >= 4) trend = `${lastCol.length}连${lastCol[0] === 'B' ? '庄' : '闲'}`;
        else if (columns.length >= 5 && columns.slice(-5).every(c => c.length === 1)) trend = '单跳循环';
        else if (Math.random() < 0.1) trend = '一庄两闲';
        else if (Math.random() < 0.1) trend = '一闲两庄';
        else if (Math.random() < 0.1) trend = '排排连';
        else if (stats.banker > stats.player + 10) trend = '庄旺';
        else if (stats.player > stats.banker + 10) trend = '闲旺';
      }

      this.allTables.push({ tId, tName, status, online, history, stats, trend });
    }
    this._updateFilterCounts();
  },

  _updateFilterCounts() {
    const counts = {
      all: this.allTables.length,
      classic: this.allTables.filter(t => t.tName.includes('国际') || t.tName.includes('咪牌') || t.tName.includes('贵宾')).length,
      speed: this.allTables.filter(t => t.tName.includes('极速') || t.tName.includes('急速')).length
    };
    
    const allEl = document.getElementById('filter-game-all');
    const classicEl = document.getElementById('filter-game-classic');
    const speedEl = document.getElementById('filter-game-speed');
    
    if (allEl) allEl.innerHTML = `全部 <span class="filter-count">${counts.all}桌</span>`;
    if (classicEl) classicEl.innerHTML = `经典百家乐 <span class="filter-count">${counts.classic}桌</span>`;
    if (speedEl) speedEl.innerHTML = `极速百家乐 <span class="filter-count">${counts.speed}桌</span>`;
  },

  _renderTables(tables, containerId) {
    const grid = document.getElementById(containerId);
    grid.innerHTML = '';

    tables.forEach(table => {
      const { tId, tName, status, online, history, stats, trend } = table;
      let statusCls = 'other';
      if (status.includes('下注')) statusCls = 'betting';
      else if (status.includes('开牌')) statusCls = 'dealing';

      const card = document.createElement('div');
      card.className = 'table-card';
      const canvasId = `road-${containerId}-${tId}`;
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
          <canvas id="${canvasId}"></canvas>
        </div>
        <div class="table-card-stats">
          <span style="color:#8888aa">◉ ${stats.total}</span>
          <span style="color:#ff1133">🔴 ${stats.banker}</span>
          <span style="color:#1166ff">🔵 ${stats.player}</span>
          <span style="color:#11cc55">🟢 ${stats.tie}</span>
        </div>
      `;
      card.addEventListener('click', () => {
        this.addToHistory(table);
        game.enterTable(tId, history);
      });
      grid.appendChild(card);

      requestAnimationFrame(() => {
        this._drawMiniRoad(canvasId, history);
      });
    });
  },

  addToHistory(tableData, profit = 0) {
    // Check if we already have an entry for this room today
    const today = new Date().toISOString().split('T')[0];
    const existingIndex = this.history.findIndex(h => h.tId === tableData.tId && h.visitedAt.startsWith(today));
    
    if (existingIndex !== -1) {
      // Update existing entry (keep earliest visit time, add profit)
      const existing = this.history[existingIndex];
      existing.profit = (existing.profit || 0) + profit;
      // Move to front
      this.history.splice(existingIndex, 1);
      this.history.unshift(existing);
    } else {
      const entry = {
        ...tableData,
        profit: profit,
        visitedAt: new Date().toISOString()
      };
      this.history.unshift(entry);
    }
    
    if (this.history.length > 40) this.history.pop();
    localStorage.setItem('baccarat_history', JSON.stringify(this.history));
  },

  _populateHistory() {
    const container = document.getElementById('history-grid');
    container.innerHTML = '';
    
    if (this.history.length === 0) {
      container.innerHTML = '<div style="color:#aaa; text-align:center; padding:40px; width:100%;">暂无历史记录</div>';
      return;
    }

    // Group by date
    const groups = {};
    this.history.forEach(item => {
      const date = item.visitedAt.split('T')[0];
      if (!groups[date]) groups[date] = [];
      groups[date].push(item);
    });

    Object.keys(groups).sort((a,b) => b.localeCompare(a)).forEach(date => {
      const groupDiv = document.createElement('div');
      groupDiv.className = 'history-date-group';
      
      const header = document.createElement('div');
      header.className = 'history-date-header';
      header.innerText = this._formatHistoryDate(date);
      groupDiv.appendChild(header);

      const grid = document.createElement('div');
      grid.className = 'history-grid';
      groupDiv.appendChild(grid);
      container.appendChild(groupDiv);

      // We need a unique prefix for canvas IDs in history
      const tables = groups[date];
      this._renderTablesToGrid(tables, grid, `hist-${date}`);
    });
  },

  _renderTablesToGrid(tables, grid, prefix) {
    tables.forEach(table => {
      const { tId, tName, status, online, history, stats, trend, profit } = table;
      let statusCls = 'other';
      if (status.includes('下注')) statusCls = 'betting';
      else if (status.includes('开牌')) statusCls = 'dealing';

      const profitNum = profit || 0;
      const profitColor = profitNum > 0 ? '#ff1133' : (profitNum < 0 ? '#11cc55' : '#888');
      const profitText = profitNum > 0 ? `+${profitNum}` : profitNum;

      const card = document.createElement('div');
      card.className = 'table-card';
      const canvasId = `road-${prefix}-${tId}`;
      card.innerHTML = `
        <div class="table-card-video">
          <div class="table-card-head">
            <span class="table-card-title">${tName} ${tId}</span>
            <span class="table-card-status ${statusCls}">${status}</span>
          </div>
          <span class="table-card-online">👤 ${online}</span>
          <div class="table-card-profit" style="position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); background:rgba(0,0,0,0.75); padding:6px 12px; border-radius:30px; font-size:12px; color:#fff; border:1px solid rgba(212,175,55,0.4); backdrop-filter:blur(4px); white-space:nowrap; box-shadow:0 4px 10px rgba(0,0,0,0.3);">
            我的盈利: <span style="color:${profitColor}; font-weight:900; font-size:15px; text-shadow:0 0 8px ${profitColor}44;">${profitText}</span>
          </div>
          <div class="table-card-foot">
            <span class="table-card-limit">限红: 100~50K</span>
            <span class="table-card-trend">${trend}</span>
          </div>
        </div>
        <div class="table-card-roadmap">
          <canvas id="${canvasId}"></canvas>
        </div>
        <div class="table-card-stats">
          <span style="color:#8888aa">◉ ${stats.total}</span>
          <span style="color:#ff1133">🔴 ${stats.banker}</span>
          <span style="color:#1166ff">🔵 ${stats.player}</span>
          <span style="color:#11cc55">🟢 ${stats.tie}</span>
        </div>
      `;
      card.addEventListener('click', () => {
        this.addToHistory(table);
        game.enterTable(tId, history);
      });
      grid.appendChild(card);

      requestAnimationFrame(() => {
        this._drawMiniRoad(canvasId, history);
      });
    });
  },

  _renderMultiTables(tables, gridId) {
    const grid = document.getElementById(gridId);
    grid.innerHTML = '';
    
    tables.forEach(table => {
      const { tId, tName, status, online, history, stats, trend } = table;
      const card = document.createElement('div');
      card.className = 'gr-card';
      const canvasId = `multi-road-${tId}`;
      
      const isSpeed = tName.includes('极速') || tName.includes('急速');
      const trendColor = trend.includes('庄') ? 'trend-red' : 'trend-blue';

      card.innerHTML = `
        <div class="gr-card-top">
          <span class="gr-card-title">${tName} ${tId}</span>
          <div class="gr-card-timer">
            <div class="gr-timer-bar"></div>
            <span class="gr-timer-text">18</span>
          </div>
          <span class="gr-card-trend ${trendColor}">${trend}</span>
        </div>
        <div class="gr-card-body">
          <div class="gr-roadmap">
            <canvas id="${canvasId}"></canvas>
          </div>
          <div class="gr-actions">
            <div class="gr-bet-row">
              <button class="gr-btn-bet gr-btn-player">
                <span style="font-size:14px">闲</span>
                <span class="gr-payout">1:1</span>
              </button>
              <button class="gr-btn-bet gr-btn-banker">
                <span style="font-size:14px">庄</span>
                <span class="gr-payout">1:0.95</span>
              </button>
            </div>
            <div class="gr-sub-actions">
              <button class="gr-btn-sub">和 1:8</button>
              <button class="gr-btn-sub">对子 1:11</button>
            </div>
          </div>
        </div>
      `;
      card.addEventListener('click', (e) => {
        if (!e.target.closest('button')) {
          this.addToHistory(table);
          game.enterTable(tId, history);
        }
      });
      grid.appendChild(card);
      
      requestAnimationFrame(() => {
        this._drawMiniRoad(canvasId, history);
      });
    });
  },

  _formatHistoryDate(dateStr) {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    if (dateStr === today) return '今天';
    if (dateStr === yesterday) return '昨天';
    return dateStr;
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
