// ═══════════════════════════════════════════════
// Game Page Controller
// Translated from ui/game_screen.py GameScreen
// ═══════════════════════════════════════════════

const game = {
  engine: null,
  dealer: null,
  roads: null,
  winOverlay: null,
  bets: { B: 0, P: 0, T: 0, BP: 0, PP: 0 },
  balance: 88888,
  previousBets: {},
  currentChipValue: 10,
  tableId: 1,
  roundCount: 0,
  countdownTotal: 15,
  countdownRemaining: 0,
  gamePhase: 'idle', // idle, betting, dealing, result
  _countdownTimer: null,
  _initialized: false,
  goodRoadOpen: false,

  // ── Initialization ──
  _init() {
    if (this._initialized) return;
    this._initialized = true;

    this.dealer = new DealerCanvas('dealer-canvas');
    this.roads = new RoadsCanvas('roads-container');
    this.winOverlay = new WinBurstOverlay('win-overlay');


    // Chips
    this._createChips();

    // Bet zone click handlers
    ['P', 'T', 'B'].forEach(zone => {
      document.getElementById(`zone-${zone}`).addEventListener('click', () => {
        this.placeBet(zone, this.currentChipValue);
      });
    });

    ['PP', 'BP'].forEach(zone => {
      document.getElementById(`side-${zone.toLowerCase()}`).addEventListener('click', () => {
        this.placeBet(zone, this.currentChipValue);
      });
    });

    // Mock stats for bet zones
    document.querySelectorAll('.mock-players').forEach(el => {
      el.textContent = `👤${Math.floor(Math.random() * 151 + 50)}`;
    });
    document.querySelectorAll('.mock-amount').forEach(el => {
      el.textContent = `💰${Math.floor(Math.random() * 221 + 80)}.${Math.floor(Math.random() * 10)}K`;
    });
    document.querySelectorAll('.side-bet-players').forEach(el => {
      el.textContent = Math.floor(Math.random() * 15 + 1);
    });

    // Good road panel
    this._populateGoodRoads();

    // Roads area buttons handler (delegated)
    this.roads.container.addEventListener('click', (e) => {
      const target = e.target;
      if (target.id === 'btn-good-road' || target.closest('#btn-good-road')) {
        this.toggleGoodRoad();
      } else if (target.id === 'btn-ask-banker' || target.closest('#btn-ask-banker')) {
        this.roads.simulateOutcome('B');
      } else if (target.id === 'btn-ask-player' || target.closest('#btn-ask-player')) {
        this.roads.simulateOutcome('P');
      }
    });

    // Balance roll animation
    this._targetBalance = this.balance;
    this._balanceStep = 0;
    this._balanceTimer = null;
  },

  _createChips() {
    const row = document.getElementById('chips-row');
    const values = [5, 10, 20, 50, 100];
    values.forEach(val => {
      const btn = document.createElement('button');
      btn.className = `chip-btn${val === 10 ? ' selected' : ''}`;
      btn.dataset.value = val;
      btn.innerHTML = `<img src="assets/chips/chip_${val}.png" alt="${val}">`;
      btn.addEventListener('click', () => this.selectChip(val));
      row.appendChild(btn);
    });
  },

  selectChip(val) {
    this.currentChipValue = val;
    document.querySelectorAll('.chip-btn').forEach(btn => {
      btn.classList.toggle('selected', parseInt(btn.dataset.value) === val);
    });
  },

  // ── Enter / Leave Table ──
  enterTable(tableId, history) {
    this._init();
    app.showScreen('game');
    this.tableId = tableId;
    this.engine = new BaccaratEngine();
    if (history) this.engine.history = history.map(h => [...h]);
    this.roundCount = this.engine.history.length;
    this.bets = { B: 0, P: 0, T: 0, BP: 0, PP: 0 };

    this._updateRoundLabel();
    this._updateBalanceDisplay();
    this.dealer.clearCards();
    this.roads.updateData(this.engine.history);

    // Reset winner highlights
    document.querySelectorAll('.main-bet').forEach(el => el.classList.remove('winner'));
    this._clearBetUI();

    // Resize dealer after screen shown
    requestAnimationFrame(() => {
      this.dealer._resize();
      this.roads._resizeAll();
    });

    this._startNewRound();
  },

  leave() {
    this._stopTimer();
    app.showScreen('lobby');
  },

  // ── Betting ──
  placeBet(zoneId, amount) {
    if (this.gamePhase !== 'betting') return;
    if (this.balance < amount) return;

    this.balance -= amount;
    this.bets[zoneId] += amount;
    this._updateBalanceDisplay();
    this._updatePercents();
    this._updateBetUI(zoneId);
  },

  _updateBetUI(zoneId) {
    // Main zones
    if (['P', 'T', 'B'].includes(zoneId)) {
      const stack = document.getElementById(`chip-stack-${zoneId}`);
      if (this.bets[zoneId] > 0) {
        stack.classList.add('visible');
        stack.innerHTML = `<div class="chip-amount">${this.bets[zoneId]}</div>`;
      } else {
        stack.classList.remove('visible');
        stack.innerHTML = '';
      }
    }
    // Side bets
    if (['PP', 'BP'].includes(zoneId)) {
      const indicator = document.getElementById(`bet-indicator-${zoneId}`);
      if (this.bets[zoneId] > 0) {
        indicator.classList.add('visible');
        indicator.textContent = this.bets[zoneId];
      } else {
        indicator.classList.remove('visible');
        indicator.textContent = '';
      }
    }
  },

  _updatePercents() {
    const total = this.bets.P + this.bets.B + this.bets.T;
    ['P', 'T', 'B'].forEach(zone => {
      const el = document.getElementById(`percent-${zone}`);
      if (total > 0) {
        const pct = Math.floor(this.bets[zone] / total * 100);
        el.textContent = `${pct}%`;
        el.classList.add('visible');
      } else {
        el.classList.remove('visible');
      }
    });
  },

  clearBets() {
    // Return bets to balance
    for (const key in this.bets) {
      this.balance += this.bets[key];
    }
    this.bets = { B: 0, P: 0, T: 0, BP: 0, PP: 0 };
    this._updateBalanceDisplay();
    this._clearBetUI();
  },

  _clearBetUI() {
    ['P', 'T', 'B'].forEach(zone => {
      const stack = document.getElementById(`chip-stack-${zone}`);
      stack.classList.remove('visible');
      stack.innerHTML = '';
      const pct = document.getElementById(`percent-${zone}`);
      pct.classList.remove('visible');
    });
    ['PP', 'BP'].forEach(zone => {
      const indicator = document.getElementById(`bet-indicator-${zone}`);
      indicator.classList.remove('visible');
      indicator.textContent = '';
    });
  },

  repeatBet() {
    if (!this.previousBets || Object.keys(this.previousBets).length === 0) return;
    if (this.gamePhase !== 'betting') return;
    this.clearBets();
    for (const [zid, amt] of Object.entries(this.previousBets)) {
      if (amt > 0) {
        this.placeBet(zid, amt);
      }
    }
  },

  // ── Timer / Auto-deal ──
  _startNewRound() {
    this.gamePhase = 'betting';
    this.countdownRemaining = this.countdownTotal;
    this.dealer.clearCards();

    // Reset winner highlights
    document.querySelectorAll('.main-bet').forEach(el => el.classList.remove('winner'));

    this._updateCountdownLabel();
    this._countdownTimer = setInterval(() => this._tick(), 1000);
  },

  _tick() {
    this.countdownRemaining--;
    this._updateCountdownLabel();
    if (this.countdownRemaining <= 0) {
      clearInterval(this._countdownTimer);
      this._autoDeal();
    }
  },

  _updateCountdownLabel() {
    const el = document.getElementById('game-status');
    const t = this.countdownRemaining;
    if (t > 5) {
      el.textContent = `请下注  ⏱ ${t}`;
      el.style.background = COLORS.TIE_GREEN;
    } else if (t > 3) {
      el.textContent = `请下注  ⏱ ${t}`;
      el.style.background = '#cc8800';
    } else if (t > 0) {
      el.textContent = `停止下注  ${t}`;
      el.style.background = COLORS.BANKER_RED;
    } else {
      el.textContent = '开牌中';
      el.style.background = '#cc8800';
    }
  },

  _stopTimer() {
    if (this._countdownTimer) {
      clearInterval(this._countdownTimer);
      this._countdownTimer = null;
    }
    this.gamePhase = 'idle';
  },

  _autoDeal() {
    this.gamePhase = 'dealing';

    // Save bets for repeat
    const totalBet = Object.values(this.bets).reduce((a, b) => a + b, 0);
    if (totalBet > 0) {
      this.previousBets = { ...this.bets };
    }

    this.roundCount++;
    this._updateRoundLabel();

    const statusEl = document.getElementById('game-status');
    statusEl.textContent = '开牌中';
    statusEl.style.background = '#cc8800';

    const res = this.engine.dealRound();

    // Show cards with animation
    this.dealer.setResult(res.playerHand, res.bankerHand, res.playerScore, res.bankerScore);

    // Delayed result after card reveal (Total sequence approx 5.5-6s)
    setTimeout(() => this._showResult(res), 6000);
  },

  _showResult(res) {
    this.gamePhase = 'result';
    const w = res.winner;
    this.dealer.winner = w;
    this.dealer.draw();

    // Winner highlights
    const winMap = { P: 'zone-P', B: 'zone-B', T: 'zone-T' };
    document.querySelectorAll('.main-bet').forEach(el => el.classList.remove('winner'));
    if (winMap[w]) {
      document.getElementById(winMap[w]).classList.add('winner');
    }

    // Status
    const statusEl = document.getElementById('game-status');
    const winText = { P: '闲 赢!', B: '庄 赢!', T: '和 局!' };
    const winColor = { P: COLORS.PLAYER_BLUE, B: COLORS.BANKER_RED, T: COLORS.TIE_GREEN };
    statusEl.textContent = winText[w];
    statusEl.style.background = winColor[w];

    // Update roads
    this.roads.updateData(this.engine.history);

    // Payout — directly add to balance with roll-up
    const payout = this.engine.calculatePayout(this.bets, res);
    const totalBet = Object.values(this.bets).reduce((a, b) => a + b, 0);
    const netProfit = payout - totalBet;

    // Track profit in history
    if (totalBet > 0) {
      app.addToHistory({
        tId: this.tableId,
        tName: document.querySelector('.table-card-title')?.innerText.split(' ')[0] || '百家乐',
        history: this.engine.history,
        stats: {
          total: this.engine.history.length,
          banker: this.engine.history.filter(h => h[0] === 'B').length,
          player: this.engine.history.filter(h => h[0] === 'P').length,
          tie: this.engine.history.filter(h => h[0] === 'T').length
        },
        trend: '' 
      }, netProfit);
    }

    if (payout > 0) {
      if (this.winOverlay) {
        this.winOverlay.triggerWinBurst(null, null, payout, 120);
      }

      this._targetBalance = this.balance + payout;
      this._balanceStep = Math.max(1, Math.floor(payout / 30));
      this._balanceTimer = setInterval(() => {
        this.balance += this._balanceStep;
        if (this.balance >= this._targetBalance) {
          this.balance = this._targetBalance;
          clearInterval(this._balanceTimer);
          this._balanceTimer = null;
        }
        this._updateBalanceDisplay();
      }, 16);
    }

    // Clear bets
    this.bets = { B: 0, P: 0, T: 0, BP: 0, PP: 0 };
    this._clearBetUI();

    // Next round after 4.5s
    setTimeout(() => this._startNewRound(), 4500);
  },



  // ── Good Road Panel ──
  toggleGoodRoad() {
    const panel = document.getElementById('good-road-panel');
    this.goodRoadOpen = !this.goodRoadOpen;
    panel.classList.toggle('open', this.goodRoadOpen);
  },

  _populateGoodRoads() {
    const list = document.getElementById('good-road-list');
    list.innerHTML = ''; // clear

    const mockTables = [
      { id: 'U11', name: '极速百家乐U11', trend: '9连庄', trendClass: 'trend-red', limit: '100~250,000', timer: 15, history: ['B','B','B','B','B','B','B','B','B'] },
      { id: 'H40', name: '经典百家乐H40', trend: '7单跳', trendClass: 'trend-blue', limit: '100~250,000', timer: 25, history: ['B','P','B','P','B','P','B'] },
      { id: 'J07', name: '经典百家乐J07', trend: '5连闲', trendClass: 'trend-blue', limit: '100~250,000', timer: 8, history: ['P','P','P','P','P'] }
    ];

    mockTables.forEach((t) => {
      // pad history with some random past data
      const fullHistory = [];
      for(let i=0; i<30; i++) fullHistory.push(Math.random() < 0.5 ? 'B' : 'P');
      fullHistory.push(...t.history);

      const item = document.createElement('div');
      item.className = 'gr-card';
      item.innerHTML = `
        <div class="gr-card-top">
          <span class="gr-card-title">${t.name} &nbsp;🔒</span>
          <span class="gr-card-limit">限红: ${t.limit}</span>
          <div class="gr-card-timer">
            <div class="gr-timer-bar"></div>
            <span class="gr-timer-text">${t.timer}</span>
          </div>
          <span class="gr-card-trend ${t.trendClass}">${t.trend}</span>
        </div>
        <div class="gr-card-body">
          <div class="gr-roadmap">
            <canvas id="gr-canvas-${t.id}"></canvas>
          </div>
          <div class="gr-actions">
            <div class="gr-bet-row">
              <button class="gr-btn-bet gr-btn-player"><span>闲</span><span class="gr-payout">1:1</span></button>
              <button class="gr-btn-bet gr-btn-banker"><span>庄</span><span class="gr-payout">1:0.95</span></button>
            </div>
            <div class="gr-sub-actions">
              <button class="gr-btn-sub">取消</button>
              <button class="gr-btn-sub">重复</button>
            </div>
          </div>
        </div>
      `;
      list.appendChild(item);

      // Draw mini road
      requestAnimationFrame(() => {
        app._drawMiniRoad(`gr-canvas-${t.id}`, fullHistory);
      });
    });

    // Populate chips in footer
    const chipsRow = document.getElementById('gr-chips-row');
    if (chipsRow && chipsRow.children.length === 0) {
      const values = [5, 10, 20, 50, 100];
      values.forEach(val => {
        const btn = document.createElement('button');
        btn.className = `chip-btn${val === 10 ? ' selected' : ''}`;
        btn.dataset.value = val;
        btn.innerHTML = `<img src="assets/chips/chip_${val}.png" alt="${val}">`;
        // Just visual toggle for demo in Good Road UI
        btn.addEventListener('click', () => {
          chipsRow.querySelectorAll('.chip-btn').forEach(b => b.classList.remove('selected'));
          btn.classList.add('selected');
        });
        chipsRow.appendChild(btn);
      });
    }
  },

  // ── Helpers ──
  _updateBalanceDisplay() {
    document.getElementById('game-balance').textContent = `💰 ${this.balance.toLocaleString()}`;
  },

  _updateRoundLabel() {
    const tStr = String(this.tableId).padStart(4, '0');
    const rStr = String(this.roundCount + 1).padStart(3, '0');
    document.getElementById('game-round').textContent = `局号:GC${tStr}${rStr}`;
  },
};

window.game = game;
