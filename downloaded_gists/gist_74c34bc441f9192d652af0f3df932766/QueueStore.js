import { QueueDb, } from './QueueDb.js';

export class QueueStore {
    _queueName;
    _queueDb;

    constructor(queueName) {
        this._queueName = queueName;
        this._queueDb = new QueueDb();
    }
    /**
     * @param {Object} entry
     * @param {Object} entry.requestData
     * @param {number} [entry.timestamp]
     * @param {Object} [entry.metadata]
     */
    async pushEntry(entry) {

        // Don't specify an ID since one is automatically generated.
        delete entry.id;
        entry.queueName = this._queueName;
        await this._queueDb.addEntry(entry);
    }
    /**
     * @param {Object} entry
     * @param {Object} entry.requestData
     * @param {number} [entry.timestamp]
     * @param {Object} [entry.metadata]
     */
    async unshiftEntry(entry) {

        const firstId = await this._queueDb.getFirstEntryId();
        if (firstId) {
            // Pick an ID one less than the lowest ID in the object store.
            entry.id = firstId - 1;
        } else {
            // Otherwise let the auto-incrementor assign the ID.
            delete entry.id;
        }
        entry.queueName = this._queueName;
        await this._queueDb.addEntry(entry);
    }
    /**
     * Removes and returns the last entry in the queue matching the `queueName`.
     *
     * @return {Promise<QueueStoreEntry|undefined>}
     */
    async popEntry() {
        return this._removeEntry(await this._queueDb.getLastEntryByQueueName(this._queueName));
    }
    /**
     * Removes and returns the first entry in the queue matching the `queueName`.
     *
     * @return {Promise<QueueStoreEntry|undefined>}
     */
    async shiftEntry() {
        return this._removeEntry(await this._queueDb.getFirstEntryByQueueName(this._queueName));
    }
    /**
     * Returns all entries in the store matching the `queueName`.
     *
     * @param {Object} options See {@link workbox-background-sync.Queue~getAll}
     * @return {Promise<Array<Object>>}
     */
    async getAll() {
        return await this._queueDb.getAllEntriesByQueueName(this._queueName);
    }
    /**
     * Returns the number of entries in the store matching the `queueName`.
     *
     * @param {Object} options See {@link workbox-background-sync.Queue~size}
     * @return {Promise<number>}
     */
    async size() {
        return await this._queueDb.getEntryCountByQueueName(this._queueName);
    }
    /**
     * Deletes the entry for the given ID.
     *
     * WARNING: this method does not ensure the deleted entry belongs to this
     * queue (i.e. matches the `queueName`). But this limitation is acceptable
     * as this class is not publicly exposed. An additional check would make
     * this method slower than it needs to be.
     *
     * @param {number} id
     */
    async deleteEntry(id) {
        await this._queueDb.deleteEntry(id);
    }
    /**
     * Removes and returns the first or last entry in the queue (based on the
     * `direction` argument) matching the `queueName`.
     *
     * @return {Promise<QueueStoreEntry|undefined>}
     * @private
     */
    async _removeEntry(entry) {
        if (entry) {
            await this.deleteEntry(entry.id);
        }
        return entry;
    }
}