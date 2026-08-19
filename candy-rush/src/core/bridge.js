/* ============================================================
   PLAYGAMA BRIDGE (v2) — safe wrapper
   ------------------------------------------------------------
   Bridge is mandatory for Playgama submission :
     - storage must go through bridge.storage (never localStorage)
     - platform events (pause / audio) must be handled
     - interstitials at natural pauses are required
     - rewarded ads + leaderboards boost monetization

   Every call is guarded so the game also runs perfectly in a
   plain browser (mock platform or no SDK at all).
   ============================================================ */

const Bridge = {
  initialized: false,
  // When false, no ads are available (e.g. CrazyGames Basic — no Playgama SDK)
  adsEnabled: false,
  // timestamp (ms) of the last successfully rewarded ad, used to
  // guarantee an interstitial is never shown right after a rewarded
  lastRewardedAt: 0,

  /* ----- lifecycle ----- */

  init() {
    return new Promise((resolve) => {
      if (typeof bridge === 'undefined' || !bridge.initialize) {
        this.initialized = false;
        resolve(false);
        return;
      }
      bridge.initialize()
        .then(() => {
          this.initialized = true;
          resolve(true);
        })
        .catch(() => {
          this.initialized = false;
          resolve(false);
        });
    });
  },

  get available() {
    return this.initialized && typeof bridge !== 'undefined';
  },

  /* ----- platform ----- */

  platform: {
    get language() {
      try {
        if (Bridge.available && bridge.platform.language) {
          return String(bridge.platform.language).slice(0, 2).toLowerCase();
        }
      } catch (e) { /* noop */ }
      return (navigator.language || 'en').slice(0, 2).toLowerCase();
    },

    get isAudioEnabled() {
      try {
        if (Bridge.available) return !!bridge.platform.isAudioEnabled;
      } catch (e) { /* noop */ }
      return true;
    },

    sendMessage(message, payload) {
      try {
        if (Bridge.available && bridge.platform.sendMessage) {
          bridge.platform.sendMessage(message, payload);
        }
      } catch (e) { /* noop */ }
    },

    onPause(handler) {
      try {
        if (Bridge.available && bridge.platform.on && bridge.EVENT_NAME) {
          bridge.platform.on(bridge.EVENT_NAME.PAUSE_STATE_CHANGED, handler);
          return true;
        }
      } catch (e) { /* noop */ }
      return false;
    },

    onAudioState(handler) {
      try {
        if (Bridge.available && bridge.platform.on && bridge.EVENT_NAME) {
          bridge.platform.on(bridge.EVENT_NAME.AUDIO_STATE_CHANGED, handler);
          return true;
        }
      } catch (e) { /* noop */ }
      return false;
    }
  },

  /* ----- storage (required) ----- */

  storage: {
    get(keys) {
      return new Promise((resolve) => {
        try {
          if (Bridge.available && bridge.storage && bridge.storage.get) {
            bridge.storage.get(keys)
              .then((data) => resolve(data))
              .catch(() => resolve(keys.map(() => null)));
            return;
          }
        } catch (e) { /* noop */ }
        // Fallback (local development without the SDK)
        resolve(keys.map((key) => {
          try {
            return localStorage.getItem(key);
          } catch (e2) { return null; }
        }));
      });
    },

    set(keys, values) {
      return new Promise((resolve) => {
        try {
          if (Bridge.available && bridge.storage && bridge.storage.set) {
            bridge.storage.set(keys, values)
              .then(() => resolve(true))
              .catch(() => resolve(false));
            return;
          }
        } catch (e) { /* noop */ }
        // Fallback (local development without the SDK)
        try {
          keys.forEach((key, i) => localStorage.setItem(key, values[i]));
        } catch (e2) { /* noop */ }
        resolve(true);
      });
    }
  },

  /* ----- ads ----- */

  advertisement: {
    isInterstitialSupported() {
      try {
        if (Bridge.available && Bridge.adsEnabled && bridge.advertisement) {
          return !!bridge.advertisement.isInterstitialSupported;
        }
      } catch (e) { /* noop */ }
      return false;
    },

    isRewardedSupported() {
      try {
        if (Bridge.available && Bridge.adsEnabled && bridge.advertisement) {
          return !!bridge.advertisement.isRewardedSupported;
        }
      } catch (e) { /* noop */ }
      return false;
    },

    showInterstitial(placement) {
      try {
        if (Bridge.available && bridge.advertisement && bridge.advertisement.showInterstitial) {
          bridge.advertisement.showInterstitial(placement);
          return true;
        }
      } catch (e) { /* noop */ }
      return false;
    },

    /* Resolves true only if the player actually watched the ad
       (state became 'rewarded'). Never grant on close. */
    showRewarded(placement) {
      return new Promise((resolve) => {
        if (!this.isRewardedSupported()) {
          resolve(false);
          return;
        }
        let settled = false;
        const finish = (ok) => {
          if (settled) return;
          settled = true;
          try {
            bridge.advertisement.off(bridge.EVENT_NAME.REWARDED_STATE_CHANGED, onChange);
          } catch (e) { /* noop */ }
          clearTimeout(timer);
          if (ok) Bridge.lastRewardedAt = Date.now();
          resolve(ok);
        };
        const onChange = (state) => {
          if (state === 'rewarded') finish(true);
          else if (state === 'closed' || state === 'failed') finish(false);
        };
        const timer = setTimeout(() => finish(false), 90000);
        try {
          bridge.advertisement.on(bridge.EVENT_NAME.REWARDED_STATE_CHANGED, onChange);
          bridge.advertisement.showRewarded(placement);
        } catch (e) {
          finish(false);
        }
      });
    }
  },

  /* ----- leaderboards ----- */

  leaderboards: {
    get type() {
      try {
        if (Bridge.available && bridge.leaderboards) return bridge.leaderboards.type;
      } catch (e) { /* noop */ }
      return 'not_available';
    },

    setScore(leaderboardId, score) {
      return new Promise((resolve) => {
        try {
          if (Bridge.available && bridge.leaderboards && bridge.leaderboards.setScore) {
            bridge.leaderboards.setScore(leaderboardId, score)
              .then(() => resolve(true))
              .catch(() => resolve(false));
            return;
          }
        } catch (e) { /* noop */ }
        resolve(false);
      });
    }
  }
};
