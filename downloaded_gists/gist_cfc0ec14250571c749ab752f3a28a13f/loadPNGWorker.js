let loadPNGWorker = (function() {
  /**
   * A singleton for loading PNGs asynchronously. This singleton owns a set of
   * web workers, which are used to offload CPU-heavy PNG decoding to separate
   * threads.
   */
  class GlobalLoadPNGWorker {
    /**
     * Initializes a GlobalLoadPNGWorker
     */
    constructor() {
      let that = this;

      // Instantiate one worker per core available. Leave one core for the UX
      // thread. Use a safe default value if navigator.hardwareConcurrency
      // isn't defined.
      let numWorkers = 8;
      if (navigator.hardwareConcurrency != null) {
        numWorkers = navigator.hardwareConcurrency - 2;
      }
      numWorkers = Math.max(1, numWorkers);

      // Create a pool of workers.
      this.workers = [];
      for (let i = 0; i < numWorkers; ++i) {
        let worker = new Worker('loadpng.worker.js');
        worker.onmessage = (e) => {
          that.onmessage(e);
        };
        this.workers.push(worker);
      }

      this.nextworker = 0;
      this.callbacks = {};
      this.i = 0;
    }

    /**
     * Fetches a PNG asynchronously.
     * @param {string} url URL of PNG to fetch.
     * @param {*} callback Callback to call with bytes from PNG.
     */
    submit(url, callback) {
      const i = this.i;
      this.callbacks[i] = callback;
      this.i += 1;

      const w = this.nextworker;
      const worker = this.workers[w];
      this.nextworker = (w + 1) % this.workers.length;

      worker.postMessage({'i': i, 'url': url});
    }

    /**
     * Callback for this.worker.
     * @param {*} e Event payload. `data` must contain `i` to know which
     *              callback to refer to and `result` to pass on.
     */
    onmessage(e) {
      const response = e.data;
      const i = response.i;
      const callback = this.callbacks[i];
      delete this.callbacks[i];
      callback(response.result);
    }
  }

  return new GlobalLoadPNGWorker();
})();