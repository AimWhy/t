import { Storage } from "./storage";
export class Variable {
    #name = "";
    #defaultValue;
    constructor(options) {
        if (options) {
            if ("name" in options) {
                this.#name = String(options.name);
            }
            this.#defaultValue = options.defaultValue;
        }
    }
    get name() {
        return this.#name;
    }
    run(value, fn, ...args) {
        const revert = Storage.set(this, value);
        try {
            return fn.apply(null, args);
        } finally {
            Storage.restore(revert);
        }
    }
    get() {
        return Storage.has(this) ? Storage.get(this) : this.#defaultValue;
    }
}