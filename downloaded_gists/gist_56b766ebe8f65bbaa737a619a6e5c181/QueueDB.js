const DB_VERSION = 3;
const DB_NAME = 'workbox-background-sync';
const REQUEST_OBJECT_STORE_NAME = 'requests';
const QUEUE_NAME_INDEX = 'queueName';

function openDB(name, version, { upgrade } = {}) {
    return new Promise((c, e) => {
        const request = indexedDB.open(name, version);
        request.onerror = () => e(request.error);
        request.onsuccess = () => {
            const db = request.result;
            c(db);
        };
        request.onupgradeneeded = (event) => {
            const db = request.result;
            upgrade && upgrade(db, event.oldVersion, event.newVersion)
        };
    });
}

export class QueueDb {
    _db = null;

    async getDb() {
        if (!this._db) {
            this._db = await openDB(DB_NAME, DB_VERSION, {
                upgrade: this._upgradeDb,
            });
        }
        return this._db;
    }

    _upgradeDb(db, oldVersion) {
        if (oldVersion > 0 && oldVersion < DB_VERSION) {
            if (db.objectStoreNames.contains(REQUEST_OBJECT_STORE_NAME)) {
                db.deleteObjectStore(REQUEST_OBJECT_STORE_NAME);
            }
        }
        const objStore = db.createObjectStore(REQUEST_OBJECT_STORE_NAME, {
            autoIncrement: true,
            keyPath: 'id',
        });
        objStore.createIndex(QUEUE_NAME_INDEX, QUEUE_NAME_INDEX, { unique: false });
    }

    async addEntry(entry) {
        const db = await this.getDb();
        const tx = db.transaction(REQUEST_OBJECT_STORE_NAME, 'readwrite', {
            durability: 'relaxed',
        });
        await tx.store.add(entry);
        await tx.done;
    }

    async getFirstEntryId() {
        const db = await this.getDb();
        const cursor = await db
            .transaction(REQUEST_OBJECT_STORE_NAME)
            .store.openCursor();
        return cursor?.value.id;
    }

    async getAllEntriesByQueueName(queueName) {
        const db = await this.getDb();
        const results = await db.getAllFromIndex(REQUEST_OBJECT_STORE_NAME, QUEUE_NAME_INDEX, IDBKeyRange.only(queueName));
        return results ? results : new Array();
    }

    async getEntryCountByQueueName(queueName) {
        const db = await this.getDb();
        return db.countFromIndex(REQUEST_OBJECT_STORE_NAME, QUEUE_NAME_INDEX, IDBKeyRange.only(queueName));
    }

    async deleteEntry(id) {
        const db = await this.getDb();
        await db.delete(REQUEST_OBJECT_STORE_NAME, id);
    }

    async getFirstEntryByQueueName(queueName) {
        return await this.getEndEntryFromIndex(IDBKeyRange.only(queueName), 'next');
    }

    async getLastEntryByQueueName(queueName) {
        return await this.getEndEntryFromIndex(IDBKeyRange.only(queueName), 'prev');
    }

    async getEndEntryFromIndex(query, direction) {
        const db = await this.getDb();
        const cursor = await db
            .transaction(REQUEST_OBJECT_STORE_NAME)
            .store.index(QUEUE_NAME_INDEX)
            .openCursor(query, direction);
        return cursor?.value;
    }
}