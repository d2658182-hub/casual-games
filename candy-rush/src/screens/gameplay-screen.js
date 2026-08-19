/* ============================================================
   GAMEPLAY — CANDY RUSH engine (level mode)
   ------------------------------------------------------------
   150 levels / 10 worlds. Each level has an objective :
     SCORE   → reach the target score
     CANDIES → collect N sweets (move left/right!)
     SURVIVE → pass every gate
   Controls (bottom bar): ◀ ▶ to move, 4 color buttons = exact
   color. Combo ≥ 5 triggers FEVER (double points, glow, music
   pitch). Passing the objective → VICTORY screen.
   ============================================================ */

/* Round color button gradient + arrow icons (no external assets). */
function ctlGrad(color) {
  return `radial-gradient(circle at 32% 28%, rgba(255,255,255,0.75), ${color.body} 52%, ${color.edge} 100%)`;
}

const CTL_ICONS = {
  left: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 4 7 12l8 8" fill="none" stroke="#7a4a66" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  right: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4l8 8-8 8" fill="none" stroke="#7a4a66" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/></svg>'
};

const FEVER_RAINBOW = ['#ff9ed8', '#8fe8c6', '#8fd0ff', '#ffe58a', '#c77dff', '#ffb56b'];

class GameplayScreen extends BaseScreen {
  constructor(game) {
    super(game, 'gameplay');
    this.images = {};
    this.resetRun();
  }

  /* ----- state ----- */

  resetRun(levelDef) {
    const cfg = this.game.config;
    const owned = this.game.storage.get('owned', {});
    const equipped = this.game.storage.get('equipped', {});
    this.level = levelDef || cfg.getLevel(1);
    this.maxHearts = Math.min(cfg.game.maxHearts, (cfg.hud.hearts || 3) + (owned.heart_plus ? 1 : 0));
    this.hearts = this.maxHearts;
    this.score = 0;
    this.coinsEarned = 0;
    this.candiesCollected = 0;
    this.combo = 0;
    this.gatesPassed = 0;
    this.gatesProcessed = 0;
    this.levelGates = this.level.gates;
    this.objective = this.level.objective;
    this.speed = this.level.speed;
    this.gapSec = this.level.gapSec;
    this.ballColor = 0;
    this.ballX = null;
    this.ballVx = 0;
    this.moveDir = 0;
    this.lastTapTime = -999;
    this.tapCount = 0;
    this.invulnUntil = 0;
    this.shieldUsed = false;
    this.hitTimer = 0;
    this.shake = 0;
    this.flash = 0;
    this.timeScale = 1;
    this.squashX = 1;
    this.squashY = 1;
    this.gates = [];
    this.sweets = [];
    this.particles = [];
    this.floaters = [];
    this.lines = [];
    this.clouds = [];
    this.trail = [];
    this.tutorialDone = false;
    this.paused = false;
    this.state = 'idle';
    this.won = false;
    this.winTimer = 0;
    this.dying = 0;
    this.deathSnapshot = null;
    this.nowSec = 0;
    this.pf = { w: 0, h: 0, x: 0, ballY: 0, r: 0, margin: 26 };
    this.comboVisible = false;
    this.fever = false;
    this.feverPulse = 0;
    // equipped cosmetics (video unlocks)
    this.skin = equipped.skin || 'default';
    this.face = equipped.face || 'default';
    this.trailType = equipped.trail || 'none';
    this.gateStyle = equipped.gate || 'default';
  }

  captureSnapshot() {
    return {
      level: this.level.n,
      score: this.score,
      coinsEarned: this.coinsEarned,
      candiesCollected: this.candiesCollected,
      speed: this.speed,
      gatesPassed: this.gatesPassed,
      gatesProcessed: this.gatesProcessed,
      gates: this.gates.map((g) => ({ ...g })),
      sweets: this.sweets.map((s) => ({ ...s })),
      tutorialDone: this.tutorialDone
    };
  }

  restoreSnapshot() {
    const snap = this.deathSnapshot;
    if (!snap) return;
    const cfg = this.game.config;
    const owned = this.game.storage.get('owned', {});
    this.maxHearts = Math.min(cfg.game.maxHearts, (cfg.hud.hearts || 3) + (owned.heart_plus ? 1 : 0));
    this.hearts = this.maxHearts;
    this.level = cfg.getLevel(snap.level);
    this.score = snap.score;
    this.coinsEarned = snap.coinsEarned;
    this.candiesCollected = snap.candiesCollected;
    this.speed = snap.speed;
    this.gatesPassed = snap.gatesPassed;
    this.gatesProcessed = snap.gatesProcessed;
    this.levelGates = this.level.gates;
    this.objective = this.level.objective;
    this.gates = snap.gates;
    this.sweets = snap.sweets;
    this.tutorialDone = snap.tutorialDone;
    this.combo = 0;
    this.comboVisible = false;
    this.fever = false;
    this.particles = [];
    this.floaters = [];
    this.lines = [];
    this.trail = [];
    this.invulnUntil = this.nowSec + 1.5;
    this.state = 'running';
    this.game.audio.playMusic(this.level.music);
    this.refreshHud();
  }

  /* ----- DOM ----- */

