/*-------------------------------- Mapping ---------------------------------*/

class FrozenRevert {
    #mapping;
    constructor(mapping) {
        this.#mapping = mapping;
    }
    restore(_current) {
        return this.#mapping;
    }
}

class Revert {
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

/*-------------------------------- Mapping ---------------------------------*/

class Mapping {
    #data;
    #frozen = false;
    constructor(data = new Map()) {
        this.#data = data;
    }
    has(key) {
        return this.#data.has(key) || false;
    }
    get(key) {
        return this.#data.get(key);
    }
    set(key, value) {
        const mapping = this.#fork();
        mapping.#data.set(key, value);
        return mapping;
    }
    delete(key) {
        const mapping = this.#fork();
        mapping.#data.delete(key);
        return mapping;
    }
    freeze() {
        this.#frozen = true;
        return this;
    }
    isFrozen() {
        return this.#frozen;
    }

    #fork() {
        return this.#frozen ? new Mapping(new Map(this.#data)) : this;
    }
}

/*-------------------------------- Storage ---------------------------------*/

export class Storage {
    static #current = new Mapping();
    static has(key) {
        return this.#current.has(key);
    }
    static get(key) {
        return this.#current.get(key);
    }
    static set(key, value) {
        const current = this.#current;
        const revert = current.isFrozen() ? new FrozenRevert(current) : new Revert(current, key);
        this.#current = this.#current.set(key, value);
        return revert;
    }
    static restore(revert) {
        this.#current = revert.restore(this.#current);
    }
    static snapshot() {
        this.#current.freeze();
        return new FrozenRevert(this.#current);
    }
    static switch(snapshot) {
        const previous = this.#current;
        this.#current = snapshot.restore(previous);
        return new FrozenRevert(previous);
    }
}
