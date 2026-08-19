/* Loading screen — real preload progress, then reports
   game_ready to Playgama (required). */

const PACK_IMAGES = [
  'b_1.png', 'b_2.png', 'b_3.png', 'b_4.png', 'b_5.png',
  'b_6.png', 'b_7.png', 'b_8.png', 'bar_1.png', 'bar_2.png',
  'c.png', 'f.png', 'field.png', 'l1.png', 'l2.png',
  'pr_ui_gold.png', 's1.png', 's2.png'
];

class LoadingScreen extends BaseScreen {
  constructor(game) {
    super(game, 'loading');
  }

  build() {
    const config = this.game.config;

    Bridge.platform.sendMessage('in_game_loading_started');

    this.el = document.createElement('div');
    this.el.className = 'screen loading-screen';
    this.el.innerHTML = `
      <div class="loading-content">
        <h1 class="game-title">${config.title}</h1>
        <div class="loading-bar">
          <div class="loading-fill"></div>
        </div>
        <div class="loading-text">${LANG.t('loading.text')} 0%</div>
      </div>
    `;
    this.el.insertBefore(BG.build('menu'), this.el.firstChild);

    this.preload(this.collectAssets());
  }

  collectAssets() {
    const config = this.game.config;
    const list = PACK_IMAGES.map((name) => `assets/ui/${name}`);
    (config.loading && config.loading.assets || []).forEach((src) => list.push(src));
    return list;
  }

  preload(assets) {
    const bar = this.el.querySelector('.loading-fill');
    const text = this.el.querySelector('.loading-text');
    let loaded = 0;
    const total = assets.length || 1;

    const setProgress = (pct) => {
      const value = Math.max(0, Math.min(100, pct));
      if (bar) bar.style.width = `${value}%`;
      if (text) text.textContent = `${Math.round(value)}%`;
    };

    const finish = () => {
      // warm up the display font so the first frames are perfect
      try {
        if (document.fonts && document.fonts.load) {
          document.fonts.load('16px "Kenney Mini Square"');
        }
      } catch (e) { /* noop */ }
      Bridge.platform.sendMessage('in_game_loading_stopped');
      Bridge.platform.sendMessage('game_ready');
      this.game.show(this.game.config.loading.loadTarget || 'menu');
    };

    setProgress(0);
    assets.forEach((src) => {
      const img = new Image();
      img.onload = img.onerror = () => {
        loaded += 1;
        setProgress((loaded / total) * 100);
        if (loaded >= total) finish();
      };
      img.src = src;
    });
  }
}
