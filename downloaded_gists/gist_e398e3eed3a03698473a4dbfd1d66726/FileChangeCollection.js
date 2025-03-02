import { FileChangeType } from '../common';
/**
 * A file change collection guarantees that only one change is reported for each URI.
 *
 * Changes are normalized according following rules:
 * - ADDED + ADDED => ADDED
 * - ADDED + UPDATED => ADDED
 * - ADDED + DELETED => NONE
 * - UPDATED + ADDED => UPDATED
 * - UPDATED + UPDATED => UPDATED
 * - UPDATED + DELETED => DELETED
 * - DELETED + ADDED => UPDATED
 * - DELETED + UPDATED => UPDATED
 * - DELETED + DELETED => DELETED
 */
export class FileChangeCollection {
    constructor() {
        this.changes = new Map();
    }
    push(change) {
        const current = this.changes.get(change.uri);
        if (current) {
            if (this.isDeleted(current, change)) {
                this.changes.delete(change.uri);
            }
            else if (this.isUpdated(current, change)) {
                current.type = FileChangeType.UPDATED;
            }
            else if (!this.shouldSkip(current, change)) {
                current.type = change.type;
            }
        }
        else {
            this.changes.set(change.uri, change);
        }
    }
    isDeleted(current, change) {
        return current.type === FileChangeType.ADDED && change.type === FileChangeType.DELETED;
    }
    isUpdated(current, change) {
        return current.type === FileChangeType.DELETED && change.type === FileChangeType.ADDED;
    }
    shouldSkip(current, change) {
        return ((current.type === FileChangeType.ADDED && change.type === FileChangeType.UPDATED) ||
            (current.type === FileChangeType.UPDATED && change.type === FileChangeType.ADDED));
    }
    values() {
        return Array.from(this.changes.values());
    }
}