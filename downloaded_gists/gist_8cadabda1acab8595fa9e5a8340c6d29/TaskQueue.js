export class TaskQueue {
    constructor() {
        this._chain = Promise.resolve();
    }
    postTask(task) {
        const result = this._chain.then(task);
        this._chain = result.then(() => undefined, () => undefined);
        return result;
    }
}