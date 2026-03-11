// ═══════════════════════════════════════════════
// Baccarat Game Engine
// Translated from core/baccarat_logic.py
// ═══════════════════════════════════════════════

class Card {
  constructor(suit, rank) {
    this.suit = suit; // 'S', 'H', 'D', 'C'
    this.rank = rank; // 'A', '2'-'10', 'J', 'Q', 'K'
  }

  get value() {
    if (['10', 'J', 'Q', 'K'].includes(this.rank)) return 0;
    if (this.rank === 'A') return 1;
    return parseInt(this.rank);
  }

  toString() {
    return `${this.rank} of ${this.suit}`;
  }
}

class Shoe {
  constructor(numDecks = 8) {
    this.numDecks = numDecks;
    this.cards = [];
    this.build();
  }

  build() {
    const suits = ['S', 'H', 'D', 'C'];
    const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    this.cards = [];
    for (let d = 0; d < this.numDecks; d++) {
      for (const s of suits) {
        for (const r of ranks) {
          this.cards.push(new Card(s, r));
        }
      }
    }
    this.shuffle();
  }

  shuffle() {
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
  }

  draw() {
    if (this.cards.length < 15) this.build();
    return this.cards.pop();
  }
}

class BaccaratEngine {
  constructor() {
    this.shoe = new Shoe();
    this.history = []; // [(winner, isBankerPair, isPlayerPair), ...]
  }

  calculateScore(hand) {
    return hand.reduce((sum, card) => sum + card.value, 0) % 10;
  }

  isNatural(score) {
    return score === 8 || score === 9;
  }

  dealRound() {
    const playerHand = [this.shoe.draw(), this.shoe.draw()];
    const bankerHand = [this.shoe.draw(), this.shoe.draw()];

    let playerScore = this.calculateScore(playerHand);
    let bankerScore = this.calculateScore(bankerHand);

    let playerThird = null;
    let bankerThird = null;

    if (!this.isNatural(playerScore) && !this.isNatural(bankerScore)) {
      // Player rule
      if (playerScore <= 5) {
        playerThird = this.shoe.draw();
        playerHand.push(playerThird);
        playerScore = this.calculateScore(playerHand);
      }

      // Banker rule
      if (bankerScore <= 2) {
        bankerThird = this.shoe.draw();
      } else if (bankerScore === 3) {
        if (playerThird === null || playerThird.value !== 8) {
          bankerThird = this.shoe.draw();
        }
      } else if (bankerScore === 4) {
        if (playerThird === null || [2, 3, 4, 5, 6, 7].includes(playerThird.value)) {
          bankerThird = this.shoe.draw();
        }
      } else if (bankerScore === 5) {
        if (playerThird !== null && [4, 5, 6, 7].includes(playerThird.value)) {
          bankerThird = this.shoe.draw();
        }
      } else if (bankerScore === 6) {
        if (playerThird !== null && [6, 7].includes(playerThird.value)) {
          bankerThird = this.shoe.draw();
        }
      }

      if (bankerThird) {
        bankerHand.push(bankerThird);
        bankerScore = this.calculateScore(bankerHand);
      }
    }

    // Determine winner
    let winner = 'T';
    if (playerScore > bankerScore) winner = 'P';
    else if (bankerScore > playerScore) winner = 'B';

    // Pairs
    const isPlayerPair = playerHand[0].rank === playerHand[1].rank;
    const isBankerPair = bankerHand[0].rank === bankerHand[1].rank;

    const result = {
      playerHand,
      bankerHand,
      playerScore,
      bankerScore,
      winner,
      playerPair: isPlayerPair,
      bankerPair: isBankerPair,
    };

    this.history.push([winner, isBankerPair, isPlayerPair]);
    return result;
  }

  calculatePayout(bets, result) {
    let payout = 0;
    const winner = result.winner;

    if ((bets.B || 0) > 0 && winner === 'B') payout += bets.B * 1.95;
    if ((bets.P || 0) > 0 && winner === 'P') payout += bets.P * 2.0;
    if ((bets.T || 0) > 0 && winner === 'T') payout += bets.T * 9.0;

    // Tie → push B and P bets
    if (winner === 'T') {
      payout += bets.B || 0;
      payout += bets.P || 0;
    }

    // Pairs (1:11)
    if ((bets.BP || 0) > 0 && result.bankerPair) payout += bets.BP * 12.0;
    if ((bets.PP || 0) > 0 && result.playerPair) payout += bets.PP * 12.0;

    return Math.floor(payout);
  }
}

// ═══════════════════════════════════════════════
// Road Building Functions
// ═══════════════════════════════════════════════

function buildBigRoad(history) {
  if (!history || history.length === 0) return { columns: [], ties: [] };

  const columns = [];
  const ties = [];
  let currentCol = [];
  let lastBP = null;

  for (const h of history) {
    const winner = Array.isArray(h) ? h[0] : h;
    if (winner === 'T') {
      if (columns.length > 0) {
        ties.push([columns.length - 1, Math.max(0, columns[columns.length - 1].length - 1)]);
      } else if (currentCol.length > 0) {
        ties.push([0, currentCol.length - 1]);
      }
      continue;
    }

    if (lastBP === null) {
      currentCol = [winner];
      lastBP = winner;
    } else if (winner === lastBP) {
      currentCol.push(winner);
    } else {
      columns.push(currentCol);
      currentCol = [winner];
      lastBP = winner;
    }
  }
  if (currentCol.length > 0) columns.push(currentCol);

  return { columns, ties };
}

function buildDerivedRoad(bigRoadCols, cycle) {
  const result = [];
  if (bigRoadCols.length <= cycle) return result;

  for (let colIdx = cycle; colIdx < bigRoadCols.length; colIdx++) {
    const col = bigRoadCols[colIdx];
    for (let rowIdx = 0; rowIdx < col.length; rowIdx++) {
      if (colIdx === cycle && rowIdx === 0) continue;

      const refColIdx = colIdx - cycle;
      if (refColIdx < 0) continue;
      const refCol = bigRoadCols[refColIdx];

      if (rowIdx === 0) {
        const prevCol = colIdx > 0 ? bigRoadCols[colIdx - 1] : [];
        const refPrev = refColIdx > 0 ? bigRoadCols[refColIdx - 1] : [];
        result.push(prevCol.length === refPrev.length ? 'R' : 'B');
      } else {
        result.push(rowIdx < refCol.length ? 'R' : 'B');
      }
    }
  }

  return result;
}

// Export for use
window.Card = Card;
window.Shoe = Shoe;
window.BaccaratEngine = BaccaratEngine;
window.buildBigRoad = buildBigRoad;
window.buildDerivedRoad = buildDerivedRoad;
