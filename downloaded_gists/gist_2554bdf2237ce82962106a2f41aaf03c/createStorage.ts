export type StorageSlot = {
  clear: () => void;
  get: (key: string) => string | null;
  set: (key: string, value: string) => void;
  del: (key: string) => void;
  listen: (onChange: (event: StorageEvent) => void, key: string) => () => void;
};

const NoopStorageSlot: StorageSlot = {
  clear: () => {},
  get: () => null,
  set: () => {},
  del: () => {},
  listen: () => () => {},
};

export type StorageType = 'localStorage' | 'sessionStorage' | 'none';

const DefaultStorageType: StorageType = 'localStorage';

function getBrowserStorage(storageType: StorageType = DefaultStorageType): Storage | null {
  if (typeof window === 'undefined') {
    throw new Error('Browser storage is not available.');
  }
  if (storageType === 'none') {
    return null;
  }

  try {
    return window[storageType];
  } catch (err) {
    return null;
  }
}

function dispatchChangeEvent({
  key,
  oldValue,
  newValue,
  storage,
}: {
  key: string;
  oldValue: string | null;
  newValue: string | null;
  storage: Storage;
}) {
  const event = document.createEvent('StorageEvent');
  event.initStorageEvent(
    'storage',
    false,
    false,
    key,
    oldValue,
    newValue,
    window.location.href,
    storage
  );
  window.dispatchEvent(event);
}

export function createStorage(persistence?: StorageType): StorageSlot {
  const storage = getBrowserStorage(persistence);
  if (storage === null) {
    return NoopStorageSlot;
  }

  return {
    clear: () => {
      try {
        const oldValue = JSON.stringify(storage);
        storage.clear();
        dispatchChangeEvent({ key: '*', oldValue, newValue: null, storage });
      } catch (err) {
        console.error('storage error, clear error', err);
      }
    },
    get: (key) => {
      try {
        return storage.getItem(key);
      } catch (err) {
        console.error(`storage error, can't get key=${key}`, err);
        return null;
      }
    },
    set: (key, newValue) => {
      try {
        const oldValue = storage.getItem(key);
        storage.setItem(key, newValue);
        dispatchChangeEvent({
          key,
          oldValue,
          newValue,
          storage,
        });
      } catch (err) {
        console.error(`storage error, can't set ${key}=${newValue}`, err);
      }
    },
    del: (key) => {
      try {
        const oldValue = storage.getItem(key);
        storage.removeItem(key);
        dispatchChangeEvent({ key, oldValue, newValue: null, storage });
      } catch (err) {
        console.error(`storage error, can't delete key=${key}`, err);
      }
    },
    listen: (onChange, key = '*') => {
      try {
        const listener = (event: StorageEvent) => {
          if (event.storageArea === storage && (event.key === key || key === '*')) {
            onChange(event);
          }
        };
        window.addEventListener('storage', listener);
        return () => window.removeEventListener('storage', listener);
      } catch (err) {
        console.error(`storage error, can't listen for changes of key=${key}`, err);
        return () => {};
      }
    },
  };
}