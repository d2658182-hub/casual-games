/* Gameplay screen — Chain Rush core loop.
   Draw a continuous line to connect moving candies of the same color.
   Chain of 3+ = explosion + points. Reach the target score before time runs out. */

const CANDY_COLOR_HEX = {
  red: '#ff5a5a',
  orange: '#ff9f43',
  yellow: '#ffd93d',
  green: '#6bcf6b',
  blue: '#4f9dff',
  pink: '#ff7ac6',
  purple: '#b37aff',
  golden: '#ffd700',
  rainbow: '#ffffff',
  bomb: '#ff6b6b'
};

class GameplayScreen extends BaseScreen {
  constructor(game) {
    super(game, 'gameplay');
    this.canvas = null;
    this.ctx = null;
    this.hud = null;
    this.frameId = null;
    this.lastTime = 0;
    this.w = 0;
    this.h = 0;
    this.dpr = 1;

    this.running = false;
    this.ended = false;

    this.level = 1;
    this.cfg = null;
    this.score = 0;
    this.target = 0;
    this.timeLeft = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.multiplier = 1;
    this.starRushT = 0;
    this.slowT = 0;
    this.freezeT = 0;

    this.candies = [];
    this.obstacles = [];
    this.particles = [];
    this.popups = [];
    this.chain = [];
    this.chainColor = null;
    this.path = [];
    this.drawing = false;
    this.shake = 0;
    this.obstacleCooldown = 0;
    this.currentShape = null;

    this.imgs = {};
    this.fx = {};
    this.obstacleImgs = {};

    this.loadImages();
    this.loadObstacleImages();
  }

  /* ---------- assets ---------- */

  loadImages() {
    const cfg = this.game.config.candy || {};
    Object.keys(cfg.images || {}).forEach((key) => {
      const im = new Image();
      im.src = cfg.images[key];
      this.imgs[key] = im;
    });
    (cfg.shapes || []).forEach((shape) => {
      (cfg.colors || []).forEach((color) => {
        const key = `${shape}_${color}`;
        const im = new Image();
        im.src = `assets/game/candy/${key}.png`;
        this.imgs[key] = im;
      });
    });
  }

  loadObstacleImages() {
    ['rock', 'spikes'].forEach((key) => {
      const im = new Image();
      im.src = `assets/game/obstacles/${key}.png`;
      this.obstacleImgs[key] = im;
    });
  }

  candyKey(c) {
    return c.type === 'normal' ? `${this.currentShape}_${c.color}` : c.type;
  }

  imgFor(c) {
    return this.imgs[this.candyKey(c)] || null;
  }

  explosionFrames(color) {
    if (!this.fx[color]) {
      this.fx[color] = [];
      for (let n = 1; n <= 5; n += 1) {
        const im = new Image();
        im.src = `assets/game/fx/explosion-${color}-0${n}.png`;
        this.fx[color].push(im);
      }
    }
    return this.fx[color];
  }

  /* ---------- lifecycle ---------- */

  build() {
    const config = this.game.config;
    this.el = document.createElement('div');
    this.el.className = 'screen gameplay-screen';
    this.el.style.backgroundImage = `url("${config.backgrounds.gameplay}")`;

    this.canvas = document.createElement('canvas');
    this.canvas.className = 'game-canvas';
    this.ctx = this.canvas.getContext('2d');

    this.hud = document.createElement('div');
    this.hud.className = 'gameplay-hud';
    this.hud.innerHTML = `
      <div class="hud-top">
        <div class="hud-stat hud-score">
          <img src="assets/ui/c.png" alt="" draggable="false">
          <span class="hud-score-value">0</span>
          <span class="hud-target">/ 0</span>
        </div>
        <div class="hud-level">LVL 1</div>
        <button type="button" class="btn btn-square btn-pause" aria-label="Pause">
          <img src="assets/ui/b_8.png" alt="" draggable="false">
          <span class="btn-icon">⏸</span>
        </button>
      </div>
      <div class="hud-timer"><div class="hud-timer-fill"></div></div>
      <div class="hud-combo" aria-hidden="true">x1.5</div>
      <div class="level-banner" aria-hidden="true">
        <div class="level-banner-level">LEVEL 1</div>
        <div class="level-banner-sub">GOAL 0</div>
      </div>
      <div class="hud-powerups">${this.powerUpButtons()}</div>
    `;

    this.el.appendChild(this.canvas);
    this.el.appendChild(this.hud);

    this.levelBanner = this.hud.querySelector('.level-banner');
    this.bannerTimer = null;

    this.hud.querySelector('.btn-pause').addEventListener('click', () => this.pause());
    this.hud.querySelectorAll('.pwr-btn').forEach((btn) => {
      btn.addEventListener('click', () => this.usePowerUp(btn.dataset.id));
    });

    this.onKeyDown((event) => {
      if (event.code === 'Escape' || event.code === 'KeyP') this.pause();
    });
  }

