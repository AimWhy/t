function noop() { }

export class WorkerQueue {
  constructor({ logger, concurrency = 5 } = {}) {
    this.logger = logger;
    this.worker = noop;

    this.concurrency = concurrency;
    this.running = 0;
    this.queue = [];
  }

  subscribe(worker) {
    this.worker = worker;
  }

  enqueue(payload) {
    if (this.running < this.concurrency) {
      this.running++;
      this.execute(payload);
    } else {
      this.queue.unshift(payload);
    }
  }

  pop() {
    const payload = this.queue.pop();

    if (payload) {
      this.execute(payload);
    } else {
      this.running--;
    }
  }

  async execute(payload) {
    try {
      await this.worker(payload);
    } catch (error) {
      this.logger.error(error);
    } finally {
      this.pop();
    }
  }
};