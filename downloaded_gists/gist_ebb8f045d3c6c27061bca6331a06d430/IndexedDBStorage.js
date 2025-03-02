// 保存db实例
const dbContexts = {};

// 创建 dbcontext
function createContext() {
    return {
        db: null,
        name: '',
        storeName: '',
        version: 1,
    };
}

// 获取indexedDB，若浏览器不支持则打印警告并返回 null
export function getIndexedDBFactory() {
    if (!('indexedDB' in window)) {
        console.warn('The current browser is not support indexedDB!');
        return null;
    }
    return window.indexedDB;
}


export class IndexedDBStorage {
    constructor(options) {
        this.dbInfo = createContext();
        this.ready = null;
        this.initStorage(options);
    }

    initStorage(options) {
        const indexedDB = getIndexedDBFactory();
        if (!indexedDB) {
            return;
        }

        let initResolve = null;
        let initReject = null;
        this.ready = new Promise((resolve, reject) => {
            initResolve = resolve;
            initReject = reject;
        });
        const { dbInfo } = this;
        if (options) {
            dbInfo.name = options.name || dbInfo.name;
            dbInfo.storeName = options.storeName || dbInfo.storeName;
            dbInfo.version = options.version || dbInfo.version;
        }
        let dbContext = dbContexts[dbInfo.name];
        if (!dbContext) {
            dbContext = createContext();
            dbContexts[dbInfo.name] = dbContext;
        }
        dbInfo.db = dbContext.db;
        // 是否升级
        const isUpgrade = this.isUpgradeNeeded(dbInfo);
        if (dbInfo.db) {
            if (isUpgrade) {
                // 升级前关闭原来打开的
                dbInfo.db.close();
            } else {
                initResolve(dbInfo);
                return;
            }
        }
        const dbArgs = [dbInfo.name, undefined];
        if (isUpgrade) {
            dbArgs[1] = dbInfo.version;
        }
        // 打开数据库
        const openreq = indexedDB.open.apply(indexedDB, dbArgs);
        if (isUpgrade) {
            // 如果升级则监听 onupgradeneeded 事件
            openreq.onupgradeneeded = function (e) {
                dbContext.db = openreq.result;
                dbInfo.db = openreq.result;
                try {
                    // 创建 ojectStore(只能在 onupgradeneeded 事件中创建)
                    dbInfo.db.createObjectStore(dbInfo.storeName);
                } catch (err) {
                    // storeName 可能重复
                    if (err.name === 'ConstraintError') {
                        console.warn(`The database "${dbInfo.name}"`
                            + ` has been upgraded from version ${e.oldVersion} to version ${e.newVersion}, `
                            + `but the storage "${dbInfo.storeName}" already exists.`);
                    } else {
                        throw err;
                    }
                }
            };
        }
        openreq.onerror = function () {
            initReject(openreq.error);
        };
        openreq.onsuccess = function () {
            dbInfo.db = openreq.result;
            dbContext.db = openreq.result;
            dbInfo.db.onversionchange = function (e) {
                e.target.close();
            };
            initResolve(dbInfo);
        };
    }
    /**
     * 判断是否升级
     * @param dbInfo
     * @returns
     */
    isUpgradeNeeded(dbInfo) {
        if (!dbInfo.db)
            return true;
        // 是否有新的 objectStore
        const isNewStore = !dbInfo.db.objectStoreNames.contains(dbInfo.storeName);
        // 是否降低版本
        const isDowngrade = dbInfo.version < dbInfo.db.version;
        // 是否升级版本
        const isUpgrade = dbInfo.version > dbInfo.db.version;
        if (isDowngrade) {
            // 对于降低版本给予提示，并继续采用之前的版本
            console.warn(`The database "${dbInfo.name}" can't be downgraded from version ${dbInfo.db.version} to version ${dbInfo.version}`);
            dbInfo.version = dbInfo.db.version;
        }
        if (isUpgrade || isNewStore) {
            // 有新的 objectStore 则升级版本
            if (isNewStore) {
                const incVersion = dbInfo.db.version + 1;
                if (incVersion > dbInfo.version) {
                    dbInfo.version = incVersion;
                }
            }
            return true;
        }
        return false;
    }
    getObjectStore(storeName, mode) {
        try {
            const { db } = this.dbInfo;
            if (!db) {
                throw new Error('forget init');
            }
            const tx = db.transaction(storeName, mode || 'readonly').objectStore(storeName);
            return [null, tx];
        }
        catch (e) {
            console.error(`get ${storeName} objectStore failed in ${this.dbInfo.name} database`);
            return [e, null];
        }
    }
    getItem(key) {
        const promise = new Promise((resolve, reject) => {
            this.getReady()
                ?.then((dbInfo) => {
                    const [error, objectStore] = this.getObjectStore(dbInfo.storeName);
                    if (error || !objectStore) {
                        reject(error);
                        return;
                    }
                    const getreq = objectStore.get(key);
                    getreq.onsuccess = function () {
                        resolve(getreq.result || null);
                    };
                    getreq.onerror = function () {
                        reject(getreq.error);
                    };
                })
                .catch(reject);
        });
        return promise;
    }
    setItem(key, value) {
        const promise = new Promise((resolve, reject) => {
            this.getReady()
                ?.then((dbInfo) => {
                    const [error, objectStore] = this.getObjectStore(dbInfo.storeName, 'readwrite');
                    if (error || !objectStore) {
                        reject(error);
                        return;
                    }
                    const putreq = objectStore.put(value, key);
                    putreq.onsuccess = function () {
                        resolve(value);
                    };
                    putreq.onerror = function () {
                        reject(putreq.error);
                    };
                })
                .catch(reject);
        });
        return promise;
    }
    getReady() {
        if (!this.ready) {
            throw new Error('forget init');
        }
        return this.ready;
    }
}