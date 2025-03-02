export class Mutex {
  #status;
  #promise;
  #resolve;

  constructor() {
    this.#status = "unlocked";
    this.#promise = null;
    this.#resolve = null;
  }

  async lock() {
    if (this.#status === "locked") {
      await this.#promise;
    } else {
      this.#status = "locked";
      ({ promise: this.#promise, resolve: this.#resolve } =
        Promise.withResolvers());
    }
  }

  unlock() {
    if (this.#status === "unlocked") {
      throw new Error("This Mutex is not locked.");
    }
    this.#status = "unlocked";
    if (this.#resolve) {
      this.#resolve();
    }
  }

  async scoped(content) {
    try {
      await this.lock();
      await content();
    } finally {
      this.unlock();
    }
  }
}
