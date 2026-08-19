/* Level curve — 150 to 300 levels produced from parameters, never hand-coded. */

const LEVELS = {
  clamp(level) {
    const n = Math.floor(Number(level) || 1);
    return Math.max(1, Math.min(300, n));
  },

  /* 6 visual worlds of 50 levels each (background theme changes). */
  world(level) {
    return Math.min(6, Math.max(1, Math.ceil(this.clamp(level) / 50)));
  },

  /* Score target — flattened vs the old spec so high levels stay reachable
     (250 + 40 * level^1.15: niv300 ≈ 28 500 instead of ≈ 88 500). */
  target(level) {
    return Math.round(250 + 40 * Math.pow(level, 1.15));
  },

  /* Timer — longer on high levels so the final worlds stay beatable
     (30 + min(30, (level-1) * 0.5) seconds, capped at 60s). */
  time(level) {
    return Math.round(30 + Math.min(30, (level - 1) * 0.5));
  },

  candyCount(level) {
    return Math.min(22, 8 + Math.round(level * 0.06));
  },

  colorCount(level) {
    return Math.min(7, 3 + Math.floor(level / 45));
  },

  speed(level) {
    return 40 + level * 1.2;
  },

  /* chance a spawned candy is a special (golden/rainbow/bomb) */
  specialChance(level) {
    if (level >= 40) return 0.12;
    if (level >= 25) return 0.08;
    if (level >= 10) return 0.05;
    return 0;
  },

  /* bouncing obstacles that break your chain — introduced progressively */
  obstacles(level) {
    if (level >= 180) return { rock: 2, spikes: 2 };
    if (level >= 120) return { rock: 1, spikes: 1 };
    if (level >= 60) return { rock: 1, spikes: 0 };
    return { rock: 0, spikes: 0 };
  },

  config(level) {
    const l = this.clamp(level);
    return {
      level: l,
      world: this.world(l),
      target: this.target(l),
      time: this.time(l),
      candyCount: this.candyCount(l),
      colorCount: this.colorCount(l),
      speed: this.speed(l),
      specialChance: this.specialChance(l),
      obstacles: this.obstacles(l)
    };
  }
};
