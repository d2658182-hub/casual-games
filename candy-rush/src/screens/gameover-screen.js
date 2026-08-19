/* ============================================================
   GAME OVER
   REVIVE is ALWAYS shown (watch a video to come back exactly
   where you died). Without a real SDK (GitHub Pages demo) the
   revive is granted instantly. RETRY restarts the same level.
   ============================================================ */

class GameOverScreen extends BaseScreen {
  constructor(game) {
    super(game, 'gameover');
  }

  build(options = {}) {
    const score = options.score || 0;
    const best = options.best || 0;
    const coins = options.coins || 0;
    const isNewBest = !!options.isNewBest;
    const level = options.level || 1;
    const worldName = options.worldName || '';

    this.level = level;
    this.reviving = false;

    this.el = document.createElement('div');
    this.el.className = 'screen gameover-screen';
    this.el.innerHTML = '';
    this.el.appendChild(BG.build('menu'));

    const panel = new Panel({ image: 'assets/ui/f.png' });
    const children = [this.titleEl(isNewBest ? LANG.t('gameover.newBest') : LANG.t('gameover.title'), isNewBest)];
    children.push(this.levelEl(level, worldName));
    children.push(this.scoreEl(score));
    if (coins > 0) children.push(this.coinsEl(coins));
    children.push(this.bestEl(best));
    children.push(this.buttonEl(LANG.t('gameover.retry'), 'primary', () => this.retry()));
    // REVIVE always visible — the video icon shows that watching an ad
    // brings you right back where you died.
    if (Bridge.advertisement.isRewardedSupported()) {
      children.push(this.buttonEl(`${this.videoIcon()} ${LANG.t('gameover.revive')}`, 'secondary', (event, btn) => this.revive(btn)));
    }
    panel.add(...children);
    this.el.appendChild(panel.el);

    this.onKeyDown((event) => {
      if (event.code === 'Enter' || event.code === 'Space') this.retry();
    });
  }

  titleEl(text, isNewBest) {
    const h = document.createElement('h2');
    h.className = `modal-title ${isNewBest ? 'title-new-best' : ''}`;
    h.textContent = text;
    return h;
  }

  levelEl(level, worldName) {
    const div = document.createElement('div');
    div.className = 'gameover-level';
    div.textContent = `${LANG.t('gameplay.level')} ${level} · ${worldName}`;
    return div;
  }

  starsEl(count) {
    const row = document.createElement('div');
    row.className = 'modal-stars';
    for (let i = 0; i < 3; i += 1) {
      const img = document.createElement('img');
      img.src = i < count ? 'assets/ui/s1.png' : 'assets/ui/s2.png';
      img.alt = '';
      row.appendChild(img);
    }
    return row;
  }

  scoreEl(score) {
    const row = document.createElement('div');
    row.className = 'modal-score';
    row.innerHTML = `<img src="assets/ui/c.png" alt="" draggable="false"><span>${score.toLocaleString('en-US')}</span>`;
    return row;
  }

  coinsEl(coins) {
    const row = document.createElement('div');
    row.className = 'modal-coins';
    row.innerHTML = `<img src="assets/ui/c.png" alt="" draggable="false"><span>+${coins.toLocaleString('en-US')}</span>`;
    return row;
  }

  bestEl(best) {
    const div = document.createElement('div');
    div.className = 'modal-best';
    div.textContent = `${LANG.t('gameover.best')} ${best.toLocaleString('en-US')}`;
    return div;
  }

  buttonEl(label, variant, onClick) {
    return new Button({ label, variant, onClick });
  }

  videoIcon() {
    return '<svg class="btn-video-icon" viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="29" fill="#fff" stroke="#f45baf" stroke-width="5"/><path d="M26 20.5 45 32 26 43.5z" fill="#f45baf"/></svg>';
  }

  retry() {
    this.game.audio.click();
    this.game.show(this.game.config.playTarget || 'gameplay', { level: this.level });
  }

  revive(btn) {
    if (this.reviving) return;
    this.game.audio.click();
    this.reviving = true;
    if (btn && btn.el) btn.el.disabled = true;
    const grant = (ok) => {
      this.reviving = false;
      if (ok) {
        this.game.audio.revive();
        this.game.show('gameplay', { level: this.level, revive: true });
      } else if (btn && btn.el) {
        btn.el.disabled = false;
      }
    };
    if (Bridge.advertisement.isRewardedSupported()) {
      Bridge.advertisement.showRewarded('revive').then((rewarded) => grant(rewarded));
    } else {
      // No SDK (GitHub Pages / local demo) : instant free revive
      setTimeout(() => grant(true), 250);
    }
  }
}