  powerUpButtons() {
    const items = this.game.config.shop.items || [];
    return items.map((item) => `
      <button type="button" class="pwr-btn" data-id="${item.id}" aria-label="${item.name}">
        <img src="${item.icon}" alt="${item.name}" draggable="false">
        <span class="pwr-count">0</span>
      </button>
    `).join('');
  }

  enter(previous, options) {
    this.resize();
    this.onResize = () => this.resize();
    window.addEventListener('resize', this.onResize);
    this.bindInput();

    if (this.game.resumeRun && this.game.run) {
      this.restoreRun(this.game.run);
    } else {
      this.startLevel((options && options.level) || this.game.storage.get('level', 1));
    }
    this.game.resumeRun = false;

    this.lastTime = 0;
    this.frameId = requestAnimationFrame(this.loop.bind(this));
  }

  exit() {
    window.removeEventListener('resize', this.onResize);
    this.unbindInput();
    cancelAnimationFrame(this.frameId);
    this.frameId = null;
    clearTimeout(this.bannerTimer);
    if (this.running) this.game.run = this.serializeRun();
  }

  /* ---------- input ---------- */

  bindInput() {
    this.onPointerDown = (e) => this.pointerDown(e);
    this.onPointerMove = (e) => this.pointerMove(e);
    this.onPointerUp = (e) => this.pointerUp(e);
    this.canvas.addEventListener('pointerdown', this.onPointerDown);
    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
    window.addEventListener('pointercancel', this.onPointerUp);
  }

  unbindInput() {
    this.canvas.removeEventListener('pointerdown', this.onPointerDown);
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
    window.removeEventListener('pointercancel', this.onPointerUp);
  }

