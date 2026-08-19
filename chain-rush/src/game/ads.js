/* Interstitial policy — after 2 consecutive same-outcome runs. */

class Ads {
  constructor(game) {
    this.game = game;
  }

  /* 'win' or 'lose' */
  recordRun(outcome) {
    const s = this.game.storage.get('streak', { outcome: null, count: 0 });
    if (s.outcome === outcome) {
      s.count += 1;
    } else {
      s.outcome = outcome;
      s.count = 1;
    }
    this.game.storage.set('streak', s);
  }

  /* Call at a natural transition (game over / victory). Shows if streak >= 2. */
  maybeInterstitial() {
    const s = this.game.storage.get('streak', { count: 0 });
    if (s.count >= 2) {
      this.game.storage.set('streak', { outcome: s.outcome, count: 0 });
      // Ads disabled — no interstitial shown
    }
  }
}
