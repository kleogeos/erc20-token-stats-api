class TtlCache {
  constructor(ttlMs) {
    this.ttlMs = ttlMs;
    this.store = new Map();
  }

  get(key) {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() - entry.storedAt > this.ttlMs) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key, value) {
    this.store.set(key, { value, storedAt: Date.now() });
  }

  size() {
    return this.store.size;
  }
}

module.exports = { TtlCache };
