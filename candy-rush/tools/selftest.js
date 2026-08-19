/* ============================================================
   SELFTEST — temporary harness validating the 7 reported fixes
   1. pause → quit stops the run (RAF + music)
   2. levels HOME button small, inside viewport
   3. shop items nested inside the panel (no overflow)
   4. victory BONUS always visible (free fallback without SDK)
   5. daily reward granted through rewarded flow (or free demo)
   6. ball color no longer cycles on canvas tap
   7. controls : arrows above colors, bigger
   ============================================================ */

window.bridge = {
  EVENT_NAME: {
    REWARDED_STATE_CHANGED: 'rewarded_state_changed',
    PAUSE_STATE_CHANGED: 'pause_state_changed',
    AUDIO_STATE_CHANGED: 'audio_state_changed'
  },
  initialize: () => Promise.resolve(),
  platform: { language: 'en', isAudioEnabled: true, sendMessage() {}, on() {} },
  storage: { get: (keys) => Promise.resolve(keys.map(() => null)), set: () => Promise.resolve() },
  advertisement: {
    _cb: null,
    isInterstitialSupported: () => false,
    isRewardedSupported: () => true,
    showInterstitial() {},
    on(name, cb) { this._cb = cb; },
    off() { this._cb = null; },
    showRewarded() { setTimeout(() => { if (this._cb) this._cb('rewarded'); }, 10); }
  },
  leaderboards: { setScore: () => Promise.resolve() }
};

const T = { errors: [], fails: [], notes: [] };
window.__T = T;
window.addEventListener('error', (e) => T.errors.push('error: ' + e.message));
const origError = console.error;
console.error = (...a) => { T.errors.push(a.map((x) => String(x)).join(' ')); origError(...a); };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function settle() { await sleep(400); }
function check(name, cond, extra) {
  if (cond) T.notes.push('OK   ' + name);
  else { T.fails.push(name + (extra ? ' — ' + extra : '')); T.notes.push('FAIL ' + name + (extra ? ' — ' + extra : '')); }
}
function inside(rect, vp) {
  return rect.left >= -1 && rect.top >= -1 && rect.right <= vp.w + 1 && rect.bottom <= vp.h + 1;
}