  toLocal(e) {
    const rect = this.canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  pointerDown(e) {
    e.preventDefault();
    if (!this.running) return;
    const pt = this.toLocal(e);
    if (this.obstacles.length && this.hitObstacle(pt)) {
      this.touchObstacle();
      return;
    }
    this.drawing = true;
    this.path = [pt];
    const hit = this.hitCandy(pt);
    if (hit) {
      this.chain = [hit];
      hit.locked = true;
      this.chainColor = this.startColor(hit);
      this.game.audio.play('collect', 0.8);
    }
  }

  pointerMove(e) {
    if (!this.drawing || !this.running) return;
    const pt = this.toLocal(e);
    this.path.push(pt);
    if (this.obstacles.length && this.hitObstacle(pt)) {
      this.touchObstacle();
      return;
    }
    if (this.chain.length === 0) {
      const hit = this.hitCandy(pt);
      if (hit) {
        this.chain = [hit];
        hit.locked = true;
        this.chainColor = this.startColor(hit);
        this.game.audio.play('collect', 0.8);
      }
      return;
    }
    const threshold = this.radius() * 1.7;
    for (const c of this.candies) {
      if (c.spawn > 0 || c.locked) continue;
      const dx = c.x - pt.x;
      const dy = c.y - pt.y;
      if (dx * dx + dy * dy <= threshold * threshold) {
        if (this.matches(this.chainColor, c)) {
          c.locked = true;
          this.chain.push(c);
          if (this.chainColor === null && c.type === 'normal') this.chainColor = c.color;
          this.game.audio.play('collect', 0.8);
        } else {
          this.breakChain();
        }
        break;
      }
    }
  }

  pointerUp() {
    if (!this.drawing) return;
    this.drawing = false;
    if (this.chain.length >= 3) {
      this.explodeChain();
    } else if (this.chain.length > 0) {
      this.chain.forEach((c) => { c.locked = false; });
    }
    this.chain = [];
    this.chainColor = null;
    this.path = [];
  }

  /* ---------- geometry ---------- */

  radius() {
    return Math.max(18, Math.min(40, Math.min(this.w, this.h) * 0.055));
  }

  hudTop() {
    return Math.max(72, this.h * 0.15);
  }

  powerBarH() {
    return 96;
  }

  hitCandy(pt) {
    let best = null;
    let bestD = Infinity;
    const thr = this.radius() * 1.8;
    for (const c of this.candies) {
      if (c.spawn > 0) continue;
      const d = Math.hypot(c.x - pt.x, c.y - pt.y);
      if (d <= thr && d < bestD) { bestD = d; best = c; }
    }
    return best;
  }

  dist(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  matches(chainColor, c) {
    if (c.type !== 'normal') return true;   // specials (golden/bomb/rainbow) join any chain
    if (chainColor === null || chainColor === 'rainbow') return true;   // undecided, or rainbow is the wildcard
    return c.color === chainColor;
  }

  /* Color the chain locks onto when it starts on a candy. Golden/bomb are
     colorless specials: the first normal candy decides the chain color. */
  startColor(hit) {
    if (hit.type === 'normal') return hit.color;
    if (hit.type === 'rainbow') return 'rainbow';
    return null;
  }

  colorHex(c) {
    const key = c.type === 'normal' ? c.color : c.type;
    return CANDY_COLOR_HEX[key] || '#ffffff';
  }

  explosionColor(c) {
    if (c.type !== 'normal') return 'red';
    const map = { red: 'red', orange: 'red', yellow: 'pink', green: 'green', blue: 'blue', pink: 'pink', purple: 'pink' };
    return map[c.color] || 'red';
  }

  /* ---------- level + spawn ---------- */

  startLevel(level) {
    this.level = LEVELS.clamp(level);
    this.cfg = LEVELS.config(this.level);
    this.score = 0;
    this.target = this.cfg.target;
    this.timeLeft = this.cfg.time;
    this.combo = 0;
    this.comboTimer = 0;
    this.multiplier = 1;
    this.starRushT = 0;
    this.slowT = 0;
    this.freezeT = 0;
    this.candies = [];
    this.obstacles = [];
    this.particles = [];
    this.popups = [];
    this.chain = [];
    this.chainColor = null;
    this.path = [];
    this.drawing = false;
    this.shake = 0;
    this.obstacleCooldown = 0;
    this.running = true;
    this.ended = false;
    this.applyWorldTheme();
    this.setShape();
    for (let i = 0; i < this.cfg.candyCount; i += 1) this.candies.push(this.spawnCandy());
    this.spawnObstacles(this.cfg.obstacles);
    this.updateHUD();
    this.showLevelIntro();
    this.sdk('level_started');
  }

  /* Background theme changes every 50 levels (world 1..6). */
  applyWorldTheme() {
    const world = this.cfg.world || LEVELS.world(this.level);
    this.el.style.backgroundImage = `url("assets/screens/gameplay-bg-${world}.png")`;
  }

  /* Pick a random candy shape for this level (visual variety). */
  setShape() {
    const shapes = this.game.config.candy.shapes || [];
    if (!shapes.length) { this.currentShape = null; return; }
    let idx = Math.floor(Math.random() * shapes.length);
    if (shapes[idx] === this.currentShape && shapes.length > 1) {
      idx = (idx + 1) % shapes.length;
    }
    this.currentShape = shapes[idx];
  }

  spawnObstacles(counts) {
    counts = counts || { rock: 0, spikes: 0 };
    for (let i = 0; i < (counts.rock || 0); i += 1) this.obstacles.push(this.spawnObstacle('rock'));
    for (let i = 0; i < (counts.spikes || 0); i += 1) this.obstacles.push(this.spawnObstacle('spikes'));
  }

  spawnObstacle(type) {
    const r = this.radius() * 1.1;
    const pad = r + 10;
    const top = this.hudTop();
    const bottom = this.h - this.powerBarH();
    const x = pad + Math.random() * (this.w - 2 * pad);
    const y = top + pad + Math.random() * Math.max(20, (bottom - top - 2 * pad));
    const angle = Math.random() * Math.PI * 2;
    const sp = this.cfg.speed * (0.75 + Math.random() * 0.5) * (type === 'spikes' ? 1.35 : 1);
    return {
      x, y,
      vx: Math.cos(angle) * sp,
      vy: Math.sin(angle) * sp,
      rot: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 2,
      r,
      type
    };
  }

  /* Level intro banner: announces the level + new mechanics/milestones. */
  showLevelIntro() {
    if (!this.levelBanner) return;
    const goal = this.target.toLocaleString('en-US');
    const prev = LEVELS.config(this.level - 1);
    let sub;
    if (this.level % 25 === 0) sub = `MILESTONE • GOAL ${goal}`;
    else if (this.cfg.colorCount > prev.colorCount) sub = `NEW COLOR • GOAL ${goal}`;
    else if (this.cfg.specialChance > prev.specialChance) sub = `SPECIAL CANDIES • GOAL ${goal}`;
    else sub = `GOAL ${goal}`;
    this.levelBanner.querySelector('.level-banner-level').textContent = `LEVEL ${this.level}`;
    this.levelBanner.querySelector('.level-banner-sub').textContent = sub;
    this.levelBanner.classList.remove('show');
    void this.levelBanner.offsetWidth; // restart the CSS animation
    this.levelBanner.classList.add('show');
    clearTimeout(this.bannerTimer);
    this.bannerTimer = setTimeout(() => this.levelBanner.classList.remove('show'), 1900);
  }

  spawnCandy() {
    const r = this.radius();
    const pad = r + 8;
    const top = this.hudTop();
    const bottom = this.h - this.powerBarH();
    const x = pad + Math.random() * (this.w - 2 * pad);
    const y = top + pad + Math.random() * Math.max(20, (bottom - top - 2 * pad));
    const angle = Math.random() * Math.PI * 2;
    const sp = this.cfg.speed * (0.6 + Math.random() * 0.8);
    const type = this.rollSpecial();
    return {
      x, y,
      vx: Math.cos(angle) * sp,
      vy: Math.sin(angle) * sp,
      rot: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 2.2,
      r,
      type,
      color: type === 'normal' ? this.randomColor() : null,
      locked: false,
      spawn: 0.35
    };
  }

  rollSpecial() {
    if (Math.random() >= this.cfg.specialChance) return 'normal';
    const roll = Math.random();
    if (roll < 0.45) return 'golden';
    if (roll < 0.8) return 'rainbow';
    return 'bomb';
  }

  randomColor() {
    const colors = this.game.config.candy.colors.slice(0, this.cfg.colorCount);
    return colors[Math.floor(Math.random() * colors.length)];
  }

  /* ---------- run state ---------- */

  serializeRun() {
    return {
      level: this.level,
      cfg: this.cfg,
      score: this.score,
      target: this.target,
      timeLeft: this.timeLeft,
      combo: this.combo,
      comboTimer: this.comboTimer,
      multiplier: this.multiplier,
      starRushT: this.starRushT,
      slowT: this.slowT,
      freezeT: this.freezeT,
      shape: this.currentShape,
      candies: this.candies.map((c) => ({
        x: c.x, y: c.y, vx: c.vx, vy: c.vy, rot: c.rot, vr: c.vr,
        r: c.r, type: c.type, color: c.color, locked: false, spawn: 0
      })),
      obstacles: this.obstacles.map((o) => ({
        x: o.x, y: o.y, vx: o.vx, vy: o.vy, rot: o.rot, vr: o.vr, r: o.r, type: o.type
      }))
    };
  }

  restoreRun(run) {
    this.level = run.level;
    this.cfg = run.cfg;
    this.score = run.score;
    this.target = run.target;
    this.timeLeft = run.timeLeft;
    this.combo = run.combo;
    this.comboTimer = run.comboTimer;
    this.multiplier = run.multiplier;
    this.starRushT = run.starRushT;
    this.slowT = run.slowT;
    this.freezeT = run.freezeT;
    this.currentShape = run.shape || null;
    if (!this.currentShape) this.setShape();
    this.candies = run.candies.map((c) => Object.assign({}, c));
    this.obstacles = (run.obstacles || []).map((o) => Object.assign({}, o));
    this.obstacleCooldown = 0;
    this.applyWorldTheme();
    this.particles = [];
    this.popups = [];
    this.chain = [];
    this.chainColor = null;
    this.path = [];
    this.drawing = false;
    this.shake = 0;
    this.running = true;
    this.ended = false;
    this.updateHUD();
  }

  /* ---------- loop ---------- */

  resize() {
    const rect = this.el.getBoundingClientRect();
    this.w = Math.max(1, rect.width);
    this.h = Math.max(1, rect.height);
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = Math.floor(this.w * this.dpr);
    this.canvas.height = Math.floor(this.h * this.dpr);
  }

  loop(time) {
    if (!this.running) return;
    const delta = this.lastTime ? (time - this.lastTime) / 1000 : 0;
    this.lastTime = time;
    if (delta > 0) this.update(Math.min(delta, 0.05));
    this.render();
    if (this.running) this.frameId = requestAnimationFrame(this.loop.bind(this));
  }

  speedFactor() {
    if (this.freezeT > 0) return 0;
    if (this.slowT > 0) return 0.55;
    return 1;
  }

  update(dt) {
    if (!this.running) return;

    this.starRushT = Math.max(0, this.starRushT - dt);
    this.slowT = Math.max(0, this.slowT - dt);
    this.freezeT = Math.max(0, this.freezeT - dt);

    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) {
        this.combo = 0;
        this.multiplier = 1;
        this.updateHUD();
      }
    }

    this.timeLeft -= dt;
    if (this.timeLeft <= 0) {
      this.timeLeft = 0;
      this.updateHUD();
      this.gameover();
      return;
    }

    this.shake = Math.max(0, this.shake - dt * 40);
    this.obstacleCooldown = Math.max(0, this.obstacleCooldown - dt);

    const sf = this.speedFactor();
    this.candies.forEach((c) => this.updateCandy(c, dt, sf));
    this.obstacles.forEach((o) => this.updateObstacle(o, dt, sf));

    this.particles = this.particles.filter((p) => this.updateParticle(p, dt));
    this.popups = this.popups.filter((p) => {
      p.life -= dt;
      p.y -= 44 * dt;
      return p.life > 0;
    });

    this.updateHUD();
  }