  build(options = {}) {
    const config = this.game.config;

    // build() runs BEFORE enter() (screen-manager), so resolve the level now
    // to build the right world background (else it stays on world 1 forever)
    const n = Math.max(1, Math.min(config.totalLevels, options.level || this.level.n || 1));
    const lvlDef = config.getLevel(n);
    this.level = lvlDef;

    this.el = document.createElement('div');
    this.el.className = 'screen gameplay-screen';
    this.el.appendChild(BG.build('gameplay', lvlDef.bg));

    this.canvas = document.createElement('canvas');
    this.canvas.className = 'game-canvas';
    this.ctx = this.canvas.getContext('2d');

    this.hud = document.createElement('div');
    this.hud.className = 'gameplay-hud';
    this.hud.innerHTML = `
      <div class="hud-left">
        <div class="hud-score">
          <img src="assets/ui/c.png" alt="" draggable="false">
          <span class="hud-score-value">0</span>
        </div>
        <div class="level-tag"><span class="level-tag-num">1</span></div>
      </div>
      <div class="hud-center">
        <div class="combo-pill hidden"><span>${LANG.t('gameplay.combo')}</span> <b>x1</b></div>
        <div class="fever-pill hidden">${LANG.t('gameplay.fever')} 🔥</div>
      </div>
      <div class="hud-right">
        <div class="hud-hearts"></div>
        <button type="button" class="btn btn-square btn-pause" aria-label="Pause">
          <img src="assets/ui/b_8.png" alt="" draggable="false">
          <span class="btn-icon">⏸</span>
        </button>
      </div>
    `;

    this.pauseMenu = document.createElement('div');
    this.pauseMenu.className = 'pause-overlay hidden';
    this.pauseMenu.innerHTML = `
      <div class="pause-card">
        <h2 class="modal-title">${LANG.t('gameplay.pause')}</h2>
        <button type="button" class="btn btn-primary btn-resume"><img src="assets/ui/b_4.png" alt="" draggable="false"><span class="btn-label">${LANG.t('gameplay.resume')}</span></button>
        <button type="button" class="btn btn-secondary btn-restart"><img src="assets/ui/b_5.png" alt="" draggable="false"><span class="btn-label">${LANG.t('gameplay.restart')}</span></button>
        <button type="button" class="btn btn-back btn-quit"><img src="assets/ui/b_2.png" alt="" draggable="false"><span class="btn-label">${LANG.t('gameplay.quit')}</span></button>
      </div>
    `;

    // Bottom control bar : ◀ ▶ on their own row ABOVE the 4 color
    // buttons (bigger, more spaced = more comfortable on a phone)
    this.controls = document.createElement('div');
    this.controls.className = 'game-controls';
    const palette = this.game.config.game.palette;
    const colorButtons = palette.map((c, i) =>
      `<button type="button" class="ctl-btn ctl-color" data-color="${i}" aria-label="${c.id}" style="background:${ctlGrad(c)};--glow:${c.glow}"><span class="ctl-dot"></span></button>`
    ).join('');
    this.controls.innerHTML = `
      <div class="ctl-row ctl-row-move">
        <button type="button" class="ctl-btn ctl-arrow ctl-left" aria-label="Move left">${CTL_ICONS.left}</button>
        <button type="button" class="ctl-btn ctl-arrow ctl-right" aria-label="Move right">${CTL_ICONS.right}</button>
      </div>
      <div class="ctl-row ctl-row-colors">${colorButtons}</div>
    `;

    this.el.appendChild(this.canvas);
    this.el.appendChild(this.hud);
    this.el.appendChild(this.pauseMenu);
    this.el.appendChild(this.controls);

    // objective progress bar : its own row below the HUD (no overlap)
    this.objectiveWrap = document.createElement('div');
    this.objectiveWrap.className = 'objective-wrap hidden';
    this.objectiveWrap.innerHTML = `
      <div class="objective-bar">
        <span class="objective-label">${LANG.t('gameplay.objective.score')}</span>
        <div class="objective-track"><div class="objective-fill"></div></div>
        <span class="objective-value">0/0</span>
      </div>
    `;
    this.el.appendChild(this.objectiveWrap);

    this.loadImages();

    // interactions — NO canvas tap-to-cycle : the color must only change
    // via the 4 dedicated buttons (an accidental tap used to switch
    // pink → mint without the player noticing)
    this.canvas.addEventListener('pointerdown', (e) => e.preventDefault());
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    // Hold-to-move arrows (pointer events, multi-touch safe)
    const holdArrow = (btn, dir) => {
      const press = (e) => {
        e.preventDefault();
        this.moveDir = dir;
      };
      const release = () => {
        if (this.moveDir === dir) this.moveDir = 0;
      };
      btn.addEventListener('pointerdown', press);
      btn.addEventListener('pointerup', release);
      btn.addEventListener('pointercancel', release);
      btn.addEventListener('pointerleave', release);
      btn.addEventListener('contextmenu', (e) => e.preventDefault());
    };
    holdArrow(this.controls.querySelector('.ctl-left'), -1);
    holdArrow(this.controls.querySelector('.ctl-right'), 1);

    this.controls.querySelectorAll('.ctl-color').forEach((btn) => {
      btn.addEventListener('click', () => this.setColor(parseInt(btn.dataset.color, 10)));
    });

    this.hud.querySelector('.btn-pause').addEventListener('click', () => {
      this.game.audio.click();
      this.togglePause();
    });
    this.pauseMenu.querySelector('.btn-resume').addEventListener('click', () => {
      this.game.audio.click();
      this.togglePause();
    });
    this.pauseMenu.querySelector('.btn-restart').addEventListener('click', () => {
      this.game.audio.click();
      this.restartRun();
    });
    this.pauseMenu.querySelector('.btn-quit').addEventListener('click', () => {
      this.game.audio.click();
      this.stopRun();
      Bridge.platform.sendMessage('level_paused', this.levelPayload());
      this.game.show('menu');
    });

    this.onKeyDown((event) => {
      if (event.code === 'Escape') {
        this.togglePause();
      } else if (event.code === 'ArrowLeft') {
        this.moveDir = -1;
      } else if (event.code === 'ArrowRight') {
        this.moveDir = 1;
      } else if (event.code === 'Space' || event.code === 'ArrowUp' || event.code === 'Enter') {
        this.switchColor();
      } else if (event.code >= 'Digit1' && event.code <= 'Digit4') {
        this.setColor(parseInt(event.code.slice(-1), 10) - 1);
      }
    });
    this.cleanups.push(this.game.input.on('keyup', (event) => {
      if (event.code === 'ArrowLeft' && this.moveDir === -1) this.moveDir = 0;
      if (event.code === 'ArrowRight' && this.moveDir === 1) this.moveDir = 0;
    }));

    this.updateColorButtons();
  }

  loadImages() {
    const list = [
      'assets/candies/donut-sprinkles.png',
      'assets/candies/lollypop.png',
      'assets/candies/cupcake.png',
      'assets/candies/ice-cream.png',
      'assets/candies/cookie.png',
      'assets/candies/candy-bar.png',
      'assets/fx/star.png',
      'assets/fx/spark.png',
      'assets/bg/clouds1.png',
      'assets/bg/cloud3.png',
      'assets/bg/cloud9.png'
    ];
    list.forEach((path) => {
      if (this.images[path]) return;
      const img = new Image();
      img.src = path;
      this.images[path] = img;
    });
  }

  img(path) {
    return this.images[path];
  }

  /* ----- Playgama lifecycle helpers ----- */

  levelPayload() {
    return { world: this.level.worldName, level: String(this.level.n) };
  }

