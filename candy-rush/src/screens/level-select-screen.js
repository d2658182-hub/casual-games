/* ============================================================
   WORLD MAP — the 10 candy worlds on a winding path
   ------------------------------------------------------------
   • Map view : one node per world (pastel gradient, name, stars,
     lock state). Tapping an unlocked world opens its levels.
   • World view : the 15 levels of that world in a grid. The 15th
     level is the BOSS node (crown). Tapping a level starts it.
   • Esc / HOME always goes back one step (world → map → menu).
   ============================================================ */

class LevelSelectScreen extends BaseScreen {
  constructor(game) {
    super(game, 'levels');
    this.view = 'map';      // 'map' | 'world'
    this.worldIdx = 0;
  }

  build(options = {}) {
    const cfg = this.game.config;
    const progress = this.game.storage.get('progress', { unlocked: 1, stars: {} });
    const unlocked = Math.max(1, progress.unlocked || 1);

    if (options.world !== undefined && options.world !== null) {
      this.view = 'world';
      this.worldIdx = options.world;
    }

    this.el = document.createElement('div');
    this.el.className = 'screen level-select-screen';
    this.el.innerHTML = '';
    const world = this.view === 'world' ? cfg.worlds[this.worldIdx] : null;
    this.el.appendChild(BG.build('gameplay', world ? world.bg : null));

    const head = document.createElement('div');
    head.className = 'levels-head';
    const title = document.createElement('h2');
    title.className = 'modal-title';
    title.textContent = world ? `${this.worldIdx + 1}. ${world.name}` : LANG.t('levels.title');
    head.appendChild(title);
    const homeBtn = new Button({
      label: LANG.t('levels.home'),
      variant: 'back',
      onClick: () => this.back()
    });
    head.appendChild(homeBtn.el);
    this.el.appendChild(head);

    if (this.view === 'world') {
      this.el.appendChild(this.worldLevelsEl(this.worldIdx, unlocked, progress));
    } else {
      this.el.appendChild(this.mapEl(unlocked, progress));
    }

    this.onKeyDown((event) => {
      if (event.code === 'Escape') this.back();
    });
  }

  back() {
    this.game.audio.click();
    if (this.view === 'world') {
      this.view = 'map';
      this.rebuild();
    } else {
      this.game.show('menu');
    }
  }

  rebuild() {
    const el = this.el;
    const game = this.game;
    this.cleanups.forEach((cleanup) => cleanup());
    this.cleanups = [];
    game.screens.show('levels');
    if (el) el.remove();
  }

  /* ----- map : winding path of world nodes ----- */

  mapEl(unlocked, progress) {
    const cfg = this.game.config;
    const scroll = document.createElement('div');
    scroll.className = 'world-map-scroll';
    const path = document.createElement('div');
    path.className = 'world-map-path';
    path.appendChild(this.mapStartNode());

    cfg.worlds.forEach((w, wIdx) => {
      const first = wIdx * cfg.levelsPerWorld + 1;
      const locked = first > unlocked;
      const node = document.createElement('button');
      node.type = 'button';
      node.className = `world-node ${locked ? 'locked' : ''}`;
      node.style.setProperty('--w1', w.bg[0]);
      node.style.setProperty('--w2', w.bg[2]);
      const stars = this.worldStars(progress, wIdx);
      const total = cfg.levelsPerWorld * 3;
      node.innerHTML = `
        <span class="world-node-badge">${wIdx + 1}</span>
        <span class="world-node-name">${w.name}</span>
        <span class="world-node-stars"><img src="assets/ui/s1.png" alt="" draggable="false">${stars}/${total}</span>
        ${locked ? '<span class="world-node-lock">🔒</span>' : ''}
        ${!locked && stars === total ? '<span class="world-node-done">👑</span>' : ''}
      `;
      if (locked) {
        node.disabled = true;
      } else {
        node.addEventListener('click', () => {
          this.game.audio.click();
          this.worldIdx = wIdx;
          this.view = 'world';
          this.rebuild();
        });
      }
      path.appendChild(node);
      if (wIdx < cfg.worlds.length - 1) path.appendChild(this.mapLinkNode(wIdx));
    });
    scroll.appendChild(path);
    return scroll;
  }

  /* little candy dot marking the start of the path */
  mapStartNode() {
    const dot = document.createElement('span');
    dot.className = 'world-map-start';
    dot.textContent = '🍭';
    return dot;
  }

  /* dotted link between two world nodes */
  mapLinkNode(wIdx) {
    const link = document.createElement('span');
    link.className = 'world-map-link';
    link.innerHTML = `<i></i><i></i><i></i>`;
    return link;
  }

  /* ----- world view : the 15 levels of a world ----- */

  worldLevelsEl(wIdx, unlocked, progress) {
    const cfg = this.game.config;
    const wrap = document.createElement('div');
    wrap.className = 'world-levels';

    const info = document.createElement('div');
    info.className = 'world-levels-info';
    const w = cfg.worlds[wIdx];
    info.innerHTML = `<img src="assets/ui/s1.png" alt="" draggable="false"><span>${this.worldStars(progress, wIdx)}/${cfg.levelsPerWorld * 3}</span>`;
    wrap.appendChild(info);

    const grid = document.createElement('div');
    grid.className = 'levels-grid';
    for (let i = 0; i < cfg.levelsPerWorld; i += 1) {
      const n = wIdx * cfg.levelsPerWorld + i + 1;
      const isBoss = i === cfg.levelsPerWorld - 1;
      const locked = n > unlocked;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `level-btn ${locked ? 'locked' : ''} ${isBoss ? 'boss' : ''}`;
      btn.innerHTML = `<span class="level-btn-num">${n}</span>`;
      if (isBoss) btn.innerHTML += '<span class="level-btn-crown">👑</span>';
      if (progress.stars && progress.stars[n]) {
        btn.innerHTML += `<span class="level-btn-stars">${'★'.repeat(progress.stars[n])}</span>`;
      }
      if (locked) {
        btn.innerHTML += '<span class="level-btn-lock">🔒</span>';
        btn.disabled = true;
      } else {
        btn.addEventListener('click', () => {
          this.game.audio.click();
          this.game.show('gameplay', { level: n });
        });
      }
      grid.appendChild(btn);
    }
    wrap.appendChild(grid);
    return wrap;
  }

  worldStars(progress, wIdx) {
    const cfg = this.game.config;
    let total = 0;
    for (let i = 0; i < cfg.levelsPerWorld; i += 1) {
      const n = wIdx * cfg.levelsPerWorld + i + 1;
      if (progress.stars && progress.stars[n]) total += progress.stars[n];
    }
    return total;
  }
}
