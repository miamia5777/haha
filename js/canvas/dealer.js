// ═══════════════════════════════════════════════
// Dealer Area Canvas Renderer
// Translated from ui/game_screen.py DealerAreaWidget
// ═══════════════════════════════════════════════

class DealerCanvas {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.playerCards = []; // [{rank, suit}]
    this.bankerCards = [];
    this.playerScore = null;
    this.bankerScore = null;
    this.showCards = false;
    this.cardRevealCount = 0;
    this.totalCards = 0;
    this.winner = null;
    this._animTimer = null;

    this._resize();
    window.addEventListener('resize', () => this._resize());
  }

  _resize() {
    const container = this.canvas.parentElement;
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = container.clientWidth * dpr;
    this.canvas.height = container.clientHeight * dpr;
    this.canvas.style.width = container.clientWidth + 'px';
    this.canvas.style.height = container.clientHeight + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.w = container.clientWidth;
    this.h = container.clientHeight;
    this.draw();
  }

  clearCards() {
    this.playerCards = [];
    this.bankerCards = [];
    this.playerScore = null;
    this.bankerScore = null;
    this.showCards = false;
    this.cardRevealCount = 0;
    this.winner = null;
    if (this._animTimer) clearInterval(this._animTimer);
    if (this._winPulseTimer) { clearInterval(this._winPulseTimer); this._winPulseTimer = null; }
    this.draw();
  }

  setResult(playerHand, bankerHand, pScore, bScore) {
    this.playerCards = playerHand.map(c => ({ rank: c.rank, suit: c.suit }));
    this.bankerCards = bankerHand.map(c => ({ rank: c.rank, suit: c.suit }));
    this.playerScore = pScore;
    this.bankerScore = bScore;
    this.showCards = true;
    this.cardRevealCount = 0;
    this.totalCards = this.playerCards.length + this.bankerCards.length;

    this._animTimer = setInterval(() => {
      this.cardRevealCount++;
      this.draw();
      if (this.cardRevealCount >= this.totalCards) {
        clearInterval(this._animTimer);
        this._animTimer = null;
      }
    }, 300);
  }

  draw() {
    const ctx = this.ctx;
    const w = this.w;
    const h = this.h;
    ctx.clearRect(0, 0, w, h);

    // ── Background: Casino felt ──
    const feltGrad = ctx.createLinearGradient(0, 0, 0, h);
    feltGrad.addColorStop(0, '#0a3018');
    feltGrad.addColorStop(0.4, '#0d4020');
    feltGrad.addColorStop(1, '#071a0c');
    ctx.fillStyle = feltGrad;
    ctx.fillRect(0, 0, w, h);

    // Felt texture dots
    ctx.fillStyle = 'rgba(255,255,255,0.03)';
    for (let i = 0; i < w; i += 12) {
      for (let j = 0; j < h; j += 12) {
        if ((i + j) % 24 === 0) {
          ctx.fillRect(i, j, 1, 1);
        }
      }
    }

    // Gold arc
    ctx.strokeStyle = COLORS.GOLD;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, h * 0.65);
    ctx.quadraticCurveTo(w * 0.5, h * 0.45, w, h * 0.65);
    ctx.stroke();

    // Inner arc
    ctx.strokeStyle = 'rgba(212,175,55,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(w * 0.05, h * 0.68);
    ctx.quadraticCurveTo(w * 0.5, h * 0.50, w * 0.95, h * 0.68);
    ctx.stroke();

    // PLAYER / BANKER labels
    ctx.font = 'bold 10px Arial';
    ctx.textAlign = 'center';
    ctx.fillStyle = COLORS.PLAYER_BLUE_LIGHT;
    ctx.fillText('PLAYER 闲', w * 0.25, h * 0.57);
    ctx.fillStyle = COLORS.BANKER_RED_LIGHT;
    ctx.fillText('BANKER 庄', w * 0.75, h * 0.57);

    // Center divider
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = COLORS.GOLD;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(w * 0.5, h * 0.5);
    ctx.lineTo(w * 0.5, h * 0.9);
    ctx.stroke();
    ctx.setLineDash([]);

    // ── Dealer figure ──
    this._drawDealer(ctx, w, h);

    // ── Win Effect: colored frame + ribbon ──
    if (this.winner && (this.winner === 'P' || this.winner === 'B') && this.cardRevealCount >= this.totalCards) {
      const isPlayer = this.winner === 'P';
      const winColor = isPlayer ? COLORS.PLAYER_BLUE_LIGHT : COLORS.BANKER_RED_LIGHT;
      const winColorDim = isPlayer ? 'rgba(68,136,255,0.15)' : 'rgba(255,68,68,0.15)';
      const areaX = isPlayer ? w * 0.04 : w * 0.52;
      const areaW = w * 0.44;
      const areaY = h * 0.60;
      const areaH = h * 0.36;

      // Soft tinted overlay on winning side
      ctx.fillStyle = winColorDim;
      roundRect(ctx, areaX, areaY, areaW, areaH, 8);
      ctx.fill();

      // Pulsing border (use time-based alpha for pulse)
      const pulse = 0.6 + 0.4 * Math.sin(Date.now() / 200);
      ctx.strokeStyle = winColor;
      ctx.lineWidth = 3;
      ctx.globalAlpha = pulse;
      roundRect(ctx, areaX, areaY, areaW, areaH, 8);
      ctx.stroke();
      ctx.globalAlpha = 1;

      // "WIN" ribbon banner at bottom of area
      const ribbonH = 22;
      const ribbonY = areaY + areaH - ribbonH - 4;
      const ribbonX = areaX + areaW * 0.15;
      const ribbonW = areaW * 0.7;

      ctx.fillStyle = winColor;
      roundRect(ctx, ribbonX, ribbonY, ribbonW, ribbonH, 4);
      ctx.fill();

      ctx.fillStyle = '#fff';
      ctx.font = 'bold 13px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(isPlayer ? 'PLAYER WIN' : 'BANKER WIN', ribbonX + ribbonW / 2, ribbonY + ribbonH / 2);

      // Request redraw for pulse animation
      if (!this._winPulseTimer) {
        this._winPulseTimer = setInterval(() => this.draw(), 50);
        setTimeout(() => {
          clearInterval(this._winPulseTimer);
          this._winPulseTimer = null;
        }, 4500);
      }
    }

    // ── Cards ──
    const cardW = 38;
    const cardH = 55;

    if (this.showCards) {
      // Player cards (left)
      const pStartX = w * 0.12;
      const pY = h * 0.68;
      this.playerCards.forEach((card, i) => {
        const angle = -5 + i * 5;
        if (i < this.cardRevealCount) {
          drawPokerCard(ctx, pStartX + i * (cardW + 4), pY, cardW, cardH, card.rank, card.suit, true, angle);
        } else {
          drawPokerCard(ctx, pStartX + i * (cardW + 4), pY, cardW, cardH, '', '', false);
        }
      });

      // Banker cards (right)
      const bStartX = w * 0.58;
      const bY = h * 0.68;
      const pCount = this.playerCards.length;
      this.bankerCards.forEach((card, i) => {
        const revealIdx = pCount + i;
        const angle = -5 + i * 5;
        if (revealIdx < this.cardRevealCount) {
          drawPokerCard(ctx, bStartX + i * (cardW + 4), bY, cardW, cardH, card.rank, card.suit, true, angle);
        } else {
          drawPokerCard(ctx, bStartX + i * (cardW + 4), bY, cardW, cardH, '', '', false);
        }
      });

      // Score badges
      if (this.cardRevealCount >= pCount && this.playerScore !== null) {
        const bx = pStartX + this.playerCards.length * (cardW + 4) + 5;
        this._drawScoreBadge(ctx, bx, pY + 12, this.playerScore, COLORS.PLAYER_BLUE);
      }
      if (this.cardRevealCount >= this.totalCards && this.bankerScore !== null) {
        const bx = bStartX + this.bankerCards.length * (cardW + 4) + 5;
        this._drawScoreBadge(ctx, bx, bY + 12, this.bankerScore, COLORS.BANKER_RED);
      }
    } else {
      // Placeholder face-down cards
      for (let i = 0; i < 2; i++) {
        drawPokerCard(ctx, w * 0.15 + i * (cardW + 4), h * 0.70, cardW, cardH, '', '', false, -3 + i * 3);
        drawPokerCard(ctx, w * 0.60 + i * (cardW + 4), h * 0.70, cardW, cardH, '', '', false, -3 + i * 3);
      }
    }
  }

  _drawScoreBadge(ctx, x, y, score, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x + 14, y + 14, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(score), x + 14, y + 14);
  }

  _drawDealer(ctx, w, h) {
    const cx = w * 0.5;
    const cy = h * 0.18;
    const headR = 18;

    // Head
    ctx.fillStyle = '#e8c9a0';
    ctx.strokeStyle = '#c4a070';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, headR, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Hair
    ctx.save();
    ctx.beginPath();
    ctx.rect(cx - headR - 5, cy - headR - 10, (headR + 5) * 2, headR + 5);
    ctx.clip();
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.ellipse(cx, cy - 5, headR + 2, headR - 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Body
    const bodyTop = cy + headR;
    ctx.fillStyle = '#2a1a3a';
    ctx.beginPath();
    ctx.moveTo(cx - 25, bodyTop);
    ctx.quadraticCurveTo(cx - 30, bodyTop + 40, cx - 20, bodyTop + 50);
    ctx.lineTo(cx + 20, bodyTop + 50);
    ctx.quadraticCurveTo(cx + 30, bodyTop + 40, cx + 25, bodyTop);
    ctx.closePath();
    ctx.fill();

    // Collar
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - 8, bodyTop);
    ctx.lineTo(cx, bodyTop + 15);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + 8, bodyTop);
    ctx.lineTo(cx, bodyTop + 15);
    ctx.stroke();

    // Eyes
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(cx - 6, cy - 2, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + 6, cy - 2, 2, 0, Math.PI * 2);
    ctx.fill();

    // Smile
    ctx.strokeStyle = '#aa5533';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy + 6, 5, 0, Math.PI);
    ctx.stroke();

    // Label
    ctx.fillStyle = COLORS.GOLD;
    ctx.font = '8px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('DEALER', cx, bodyTop + 64);
  }
}

window.DealerCanvas = DealerCanvas;