  updateCandy(c, dt, sf) {
    if (c.spawn > 0) { c.spawn -= dt; return; }
    if (c.locked) return;
    c.x += c.vx * dt * sf;
    c.y += c.vy * dt * sf;
    c.rot += c.vr * dt;
    const pad = c.r + 6;
    const top = this.hudTop();
    const bottom = this.h - this.powerBarH();
    if (c.x < pad) { c.x = pad; c.vx = Math.abs(c.vx); }
    if (c.x > this.w - pad) { c.x = this.w - pad; c.vx = -Math.abs(c.vx); }
    if (c.y < top + pad) { c.y = top + pad; c.vy = Math.abs(c.vy); }
    if (c.y > bottom - pad) { c.y = bottom - pad; c.vy = -Math.abs(c.vy); }
  }

  updateObstacle(o, dt, sf) {
    o.x += o.vx * dt * sf;
    o.y += o.vy * dt * sf;
    o.rot += o.vr * dt;
    const pad = o.r + 6;
    const top = this.hudTop();
    const bottom = this.h - this.powerBarH();
    if (o.x < pad) { o.x = pad; o.vx = Math.abs(o.vx); }
    if (o.x > this.w - pad) { o.x = this.w - pad; o.vx = -Math.abs(o.vx); }
    if (o.y < top + pad) { o.y = top + pad; o.vy = Math.abs(o.vy); }
    if (o.y > bottom - pad) { o.y = bottom - pad; o.vy = -Math.abs(o.vy); }
  }