  /* Interstitial policy (Playgama best practice) :
     - one interstitial after 2 CONSECUTIVE runs with the same outcome
       (2 wins OR 2 losses), at the natural transition (victory/game over)
     - never during active gameplay
     - never right after a rewarded ad (60 s cool-down)
     - minimum 60 s between interstitials
     then the streak resets. */
  maybeInterstitial(outcome) {
    const cfg = this.game.config.game;
    const streak = this.game._outcomeStreak || { outcome: null, count: 0 };
    streak.count = (streak.outcome === outcome) ? streak.count + 1 : 1;
    streak.outcome = outcome;
    this.game._outcomeStreak = streak;
    const minGap = (cfg.interstitialMinGapSec || 60) * 1000;
    const now = Date.now();
    const sinceRewarded = now - (Bridge.lastRewardedAt || 0);
    const sinceLast = now - (this.game._lastInterstitialAt || 0);
    if (streak.count >= (cfg.interstitialStreak || 2) &&
        sinceRewarded >= minGap && sinceLast >= minGap) {
      streak.count = 0;
      this.game._lastInterstitialAt = now;
      const placement = outcome === 'win' ? 'level_complete' : 'game_over';
      setTimeout(() => Bridge.advertisement.showInterstitial(placement), 500);
    }
  }

  /* ----- lifecycle ----- */

  enter(previous, options = {}) {
    if (options.revive && this.deathSnapshot) {
      this.restoreSnapshot();
    } else {
      const n = Math.max(1, Math.min(this.game.config.totalLevels, options.level || 1));
      this.resetRun(this.game.config.getLevel(n));
      this.state = 'ready';
      this.readyTimer = 0.7;
    }
    this.refreshHud();
    this.paused = false;
    this.pauseMenu.classList.add('hidden');
    this.resize();
    this.game.audio.playMusic(this.level.music);
    this.onResize = () => this.resize();
    window.addEventListener('resize', this.onResize);
    this.lastTime = 0;
    this.frameId = requestAnimationFrame(this.loop.bind(this));
    Bridge.platform.sendMessage('level_started', this.levelPayload());
  }

  exit(next) {
    window.removeEventListener('resize', this.onResize);
    cancelAnimationFrame(this.frameId);
    this.frameId = null;
    // leaving to the menu : stop the world music so nothing keeps playing
    if (!next || next.name === 'menu') this.game.audio.stopMusic();
  }

  restartRun() {
    this.game.audio.click();
    const n = this.level.n;
    this.resetRun(this.game.config.getLevel(n));
    this.state = 'ready';
    this.readyTimer = 0.7;
    this.paused = false;
    this.pauseMenu.classList.add('hidden');
    this.refreshHud();
    this.lastTime = 0;
  }

  /* Fully stop the run (RAF + music) when leaving to the menu :
     the game must not keep playing in the background. */
  stopRun() {
    this.paused = true;
    this.state = 'idle';
    this.moveDir = 0;
    this.pauseMenu.classList.add('hidden');
    this.game.audio.stopMusic();
    cancelAnimationFrame(this.frameId);
    this.frameId = null;
    this.game.audio.setMusicRate(1);
  }

  togglePause() {
    if (this.state !== 'running' && this.state !== 'ready') return;
    this.paused = !this.paused;
    this.pauseMenu.classList.toggle('hidden', !this.paused);
    this.game.audio.click();
    Bridge.platform.sendMessage(this.paused ? 'level_paused' : 'level_resumed', this.levelPayload());
  }

  forcePause() {
    if ((this.state === 'running' || this.state === 'ready') && !this.paused) {
      this.paused = true;
      this.pauseMenu.classList.remove('hidden');
      Bridge.platform.sendMessage('level_paused', this.levelPayload());
    }
  }

  /* ----- layout ----- */

  resize() {
    const rect = this.el.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.dpr = dpr;
    this.cssW = rect.width;
    this.cssH = rect.height;
    this.canvas.width = Math.floor(rect.width * dpr);
    this.canvas.height = Math.floor(rect.height * dpr);
    const w = rect.width;
    const h = rect.height;
    let pfW = Math.min(w - 20, 460);
    if (h < w) pfW = Math.min(pfW, Math.max(260, h * 0.86));
    this.pf = {
      w: pfW,
      h,
      x: (w - pfW) / 2,
      ballY: h < w ? h * 0.56 : h * 0.62,
      r: Math.max(15, Math.min(30, pfW * 0.075)),
      margin: Math.max(22, pfW * 0.05)
    };
    const minX = this.pf.x + this.pf.margin + this.pf.r;
    const maxX = this.pf.x + this.pf.w - this.pf.margin - this.pf.r;
    if (this.ballX == null) this.ballX = this.pf.x + this.pf.w / 2;
    this.ballX = Math.max(minX, Math.min(maxX, this.ballX));
  }

  /* ----- main loop ----- */

  loop(time) {
    const delta = this.lastTime ? Math.min((time - this.lastTime) / 1000, 0.05) : 0;
    this.lastTime = time;
    this.nowSec = time / 1000;
    if (!this.paused) {
      this.timeScale += (1 - this.timeScale) * Math.min(1, 6 * delta);
      this.update(delta * this.timeScale);
    }
    this.render();
    this.frameId = requestAnimationFrame(this.loop.bind(this));
  }

  update(wdt) {
    if (this.state === 'ready') {
      this.readyTimer -= wdt;
      this.updateFx(wdt);
      if (this.readyTimer <= 0) {
        this.state = 'running';
        this.initWorld();
      }
      return;
    }

    if (this.state === 'running') {
      // level speed : base + tiny ramp
      this.speed = Math.min(
        this.game.config.game.maxSpeed,
        this.level.speed + this.gatesPassed * 2
      );
      // horizontal movement (hold ◀ / ▶, keyboard arrows)
      const moveMax = Math.min(620, 340 + this.speed * 0.18);
      this.ballVx += (this.moveDir * moveMax - this.ballVx) * Math.min(1, 9 * wdt);
      this.ballX += this.ballVx * wdt;
      const minX = this.pf.x + this.pf.margin + this.pf.r;
      const maxX = this.pf.x + this.pf.w - this.pf.margin - this.pf.r;
      this.ballX = Math.max(minX, Math.min(maxX, this.ballX));

      this.spawnGates();
      this.moveWorld(wdt);
      this.processGates();
      this.updateSweets(wdt);
      this.updateTrail(wdt);
      this.checkWin();
      this.updateFeverFx(wdt);
    } else if (this.state === 'dying') {
      this.dying -= wdt;
      if (this.dying <= 0) {
        this.finalize();
        return;
      }
    } else if (this.state === 'won') {
      this.winTimer -= wdt;
      if (this.winTimer <= 0) {
        this.finalizeWin();
        return;
      }
    }

    this.updateFx(wdt);
  }

