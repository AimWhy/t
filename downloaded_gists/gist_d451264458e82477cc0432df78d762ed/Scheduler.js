class Scheduler {
  constructor(plugins) {
    const [pending, waiting] = this.groupByDeps(plugins);

    this.index = -1;
    this.pendingQueue = pending;
    this.waitingList = waiting;
    this.originPlugins = plugins;

    this.context = {};
  }

  groupByDeps(plugins) {
    const pending = [];
    const waiting = [];

    plugins.forEach((plugin) => {
      const hasDep
        = Array.isArray(plugin.dependencies) && plugin.dependencies.length > 0;
      if (hasDep) {
        waiting.push(plugin);
        plugin.status = STATUS.Waiting;
      } else {
        pending.push(plugin);
        plugin.status = STATUS.Pending;
      }
    });

    return [pending, waiting];
  }

  checkDepsSucceeded() {
    const executedList = this.pendingQueue.slice(0, this.index + 1);

    for (let i = this.waitingList.length - 1; i >= 0; i--) {
      const current = this.waitingList[i];
      const isFinished = current.dependencies.every((dep) => {
        const target = executedList.find(({ name }) => dep === name);
        return target && target.status === STATUS.Success;
      });

      if (isFinished) {
        this.waitingList.splice(i, 1);
        this.pendingQueue.push(current);
        current.status = STATUS.Pending;
      }
    }
  }

  start() {
    this.pre();
    this.schedule();
  }

  end() {
    this.post();
  }

  schedule() {
    if (this.index === this.pendingQueue.length - 1) {
      this.end();
      return;
    }

    const plugin = this.pendingQueue[++this.index];
    const runner = this[plugin.type] || this[TYPE.AsyncPromise];

    runner.call(this, plugin);
  }

  [TYPE.Sync](plugin) {
    try {
      const isFail = plugin.run(this.context);
      plugin.status = isFail ? STATUS.Fail : STATUS.Success;
    } catch (e) {
      console.error(e);
      plugin.status = STATUS.Fail;
    } finally {
      if (plugin.status === STATUS.Success) {
        this.checkDepsSucceeded();
      }
      this.schedule();
    }
  }

  [TYPE.AsyncPromise](plugin) {
    Promise.resolve(plugin.run(this.context))
      .then((isFail) => {
        plugin.status = isFail ? STATUS.Fail : STATUS.Success;
      })
      .catch((e) => {
        console.error(e);
        plugin.status = STATUS.Fail;
      })
      .finally(() => {
        if (plugin.status === STATUS.Success) {
          this.checkDepsSucceeded();
        }
        this.schedule();
      });
  }

  pre() {

  }

  post() {

  }
}