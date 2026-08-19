/* Audio engine — plays REAL downloaded files (music + SFX), no synthesized tones.
   Sound names map to paths in game.config.audio.sounds.
   Music switches per screen group: menu/loading/shop -> menu track,
   gameplay/pause/gameover/victory -> gameplay track. */

class AudioEngine {
  constructor(game) {
    this.game = game;
    this.settings = { sound: true };
    const saved = game.storage.get('settings', null);
    if (saved) Object.assign(this.settings, saved);
    this.cache = {};
    this.music = null;
    this.unlocked = false;
    window.addEventListener('pointerdown', () => this.unlock(), { once: true });
    window.addEventListener('keydown', () => this.unlock(), { once: true });
  }

  src(name) {
    const cfg = this.game.config.audio || {};
    const sounds = cfg.sounds || {};
    return sounds[name] || null;
  }

  sound(name) {
    const src = this.src(name);
    if (!src) return null;
    if (!this.cache[name]) {
      const a = new Audio(src);
      a.preload = 'auto';
      this.cache[name] = a;
    }
    return this.cache[name];
  }

  unlock() {
    if (this.unlocked) return;
    this.unlocked = true;
    this.playMusicFor(this.currentScreen());
  }

  currentScreen() {
    const cur = this.game.screens && this.game.screens.current;
    return cur ? cur.name : 'menu';
  }

  /* Which music track a screen belongs to. */
  musicFor(name) {
    const cfg = this.game.config.audio || {};
    const music = cfg.music || {};
    if (typeof music === 'string') return music; // backward compat: single track
    const group = (name === 'gameplay' || name === 'pause' || name === 'gameover' || name === 'victory')
      ? 'gameplay' : 'menu';
    return music[group] || music.menu || null;
  }

  /* Switch the looping music track when the screen changes. */
  playMusicFor(name) {
    if (!this.settings.sound) return;
    const src = this.musicFor(name);
    if (!src) return;
    if (this.music && this.music.dataset && this.music.dataset.src === src) return;
    this.stopMusic();
    this.startMusic(src);
  }

  play(name, volume = 1) {
    if (!this.settings.sound) return;
    const s = this.sound(name);
    if (!s) return;
    try {
      s.volume = volume;
      s.currentTime = 0;
      const p = s.play();
      if (p) p.catch(() => {});
    } catch (error) { /* audio unavailable */ }
  }

  startMusic(src) {
    if (!this.settings.sound || !src) return;
    try {
      const m = new Audio(src);
      m.loop = true;
      m.volume = 0.35;
      m.dataset.src = src;
      m.play().catch(() => {});
      this.music = m;
    } catch (error) { /* noop */ }
  }

  stopMusic() {
    if (this.music) {
      try { this.music.pause(); } catch (error) { /* noop */ }
      this.music = null;
    }
  }

  setEnabled(on) {
    this.settings.sound = !!on;
    if (on) this.playMusicFor(this.currentScreen());
    else { this.stopMusic(); this.pauseAll(); }
  }

  pauseAll() {
    Object.values(this.cache).forEach((a) => { try { a.pause(); } catch (error) { /* noop */ } });
    if (this.music) { try { this.music.pause(); } catch (error) { /* noop */ } }
  }

  resumeAll() {
    if (this.music && this.settings.sound) {
      try { this.music.play().catch(() => {}); } catch (error) { /* noop */ }
    }
  }

  click() { this.play('click'); }

  toggleSound() {
    this.settings.sound = !this.settings.sound;
    this.game.storage.set('settings', this.settings);
    if (this.settings.sound) this.playMusicFor(this.currentScreen());
    else this.stopMusic();
    return this.settings.sound;
  }
}
