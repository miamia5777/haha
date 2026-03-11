// ═══════════════════════════════════════════════
// Win Burst Particle Effects
// Translated from ui/effects.py
// ═══════════════════════════════════════════════

class CoinParticle {
  constructor(x, y, img) {
    this.x = x;
    this.y = y;
    this.img = img;
    this.vx = (Math.random() - 0.5) * 30; // wider horizontal spread
    this.vy = -(Math.random() * 25 + 10); // higher initial jump
    this.gravity = 0.8;
    this.life = 255;
    this.size = Math.random() * 30 + 20; // slightly larger coins
    this.rotation = Math.random() * Math.PI * 2;
    this.rotationSpeed = (Math.random() - 0.5) * 0.4;
  }

  update() {
    this.vy += this.gravity;
    this.x += this.vx;
    this.y += this.vy;
    this.rotation += this.rotationSpeed;

    // Fade out as it falls down instead of aggregating
    if (this.vy > 0) {
      this.life -= 3;
    }

    return this.life > 0;
  }
}

class WinBurstOverlay {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.particles = [];
    this.winAmount = 0;
    this.textScale = 0.5;
    this.textAlpha = 0;
    this.running = false;
    this.coinImg = null;
    this.onAnimationFinished = null;

    // Load gold coin image (use chip as fallback)
    const img = new Image();
    img.onload = () => { this.coinImg = img; };
    img.src = 'assets/chips/chip_100.png';

    this._resize();
    window.addEventListener('resize', () => this._resize());
  }

  _resize() {
    const dpr = window.devicePixelRatio || 1;
    const parent = this.canvas.parentElement;
    if (!parent) return;
    this.canvas.width = parent.clientWidth * dpr;
    this.canvas.height = parent.clientHeight * dpr;
    this.canvas.style.width = parent.clientWidth + 'px';
    this.canvas.style.height = parent.clientHeight + 'px';
    this.w = parent.clientWidth;
    this.h = parent.clientHeight;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  triggerWinBurst(cx, cy, amount, count = 100) {
    this._resize();
    this.particles = [];
    this.winAmount = amount;
    this.textScale = 0.5;
    this.textAlpha = 255;

    // Explode from the center of the screen or provided coordinates
    const sx = cx || this.w / 2;
    const sy = cy || this.h / 2 + 100;

    for (let i = 0; i < count; i++) {
      const p = new CoinParticle(sx, sy, this.coinImg);
      this.particles.push(p);
    }

    this.canvas.style.pointerEvents = 'none';
    this.canvas.style.display = 'block';
    this.running = true;
    this._animate();
  }

  _animate() {
    if (!this.running) return;

    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.w, this.h);

    // Win text (scaling up and fading out)
    if (this.textAlpha > 0) {
      if (this.textScale < 1.2) this.textScale += 0.05;
      if (this.textScale > 1) this.textAlpha -= 5;

      ctx.save();
      ctx.translate(this.w / 2, this.h / 2 - 50);
      ctx.scale(this.textScale, this.textScale);

      // Glow
      ctx.shadowColor = '#d4af37';
      ctx.shadowBlur = 20;

      ctx.font = '900 64px "Inter", Arial';
      ctx.fillStyle = `rgba(255,215,0,${Math.max(0, this.textAlpha / 255)})`;
      ctx.strokeStyle = `rgba(139,0,0,${Math.max(0, this.textAlpha / 255)})`;
      ctx.lineWidth = 4;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.strokeText(`+ ${this.winAmount}`, 0, 0);
      ctx.fillText(`+ ${this.winAmount}`, 0, 0);
      ctx.restore();
    }

    // Particles
    const alive = [];
    for (const p of this.particles) {
      if (p.update()) alive.push(p);
    }
    this.particles = alive;

    // Draw particles
    for (const p of this.particles) {
      ctx.globalAlpha = Math.max(0, p.life) / 255;

      if (this.coinImg) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        const sz = p.size;
        ctx.drawImage(this.coinImg, -sz / 2, -sz / 2, sz, sz);
        ctx.restore();
      } else {
        // Fallback: gold circle
        ctx.fillStyle = '#ffcf00';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#b8860b';
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;

    if (this.particles.length === 0 && this.textAlpha <= 0) {
      this.running = false;
      this.canvas.style.display = 'none';
      if (this.onAnimationFinished) this.onAnimationFinished();
      return;
    }

    requestAnimationFrame(() => this._animate());
  }
}

window.CoinParticle = CoinParticle;
window.WinBurstOverlay = WinBurstOverlay;
