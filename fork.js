export class FrozenRevert {
    #mapping;
    constructor(mapping) {
        this.#mapping = mapping;
    }
    restore(_current) {
        return this.#mapping;
    }
}

export class Revert {
    #key;
    #has;
    #prev;
    constructor(mapping, key) {
        this.#key = key;
        this.#has = mapping.has(key);
        this.#prev = mapping.get(key);
    }

    restore(current) {
        return this.#has ? current.set(this.#key, this.#prev) : current.delete(this.#key);
    }
}

/*****************************************************************************/

