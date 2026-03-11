// ═══════════════════════════════════════════════
// Utility functions
// ═══════════════════════════════════════════════

const SUIT_SYMBOLS = { S: '♠', H: '♥', D: '♦', C: '♣' };
const SUIT_COLORS = { S: '#222', H: '#cc1111', D: '#cc1111', C: '#222' };

// Color Palette
const COLORS = {
  GOLD: '#d4af37',
  GOLD_LIGHT: '#f7e07b',
  DARK_RED: '#8b0000',
  DEEP_RED: '#5a0000',
  BG_DARK: '#1a0000',
  BANKER_RED: '#cc2222',
  BANKER_RED_LIGHT: '#ff4444',
  PLAYER_BLUE: '#2255cc',
  PLAYER_BLUE_LIGHT: '#4488ff',
  TIE_GREEN: '#228833',
  TIE_GREEN_LIGHT: '#33bb55',
};

/**
 * Draw a poker card on canvas context
 */
function drawPokerCard(ctx, x, y, w, h, rank, suit, faceUp = true, angle = 0) {
  ctx.save();

  if (angle !== 0) {
    ctx.translate(x + w / 2, y + h / 2);
    ctx.rotate((angle * Math.PI) / 180);
    ctx.translate(-(x + w / 2), -(y + h / 2));
  }

  // Rounded rectangle helper
  const r = 4;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();

  if (!faceUp) {
    // Card back
    const grad = ctx.createLinearGradient(x, y, x + w, y + h);
    grad.addColorStop(0, '#8b0000');
    grad.addColorStop(0.5, '#cc2222');
    grad.addColorStop(1, '#8b0000');
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Diamond pattern
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    for (let i = x; i < x + w; i += 6) {
      ctx.beginPath();
      ctx.moveTo(i, y);
      ctx.lineTo(i + h, y + h);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(i + h, y);
      ctx.lineTo(i, y + h);
      ctx.stroke();
    }
    ctx.restore();
    return;
  }

  // Card face
  ctx.fillStyle = '#fff';
  ctx.fill();
  ctx.strokeStyle = '#888';
  ctx.lineWidth = 1;
  ctx.stroke();

  const suitSym = SUIT_SYMBOLS[suit] || suit;
  const color = SUIT_COLORS[suit] || '#222';
  ctx.fillStyle = color;

  // Top-left rank
  ctx.font = `bold ${Math.max(Math.floor(h * 0.18), 8)}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(rank, x + w * 0.25, y + h * 0.16);

  // Top-left suit
  ctx.font = `${Math.max(Math.floor(h * 0.14), 7)}px Arial`;
  ctx.fillText(suitSym, x + w * 0.25, y + h * 0.32);

  // Center large suit
  ctx.font = `${Math.max(Math.floor(h * 0.3), 12)}px Arial`;
  ctx.fillText(suitSym, x + w / 2, y + h / 2);

  ctx.restore();
}

/**
 * Preload images and return a promise
 */
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null); // Don't fail on missing images
    img.src = src;
  });
}

/**
 * Draw rounded rectangle
 */
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

window.SUIT_SYMBOLS = SUIT_SYMBOLS;
window.SUIT_COLORS = SUIT_COLORS;
window.COLORS = COLORS;
window.drawPokerCard = drawPokerCard;
window.loadImage = loadImage;
window.roundRect = roundRect;
