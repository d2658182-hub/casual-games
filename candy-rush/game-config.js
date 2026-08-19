/* ============================================================
   CANDY RUSH — GAME CONFIGURATION
   ------------------------------------------------------------
   Color Rush mechanic : move the ball left/right, match the
   candy gates, collect sweets. 150 levels across 10 worlds,
   each world with its own music + background theme.
   Everything below is customizable without touching the engine.
   ============================================================ */

const GAME_CONFIG = {
  id: 'candy-rush',
  firstScreen: 'loading',
  playTarget: 'gameplay',

  /* ----- game identity ----- */
  title: 'CANDY RUSH',
  leaderboardId: 'candy_rush_best',

  /* ----- 150 levels : 10 worlds × 15 levels ----- */
  levelsPerWorld: 15,
  totalLevels: 150,

  worlds: [
    { id: 'sugar-meadow',  name: 'Sugar Meadow',   music: 'assets/music/world1.ogg',  bg: ['#ffb3d6', '#ffe3f1', '#c9ecff', '#eaf9f0'], baseSpeed: 240, gapSec: 3.4 },
    { id: 'ice-factory',   name: 'Ice Cream Factory', music: 'assets/music/world2.ogg', bg: ['#9fd8ff', '#dff2ff', '#b9f0e2', '#fff7e6'], baseSpeed: 255, gapSec: 3.4 },
    { id: 'choco-forest',  name: 'Chocolate Forest', music: 'assets/music/world3.ogg', bg: ['#c9a06c', '#f2e0c5', '#a98d63', '#fbeedd'], baseSpeed: 268, gapSec: 3.5 },
    { id: 'gum-sky',       name: 'Bubblegum Sky',   music: 'assets/music/world4.ogg',  bg: ['#ff8fc9', '#ffd9f2', '#a8dcff', '#e8f8ff'], baseSpeed: 282, gapSec: 3.5 },
    { id: 'lolly-land',    name: 'Lollipop Land',   music: 'assets/music/world5.ogg',  bg: ['#ff9db8', '#ffe4ec', '#ffd76e', '#ffeaf2'], baseSpeed: 296, gapSec: 3.6 },
    { id: 'candy-castle',  name: 'Candy Castle',    music: 'assets/music/world6.ogg',  bg: ['#c79bff', '#f2e3ff', '#9fc0ff', '#fff2e6'], baseSpeed: 310, gapSec: 3.6 },
    { id: 'gummy-sea',     name: 'Gummy Ocean',     music: 'assets/music/world7.ogg',  bg: ['#6fd6e8', '#d4f6ff', '#8fe8c6', '#f0fbff'], baseSpeed: 324, gapSec: 3.7 },
    { id: 'marsh-mtns',    name: 'Marshmallow Mountains', music: 'assets/music/world8.ogg', bg: ['#b9b4ff', '#ecebff', '#ffc2e0', '#fdf3e7'], baseSpeed: 338, gapSec: 3.7 },
    { id: 'caramel-dune',  name: 'Caramel Desert',  music: 'assets/music/world9.ogg',  bg: ['#e8a86a', '#ffd9a8', '#c98a4e', '#f7ead9'], baseSpeed: 352, gapSec: 3.8 },
    { id: 'golden-gala',   name: 'Golden Gala',     music: 'assets/music/world10.ogg', bg: ['#ffce54', '#ffe9a8', '#f5b942', '#fffbe8'], baseSpeed: 366, gapSec: 3.8 }
  ],

  /* Objective pattern inside a world (15 levels) */
  objectivePattern: ['score', 'candies', 'score', 'survive', 'score', 'candies', 'score', 'survive', 'candies', 'score', 'score', 'candies', 'survive', 'score', 'candies'],

  /* Deterministic level generator : level n (1..150) */
  getLevel(n) {
    const wIdx = Math.min(this.worlds.length - 1, Math.floor((n - 1) / this.levelsPerWorld));
    const lvl = (n - 1) % this.levelsPerWorld;
    const w = this.worlds[wIdx];
    const gates = Math.min(22, 13 + lvl + wIdx);
    const speed = Math.min(560, w.baseSpeed + lvl * 8 + wIdx * 10);
    const gapSec = Math.min(4.4, w.gapSec + lvl * 0.05);
    const type = this.objectivePattern[lvl];
    let target;
    if (type === 'score') {
      target = Math.round(gates * (38 + wIdx * 9));
    } else if (type === 'candies') {
      target = Math.round(5 + lvl * 0.6 + wIdx * 1.6);
    } else {
      target = gates; // survive = pass every gate
    }
    return {
      n,
      world: wIdx,
      worldName: w.name,
      music: w.music,
      bg: w.bg,
      gates,
      speed,
      gapSec,
      objective: { type, target },
      perfectWindow: Math.max(0.16, 0.32 - wIdx * 0.012)
    };
  },

  /* ----- loading screen assets ----- */
  loading: {
    loadTarget: 'menu',
    assets: [
      'assets/bg/sun.png',
      'assets/bg/clouds1.png',
      'assets/bg/cloud3.png',
      'assets/bg/cloud9.png',
      'assets/candies/donut-sprinkles.png',
      'assets/candies/lollypop.png',
      'assets/candies/cupcake.png',
      'assets/candies/ice-cream.png',
      'assets/candies/cookie.png',
      'assets/candies/candy-bar.png',
      'assets/fx/star.png',
      'assets/fx/spark.png'
    ]
  },

  /* ----- optional features ----- */
  features: {
    shop: true,
    levels: true,
    dailyReward: true,
    fever: true,
    videoShop: true
  },

  /* ----- shop : coin items (owned once, effects in gameplay) ----- */
  shop: {
    items: [
      { id: 'heart_plus', nameKey: 'shop.heartPlus', price: 150, icon: 'assets/ui/l1.png' },
      { id: 'double_points', nameKey: 'shop.doublePoints', price: 250, icon: 'assets/ui/s1.png' },
      { id: 'magnet', nameKey: 'shop.magnet', price: 300, icon: 'assets/ui/icon-magnet.svg' },
      { id: 'shield', nameKey: 'shop.shield', price: 400, icon: 'assets/ui/icon-shield.svg' }
    ]
  },

  /* ----- shop : video unlocks (watch a rewarded ad to own) ----- */
  videoItems: [
    { id: 'skin_rainbow', category: 'skin', nameKey: 'shop.skinRainbow', emoji: '🌈' },
    { id: 'skin_gold', category: 'skin', nameKey: 'shop.skinGold', emoji: '⭐' },
    { id: 'skin_neon', category: 'skin', nameKey: 'shop.skinNeon', emoji: '💜' },
    { id: 'face_happy', category: 'face', nameKey: 'shop.faceHappy', emoji: '😆' },
    { id: 'face_cool', category: 'face', nameKey: 'shop.faceCool', emoji: '😎' },
    { id: 'face_love', category: 'face', nameKey: 'shop.faceLove', emoji: '🥰' },
    { id: 'trail_confetti', category: 'trail', nameKey: 'shop.trailConfetti', emoji: '🎉' },
    { id: 'trail_star', category: 'trail', nameKey: 'shop.trailStar', emoji: '✨' },
    { id: 'trail_bubble', category: 'trail', nameKey: 'shop.trailBubble', emoji: '🫧' },
    { id: 'gate_striped', category: 'gate', nameKey: 'shop.gateStriped', emoji: '🍬' },
    { id: 'gate_sparkle', category: 'gate', nameKey: 'shop.gateSparkle', emoji: '🌟' },
    { id: 'gate_dots', category: 'gate', nameKey: 'shop.gateDots', emoji: '🍩' }
  ],

  /* Ball skin definitions (code-drawn, no assets needed) */
  skins: {
    rainbow: { type: 'rainbow' },
    gold: { type: 'gold', body: '#ffd23f', edge: '#f5a300', glow: 'rgba(255,210,63,0.6)' },
    neon: { type: 'neon', body: '#c77dff', edge: '#8b2fe0', glow: 'rgba(199,125,255,0.65)' }
  },

  /* ----- gameplay HUD ----- */
  hud: {
    showScore: true,
    showHearts: true,
    hearts: 3
  },

  /* ----- gameplay tuning ----- */
  game: {
    palette: [
      { id: 'pink', body: '#ff9ed8', edge: '#f45baf', glow: 'rgba(255,158,216,0.55)' },
      { id: 'mint', body: '#8fe8c6', edge: '#3ecfa0', glow: 'rgba(143,232,198,0.55)' },
      { id: 'sky', body: '#8fd0ff', edge: '#4ba8f5', glow: 'rgba(143,208,255,0.55)' },
      { id: 'lemon', body: '#ffe58a', edge: '#f5c542', glow: 'rgba(255,229,138,0.55)' }
    ],
    gatesPerScreen: 2,       // spaced gates : at most 2 visible
    perfectWindow: 0.30,
    starScores: [500, 1500, 4000],
    maxHearts: 5,
    feverCombo: 5,           // combo that triggers FEVER
    feverPointsMult: 2,
    feverMusicRate: 1.18,
    interstitialStreak: 2,      // interstitial after 2 consecutive runs with the same outcome (2 wins OR 2 losses)
    interstitialMinGapSec: 60,   // never closer than 60 s, never right after a rewarded ad
    baseSpeed: 240,
    maxSpeed: 560,
    sweetsPerGap: [2, 4]     // sweets spawned in each gate gap
  }
};
