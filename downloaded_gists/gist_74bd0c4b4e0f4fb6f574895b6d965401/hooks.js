const createHook = () => {
  const state = {
    handlers: [],
  };

  return {
    getHandlers() {
      return state.handlers;
    },

    register(handler) {
      state.handlers.push(handler);
      return this;
    },

    delete(handler) {
      state.handlers = state.handlers.filter(item => item !== handler);
      return this;
    },

    call() {
      throw new Error('Method not implemented');
    },
  };
};

const createSyncHook = () => ({
  ...createHook(),

  call(context) {
    for (const handler of this.getHandlers()) {
      handler(context);
    }
  },
});

const createSyncWaterfallHook = () => ({
  ...createHook(),

  call(param) {
    let res = param;

    for (const handler of this.getHandlers()) {
      res = handler(res);
    }

    return res;
  },
});

const createSyncBailHook = () => ({
  ...createHook(),

  call(context) {
    for (const handler of this.getHandlers()) {
      const result = handler(context);

      if (result !== void 0) {
        return result;
      }
    }
  },
});

const createAsyncSeriesHook = () => ({
  ...createHook(),

  async call(context) {
    for (const handler of this.getHandlers()) {
      await handler(context);
    }
  },
});

const createAsyncSeriesWaterfallHook = () => ({
  ...createHook(),

  async call(param) {
    let res = param;

    for (const handler of this.getHandlers()) {
      res = await handler(res);
    }

    return res;
  },
});


const createAsyncParallelHook = () => ({
  ...createHook(),

  async call(context) {
    const promises = this.getHandlers().map(handler => handler(JSON.parse(JSON.stringify(context))));

    return Promise.all(promises);
  },
});

const createAsyncBailHook = () => ({
  ...createHook(),

  async call(context) {
    for (const handler of this.getHandlers()) {
      const result = await handler(context);

      if (result !== void 0) {
        return result;
      }
    }
  },
});

const createSyncLoopHook = () => ({
  ...createHook(),

  call(context) {
    for (const handler of this.getHandlers()) {
      let res;
      do {
        res = handler(context);
      } while (res !== void 0);
    }
  },
});

const createAsyncParallelBailHook = () => ({
  ...createHook(),

  async call(context) {
    const promises = this.getHandlers().map(handler => {
      return handler(JSON.parse(JSON.stringify(context))).then(res => {
        if (res !== void 0) {
          return res;
        }
        throw Error('no data');
      });
    });

    return Promise.race(promises);
  },
});

module.exports = {
  createHook,
  createSyncHook,
  createSyncWaterfallHook,
  createSyncBailHook,
  createAsyncSeriesHook,
  createAsyncSeriesWaterfallHook,
  createAsyncParallelHook,
  createAsyncBailHook,
  createSyncLoopHook,
  createAsyncParallelBailHook,
};
