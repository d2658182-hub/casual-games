/* Persistent storage.
   Primary store: localStorage (always works, even without the bridge).
   Cloud store: bridge.storage (Playgama) — pulled in once at boot and kept
   in sync on every write, so progress survives across devices when the SDK
   is present. Every call is defensive and never crashes the game. */

class Storage {
  constructor(gameId) {
    this.prefix = `gt_${gameId}_`;
    this.cloudReady = false;
  }

  /* Known persistent keys — used to pull cloud state at boot. */
  static keys() {
    return [
      'coins', 'level', 'best', 'settings', 'streak',
      'power_rainbow_pop', 'power_star_rush', 'power_big_blast', 'power_sweet_time'
    ];
  }

  get(key, fallback = null) {
    try {
      const value = localStorage.getItem(this.prefix + key);
      return value === null ? fallback : JSON.parse(value);
    } catch (error) {
      return fallback;
    }
  }

  set(key, value) {
    try {
      localStorage.setItem(this.prefix + key, JSON.stringify(value));
    } catch (error) {
      /* storage unavailable */
    }
    this.cloudSet(key, value);
  }

  /* Mirror a write to cloud storage (fire-and-forget, defensive). */
  cloudSet(key, value) {
    if (!this.cloudReady || typeof SDK === 'undefined') return;
    try { SDK.storageSet(this.prefix + key, value); } catch (error) { /* noop */ }
  }

  /* Pull cloud data into localStorage once the bridge is ready.
     Cloud wins over local (so cross-device progress survives). */
  initCloud() {
    if (typeof SDK === 'undefined' || !SDK.available) return Promise.resolve(false);
    return SDK.available().then((ok) => {
      if (!ok) return false;
      const keys = Storage.keys();
      return Promise.all(keys.map((key) =>
        SDK.storageGet(this.prefix + key, null).then((value) => ({ key, value }))
      )).then((pairs) => {
        this.cloudReady = true;
        pairs.forEach(({ key, value }) => {
          if (value !== null && value !== undefined) {
            try {
              localStorage.setItem(this.prefix + key, JSON.stringify(value));
            } catch (error) { /* noop */ }
          }
        });
        return true;
      }).catch(() => {
        this.cloudReady = true;
        return false;
      });
    }).catch(() => false);
  }
}
