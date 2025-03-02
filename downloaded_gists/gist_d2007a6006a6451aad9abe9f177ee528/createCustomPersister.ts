export const isUndefined = (v) => v == void 0;
export const ifNotUndefined = (value, then, otherwise) =>
  isUndefined(value) ? otherwise?.() : then(value);
export const objIsEmpty = (obj) => isObject(obj) && objSize(obj) == 0;

export const collHas = (coll, keyOrValue) => coll?.has(keyOrValue) ?? false;
export const collDel = (coll, keyOrValue) => coll?.delete(keyOrValue);

export const mapSet = (map, key, value) =>
  isUndefined(value) ? (collDel(map, key), map) : map?.set(key, value);

export const mapEnsure = (map, key, getDefaultValue) => {
  if (!collHas(map, key)) {
    mapSet(map, key, getDefaultValue());
  }
  return map?.get(key);
};

const scheduleRunning = new Map();
const scheduleActions = new Map();

export const createCustomPersister = (
  store,
  getPersisted,
  setPersisted,
  addPersisterListener,
  delPersisterListener,
  onIgnoredError,
  [getThing, thing] = [],
  scheduleId = []
) => {
  let listenerId;
  let loadSave = 0;

  let listening = 0;
  let listeningHandle;

  mapEnsure(scheduleRunning, scheduleId, () => 0);
  mapEnsure(scheduleActions, scheduleId, () => []);

  const run = async () => {
    if (!scheduleRunning?.get(scheduleId)) {
      mapSet(scheduleRunning, scheduleId, 1);

      let action = scheduleActions?.get(scheduleId).shift();
      while (!isUndefined(action)) {
        try {
          await action();
        } catch (error) {
          onIgnoredError?.(error);
        }
        action = scheduleActions?.get(scheduleId).shift();
      }

      mapSet(scheduleRunning, scheduleId, 0);
    }
  };

  const loadLock = async (actions) => {
    if (loadSave != 2) {
      loadSave = 1;
      await persister.schedule(async () => {
        await actions();
        loadSave = 0;
      });
    }
    return persister;
  };

  const persister = {
    load: async (initialTables, initialValues) =>
      await loadLock(async () => {
        try {
          store.setContent(await getPersisted());
        } catch {
          store.setContent([initialTables, initialValues]);
        }
      }),

    startAutoLoad: async (initialTables = {}, initialValues = {}) => {
      persister.stopAutoLoad();

      await persister.load(initialTables, initialValues);

      listening = 1;
      listeningHandle = addPersisterListener(
        async (getContent, getTransactionChanges) => {
          if (getTransactionChanges) {
            const transactionChanges = getTransactionChanges();
            await loadLock(async () =>
              store.setTransactionChanges(transactionChanges)
            );
          } else {
            await loadLock(async () => {
              try {
                store.setContent(getContent?.() ?? (await getPersisted()));
              } catch (error) {
                onIgnoredError?.(error);
              }
            });
          }
        }
      );
      return persister;
    },

    stopAutoLoad: () => {
      if (listening) {
        delPersisterListener(listeningHandle);
        listeningHandle = void 0;
        listening = 0;
      }
      return persister;
    },

    save: async (getTransactionChanges) => {
      if (loadSave != 1) {
        loadSave = 2;

        await persister.schedule(async () => {
          try {
            await setPersisted(store.getContent, getTransactionChanges);
          } catch (error) {
            onIgnoredError?.(error);
          }
          loadSave = 0;
        });
      }
      return persister;
    },

    startAutoSave: async () => {
      await persister.stopAutoSave().save();

      listenerId = store.addDidFinishTransactionListener(
        (_, getTransactionChanges) => {
          const [tableChanges, valueChanges] = getTransactionChanges();
          if (!objIsEmpty(tableChanges) || !objIsEmpty(valueChanges)) {
            persister.save(() => [tableChanges, valueChanges]);
          }
        }
      );
      return persister;
    },

    stopAutoSave: () => {
      ifNotUndefined(listenerId, store.delListener);
      listenerId = void 0;
      return persister;
    },

    schedule: async (...actions) => {
      scheduleActions?.get(scheduleId).push(...actions);
      await run();
      return persister;
    },

    destroy: () => persister.stopAutoLoad().stopAutoSave(),

    getStore: () => store,

    getStats: () => ({}),
  };

  if (getThing) {
    persister[getThing] = () => thing;
  }

  return object.freeze(persister);
};
