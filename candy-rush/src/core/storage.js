/* ============================================================
   STORAGE — always through Playgama Bridge (required by the
   platform: never localStorage directly). Falls back to
   localStorage in a plain browser. Values are JSON-encoded.
   ============================================================ */

class Storage {
  constructor(gameId) {
    this.prefix = `cr_${gameId}_`;
    this.cache = {};
    this.loaded = false;
  }

  _keys(keys) {
    return keys.map((key) => this.prefix + key);
  }

  load(keys) {
    const prefixed = this._keys(keys);
    return Bridge.storage.get(prefixed).then((data) => {
      keys.forEach((key, i) => {
        const raw = data && data[i];
        let value = null;
        if (raw != null && raw !== '') {
          try { value = JSON.parse(raw); } catch (e) { value = raw; }
        }
        this.cache[key] = value;
      });
      this.loaded = true;
    });
  }

  get(key, fallback = null) {
    return this.cache[key] !== undefined && this.cache[key] !== null
      ? this.cache[key]
      : fallback;
  }

  set(key, value) {
    this.cache[key] = value;
    Bridge.storage.set([this.prefix + key], [JSON.stringify(value)]);
  }
}