  /* ----- world ----- */

  initWorld() {
    for (let i = 0; i < this.game.config.game.gatesPerScreen + 1; i += 1) {
      this.spawnGate();
    }
  }

  pickColor() {
    const prev = this.gates.length ? this.gates[this.gates.length - 1].color : -1;
    let color;
    do {
      color = Math.floor(Math.random() * this.game.config.game.palette.length);
    } while (color === prev && Math.random() < 0.8);
    return color;
  }

  spawnGate() {
    const cfg = this.game.config.game;
    const color = this.pickColor();
    // SPACED gates : the gap scales with the level (gapSec seconds of travel)
    const gap = this.speed * this.gapSec * (0.9 + Math.random() * 0.25);
    const h = Math.max(12, Math.min(24, this.pf.w * (0.038 + Math.random() * 0.02)));
    const prevY = this.gates.length ? this.gates[this.gates.length - 1].y : 0;
    const newY = prevY - gap;
    this.gates.push({
      y: newY,
      h,
      color,
      processed: false,
      spawnedAt: this.nowSec
    });
    this.spawnSweetsForGap(newY, prevY);
  }

  spawnSweetsForGap(topY, bottomY) {
    const cfg = this.game.config.game;
    const [min, max] = cfg.sweetsPerGap;
    const count = min + Math.floor(Math.random() * (max - min + 1));
    for (let i = 0; i < count; i += 1) {
      const size = 26 + Math.random() * 10;
      this.sweets.push({
        x: this.pf.x + this.pf.margin + Math.random() * (this.pf.w - this.pf.margin * 2),
        y: topY + Math.random() * Math.max(60, bottomY - topY),
        kind: Math.floor(Math.random() * 6),
        size,
        r: size * 0.42,
        phase: Math.random() * Math.PI * 2,
        collected: false
      });
    }
  }

  spawnGates() {
    while (this.gates.length === 0 || this.gates[this.gates.length - 1].y > -200) {
      this.spawnGate();
    }
  }

  moveWorld(wdt) {
    const move = this.hitTimer > 0 ? 0 : this.speed * wdt;
    this.hitTimer = Math.max(0, this.hitTimer - wdt);
    for (const gate of this.gates) gate.y += move;
    for (const sweet of this.sweets) sweet.y += move;
  }

  processGates() {
    const bottom = this.pf.ballY + this.pf.r;
    for (const gate of this.gates) {
      if (!gate.processed && gate.y - gate.h / 2 >= bottom) {
        gate.processed = true;
        this.gatesProcessed += 1;
        if (gate.color === this.ballColor) this.onPass(gate);
        else this.onHit(gate);
      }
    }
    this.gates = this.gates.filter((g) => g.y - g.h / 2 < this.pf.h + 60);
  }

  perfectWindow() {
    return this.level.perfectWindow;
  }

  onPass(gate) {
    const cfg = this.game.config.game;
    const owned = this.game.storage.get('owned', {});
    const mult = owned.double_points ? 2 : 1;
    this.combo += 1;
    this.gatesPassed += 1;
    const multiplier = Math.min(10, this.combo);
    let pts = 10 * multiplier;
    const perfect = this.lastTapTime >= gate.spawnedAt && (this.nowSec - this.lastTapTime) <= this.perfectWindow();
    if (perfect) {
      pts += 50;
      this.combo += 1;
    }
    pts *= mult;
    if (this.fever) pts *= cfg.feverPointsMult;
    this.score += pts;

    const color = cfg.palette[gate.color];
    this.burst(gate.y - gate.h / 2 - this.pf.r * 0.5, color.body, 10);
    this.float(`+${pts}`, this.pf.x + this.pf.w / 2, gate.y - gate.h / 2 - 26, '#ffffff', Math.min(30, 14 + multiplier * 1.4));
    if (perfect) {
      this.float(LANG.t('gameplay.perfect'), this.pf.x + this.pf.w / 2, gate.y - gate.h / 2 - 58, '#ffd23f', 22);
      this.timeScale = 0.45;
      this.game.audio.perfect();
    }
    this.game.audio.pass(this.combo);

    if (this.combo >= 2) {
      this.comboVisible = true;
      this.comboPulse = 1;
      this.updateComboPill();
    }
    if (this.combo >= cfg.feverCombo && !this.fever) this.startFever();
    if (this.combo > 0 && this.combo % 5 === 0) {
      this.float(`${LANG.t('gameplay.combo')} x${multiplier}`, this.pf.x + this.pf.w / 2, this.pf.ballY - this.pf.r - 90, '#ffd23f', 24);
      this.game.audio.comboMilestone(Math.min(6, Math.floor(this.combo / 5)));
    }

    if (!this.tutorialDone && this.gatesPassed >= 2) this.tutorialDone = true;
    this.updateScoreDisplay();
    this.updateObjective();
  }

  onHit(gate) {
    const owned = this.game.storage.get('owned', {});
    if (owned.shield && !this.shieldUsed) {
      this.shieldUsed = true;
      this.invulnUntil = this.nowSec + 1.0;
      this.burst(this.ballX, '#ffffff', 16);
      this.float('🛡', this.ballX, this.pf.ballY - this.pf.r - 40, '#ffffff', 22);
      this.game.audio.hit();
      return;
    }
    this.hearts -= 1;
    this.combo = 0;
    this.comboVisible = false;
    this.stopFever();
    this.updateComboPill();
    this.shake = 0.55;
    this.flash = 0.6;
    this.hitTimer = 0.35;
    this.invulnUntil = this.nowSec + 1.3;
    const color = this.game.config.game.palette[this.ballColor];
    this.burst(this.ballX, color.edge, 18);
    this.game.audio.hit();
    this.updateHeartsDisplay();
    if (this.hearts <= 0) this.startDeath();
  }

  updateSweets(wdt) {
    const owned = this.game.storage.get('owned', {});
    const magnet = !!owned.magnet;
    const bx = this.ballX;
    const by = this.pf.ballY;
    const reach = 150;
    for (const sweet of this.sweets) {
      if (sweet.collected) continue;
      let dx = sweet.x - bx;
      let dy = sweet.y - by;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (magnet && dist < reach && dist > 0.5) {
        const pull = Math.min(1, 10 * wdt);
        sweet.x -= dx * pull;
        sweet.y -= dy * pull;
        dx = sweet.x - bx;
        dy = sweet.y - by;
      }
      if (Math.sqrt(dx * dx + dy * dy) < this.pf.r + sweet.r) {
        sweet.collected = true;
        this.onCollect(sweet);
      }
    }
    this.sweets = this.sweets.filter((s) => !s.collected && s.y < this.pf.h + 60);
  }

