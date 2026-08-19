class MenuScreen extends BaseScreen {
  constructor(game) {
    super(game, 'menu');
  }

  build() {
    const config = this.game.config;
    const best = this.game.storage.get('best', 0);
    const daily = this.game.storage.get('daily', null);
    const today = new Date().toDateString();
    const canClaim = config.features.dailyReward && (!daily || daily.date !== today);

    this.el = document.createElement('div');
    this.el.className = 'screen menu-screen';
    this.el.innerHTML = `
      <div class="menu-content">
        <div class="menu-deco menu-deco-left"><img src="assets/candies/lollypop.png" alt="" draggable="false"></div>
        <div class="menu-deco menu-deco-right"><img src="assets/candies/cupcake.png" alt="" draggable="false"></div>
        <h1 class="game-title">${config.title}</h1>
        <div class="menu-best">
          <img src="assets/ui/s1.png" alt="" draggable="false">
          <span>${LANG.t('menu.best')} ${best.toLocaleString('en-US')}</span>
        </div>
        <div class="menu-buttons">
          ${this.playButton()}
          ${config.features.levels ? this.levelsButton() : ''}
          ${config.features.shop ? this.shopButton() : ''}
        </div>
        ${canClaim && Bridge.advertisement.isRewardedSupported() ? this.dailyBanner() : ''}
      </div>
    `;
    this.el.insertBefore(BG.build('menu'), this.el.firstChild);
    this.el.insertAdjacentHTML('beforeend', `<div class="menu-sound">${this.soundButton()}</div>`);

    this.el.querySelector('.btn-play').addEventListener('click', () => this.startGame());
    const levelsButton = this.el.querySelector('.btn-levels');
    if (levelsButton) levelsButton.addEventListener('click', () => this.openLevels());
    const shopButton = this.el.querySelector('.btn-shop');
    if (shopButton) shopButton.addEventListener('click', () => this.openShop());
    this.el.querySelector('.btn-sound').addEventListener('click', (event) => this.toggleSound(event));
    const dailyBtn = this.el.querySelector('.btn-daily');
    if (dailyBtn) dailyBtn.addEventListener('click', () => this.claimDaily(dailyBtn));

    this.onKeyDown((event) => {
      if (event.code === 'Enter' || event.code === 'Space') this.startGame();
    });
  }

  enter(previous, options) {
    this.game.audio.playMusic('assets/music/menu.ogg');
  }

  playButton() {
    return `
      <button type="button" class="btn btn-primary btn-play" aria-label="Play">
        <img src="assets/ui/b_4.png" alt="" draggable="false">
        <span class="btn-label">${LANG.t('menu.play')}</span>
      </button>
    `;
  }

  levelsButton() {
    return `
      <button type="button" class="btn btn-primary btn-levels" aria-label="Levels">
        <img src="assets/ui/b_1.png" alt="" draggable="false">
        <span class="btn-label">${LANG.t('menu.levels')}</span>
      </button>
    `;
  }

  shopButton() {
    return `
      <button type="button" class="btn btn-secondary btn-shop" aria-label="Shop">
        <img src="assets/ui/b_5.png" alt="" draggable="false">
        <span class="btn-label">${LANG.t('menu.shop')}</span>
      </button>
    `;
  }

  soundButton() {
    const on = this.game.audio.settings.sound;
    return `
      <button type="button" class="btn btn-square btn-sound" aria-label="Sound">
        <img src="assets/ui/b_8.png" alt="" draggable="false">
        <span class="btn-icon">${on ? LANG.t('sound.on') : LANG.t('sound.off')}</span>
      </button>
    `;
  }

  dailyBanner() {
    return `
      <button type="button" class="btn btn-daily" aria-label="Daily reward">
        <span class="daily-gift">🎁</span>
        <span class="daily-text">${LANG.t('menu.daily')}</span>
        <span class="btn-video-icon daily-video"></span>
        <span class="daily-claim">${LANG.t('menu.dailyClaim')}</span>
      </button>
    `;
  }

  startGame() {
    this.game.audio.click();
    const progress = this.game.storage.get('progress', { unlocked: 1 });
    const next = Math.max(1, progress.unlocked || 1);
    this.game.show(this.game.config.playTarget || 'gameplay', { level: next });
  }

  openLevels() {
    this.game.audio.click();
    this.game.show('levels');
  }

  openShop() {
    this.game.audio.click();
    this.game.show('shop');
  }

  claimDaily(btn) {
    this.game.audio.click();
    if (btn) btn.disabled = true;
    const reward = 50;
    const grant = () => {
      this.game.audio.revive();
      this.game.storage.set('coins', this.game.storage.get('coins', 0) + reward);
      this.game.storage.set('daily', { date: new Date().toDateString() });
      if (btn) {
        btn.classList.add('claimed');
        const text = btn.querySelector('.daily-text');
        if (text) text.textContent = `${LANG.t('menu.dailyDone')} +${reward} ${LANG.t('shop.coins')}`;
      }
    };
    // the daily reward is earned by watching a rewarded ad ; on the web
    // demo (no SDK) it is granted instantly so the feature still works
    if (Bridge.advertisement.isRewardedSupported()) {
      Bridge.advertisement.showRewarded('daily').then((rewarded) => {
        if (rewarded) grant();
        else if (btn) btn.disabled = false;
      });
    } else {
      setTimeout(grant, 250);
    }
  }

  toggleSound(event) {
    event.stopPropagation();
    this.game.audio.click();
    const on = this.game.audio.toggleSound();
    event.currentTarget.querySelector('.btn-icon').textContent = on ? LANG.t('sound.on') : LANG.t('sound.off');
  }
}
