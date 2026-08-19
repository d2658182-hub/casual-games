class Game {
  constructor(config) {
    this.config = config;
    this.container = document.getElementById('game-root');
    this.storage = new Storage(config.id || 'game');
    this.audio = new AudioEngine(this);
    this.input = new Input(this);
    this.screens = new ScreenManager(this);
    this.ads = new Ads(this);
    this.run = null;         // serialized run state (for pause / continue)
    this.resumeRun = false;  // when true, gameplay restores this.run on enter
  }

  register(screen) {
    this.screens.register(screen);
    return this;
  }

  show(name, options) {
    this.screens.show(name, options);
    this.audio.playMusicFor(name);
  }

  start() {
    this.show(this.config.firstScreen);
  }
}