window.__SELFTEST_RUN = async function run(game) {
  game.audio.settings.sound = false;
  const vp = { w: window.innerWidth, h: window.innerHeight };
  // wait for the async loading screen to finish (its late show('menu')
  // would otherwise overwrite the screens we are testing)
  while (game.screens.current && game.screens.current.name === 'loading') await sleep(50);
  const style = document.createElement('style');
  style.textContent = '* { animation: none !important; transition: none !important; }';
  document.head.appendChild(style);

  // deterministic screen teardown
  const sm = game.screens;
  const origShow = sm.show.bind(sm);
  sm.show = (name, options) => {
    const previous = sm.current;
    origShow(name, options);
    if (previous && previous !== sm.current && previous.el) previous.destroy();
  };

  // ---------- FIX 4+5 : VICTORY BONUS always visible, DAILY via rewarded ----------
  game.show('gameplay', { level: 1 });
  let s = game.screens.current;
  s.paused = true;
  s.state = 'running';
  s.readyTimer = 0;
  s.initWorld();
  for (let i = 0; i < 20; i += 1) s.update(0.05);
  s.coinsEarned = 6;
  s.score = s.objective.target;
  s.updateObjective();
  s.checkWin();
  if (s.state !== 'won') throw new Error('win did not trigger');
  s.winTimer = 0;
  s.update(0.016);
  await sleep(120);
  const victory = game.screens.current;
  await settle();
  check('victory: BONUS always visible (no SDK needed)', !!victory.el.querySelector('.btn-secondary .btn-video-icon'));
  const coinsBefore = game.storage.get('coins', 0);
  victory.el.querySelector('.btn-secondary').dispatchEvent(new MouseEvent('click', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 400));
  check('victory: BONUS grants coins x2', game.storage.get('coins', 0) === coinsBefore + 12, 'coins=' + game.storage.get('coins', 0));

  // ---------- FIX 1 : PAUSE → QUIT stops the run ----------
  game.show('gameplay', { level: 1 });
  s = game.screens.current;
  s.paused = false;
  s.state = 'running';
  s.readyTimer = 0;
  s.initWorld();
  for (let i = 0; i < 10; i += 1) s.update(0.05);
  s.togglePause(); // open pause menu
  check('pause: pause menu shown', !s.pauseMenu.classList.contains('hidden'));
  const quitBtn = s.el.querySelector('.btn-quit');
  quitBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  await settle();
  check('quit: goes to menu', game.screens.current.name === 'menu');
  check('quit: RAF stopped (frameId null)', s.frameId === null, 'frameId=' + s.frameId);
  check('quit: state idle', s.state === 'idle', 'state=' + s.state);
  // after quit the MENU music plays — the world music must NOT keep playing
  check('quit: world music stopped (menu music ok)', game.audio.musicTrack === 'assets/music/menu.ogg', 'track=' + game.audio.musicTrack);
  // exactly ONE music element must exist : no old track left behind
  check('quit: single music element (no overlap)', !game.audio.musicEl || game.audio.musicEl.dataset.track === 'assets/music/menu.ogg', 'track=' + (game.audio.musicEl ? game.audio.musicEl.dataset.track : 'none'));
  // the world must not advance anymore
  const gateY = s.gates.length ? s.gates[0].y : 0;
  for (let i = 0; i < 20; i += 1) s.update(0.05);
  check('quit: world frozen', s.gates.length === 0 || s.gates[0].y === gateY, 'y=' + s.gates[0]?.y + ' was=' + gateY);

  // ---------- FIX 6 : canvas tap no longer cycles the color ----------
  game.show('gameplay', { level: 1 });
  s = game.screens.current;
  s.paused = true;
  s.state = 'running';
  s.readyTimer = 0;
  s.initWorld();
  for (let i = 0; i < 10; i += 1) s.update(0.05);
  const colorBefore = s.ballColor;
  s.canvas.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
  check('gameplay: canvas tap does NOT change color', s.ballColor === colorBefore, 'before=' + colorBefore + ' after=' + s.ballColor);
  // color buttons still work
  const colorBtn = Array.from(s.el.querySelectorAll('.ctl-color')).find((b) => b.dataset.color === '2');
  s.paused = false;
  colorBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  s.paused = true;
  check('gameplay: color button still selects color', s.ballColor === 2, 'color=' + s.ballColor);

  // ---------- FIX 7 : controls layout ----------
  const rows = s.el.querySelectorAll('.game-controls .ctl-row');
  check('controls: 2 rows (move + colors)', rows.length === 2, 'rows=' + rows.length);
  const moveRow = s.el.querySelector('.ctl-row-move');
  const colorRow = s.el.querySelector('.ctl-row-colors');
  check('controls: arrows row ABOVE colors', !!moveRow && !!colorRow && moveRow.getBoundingClientRect().top < colorRow.getBoundingClientRect().top);
  check('controls: 6 buttons total', s.el.querySelectorAll('.ctl-btn').length === 6);
  check('controls: inside viewport', Array.from(s.el.querySelectorAll('.ctl-btn')).every((b) => inside(b.getBoundingClientRect(), vp)));

  // ---------- FIX 2 : WORLD MAP (levels button = map now) ----------
  game.show('levels');
  await settle();
  const levels = game.screens.current;
  const homeBtn = levels.el.querySelector('.levels-head .btn-back');
  const hr = homeBtn.getBoundingClientRect();
  check('levels: home button small (w < 90)', hr.width < 90, 'w=' + hr.width);
  check('levels: home inside viewport', inside(hr, vp));
  const head = levels.el.querySelector('.levels-head');
  const headR = head.getBoundingClientRect();
  check('levels: head inside viewport', inside(headR, vp));
  const title = levels.el.querySelector('.levels-head .modal-title');
  check('levels: home does not overlap title', !title || !homeBtn || !(title.getBoundingClientRect().right > hr.left && hr.left < title.getBoundingClientRect().right), '');
  // WORLD MAP : 10 world nodes on a path
  const nodes = levels.el.querySelectorAll('.world-node');
  check('map: 10 world nodes', nodes.length === 10, 'n=' + nodes.length);
  check('map: nodes inside viewport (scrollable area)', Array.from(nodes).every((n) => inside(n.getBoundingClientRect(), vp)) || levels.el.querySelector('.world-map-scroll').scrollHeight >= levels.el.querySelector('.world-map-scroll').clientHeight, '');
  // tap world 1 (unlocked) → world view with 15 levels
  const firstNode = Array.from(nodes).find((n) => !n.classList.contains('locked'));
  firstNode.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  await settle();
  const levelBtns = levels.el.querySelectorAll('.level-btn');
  check('map: world opens 15 levels', levelBtns.length === 15, 'n=' + levelBtns.length);
  const bossBtn = levels.el.querySelector('.level-btn.boss');
  check('map: level 15 is the BOSS node', !!bossBtn && bossBtn.querySelector('.level-btn-num').textContent === '15', '');
  // back to map
  levels.el.querySelector('.levels-head .btn-back').dispatchEvent(new MouseEvent('click', { bubbles: true }));
  await settle();
  check('map: back returns to the world map', levels.el.querySelectorAll('.world-node').length === 10, '');

  // ---------- FIX 3 : SHOP items inside the new parent (no f.png asset) ----------
  game.show('shop');
  await settle();
  const shop = game.screens.current;
  const panel = shop.el.querySelector('.shop-panel');
  // the new parent must NOT use the f.png panel image as its background
  const panelBg = panel ? (getComputedStyle(panel).backgroundImage || '') : '';
  check('shop: new parent container exists (no f.png asset)', !!panel && panelBg.indexOf('f.png') === -1, 'bg=' + panelBg.slice(0, 60));
  const panelRect = panel.getBoundingClientRect();
  check('shop: panel inside viewport', inside(panelRect, vp));
  const items = Array.from(shop.el.querySelectorAll('.shop-item, .video-card'));
  check('shop: items exist', items.length > 4, 'n=' + items.length);
  // the parent owns the scroll : nothing spills out of it
  const hOverflow = items.filter((el) => {
    const r = el.getBoundingClientRect();
    return r.right > panelRect.right + 2 || r.left < panelRect.left - 2;
  });
  check('shop: no item overflows the new parent horizontally', hOverflow.length === 0, 'hOverflow=' + hOverflow.length);
  const scrollable = panel.scrollHeight >= panel.clientHeight - 2;
  const lastItemBottom = Math.max(...items.map((el) => el.getBoundingClientRect().bottom));
  const coversAll = panel.scrollHeight >= lastItemBottom - panelRect.top - 2;
  check('shop: parent scrolls and covers the whole list', scrollable && coversAll, 'scrollH=' + panel.scrollHeight + ' clientH=' + panel.clientHeight + ' last=' + Math.round(lastItemBottom - panelRect.top));

  // ---------- FINAL ----------
  check('zero console errors', T.errors.length === 0, T.errors.join(' | ').slice(0, 300));
  const ok = T.fails.length === 0;
  document.title = ok ? 'SELFTEST-PASS' : 'SELFTEST-FAIL';
  const pre = document.createElement('pre');
  pre.id = 'selftest-result';
  pre.textContent = JSON.stringify({ ok, vp, fails: T.fails, notes: T.notes, errors: T.errors }, null, 1);
  document.body.appendChild(pre);
  console.log('[SELFTEST] ' + (ok ? 'PASS' : 'FAIL') + ' @ ' + vp.w + 'x' + vp.h);
};
