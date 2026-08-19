const game = new Game(GAME_CONFIG);
game
  .register(new LoadingScreen(game))
  .register(new MenuScreen(game))
  .register(new GameplayScreen(game))
  .register(new PauseScreen(game))
  .register(new GameOverScreen(game))
  .register(new VictoryScreen(game));
if (GAME_CONFIG.features.shop) {
  game.register(new ShopScreen(game));
}

/* Pull cloud (bridge.storage) state in early; it resolves during the loading
   screen, so level/coins/best are ready before gameplay reads them. */
if (typeof SDK !== 'undefined') {
  game.storage.initCloud();
}

game.start();

/* Playgama bridge events — wired once, defensive. */
if (typeof SDK !== 'undefined') {
  /* Initialize mute from the platform's current audio state. */
  SDK.audioEnabled().then((enabled) => {
    if (typeof enabled === 'boolean') game.audio.setEnabled(enabled);
  });
  SDK.onAudio((enabled) => game.audio.setEnabled(!!enabled));
  SDK.onPause((paused) => {
    if (paused) game.audio.pauseAll();
    else game.audio.resumeAll();
  });
}