  onCollect(sweet) {
    const cfg = this.game.config.game;
    const owned = this.game.storage.get('owned', {});
    this.coinsEarned += 1;
    this.candiesCollected += 1;
    let pts = 25 * (owned.double_points ? 2 : 1);
    if (this.fever) pts *= cfg.feverPointsMult;
    this.score += pts;
    this.sparkle(sweet.x, sweet.y, '#ffffff');
    this.float(`+${pts}`, sweet.x, sweet.y - 22, '#ff9ed8', 15);
    this.game.audio.gem();
    this.updateScoreDisplay();
    this.updateObjective();
  }

  /* ----- objective + win ----- */

  objectiveProgress() {
    const t = this.objective;
    if (t.type === 'score') return { value: this.score, target: t.target };
    if (t.type === 'candies') return { value: this.candiesCollected, target: t.target };
    return { value: this.gatesProcessed, target: t.target };
  }

  updateObjective() {
    const wrap = this.objectiveWrap;
    if (!wrap) return;
    const p = this.objectiveProgress();
    wrap.classList.remove('hidden');
    wrap.querySelector('.objective-label').textContent = LANG.t(`gameplay.objective.${this.objective.type}`);
    wrap.querySelector('.objective-value').textContent = `${Math.min(p.value, p.target)}/${p.target}`;
    const pct = Math.min(1, p.value / p.target);
    wrap.querySelector('.objective-fill').style.width = `${Math.round(pct * 100)}%`;
    if (p.value >= p.target) wrap.classList.add('objective-done');
  }

  checkWin() {
    if (this.state !== 'running' || this.won) return;
    const p = this.objectiveProgress();
    if (p.value >= p.target) this.startWin();
  }

  startWin() {
    if (this.won) return;
    this.won = true;
    this.state = 'won';
    this.winTimer = 1.3;
    this.game.audio.revive();
    // celebration : confetti burst + coin fountain
    for (let i = 0; i < 3; i += 1) {
      setTimeout(() => this.confettiBurst(), i * 150);
    }
    this.float(LANG.t('victory.title'), this.pf.x + this.pf.w / 2, this.pf.ballY - this.pf.r - 70, '#ffd23f', 30);
    this.shake = 0.4;
  }

  confettiBurst() {
    const cfg = this.game.config.game;
    const cx = this.pf.x + this.pf.w / 2;
    for (let i = 0; i < 34; i += 1) {
      const a = Math.random() * Math.PI * 2;
      const sp = 90 + Math.random() * 240;
      this.particles.push({
        x: cx, y: this.pf.ballY,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 120,
        life: 0.7 + Math.random() * 0.6,
        maxLife: 1.3,
        size: 3 + Math.random() * 5,
        color: FEVER_RAINBOW[i % FEVER_RAINBOW.length],
        type: 'circle',
        gravity: 320
      });
    }
  }

  starsEarned() {
    const p = this.objectiveProgress();
    const ratio = p.value / p.target;
    if (this.objective.type === 'survive') {
      return this.hearts >= this.maxHearts ? 3 : this.hearts >= 2 ? 2 : 1;
    }
    if (ratio >= 1.9) return 3;
    if (ratio >= 1.45) return 2;
    return 1;
  }

  finalizeWin() {
    if (this.state !== 'won') return;
    this.state = 'idle';
    this.game.audio.setMusicRate(1);
    const cfg = this.game.config;
    const stars = this.starsEarned();
    const progress = this.game.storage.get('progress', { unlocked: 1, stars: {} });
    progress.stars = progress.stars || {};
    progress.stars[this.level.n] = Math.max(progress.stars[this.level.n] || 0, stars);
    progress.unlocked = Math.max(progress.unlocked || 1, Math.min(cfg.totalLevels, this.level.n + 1));
    this.game.storage.set('progress', progress);
    this.game.storage.set('coins', this.game.storage.get('coins', 0) + this.coinsEarned);
    Bridge.platform.sendMessage('level_completed', this.levelPayload());
    this.maybeInterstitial('win');
    this.game.show('victory', {
      level: this.level.n,
      worldName: this.level.worldName,
      stars,
      score: this.score,
      coins: this.coinsEarned,
      isLast: this.level.n >= cfg.totalLevels
    });
  }

  /* ----- death ----- */

  startDeath() {
    if (this.state === 'dying' || this.state === 'idle' || this.state === 'won') return;
    this.state = 'dying';
    this.dying = 0.9;
    this.deathSnapshot = this.captureSnapshot();
    this.shake = 0.8;
    this.flash = 0.9;
    this.burst(this.ballX, this.pf.ballY, '#ffffff', 26);
    this.stopFever();
    this.game.audio.gameOver();
    Bridge.platform.sendMessage('level_failed', this.levelPayload());
  }

  finalize() {
    if (this.state !== 'dying') return;
    this.state = 'idle';
    const prevBest = this.game.storage.get('best', 0);
    const best = Math.max(prevBest, this.score);
    const isNewBest = this.score > prevBest && this.score > 0;
    this.game.storage.set('best', best);
    if (isNewBest) Bridge.platform.sendMessage('player_got_achievement');
    if (this.score > 0) Bridge.leaderboards.setScore(this.game.config.leaderboardId, this.score);
    this.maybeInterstitial('loss');
    this.game.show('gameover', {
      score: this.score,
      best,
      coins: this.coinsEarned,
      isNewBest,
      level: this.level.n,
      worldName: this.level.worldName
    });
  }

  /* ----- FEVER (combo ≥ 5) ----- */

  startFever() {
    this.fever = true;
    this.feverPulse = 1;
    this.float(LANG.t('gameplay.fever') + ' 🔥', this.pf.x + this.pf.w / 2, this.pf.ballY - this.pf.r - 60, '#ff9ed8', 28);
    this.game.audio.comboMilestone(4);
    this.updateFeverPill();
    this.game.audio.setMusicRate(this.game.config.game.feverMusicRate);
  }

  stopFever() {
    if (!this.fever) return;
    this.fever = false;
    this.feverPulse = 0;
    this.updateFeverPill();
    this.game.audio.setMusicRate(1);
  }

