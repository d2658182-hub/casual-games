/* Game Over — score + best, RETRY (fresh), CONTINUE (rewarded: +15s),
   MENU. */

class GameOverScreen extends BaseScreen {
  constructor(game) {
    super(game, 'gameover');
  }

  build(options = {}) {
    const score = options.score || 0;
    const best = options.best || 0;

    this.el = document.createElement('div');
    this.el.className = 'screen gameover-screen';
    this.el.style.backgroundImage = `url("${this.game.config.backgrounds.menu}")`;

    const panel = new Panel({ image: 'assets/ui/f.png' });
    panel.add(
      this.titleEl('GAME OVER'),
      this.scoreEl(score),
      this.bestEl(best),
      this.buttonEl('RETRY', 'primary', () => this.retry()),
      this.buttonEl('CONTINUE +15s', 'secondary', () => this.continueRun()),
      this.buttonEl('MENU', 'back', () => this.menu())
    );
    this.el.appendChild(panel.el);

    this.onKeyDown((event) => {
      if (event.code === 'Enter' || event.code === 'Space') this.retry();
    });
  }

  titleEl(text) {
    const h = document.createElement('h2');
    h.className = 'modal-title';
    h.textContent = text;
    return h;
  }

  scoreEl(score) {
    const row = document.createElement('div');
    row.className = 'modal-score';
    row.innerHTML = `<img src="assets/ui/c.png" alt="" draggable="false"><span>${score.toLocaleString('en-US')}</span>`;
    return row;
  }

  bestEl(best) {
    const row = document.createElement('div');
    row.className = 'modal-best';
    row.textContent = `BEST ${best.toLocaleString('en-US')}`;
    return row;
  }

  buttonEl(label, variant, onClick) {
    return new Button({ label, variant, onClick });
  }

  retry() {
    this.game.audio.click();
    this.game.resumeRun = false;
    this.game.show(this.game.config.playTarget || 'gameplay');
  }

  continueRun() {
    this.game.audio.click();
    if (typeof SDK === 'undefined') return;
    this.game.audio.pauseAll();
    SDK.rewarded().then((ok) => {
      this.game.audio.resumeAll();
      if (ok && this.game.run) {
        this.game.run.timeLeft = (this.game.run.timeLeft || 0) + 15;
        this.game.resumeRun = true;
        this.game.show(this.game.config.playTarget || 'gameplay');
      }
    });
  }

  menu() {
    this.game.audio.click();
    this.game.resumeRun = false;
    this.game.show('menu');
  }
}
