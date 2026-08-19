/* ============================================================
   VICTORY — level clear screen
   Stars 1-3, then NEXT (next level) or BONUS (rewarded ad →
   coins ×2). The ONLY rewarded placements are REVIVE + BONUS.
   ============================================================ */

class VictoryScreen extends BaseScreen {
  constructor(game) {
    super(game, 'victory');
  }

  build(options = {}) {
    const level = options.level || 1;
    const worldName = options.worldName || '';
    const stars = options.stars || 1;
    const score = options.score || 0;
    const coins = options.coins || 0;
    const isLast = !!options.isLast;

    this.level = level;
    this.coins = coins;

    this.el = document.createElement('div');
    this.el.className = 'screen victory-screen';
    this.el.innerHTML = '';
    this.el.appendChild(BG.build('menu'));
    this.el.appendChild(this.confettiLayer());

    const panel = new Panel({ image: 'assets/ui/f.png' });
    const children = [this.titleEl()];
    children.push(this.worldEl(worldName));
    children.push(this.starsEl(stars));
    children.push(this.scoreEl(score));
    children.push(this.coinsEl(coins));
    children.push(this.buttonEl(LANG.t('victory.next'), 'primary', () => this.nextLevel()));
    if (Bridge.advertisement.isRewardedSupported()) {
      children.push(this.buttonEl(`${this.videoIcon()} ${LANG.t('victory.bonus')}`, 'secondary', (event, btn) => this.bonus(btn)));
    }
    children.push(this.buttonEl(LANG.t('levels.home'), 'back', () => this.home()));
    panel.add(...children);
    this.el.appendChild(panel.el);

    this.onKeyDown((event) => {
      if (event.code === 'Enter' || event.code === 'Space') this.nextLevel();
    });
  }

  /* Celebration confetti : Kenney Particle Pack sprites (stars, diamonds,
     ribbons, tinted to candy colors — assets/fx/confetti/) falling from the
     top, looped with a negative delay so the screen is already full of
     confetti the moment it appears. */
  confettiLayer() {
    const layer = document.createElement('div');
    layer.className = 'confetti-layer';
    layer.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < 44; i += 1) {
      const img = document.createElement('img');
      img.className = 'confetti-piece';
      const n = String(1 + Math.floor(Math.random() * 12)).padStart(2, '0');
      img.src = `assets/fx/confetti/confetti-${n}.png`;
      img.alt = '';
      img.draggable = false;
      img.style.left = `${Math.random() * 100}%`;
      img.style.width = `${18 + Math.random() * 30}px`;
      img.style.animationDelay = `${-(Math.random() * 6).toFixed(2)}s`;
      img.style.animationDuration = `${(2.4 + Math.random() * 2.6).toFixed(2)}s`;
      img.style.setProperty('--sway', `${20 + Math.random() * 60}px`);
      img.style.setProperty('--spin', `${Math.round((Math.random() - 0.5) * 1080)}deg`);
      layer.appendChild(img);
    }
    return layer;
  }

  titleEl() {
    const h = document.createElement('h2');
    h.className = 'modal-title victory-title';
    h.textContent = LANG.t('victory.title');
    return h;
  }

  worldEl(name) {
    const div = document.createElement('div');
    div.className = 'victory-world';
    div.textContent = name;
    return div;
  }

  starsEl(count) {
    const row = document.createElement('div');
    row.className = 'modal-stars victory-stars';
    for (let i = 0; i < 3; i += 1) {
      const img = document.createElement('img');
      img.src = i < count ? 'assets/ui/s1.png' : 'assets/ui/s2.png';
      img.alt = '';
      if (i < count) {
        img.classList.add('star-pop');
        img.style.animationDelay = `${0.25 + i * 0.28}s`;
      }
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

  buttonEl(label, variant, onClick) {
    return new Button({ label, variant, onClick });
  }

  videoIcon() {
    return '<svg class="btn-video-icon" viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="29" fill="#fff" stroke="#f45baf" stroke-width="5"/><path d="M26 20.5 45 32 26 43.5z" fill="#f45baf"/></svg>';
  }

  nextLevel() {
    this.game.audio.click();
    if (this.level >= this.game.config.totalLevels) {
      this.game.show('menu');
      return;
    }
    this.game.show('gameplay', { level: this.level + 1 });
  }

  bonus(btn) {
    this.game.audio.click();
    if (btn && btn.el) btn.el.disabled = true;
    const grant = () => {
      const bonusCoins = this.coins * 2;
      this.game.storage.set('coins', this.game.storage.get('coins', 0) + bonusCoins);
      this.game.audio.revive();
      this.showBonusToast(`+${bonusCoins}`);
      if (btn && btn.el) btn.el.disabled = false;
    };
    if (Bridge.advertisement.isRewardedSupported()) {
      Bridge.advertisement.showRewarded('bonus').then((rewarded) => {
        if (rewarded) grant();
        else if (btn && btn.el) btn.el.disabled = false;
      });
    } else {
      // No SDK (GitHub Pages / local demo) : instant free double
      setTimeout(grant, 250);
    }
  }

  showBonusToast(text) {
    if (!this.el) return;
    let toast = this.el.querySelector('.victory-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'victory-toast';
      this.el.appendChild(toast);
    }
    toast.textContent = `${text} ${LANG.t('shop.coins')} ✨`;
    toast.classList.add('show');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => toast.classList.remove('show'), 1800);
  }

  home() {
    this.game.audio.click();
    this.game.show('menu');
  }
}