  updateFeverFx(wdt) {
    if (this.fever) this.feverPulse = Math.min(1, this.feverPulse + wdt * 2);
    else this.feverPulse = Math.max(0, this.feverPulse - wdt * 2);
  }

  updateFeverPill() {
    const pill = this.hud.querySelector('.fever-pill');
    if (!pill) return;
    pill.classList.toggle('hidden', !this.fever);
  }

  /* ----- input ----- */

  switchColor() {
    if (this.state !== 'running' || this.paused) return;
    this.ballColor = (this.ballColor + 1) % this.game.config.game.palette.length;
    this.lastTapTime = this.nowSec;
    this.tapCount += 1;
    this.squashX = 1.22;
    this.squashY = 0.78;
    this.game.audio.switchColor();
    this.updateColorButtons();
  }

  setColor(index) {
    if (this.state !== 'running' || this.paused) return;
    if (index < 0 || index >= this.game.config.game.palette.length) return;
    if (index === this.ballColor) return;
    this.ballColor = index;
    this.lastTapTime = this.nowSec;
    this.squashX = 1.22;
    this.squashY = 0.78;
    this.game.audio.switchColor();
    this.updateColorButtons();
  }

  updateColorButtons() {
    if (!this.controls) return;
    this.controls.querySelectorAll('.ctl-color').forEach((btn) => {
      btn.classList.toggle('active', parseInt(btn.dataset.color, 10) === this.ballColor);
    });
  }

  /* ----- fx ----- */

  updateTrail(wdt) {
    if (this.trailType === 'none' || this.state !== 'running') {
      this.trail = [];
      return;
    }
    this.trail.push({ x: this.ballX, y: this.pf.ballY, life: 0.45, vx: -this.ballVx * 0.25 });
    if (this.trail.length > 14) this.trail.shift();
    for (const t of this.trail) {
      t.life -= wdt;
      t.x += t.vx * wdt;
    }
    this.trail = this.trail.filter((t) => t.life > 0);
  }

  updateFx(wdt) {
    this.squashX += (1 - this.squashX) * Math.min(1, 10 * wdt);
    this.squashY += (1 - this.squashY) * Math.min(1, 10 * wdt);
    this.shake = Math.max(0, this.shake - wdt * 1.7);
    this.flash = Math.max(0, this.flash - wdt * 2.2);
    this.comboPulse = Math.max(0, (this.comboPulse || 0) - wdt * 3);
    for (const p of this.particles) {
      p.life -= wdt;
      p.x += p.vx * wdt;
      p.y += p.vy * wdt;
      p.vy += (p.gravity || 0) * wdt;
      p.rot += (p.vr || 0) * wdt;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
    if (this.particles.length > 200) this.particles.splice(0, this.particles.length - 200);
    for (const f of this.floaters) {
      f.life -= wdt;
      f.y += f.vy * wdt;
    }
    this.floaters = this.floaters.filter((f) => f.life > 0);
    this.updateClouds(wdt);
    this.updateLines(wdt);
  }

  updateClouds(wdt) {
    if (this.clouds.length === 0) {
      const defs = [
        { img: 'assets/bg/clouds1.png', scale: 0.55, factor: 0.28, alpha: 0.5 },
        { img: 'assets/bg/cloud3.png', scale: 0.8, factor: 0.4, alpha: 0.6 },
        { img: 'assets/bg/cloud9.png', scale: 0.7, factor: 0.5, alpha: 0.6 },
        { img: 'assets/bg/cloud3.png', scale: 0.55, factor: 0.62, alpha: 0.5 },
        { img: 'assets/bg/clouds1.png', scale: 0.35, factor: 0.8, alpha: 0.35 }
      ];
      defs.forEach((d) => {
        this.clouds.push({
          img: d.img,
          scale: d.scale,
          factor: d.factor,
          alpha: d.alpha,
          x: Math.random() * this.pf.w,
          y: -Math.random() * this.pf.h
        });
      });
    }
    const speed = this.state === 'running' ? this.speed : this.speed * 0.3;
    for (const c of this.clouds) {
      c.y += speed * c.factor * wdt;
      if (c.y > this.pf.h + 120) {
        c.y = -120;
        c.x = Math.random() * this.pf.w;
      }
    }
  }

  updateLines(wdt) {
    if (this.state === 'running' && this.speed > 380) {
      const chance = Math.min(0.5, (this.speed - 380) / 700);
      if (Math.random() < chance) {
        this.lines.push({
          x: this.pf.x + this.pf.margin + Math.random() * (this.pf.w - this.pf.margin * 2),
          y: -30,
          len: 40 + Math.random() * 60
        });
      }
    }
    for (const l of this.lines) l.y += this.speed * 1.8 * wdt;
    this.lines = this.lines.filter((l) => l.y < this.pf.h + 40);
  }

  burst(x, y, color, count) {
    for (let i = 0; i < count; i += 1) {
      const a = Math.random() * Math.PI * 2;
      const sp = 40 + Math.random() * 160;
      this.particles.push({
        x, y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 40,
        life: 0.4 + Math.random() * 0.4,
        maxLife: 0.8,
        size: 2 + Math.random() * 4,
        color,
        type: 'circle'
      });
    }
  }

  sparkle(x, y, color) {
    for (let i = 0; i < 6; i += 1) {
      const a = Math.random() * Math.PI * 2;
      const sp = 30 + Math.random() * 90;
      this.particles.push({
        x, y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: 0.3 + Math.random() * 0.3,
        maxLife: 0.6,
        size: 6 + Math.random() * 8,
        color,
        type: 'star',
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 8,
        img: this.img('assets/fx/star.png')
      });
    }
  }

  float(text, x, y, color, size) {
    this.floaters.push({ text, x, y, vy: -46, life: 0.9, maxLife: 0.9, color, size });
  }

  /* ----- HUD ----- */

  updateScoreDisplay() {
    const value = this.hud.querySelector('.hud-score-value');
    if (value) value.textContent = this.score.toLocaleString('en-US');
    const tag = this.hud.querySelector('.level-tag-num');
    if (tag) tag.textContent = this.level.n;
  }

  updateHeartsDisplay() {
    const container = this.hud.querySelector('.hud-hearts');
    if (!container) return;
    container.innerHTML = '';
    for (let i = 0; i < this.maxHearts; i += 1) {
      const img = document.createElement('img');
      img.src = i < this.hearts ? 'assets/ui/l1.png' : 'assets/ui/l2.png';
      img.alt = '';
      img.draggable = false;
      if (i >= this.hearts) img.classList.add('heart-lost');
      container.appendChild(img);
    }
  }

  updateComboPill() {
    const pill = this.hud.querySelector('.combo-pill');
    if (!pill) return;
    if (this.comboVisible && this.combo >= 2) {
      const multiplier = Math.min(10, this.combo);
      pill.classList.remove('hidden');
      pill.querySelector('b').textContent = `x${multiplier}`;
    } else {
      pill.classList.add('hidden');
    }
  }

  refreshHud() {
    this.updateScoreDisplay();
    this.updateHeartsDisplay();
    this.updateComboPill();
    this.updateColorButtons();
    this.updateObjective();
    this.updateFeverPill();
  }

  /* ----- render ----- */

  render() {
    const { ctx, dpr } = this;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, this.cssW, this.cssH);

    ctx.save();
    const shX = (Math.random() - 0.5) * this.shake * 22;
    const shY = (Math.random() - 0.5) * this.shake * 22;
    ctx.translate(shX, shY);

    this.drawClouds();
    this.drawLines();
    this.drawGates();
    this.drawSweets();
    this.drawTrail();
    this.drawParticles();
    this.drawBall();
    this.drawFloaters();
    this.drawFeverOverlay();
    this.drawTutorial();
    this.drawFlash();

    ctx.restore();
  }

