import { EventEmitter } from 'events';
export class StateMachine {
    constructor(_currentState) {
        this._currentState = _currentState;
        this.valueEmitter = new EventEmitter();
    }
    get error() {
        return this._error;
    }
    get currentState() {
        return this._currentState;
    }
    set(...[newState, error]) {
        this._currentState = newState;
        this._error = error;
        this.valueEmitter.emit(newState);
    }
    wait(state) {
        return new Promise((resolve) => {
            this.once(state, resolve);
        });
    }
    once(state, cb) {
        return this.subscribe(state, cb, { once: true });
    }
    on(state, cb) {
        return this.subscribe(state, cb);
    }
    is(targetState) {
        if (!Array.isArray(targetState)) {
            targetState = [targetState];
        }
        return targetState.includes(this._currentState);
    }
    subscribe(state, cb, { once } = {}) {
        const statesNormalized = Array.isArray(state) ? state : [state];
        if (statesNormalized.includes(this._currentState)) {
            cb();
            return () => { };
        }
        let executed = false;
        const wrappedCb = () => {
            if (!executed) {
                executed = true;
                cb();
            }
        };
        const fn = once ? 'once' : 'on';
        statesNormalized.forEach((item) => {
            this.valueEmitter[fn](item, wrappedCb);
        });
        return () => {
            statesNormalized.forEach((item) => {
                this.valueEmitter.off(item, wrappedCb);
            });
        };
    }
}