  hitObstacle(pt) {
    for (const o of this.obstacles) {
      const d = Math.hypot(o.x - pt.x, o.y - pt.y);
      if (d <= o.r + this.radius() * 0.9) return o;
    }
    return null;
  }

  touchObstacle() {
    if (this.obstacleCooldown > 0) return;
    this.obstacleCooldown = 0.9;
    if (this.chain.length > 0) {
      this.breakChain();
    } else {
      this.timeLeft = Math.max(0, this.timeLeft - 0.5);
      this.shake = Math.max(this.shake, 6);
      this.game.audio.play('defeat', 0.4);
      this.updateHUD();
    }
  }

  updateParticle(p, dt) {
    p.t = (p.t || 0) + dt;
    if (p.kind === 'burst') {
      p.frame = Math.min(4, Math.floor(p.t / 0.07));
      return p.t < 0.35;
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 260 * dt;
    p.rot += p.vr * dt;
    return p.t < p.life;
  }

  /* ---------- render ---------- */

  render() {
    const ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.w, this.h);
    if (this.shake > 0) {
      ctx.translate((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake);
    }
    this.drawChainLine(ctx);
    this.candies.forEach((c) => this.drawCandy(ctx, c));
    this.drawObstacles(ctx);
    this.drawParticles(ctx);
    this.drawPopups(ctx);
  }

  drawChainLine(ctx) {
    if (!this.drawing || this.path.length < 2) return;
    const color = this.chainColor ? this.colorHexKey(this.chainColor) : '#ffffff';
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = color;
    ctx.lineWidth = 7;
    ctx.shadowColor = color;
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.moveTo(this.path[0].x, this.path[0].y);
    for (let i = 1; i < this.path.length; i += 1) ctx.lineTo(this.path[i].x, this.path[i].y);
    ctx.stroke();
    ctx.restore();
  }

  colorHexKey(key) {
    return CANDY_COLOR_HEX[key] || '#ffffff';
  }

  drawCandy(ctx, c) {
    const img = this.imgFor(c);
    if (!img || !img.complete) return;
    const scale = c.spawn > 0 ? Math.max(0.01, 1 - c.spawn / 0.35) : 1;
    const r = c.r * scale;
    ctx.save();
    ctx.translate(c.x, c.y);
    ctx.rotate(c.rot);
    ctx.shadowColor = 'rgba(30, 15, 0, 0.45)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 4;
    if (c.locked) {
      ctx.shadowColor = this.colorHex(c);
      ctx.shadowBlur = 22;
      ctx.shadowOffsetY = 0;
    }
    ctx.drawImage(img, -r * 1.1, -r, r * 2.2, r * 2);
    ctx.restore();
  }

  drawObstacles(ctx) {
    this.obstacles.forEach((o) => {
      const img = this.obstacleImgs[o.type];
      if (!img || !img.complete) return;
      ctx.save();
      ctx.translate(o.x, o.y);
      ctx.rotate(o.rot);
      ctx.shadowColor = 'rgba(30, 15, 0, 0.5)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetY = 3;
      ctx.drawImage(img, -o.r, -o.r, o.r * 2, o.r * 2);
      ctx.restore();
    });
  }

  drawParticles(ctx) {
    this.particles.forEach((p) => {
      if (p.kind === 'burst') {
        const frames = this.explosionFrames(p.color);
        const img = frames[Math.min(frames.length - 1, p.frame)];
        if (img && img.complete) {
          const s = p.r || this.radius() * 3.2;
          ctx.save();
          ctx.globalAlpha = Math.max(0, 1 - p.t / 0.35);
          ctx.drawImage(img, p.x - s, p.y - s, s * 2, s * 2);
          ctx.restore();
        }
      } else {
        const img = this.imgs[p.img];
        if (img && img.complete) {
          ctx.save();
          ctx.globalAlpha = Math.max(0, Math.min(1, p.life - p.t));
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.drawImage(img, -p.r, -p.r, p.r * 2, p.r * 2);
          ctx.restore();
        }
      }
    });
    ctx.globalAlpha = 1;
  }

  drawPopups(ctx) {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `900 ${Math.round(this.radius() * 1.1)}px system-ui, sans-serif`;
    this.popups.forEach((p) => {
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life));
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(60,20,0,0.75)';
      ctx.strokeText(p.text, p.x, p.y);
      ctx.fillStyle = p.color || '#ffffff';
      ctx.fillText(p.text, p.x, p.y);
    });
    ctx.globalAlpha = 1;
  }

  /* ---------- chain ---------- */

  breakChain() {
    if (this.chain.length === 0) return;
    this.chain.forEach((c) => { c.locked = false; });
    this.chain = [];
    this.chainColor = null;
    this.path = [this.path[this.path.length - 1]];
    this.combo = 0;
    this.comboTimer = 0;
    this.multiplier = 1;
    this.timeLeft = Math.max(0, this.timeLeft - 1);
    this.shake = Math.max(this.shake, 4);
    this.game.audio.play('defeat', 0.45);
    this.updateHUD();
  }

  explodeChain() {
    const chain = this.chain.slice();
    const n = chain.length;

    this.combo += 1;
    this.comboTimer = 3;
    this.multiplier = Math.min(5, 1 + (this.combo - 1) * 0.5);

    let bonus = 0;
    const primary = chain.find((c) => c.type === 'normal');
    const primaryColor = primary ? primary.color : null;
    const extras = [];

    chain.forEach((c) => {
      if (c.type === 'golden') bonus += 300;
      if (c.type === 'rainbow' && primaryColor) {
        this.candies.forEach((o) => {
          if (o.type === 'normal' && o.color === primaryColor && !o.locked && o.spawn <= 0) {
            extras.push(o);
            bonus += 50;
          }
        });
      }
      if (c.type === 'bomb') {
        this.candies.forEach((o) => {
          if (!o.locked && o.spawn <= 0 && this.dist(c, o) < this.radius() * 2.8) {
            extras.push(o);
            bonus += 50;
          }
        });
      }
    });

    let points = 50 * n * (n - 2) + bonus;
    const mult = this.multiplier * (this.starRushT > 0 ? 2 : 1);
    const finalPoints = Math.round(points * mult);
    this.score += finalPoints;

    const exploded = new Set(chain.concat(extras));
    exploded.forEach((c) => this.explodeCandy(c));
    this.candies = this.candies.filter((c) => !exploded.has(c));
    for (let i = 0; i < exploded.size; i += 1) this.candies.push(this.spawnCandy());

    const cx = chain.reduce((s, c) => s + c.x, 0) / n;
    const cy = chain.reduce((s, c) => s + c.y, 0) / n;
    this.popups.push({ x: cx, y: cy, text: `+${finalPoints.toLocaleString('en-US')}`, life: 1, color: '#ffffff' });
    if (this.combo > 1) {
      this.popups.push({ x: cx, y: cy - 28, text: `COMBO x${this.multiplier.toFixed(1)}`, life: 1.2, color: '#ffe08a' });
    }

    this.game.audio.play('explosion');
    if (this.combo >= 2) this.game.audio.play('combo', 0.7);
    this.shake = Math.max(this.shake, 6);
    this.updateHUD();

    if (this.score >= this.target) this.victory();
  }

  explodeCandy(c) {
    const color = this.explosionColor(c);
    this.particles.push({ kind: 'burst', x: c.x, y: c.y, color, frame: 0, t: 0, r: this.radius() * 3.2 });
    for (let i = 0; i < 4; i += 1) {
      const a = Math.random() * Math.PI * 2;
      const sp = 80 + Math.random() * 160;
      this.particles.push({
        kind: 'shard',
        x: c.x, y: c.y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 60,
        rot: Math.random() * 6,
        vr: (Math.random() - 0.5) * 10,
        r: c.r * 0.42,
        img: this.candyKey(c),
        t: 0,
        life: 0.7
      });
    }
  }

  /* ---------- power-ups ---------- */

  usePowerUp(id) {
    const key = `power_${id}`;
    const stock = this.game.storage.get(key, 0);
    if (stock <= 0 || !this.running) return;
    this.game.storage.set(key, stock - 1);
    this.refreshPowerUpButtons();
    this.game.audio.click();

    switch (id) {
      case 'rainbow_pop': this.powerRainbowPop(); break;
      case 'star_rush': this.starRushT = 10; this.popups.push({ x: this.w / 2, y: this.h / 2, text: '2x SCORE!', life: 1.2, color: '#ffe08a' }); break;
      case 'big_blast': this.powerBigBlast(); break;
      case 'sweet_time': this.timeLeft += 10; this.popups.push({ x: this.w / 2, y: this.h / 2, text: '+10s', life: 1.2, color: '#aef7c8' }); break;
      default: break;
    }
    this.updateHUD();
  }

  explodeSet(targets, pointsPer) {
    if (targets.length === 0) return;
    const gained = targets.length * pointsPer;
    this.score += gained;
    targets.forEach((c) => this.explodeCandy(c));
    this.candies = this.candies.filter((c) => !targets.includes(c));
    targets.forEach(() => this.candies.push(this.spawnCandy()));
    this.popups.push({ x: this.w / 2, y: this.h / 2, text: `+${gained.toLocaleString('en-US')}`, life: 1, color: '#ffffff' });
    this.game.audio.play('explosion');
    this.shake = Math.max(this.shake, 5);
    this.updateHUD();
    if (this.score >= this.target) this.victory();
  }

  powerRainbowPop() {
    const counts = {};
    this.candies.forEach((c) => { if (c.type === 'normal') counts[c.color] = (counts[c.color] || 0) + 1; });
    let color = null;
    let max = 0;
    Object.keys(counts).forEach((k) => { if (counts[k] > max) { max = counts[k]; color = k; } });
    if (!color) return;
    this.explodeSet(this.candies.filter((c) => c.type === 'normal' && c.color === color), 60);
  }

  powerBigBlast() {
    const cx = this.w / 2;
    const cy = this.h / 2;
    const rr = this.radius() * 5;
    this.explodeSet(this.candies.filter((c) => Math.hypot(c.x - cx, c.y - cy) < rr), 70);
  }

  /* ---------- HUD ---------- */

  updateHUD() {
    if (!this.hud) return;
    const scoreEl = this.hud.querySelector('.hud-score-value');
    if (scoreEl) scoreEl.textContent = this.score.toLocaleString('en-US');
    const targetEl = this.hud.querySelector('.hud-target');
    if (targetEl) targetEl.textContent = `/ ${this.target.toLocaleString('en-US')}`;
    const levelEl = this.hud.querySelector('.hud-level');
    if (levelEl) levelEl.textContent = `LVL ${this.level}`;
    const fill = this.hud.querySelector('.hud-timer-fill');
    if (fill && this.cfg) {
      const pct = Math.max(0, Math.min(100, (this.timeLeft / this.cfg.time) * 100));
      fill.style.width = `${pct}%`;
      fill.classList.toggle('low', pct < 30);
    }
    const comboEl = this.hud.querySelector('.hud-combo');
    if (comboEl) {
      if (this.combo > 1) {
        comboEl.style.display = 'flex';
        comboEl.textContent = `x${this.multiplier.toFixed(1)}`;
      } else {
        comboEl.style.display = 'none';
      }
    }
    this.refreshPowerUpButtons();
  }

  refreshPowerUpButtons() {
    if (!this.hud) return;
    this.hud.querySelectorAll('.pwr-btn').forEach((btn) => {
      const count = this.game.storage.get(`power_${btn.dataset.id}`, 0);
      const el = btn.querySelector('.pwr-count');
      if (el) el.textContent = count;
      btn.classList.toggle('empty', count <= 0);
    });
  }

  /* ---------- end states ---------- */

  starsFor() {
    const ratio = this.score / this.target;
    if (ratio >= 1.6) return 3;
    if (ratio >= 1.25) return 2;
    return 1;
  }

  victory() {
    if (this.ended) return;
    this.ended = true;
    this.running = false;
    this.score += Math.round(this.timeLeft * 20);

    const coins = 25 + this.level * 3;
    this.game.storage.set('coins', this.game.storage.get('coins', 0) + coins);
    const best = Math.max(this.game.storage.get('best', 0), this.score);
    this.game.storage.set('best', best);
    this.game.storage.set('level', Math.min(300, this.level + 1));

    this.game.audio.play('victory');
    this.game.ads.recordRun('win');
    this.game.resumeRun = false;
    this.sdk('level_completed');
    this.game.ads.maybeInterstitial();
    this.game.show('victory', {
      score: this.score,
      best,
      coins,
      level: this.level,
      stars: this.starsFor(),
      nextLevel: Math.min(300, this.level + 1)
    });
  }

  gameover() {
    if (this.ended) return;
    this.ended = true;
    this.running = false;

    const coins = Math.max(3, Math.round(this.score / 60));
    this.game.storage.set('coins', this.game.storage.get('coins', 0) + coins);
    const best = Math.max(this.game.storage.get('best', 0), this.score);
    this.game.storage.set('best', best);

    this.game.audio.play('defeat');
    this.game.ads.recordRun('lose');
    this.game.run = this.serializeRun();
    this.game.resumeRun = false;
    this.sdk('level_failed');
    this.game.ads.maybeInterstitial();
    this.game.show('gameover', { score: this.score, best, coins, level: this.level });
  }

  pause() {
    if (!this.running) return;
    this.game.audio.click();
    this.game.resumeRun = true;
    this.game.run = this.serializeRun();
    this.game.show('pause');
  }

  sdk(name) {
    if (typeof SDK !== 'undefined') SDK.levelMessage(name);
  }
}
