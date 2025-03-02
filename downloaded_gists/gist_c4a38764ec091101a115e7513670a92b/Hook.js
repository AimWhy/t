export class Hook {
    constructor() {
        this.tap = (tasks) => {
            Array.isArray(tasks) ? this.tasks.push(...tasks) : this.tasks.push(tasks);
        };
        this.call = (args) => {
            return this.tasks.reduce((preReturn, task) => {
                return preReturn.then((data) => task(args, data));
            }, Promise.resolve(args));
        };
        this.tasks = [];
    }
}