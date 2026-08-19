/* ============================================================
   AUDIO ENGINE — real CC0 files (Kenney.nl) for every sound.
   ------------------------------------------------------------
   Music : one CC0 loop per world + menu (assets/music/*.ogg).
   SFX   : real files (assets/audio/sfx/*.ogg) — nothing is
   synthesized by code. The combo pitch rise is done with
   playbackRate on the same file. Respects the platform audio
   state (Playgama requirement).
   ============================================================ */

class AudioEngine {
  constructor(game) {
    this.game = game;
    this.settings = { sound: true };
    this.platformMuted = false;
    this.musicEl = null;
    this.musicTrack = null;
    this.musicBaseRate = 1;
    this.musicWanted = false;
    const saved = game.storage.get('settings', null);
    if (saved) Object.assign(this.settings, saved);

    // SFX pool : one group of Audio elements per file, so rapid
    // consecutive sounds (combo passes) can overlap cleanly.
    this.sfxPool = {};
    const poolSize = 3;
    const defs = {
      click:    { src: 'assets/audio/sfx/ui-click.ogg',   vol: 0.5 },
      hover:    { src: 'assets/audio/sfx/ui-hover.ogg',   vol: 0.18 },
      switch:   { src: 'assets/audio/sfx/ui-switch.ogg',  vol: 0.35 },
      pass:     { src: 'assets/audio/sfx/pass.ogg',       vol: 0.4 },
      perfect:  { src: 'assets/audio/sfx/perfect.ogg',    vol: 0.45 },
      gem:      { src: 'assets/audio/sfx/gem.ogg',        vol: 0.4 },
      hit:      { src: 'assets/audio/sfx/hit.ogg',        vol: 0.45 },
      combo:    { src: 'assets/audio/sfx/combo.ogg',      vol: 0.45 },
      gameover: { src: 'assets/audio/sfx/gameover.ogg',   vol: 0.5 },
      revive:   { src: 'assets/audio/sfx/revive.ogg',     vol: 0.45 },
      coins:    { src: 'assets/audio/sfx/coins.ogg',      vol: 0.4 }
    };
    this.sfxDefs = defs;
    Object.keys(defs).forEach((name) => {
      this.sfxPool[name] = [];
      for (let i = 0; i < poolSize; i += 1) {
        const el = new Audio();
        el.src = defs[name].src;
        el.volume = defs[name].vol;
        el.preload = 'auto';
        el.dataset.used = '0';
        this.sfxPool[name].push(el);
      }
    });

    window.addEventListener('pointerdown', () => this.unlock(), { once: true });
    window.addEventListener('keydown', () => this.unlock(), { once: true });
  }

  /* ----- background music (CC0 loops, one per world) ----- */

  playMusic(path) {
    this.musicWanted = !!path;
    this.musicTrack = path || null;
    if (!path || !this.settings.sound || this.platformMuted) {
      this._stopMusicEl();
      return;
    }
    if (this.musicEl && this.musicEl.dataset.track === path) {
      // already on this track : just make sure it plays
      this._resumeMusicEl();
      return;
    }
    // fully tear down the previous element BEFORE creating the new one,
    // so a late canplaythrough from the old track can never play on top
    // of the new one (this used to make menu + world music overlap)
    this._stopMusicEl();
    try {
      const audio = new Audio();
      audio.src = path;
      audio.dataset.track = path;
      audio.loop = true;
      audio.volume = 0.2;
      audio.preload = 'auto';
      audio.playbackRate = this.musicBaseRate;
      this.musicEl = audio;
      const start = () => {
        if (this.musicEl !== audio || !this.musicWanted) return;
        audio.play().catch(() => { /* autoplay blocked until gesture */ });
        audio.removeEventListener('canplaythrough', start);
      };
      audio.addEventListener('canplaythrough', start);
    } catch (e) { /* noop */ }
  }

  stopMusic() {
    this.musicWanted = false;
    this.musicTrack = null;
    this._stopMusicEl();
  }

  setMusicRate(rate) {
    this.musicBaseRate = rate;
    if (this.musicEl) this.musicEl.playbackRate = rate;
  }

  /* Pause but keep the element (used by the sound toggle / platform) */
  _pauseMusicEl() {
    if (this.musicEl) {
      try { this.musicEl.pause(); } catch (e) { /* noop */ }
    }
  }

  /* Full teardown : pause, drop the source and abort any pending load */
  _stopMusicEl() {
    if (!this.musicEl) return;
    try {
      this.musicEl.pause();
      this.musicEl.removeAttribute('src');
      this.musicEl.load();
    } catch (e) { /* noop */ }
    this.musicEl = null;
  }

  _resumeMusicEl() {
    if (this.musicEl && this.musicWanted && this.settings.sound && !this.platformMuted) {
      try { this.musicEl.play().catch(() => {}); } catch (e) { /* noop */ }
    }
  }

  unlock() {
    // first user gesture : start the background music if one is queued
    this._resumeMusicEl();
  }

  /* Called by the platform when audio is disabled/enabled */
  setPlatformEnabled(enabled) {
    this.platformMuted = !enabled;
    if (enabled) this._resumeMusicEl();
    else this._pauseMusicEl();
  }

  /* Called when the user toggles sound in the UI */
  toggleSound() {
    this.settings.sound = !this.settings.sound;
    this.game.storage.set('settings', this.settings);
    if (this.settings.sound) {
      if (this.musicWanted) this._resumeMusicEl();
    } else {
      this._pauseMusicEl();
    }
    return this.settings.sound;
  }

  /* ----- SFX (real files, pooled for overlap) ----- */

  sfx(name, { rate = 1 } = {}) {
    if (!this.settings.sound || this.platformMuted) return;
    const pool = this.sfxPool[name];
    if (!pool || pool.length === 0) return;
    // pick the least recently used element in the pool
    let el = pool[0];
    for (let i = 1; i < pool.length; i += 1) {
      if (pool[i].dataset.used === '0') { el = pool[i]; break; }
      if (pool[i].dataset.used < el.dataset.used) el = pool[i];
    }
    el.dataset.used = String(Date.now());
    try {
      el.playbackRate = rate;
      el.currentTime = 0;
      el.play().catch(() => { /* autoplay blocked until gesture */ });
    } catch (e) { /* noop */ }
  }

  /* ----- UI ----- */

  click() {
    this.sfx('click');
  }

  hover() {
    this.sfx('hover');
  }

  /* ----- gameplay ----- */

  switchColor() {
    this.sfx('switch');
  }

  pass(combo) {
    // pitch rises with the combo (same file, faster playback)
    const rate = 1 + Math.min(1.2, (combo % 12) * 0.05);
    this.sfx('pass', { rate });
  }

  perfect() {
    this.sfx('perfect');
  }

  gem() {
    this.sfx('gem');
  }

  hit() {
    this.sfx('hit');
  }

  comboMilestone(level) {
    const rate = 1 + Math.min(0.6, level * 0.06);
    this.sfx('combo', { rate });
  }

  gameOver() {
    this.sfx('gameover');
  }

  revive() {
    this.sfx('revive');
  }

  coins() {
    this.sfx('coins');
  }
}
