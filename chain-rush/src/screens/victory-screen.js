/* Victory — stars, coins earned, NEXT LEVEL, DOUBLE COINS (rewarded),
   and a big confetti rain. */

const CONFETTI_COLORS = ['#ff5a5a', '#ff9f43', '#ffd93d', '#6bcf6b', '#4f9dff', '#ff7ac6', '#b37aff', '#ffd700', '#ffffff'];

class VictoryScreen extends BaseScreen {
  constructor(game) {
    super(game, 'victory');
    this.canvas = null;
    this.ctx = null;
    this.confetti = [];
    this.frameId = null;
    this.lastTime = 0;
    this.w = 0;
    this.h = 0;
    this.dpr = 1;
  }

  build(options = {}) {
    const score = options.score || 0;
    const coins = options.coins || 0;
    const stars = options.stars != null ? options.stars : 3;

    this.el = document.createElement('div');
    this.el.className = 'screen victory-screen';
    this.el.style.backgroundImage = `url("${this.game.config.backgrounds.menu}")`;

    this.canvas = document.createElement('canvas');
    this.canvas.className = 'confetti-canvas';
    this.ctx = this.canvas.getContext('2d');
    this.el.appendChild(this.canvas);

    const panel = new Panel({ image: 'assets/ui/f.png' });
    panel.add(
      this.titleEl('VICTORY'),
      this.starsEl(stars),
      this.scoreEl(score),
      this.coinsEl(coins),
      this.buttonEl('NEXT LEVEL', 'primary', () => this.nextLevel()),
      this.buttonEl('DOUBLE COINS', 'secondary', () => this.doubleCoins(coins))
    );
    this.el.appendChild(panel.el);

    this.onKeyDown((event) => {
      if (event.code === 'Enter' || event.code === 'Space') this.nextLevel();
    });
  }

  enter(previous, options) {
    this.resize();
    this.onResize = () => this.resize();
    window.addEventListener('resize', this.onResize);
    this.spawnConfetti();
    this.lastTime = 0;
    this.frameId = requestAnimationFrame(this.loop.bind(this));
  }

  exit(next) {
    window.removeEventListener('resize', this.onResize);
    cancelAnimationFrame(this.frameId);
    this.frameId = null;
    this.confetti = [];
  }

  titleEl(text) {
    const h = document.createElement('h2');
    h.className = 'modal-title';
    h.textContent = text;
    return h;
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
    row.className = 'modal-best';
    row.textContent = `+${coins.toLocaleString('en-US')} COINS`;
    return row;
  }

  buttonEl(label, variant, onClick) {
    return new Button({ label, variant, onClick });
  }

  /* ---------- confetti ---------- */

  resize() {
    const rect = this.el.getBoundingClientRect();
    this.w = Math.max(1, rect.width);
    this.h = Math.max(1, rect.height);
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = Math.floor(this.w * this.dpr);
    this.canvas.height = Math.floor(this.h * this.dpr);
  }

  newPiece(anywhere) {
    return {
      x: Math.random() * this.w,
      y: anywhere ? Math.random() * this.h : -20 - Math.random() * this.h,
      w: 6 + Math.random() * 8,
      h: 10 + Math.random() * 12,
      vy: 130 + Math.random() * 240,
      vx: (Math.random() - 0.5) * 90,
      rot: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 7,
      sway: Math.random() * Math.PI * 2,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)]
    };
  }

  spawnConfetti() {
    this.confetti = [];
    for (let i = 0; i < 260; i += 1) this.confetti.push(this.newPiece(true));
  }

  loop(time) {
    const delta = this.lastTime ? Math.min(0.05, (time - this.lastTime) / 1000) : 0;
    this.lastTime = time;
    if (delta > 0) this.update(delta);
    this.render();
    this.frameId = requestAnimationFrame(this.loop.bind(this));
  }

  update(dt) {
    this.confetti.forEach((p) => {
      p.rot += p.vr * dt;
      p.sway += dt * 2;
      p.y += p.vy * dt;
      p.x += (p.vx + Math.sin(p.sway) * 45) * dt;
      if (p.y > this.h + 40) Object.assign(p, this.newPiece(false));
      if (p.x < -40) p.x = this.w + 40;
      if (p.x > this.w + 40) p.x = -40;
    });
  }

  render() {
    const ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.w, this.h);
    this.confetti.forEach((p) => {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    });
  }

  nextLevel() {
    this.game.audio.click();
    this.game.resumeRun = false;
    this.game.show(this.game.config.playTarget || 'gameplay');
  }

  doubleCoins(coins) {
    this.game.audio.click();
    if (typeof SDK === 'undefined') return;
    this.game.audio.pauseAll();
    SDK.rewarded().then((ok) => {
      this.game.audio.resumeAll();
      if (ok) {
        this.game.storage.set('coins', this.game.storage.get('coins', 0) + coins);
        this.game.audio.play('coin');
      }
      this.game.resumeRun = false;
      this.game.show('menu');
    });
  }
}
