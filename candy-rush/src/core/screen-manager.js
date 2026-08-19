class ScreenManager {
  constructor(game) {
    this.game = game;
    this.container = game.container;
    this.screens = new Map();
    this.current = null;
  }

  register(screen) {
    this.screens.set(screen.name, screen);
    return this;
  }

  show(name, options = {}) {
    const next = this.screens.get(name);
    if (!next) {
      console.error(`Screen "${name}" not found`);
      return;
    }
    const previous = this.current;
    if (previous && previous !== next) previous.exit(next);
    next.build(options);
    this.container.appendChild(next.el);
    if (typeof UI !== 'undefined') UI.setupLoaded(next.el);
    next.enter(previous, options);
    this.current = next;
    // Deferred teardown : screens are singletons, so only destroy the previous
    // one if it is no longer the active screen (a stale callback must never
    // kill the screen the player is currently looking at).
    if (previous && previous !== next) {
      requestAnimationFrame(() => {
        if (this.current !== previous) previous.destroy();
      });
    }
  }
}