  rr(x, y, w, h, r) {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  drawClouds() {
    const ctx = this.ctx;
    for (const c of this.clouds) {
      const img = this.img(c.img);
      if (!img || !img.complete || img.naturalWidth === 0) continue;
      const w = img.naturalWidth * c.scale;
      const h = img.naturalHeight * c.scale;
      ctx.globalAlpha = c.alpha;
      ctx.drawImage(img, c.x, c.y, w, h);
      ctx.globalAlpha = 1;
    }
  }

  drawLines() {
    if (this.lines.length === 0) return;
    const ctx = this.ctx;
    const alpha = Math.min(0.3, (this.speed - 380) / 800);
    ctx.fillStyle = `rgba(255,255,255,${alpha.toFixed(3)})`;
    for (const l of this.lines) {
      ctx.fillRect(l.x, l.y, 3, l.len);
    }
  }

  drawGates() {
    const ctx = this.ctx;
    const cfg = this.game.config.game;
    const x = this.pf.x;
    const w = this.pf.w;
    const style = this.gateStyle;
    for (const gate of this.gates) {
      const col = cfg.palette[gate.color];
      const gy = gate.y - gate.h / 2;
      const r = gate.h / 2;
      const pulse = 0.5 + 0.5 * Math.sin(this.nowSec * 5 + gate.y);
      // body
      ctx.fillStyle = col.body;
      this.rr(x, gy, w, gate.h, r);
      ctx.fill();
      // glossy top
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      this.rr(x, gy, w, gate.h * 0.34, r);
      ctx.fill();
      // darker bottom edge
      ctx.fillStyle = col.edge;
      this.rr(x, gy + gate.h - gate.h * 0.3, w, gate.h * 0.3, r);
      ctx.fill();
      // candy stripes / decorations per gate style
      if (style === 'striped') {
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        for (let sx = x - gate.h; sx < x + w + gate.h; sx += gate.h * 1.6) {
          ctx.beginPath();
          ctx.moveTo(sx, gy + gate.h);
          ctx.lineTo(sx + gate.h, gy);
          ctx.lineTo(sx + gate.h * 0.6, gy);
          ctx.lineTo(sx - gate.h * 0.4, gy + gate.h);
          ctx.closePath();
          ctx.fill();
        }
      } else if (style === 'dots') {
        ctx.fillStyle = 'rgba(255,255,255,0.45)';
        const dotR = gate.h * 0.22;
        for (let sx = x + w * 0.12; sx < x + w; sx += w * 0.22) {
          ctx.beginPath();
          ctx.arc(sx, gy + gate.h / 2, dotR, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (style === 'sparkle') {
        ctx.fillStyle = `rgba(255,255,255,${(0.25 + 0.4 * pulse).toFixed(2)})`;
        ctx.fillRect(x + w * 0.08, gy + gate.h * 0.55, w * 0.06, gate.h * 0.18);
        ctx.fillRect(x + w * 0.86, gy + gate.h * 0.55, w * 0.06, gate.h * 0.18);
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 6 + 10 * pulse;
        ctx.fillRect(x + w * 0.08, gy + gate.h * 0.55, w * 0.06, gate.h * 0.18);
        ctx.shadowBlur = 0;
      } else {
        ctx.fillStyle = 'rgba(255,255,255,0.22)';
        ctx.fillRect(x + w * 0.08, gy + gate.h * 0.55, w * 0.06, gate.h * 0.18);
        ctx.fillRect(x + w * 0.86, gy + gate.h * 0.55, w * 0.06, gate.h * 0.18);
      }
    }
  }

  drawSweets() {
    const ctx = this.ctx;
    const paths = [
      'assets/candies/cookie.png',
      'assets/candies/ice-cream.png',
      'assets/candies/candy-bar.png',
      'assets/candies/cupcake.png',
      'assets/candies/lollypop.png',
      'assets/candies/donut-sprinkles.png'
    ];
    for (const sweet of this.sweets) {
      const img = this.img(paths[sweet.kind]);
      if (!img || !img.complete || img.naturalWidth === 0) continue;
      const bob = Math.sin(this.nowSec * 3 + sweet.phase) * 2.5;
      const size = sweet.size;
      ctx.save();
      ctx.translate(sweet.x, sweet.y + bob);
      ctx.rotate(Math.sin(this.nowSec * 1.6 + sweet.phase) * 0.15);
      ctx.drawImage(img, -size / 2, -size / 2, size, size);
      ctx.restore();
    }
  }

  drawTrail() {
    if (this.trailType === 'none' || this.trail.length === 0) return;
    const ctx = this.ctx;
    const colors = this.trailType === 'confetti' ? FEVER_RAINBOW
      : this.trailType === 'star' ? ['#ffffff', '#ffe58a'] : ['#bfe8ff', '#ffffff'];
    for (const t of this.trail) {
      const alpha = Math.max(0, t.life / 0.45) * 0.55;
      ctx.globalAlpha = alpha;
      const c = colors[Math.floor(t.life * 20) % colors.length];
      ctx.fillStyle = c;
      if (this.trailType === 'star') {
        ctx.save();
        ctx.translate(t.x, t.y);
        ctx.rotate(t.life * 6);
        const s = 7;
        ctx.fillRect(-s / 2, -s / 2, s, s);
        ctx.restore();
      } else {
        ctx.beginPath();
        ctx.arc(t.x, t.y, 3 + t.life * 6, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
  }

  drawParticles() {
    const ctx = this.ctx;
    for (const p of this.particles) {
      const t = p.life / p.maxLife;
      if (p.type === 'star' && p.img) {
        ctx.globalAlpha = t;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.drawImage(p.img, -p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
        ctx.globalAlpha = 1;
      } else {
        ctx.globalAlpha = t;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * t, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }
  }

  ballColors() {
    const cfg = this.game.config.game;
    if (this.skin === 'rainbow') {
      const i = Math.floor(this.nowSec * 6) % FEVER_RAINBOW.length;
      return { body: FEVER_RAINBOW[i], edge: FEVER_RAINBOW[(i + 1) % FEVER_RAINBOW.length], glow: 'rgba(255,255,255,0.6)' };
    }
    const skinDef = this.game.config.skins[this.skin];
    if (skinDef) return { body: skinDef.body, edge: skinDef.edge, glow: skinDef.glow };
    return cfg.palette[this.ballColor];
  }

  drawBall() {
    const ctx = this.ctx;
    const col = this.ballColors();
    const r = this.pf.r;
    const bx = this.ballX;
    const by = this.pf.ballY;
    const owned = this.game.storage.get('owned', {});

    ctx.save();
    ctx.translate(bx, by);
    ctx.scale(this.squashX, this.squashY);

    ctx.shadowColor = this.fever ? '#ffffff' : col.glow;
    ctx.shadowBlur = this.fever ? 26 : 16;
    const grad = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r);
    grad.addColorStop(0, col.body);
    grad.addColorStop(0.75, col.body);
    grad.addColorStop(1, col.edge);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // candy stripes skin
    if (this.skin === 'rainbow' || this.skin === 'gold') {
      ctx.save();
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.clip();
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      for (let i = -r; i < r; i += r * 0.5) {
        ctx.save();
        ctx.translate(i, 0);
        ctx.rotate(0.7);
        ctx.fillRect(0, -r, r * 0.18, r * 2);
        ctx.restore();
      }
      ctx.restore();
    }

    // shine
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.beginPath();
    ctx.ellipse(-r * 0.32, -r * 0.42, r * 0.28, r * 0.15, -0.55, 0, Math.PI * 2);
    ctx.fill();

    // kawaii face (emoji skins, or blink while invulnerable)
    if (this.face !== 'default') {
      const emoji = { face_happy: '😆', face_cool: '😎', face_love: '🥰' }[this.face] || '😊';
      ctx.font = `${r * 1.35}px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(emoji, 0, r * 0.05);
    } else {
      const blink = this.invulnUntil > this.nowSec && Math.sin(this.nowSec * 26) > 0.55;
      if (!blink) {
        ctx.fillStyle = '#4a2b3e';
        ctx.beginPath();
        ctx.arc(-r * 0.3, -r * 0.05, r * 0.11, 0, Math.PI * 2);
        ctx.arc(r * 0.3, -r * 0.05, r * 0.11, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#4a2b3e';
        ctx.lineWidth = Math.max(2, r * 0.09);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(0, r * 0.02, r * 0.24, 0.2, Math.PI - 0.2);
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,120,170,0.5)';
        ctx.beginPath();
        ctx.ellipse(-r * 0.46, r * 0.18, r * 0.16, r * 0.09, 0, 0, Math.PI * 2);
        ctx.ellipse(r * 0.46, r * 0.18, r * 0.16, r * 0.09, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // shield ring
    if (owned.shield && !this.shieldUsed) {
      ctx.strokeStyle = `rgba(255,255,255,${0.5 + 0.4 * Math.sin(this.nowSec * 6)})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, r + 7, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }

  drawFeverOverlay() {
    if (this.feverPulse <= 0.01) return;
    const ctx = this.ctx;
    const pulse = 0.5 + 0.5 * Math.sin(this.nowSec * 9);
    const alpha = this.feverPulse * (0.06 + 0.05 * pulse);
    ctx.fillStyle = `rgba(255,158,216,${alpha.toFixed(3)})`;
    ctx.fillRect(0, 0, this.cssW, this.cssH);
  }

  drawFloaters() {
    const ctx = this.ctx;
    for (const f of this.floaters) {
      const t = f.life / f.maxLife;
      ctx.globalAlpha = Math.min(1, t * 1.6);
      ctx.font = `${f.size}px "Kenney Mini Square","Segoe UI",Arial,sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(74,43,62,0.9)';
      ctx.strokeText(f.text, f.x, f.y);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y);
      ctx.globalAlpha = 1;
    }
  }

  drawTutorial() {
    if (this.tutorialDone || this.state !== 'running') return;
    const ctx = this.ctx;
    const cx = this.ballX;
    const cy = this.pf.ballY - this.pf.r - 46 + Math.sin(this.nowSec * 4) * 4;
    const text = LANG.t('gameplay.hint');
    ctx.font = `18px "Kenney Mini Square","Segoe UI",Arial,sans-serif`;
    const tw = ctx.measureText(text).width;
    const w = Math.min(this.pf.w - 40, tw + 36);
    const h = 40;
    const x = cx - w / 2;
    const y = cy - h / 2;

    ctx.fillStyle = 'rgba(255,255,255,0.94)';
    this.rr(x, y, w, h, h / 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(74,43,62,0.25)';
    ctx.lineWidth = 2;
    this.rr(x, y, w, h, h / 2);
    ctx.stroke();

    ctx.fillStyle = '#4a2b3e';
    ctx.font = `18px "Kenney Mini Square","Segoe UI",Arial,sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, cx, cy);

    const palette = this.game.config.game.palette;
    const dotR = 7;
    const total = palette.length * (dotR * 2 + 6) - 6;
    let dx = cx - total / 2 + dotR;
    for (let i = 0; i < palette.length; i += 1) {
      ctx.fillStyle = palette[i].body;
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(dx, cy + h / 2 + dotR + 6, dotR, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      dx += dotR * 2 + 6;
    }
  }

  drawFlash() {
    if (this.flash <= 0) return;
    const ctx = this.ctx;
    ctx.fillStyle = `rgba(255,90,120,${(this.flash * 0.3).toFixed(3)})`;
    ctx.fillRect(0, 0, this.cssW, this.cssH);
  }
}
