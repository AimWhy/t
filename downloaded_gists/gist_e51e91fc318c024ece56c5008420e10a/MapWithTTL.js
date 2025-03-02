export class MapWithTTL extends Map {
    /**
     * Create a map with keys that will be automatically deleted _ttlMs
     * milliseconds after they have been last set.  Precision of timing
     * may vary.
     */
    constructor(_ttlMs) {
        super();
        this._ttlMs = _ttlMs;
        this._timeouts = new Map();
    }
    /**
     * Set a key, with expiration.
     */
    set(key, value) {
        return this.setWithCustomTTL(key, value, this._ttlMs);
    }
    /**
     * Set a key, with custom expiration.
     */
    setWithCustomTTL(key, value, ttlMs) {
        const curr = this._timeouts.get(key);
        if (curr) {
            clearTimeout(curr);
        }
        super.set(key, value);
        this._timeouts.set(key, setTimeout(this.delete.bind(this, key), ttlMs));
        return this;
    }
    /**
     * Remove a key.
     */
    delete(key) {
        const result = super.delete(key);
        const timeout = this._timeouts.get(key);
        if (timeout) {
            clearTimeout(timeout);
            this._timeouts.delete(key);
        }
        return result;
    }
    /**
     * Forcibly expire everything.
     */
    clear() {
        for (const timeout of this._timeouts.values()) {
            clearTimeout(timeout);
        }
        this._timeouts.clear();
        super.clear();
    }
}