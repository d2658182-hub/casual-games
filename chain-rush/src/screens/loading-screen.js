/* Loading screen — preloads every image + audio, drives the bar and the
   Playgama SDK progress (SDK.loadingProgress). */

const PACK_IMAGES = [
  'b_1.png', 'b_2.png', 'b_3.png', 'b_4.png', 'b_5.png',
  'b_6.png', 'b_7.png', 'b_8.png', 'bar_1.png', 'bar_2.png',
  'c.png', 'f.png', 'field.png', 'l1.png', 'l2.png',
  'pr_ui_gold.png', 's1.png', 's2.png'
];

const FX_COLORS = ['red', 'blue', 'green', 'pink'];

class LoadingScreen extends BaseScreen {
  constructor(game) {
    super(game, 'loading');
  }

  build() {
    const config = this.game.config;

    this.el = document.createElement('div');
    this.el.className = 'screen loading-screen';
    this.el.style.backgroundImage = `url("${config.backgrounds.menu}")`;
    this.el.innerHTML = `
      <div class="loading-content">
        <h1 class="game-title">${config.title}</h1>
        <div class="loading-bar">
          <div class="loading-fill"></div>
        </div>
        <div class="loading-text">LOADING 0%</div>
      </div>
    `;

    this.preload(this.collectAssets());
  }

  collectAssets() {
    const config = this.game.config;
    const list = PACK_IMAGES.map((name) => `assets/ui/${name}`);
    Object.values(config.backgrounds || {}).forEach((bg) => { if (bg) list.push(bg); });

    // candies (every shape x color) + specials
    Object.values((config.candy && config.candy.images) || {}).forEach((src) => list.push(src));
    (config.candy && config.candy.shapes || []).forEach((shape) => {
      (config.candy && config.candy.colors || []).forEach((color) => {
        list.push(`assets/game/candy/${shape}_${color}.png`);
      });
    });

    // explosion frames
    FX_COLORS.forEach((col) => {
      for (let n = 1; n <= 5; n += 1) list.push(`assets/game/fx/explosion-${col}-0${n}.png`);
    });

    // shop illustrations
    (config.shop && config.shop.items || []).forEach((item) => { if (item.icon) list.push(item.icon); });

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
      if (text) text.textContent = `LOADING ${Math.round(value)}%`;
      if (typeof SDK !== 'undefined' && SDK.loadingProgress) {
        try { SDK.loadingProgress(value / 100); } catch (error) { /* noop */ }
      }
    };

    const done = () => {
      loaded += 1;
      setProgress((loaded / total) * 100);
      if (loaded >= total) {
        if (typeof SDK !== 'undefined') SDK.gameReady();
        this.game.show(this.game.config.loading.loadTarget || 'menu');
      }
    };

    setProgress(0);

    assets.forEach((src) => {
      const img = new Image();
      img.onload = img.onerror = done;
      img.src = src;
    });

    /* watchdog: never let the game hang on a slow/blocked image */
    setTimeout(() => {
      if (loaded < total) {
        for (let i = loaded; i < total; i += 1) done();
      }
    }, 25000);

    // Audio is preloaded in the background and does NOT block the progress bar
    // (some browsers never fire canplaythrough on a muted page).
    this.collectAudio().forEach((src) => {
      const a = new Audio();
      a.preload = 'auto';
      a.src = src;
    });
  }

  collectAudio() {
    const config = this.game.config.audio || {};
    const list = [];
    const music = config.music;
    if (typeof music === 'string') list.push(music);
    else if (music) Object.values(music).forEach((src) => list.push(src));
    Object.values(config.sounds || {}).forEach((src) => list.push(src));
    return list;
  }
}
