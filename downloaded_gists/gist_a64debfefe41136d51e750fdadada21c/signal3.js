let activeEffect = null;
let isBatching = false;
let pendingSubscribers = new Set();

let activeComponent = null;
export function setActiveComponent(component, updateFnName) {
    activeComponent = component;
    activeComponent._tempActiveUpdateFnName = updateFnName || 'queuedUpdate';
}
export function clearActiveComponent() {
    activeComponent = null;
}
export function getActiveComponent() {
    return activeComponent;
}

export class Signal {
    constructor(value) {
        this.subscribers = new Set();
        this.depsComponents = new Set();
        this.notifying = false;
        this._value = value;
    }
    get value() {
        // 没有在通知，才能添加依赖，否则会导致循环依赖
        if (!this.notifying) {
            if (activeEffect) {
                // computed 内部触发的原始信号的 get value 不用加入原始信号的订阅
                if (activeEffect.run) {
                    this.subscribe(activeEffect.run);
                }
                activeEffect.addDependency(this);
            }
        }
        const component = getActiveComponent();
        if (component)
            this.depsComponents.add(component);
        return this._value;
    }
    set value(newValue) {
        // 修改前也有 hook？
        if (newValue !== this._value) {
            this._value = newValue;
            this.update();
        }
    }
    peek() {
        return this._value;
    }
    update() {
        this.notify();
        this.depsComponents.forEach((component) => component[component._tempActiveUpdateFnName]?.());
        // 信号值修改后 hook，重置已经执行的 effect
        this.subscribers.forEach((callback) => {
            // 重置计算属性的 subscribers，防止不依赖 signal 但依赖 computed的 effect不执行
            if (callback.computedInstance) {
                callback.computedInstance.subscribers.forEach((cb) => {
                    cb.done = false;
                });
            }
            callback.done = false;
        });
    }
    subscribe(callback) {
        this.subscribers.add(callback);
    }
    unsubscribe(callback) {
        this.subscribers.delete(callback);
    }
    notify() {
        if (isBatching) {
            this.subscribers.forEach((callback) => pendingSubscribers.add(callback));
        }
        else {
            this.notifying = true;
            this.subscribers.forEach((callback) => {
                if (typeof callback === 'function' && !callback.done) {
                    callback.done = true;
                    callback();
                }
            });
            this.notifying = false;
        }
    }
}
export class Computed {
    constructor(computeFn) {
        this.dependencies = new Set();
        this.subscribers = new Set();
        this.depsComponents = new Set();
        this.notifying = false;
        this.recompute = () => {
            const newValue = this.compute();
            if (newValue !== this._value) {
                this._value = newValue;
                this.notify();
                this.depsComponents.forEach((component) => component[component._tempActiveUpdateFnName]?.());
            }
        };
        this.computeFn = computeFn;
        this._value = this.compute();
    }
    get value() {
        if (!this.notifying) {
            if (activeEffect) {
                this.subscribe(activeEffect.run);
                activeEffect.addDependency(this);
            }
        }
        const component = getActiveComponent();
        if (component)
            this.depsComponents.add(component);
        return this._value;
    }
    peek() {
        return this._value;
    }
    compute() {
        const previousEffect = activeEffect;
        activeEffect = this;
        const newValue = this.computeFn();
        activeEffect = previousEffect;
        return newValue;
    }
    subscribe(callback) {
        if (callback) {
            this.subscribers.add(callback);
        }
    }
    unsubscribe(callback) {
        this.subscribers.delete(callback);
    }
    notify() {
        if (isBatching) {
            this.subscribers.forEach((callback) => pendingSubscribers.add(callback));
        }
        else {
            this.notifying = true;
            this.subscribers.forEach((callback) => {
                if (!callback.done) {
                    callback.done = true;
                    callback();
                }
            });
            this.notifying = false;
        }
    }
    addDependency(dep) {
        this.dependencies.add(dep);
        // 订阅重新计算
        dep.subscribe(this.recompute);
        this.recompute.computedInstance = this;
    }
}
export class Effect {
    constructor(effectFn) {
        this.dependencies = new Set();
        this.disposed = false;
        this.run = () => {
            if (this.disposed)
                return;
            const previousEffect = activeEffect;
            activeEffect = this;
            this.effectFn();
            activeEffect = previousEffect;
        };
        this.effectFn = effectFn;
        this.run();
    }
    addDependency(dep) {
        if (this.disposed)
            return;
        this.dependencies.add(dep);
        this.run.effectInstance = this;
        dep.subscribe(this.run);
    }
    cleanup() {
        this.dependencies.forEach((dep) => dep.unsubscribe(this.run));
        this.dependencies.clear();
    }
    dispose() {
        this.cleanup();
        this.disposed = true;
    }
}
// Factory functions
export function signal(value) {
    return new Signal(value);
}
export function computed(computeFn) {
    return new Computed(computeFn);
}
export function effect(effectFn) {
    const eff = new Effect(effectFn);
    return () => eff.dispose();
}
export function batch(fn) {
    isBatching = true;
    try {
        fn();
    }
    finally {
        isBatching = false;
        pendingSubscribers.forEach((callback) => {
            if (!callback.done) {
                callback.done = true;
                callback();
            }
        });
        pendingSubscribers.forEach((callback) => {
            callback.done = false;
        });
        pendingSubscribers.clear();
    }
}
export function signalObject(initialValues) {
    const signals = Object.entries(initialValues).reduce((acc, [key, value]) => {
        acc[key] = signal(value);
        return acc;
    }, {});
    return signals;
}
