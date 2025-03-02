export class HookManager {
    static { this.hooks = new Map(); }
    static async subscribeHook(event, cb) {
        console.log(`Registered Hook: ${event}`);
        let hookList = this.hooks.get(event) || [];
        hookList.push(await cb);
        this.hooks.set(event, hookList);
        const context = {
            event,
            cb
        };
        return context;
    }
    static unsubscribe(context) {
        if (context && context.event && context.cb) {
            const hookList = this.hooks.get(context.event);
            const index = hookList.indexOf(context.cb);
            if (index >= 0) {
                hookList.splice(index, 1);
                this.hooks.set(context.event, hookList);
            }
        }
    }
    static async triggerHook(event, data) {
        let hookList = this.hooks.get(event);
        let dataTrace = data;
        if (hookList) {
            for (let i = 0; i < hookList.length; ++i) {
                dataTrace = await hookList[i](dataTrace);
                console.log(`Trigger Hook: [${event}] => `, dataTrace);
            }
        }
        return dataTrace || data;
    }
}