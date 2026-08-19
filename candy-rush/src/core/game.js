class Game {
  constructor(config) {
    this.config = config;
    this.container = document.getElementById('game-root');
    this.storage = new Storage(config.id || 'game');
    this.audio = new AudioEngine(this);
    this.input = new Input(this);
    this.screens = new ScreenManager(this);
  }

  register(screen) {
    this.screens.register(screen);
    return this;
  }

  show(name, options) {
    this.screens.show(name, options);
  }

  start() {
    this.show(this.config.firstScreen);
  }
}
