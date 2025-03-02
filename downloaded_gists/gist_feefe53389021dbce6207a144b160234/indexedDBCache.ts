export const DB_NAME = "indexedDB.db";
export const DB_VERSION = 1;
export const DB_TABLE_NAME = `${DB_NAME}.keys`;

export class DatabaseStorage {
    dbName: string;
    version: number;
    tableName: string;
    dbOpen: boolean;
    db: IDBDatabase;

    constructor() {
        this.dbName = DB_NAME;
        this.version = DB_VERSION;
        this.tableName = DB_TABLE_NAME;
        this.dbOpen = false;
    }

    async open() {
        return new Promise((resolve, reject) => {
            const openDB = window.indexedDB.open(this.dbName, this.version);
            openDB.addEventListener("upgradeneeded", (event) => {
                (event.target as IDBOpenDBRequest).result.createObjectStore(this.tableName);
            });
            openDB.addEventListener("success", (event) => {
                this.db = (event.target as IDBOpenDBRequest).result;
                this.dbOpen = true;
                resolve(null);
            });
            openDB.addEventListener("error", () => reject(new Error('databaseUnavailable')));
        });
    }

    closeConnection() {
        const db = this.db;
        if (db && this.dbOpen) {
            db.close();
            this.dbOpen = false;
        }
    }

    async validateDbIsOpen() {
        if (!this.dbOpen) {
            return this.open();
        }
    }

    async getItem(key) {
        await this.validateDbIsOpen();
        return new Promise((resolve, reject) => {
            // TODO: Add timeouts?
            if (!this.db) {
                return reject(new Error('databaseNotOpen'));
            }
            const transaction = this.db.transaction([this.tableName], "readonly");
            const objectStore = transaction.objectStore(this.tableName);
            const dbGet = objectStore.get(key);
            dbGet.addEventListener("success", (event) => {
                this.closeConnection();
                resolve((event.target as IDBRequest).result);
            });
            dbGet.addEventListener("error", (e) => {
                this.closeConnection();
                reject(e);
            });
        });
    }

    async setItem(key, payload) {
        await this.validateDbIsOpen();
        return new Promise((resolve, reject) => {
            // TODO: Add timeouts?
            if (!this.db) {
                return reject(new Error('databaseNotOpen'));
            }
            const transaction = this.db.transaction([this.tableName], "readwrite");
            const objectStore = transaction.objectStore(this.tableName);
            const dbPut = objectStore.put(payload, key);
            dbPut.addEventListener("success", () => {
                this.closeConnection();
                resolve(null);
            });
            dbPut.addEventListener("error", (e) => {
                this.closeConnection();
                reject(e);
            });
        });
    }

    async removeItem(key) {
        await this.validateDbIsOpen();
        return new Promise((resolve, reject) => {
            if (!this.db) {
                return reject(new Error('databaseNotOpen'));
            }
            const transaction = this.db.transaction([this.tableName], "readwrite");
            const objectStore = transaction.objectStore(this.tableName);
            const dbDelete = objectStore.delete(key);
            dbDelete.addEventListener("success", () => {
                this.closeConnection();
                resolve(null);
            });
            dbDelete.addEventListener("error", (e) => {
                this.closeConnection();
                reject(e);
            });
        });
    }

    async getKeys() {
        await this.validateDbIsOpen();
        return new Promise((resolve, reject) => {
            if (!this.db) {
                return reject(new Error('databaseNotOpen'));
            }
            const transaction = this.db.transaction([this.tableName], "readonly");
            const objectStore = transaction.objectStore(this.tableName);
            const dbGetKeys = objectStore.getAllKeys();
            dbGetKeys.addEventListener("success", (event) => {
                this.closeConnection();
                resolve((event.target as IDBRequest).result);
            });
            dbGetKeys.addEventListener("error", (e) => {
                this.closeConnection();
                reject(e);
            });
        });
    }

    async containsKey(key) {
        await this.validateDbIsOpen();
        return new Promise((resolve, reject) => {
            if (!this.db) {
                return reject(new Error('databaseNotOpen'));
            }
            const transaction = this.db.transaction([this.tableName], "readonly");
            const objectStore = transaction.objectStore(this.tableName);
            const dbContainsKey = objectStore.count(key);
            dbContainsKey.addEventListener("success", (event) => {
                this.closeConnection();
                resolve((event.target as IDBRequest).result === 1);
            });
            dbContainsKey.addEventListener("error", (e) => {
                this.closeConnection();
                reject(e);
            });
        });
    }

    async deleteDatabase() {
        // Check if database being deleted exists
        if (this.db && this.dbOpen) {
            this.closeConnection();
        }
        return new Promise((resolve, reject) => {
            const deleteDbRequest = window.indexedDB.deleteDatabase(DB_NAME);
            // Reject if events aren't raised within 200ms
            const id = setTimeout(() => reject(false), 200);
            deleteDbRequest.addEventListener("success", () => {
                clearTimeout(id);
                return resolve(true);
            });
            deleteDbRequest.addEventListener("blocked", () => {
                clearTimeout(id);
                return resolve(true);
            });
            deleteDbRequest.addEventListener("error", () => {
                clearTimeout(id);
                return reject(false);
            });
        });
    }
}

export const indexedDBCache = new DatabaseStorage();