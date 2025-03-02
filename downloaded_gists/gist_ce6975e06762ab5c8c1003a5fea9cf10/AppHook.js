export const ListenerType = { Filter: 'Filter', Trigger: 'Trigger' };

export class AppHook {
  _listeners = {};

  _onAddTrigger;
  _onAddFilter;

  _onDoTrigger;
  _whenApplyFilters;

  bindAddTrigger(bind) {
    this._onAddTrigger = bind;
  }

  bindAddFilter(bind) {
    this._onAddFilter = bind;
  }

  bindDoTrigger(bind) {
    this._onDoTrigger = bind;
  }

  bindUseFilters(bind) {
    this._whenApplyFilters = bind;
  }

  addListener(type, hook, newListener) {
    let typeListners = this._listeners[type];
    if (typeListners === void 0) {
      typeListners = this._listeners[type] = {};
    }

    let listenerList = typeListners[hook];
    if (listenerList === void 0) {
      typeListners[hook] = [newListener];
      return;
    }

    // order insert, the smaller the number, the more small index.
    for (let i = 0; i <= listenerList.length; i++) {
      const loopListener = listenerList[i];
      if (i === listenerList.length) {
        listenerList.push(newListener);
        break;
      }

      if (newListener.priority <= loopListener.priority) {
        listenerList.splice(i, 0, newListener);
        break;
      }
    }
  }

  addTrigger({ hook, command, commandArg, rule, priority = 0, isCatch = false }) {
    if (this._onAddTrigger != null) {
      this._onAddTrigger({ hook, command, commandArg, rule, priority, isCatch });
    }

    const action = { command, args: commandArg };
    const trigger = { type: ListenerType.Filter, priority, hook, action, rule, isCatch };

    this.addListener(ListenerType.Trigger, hook, trigger);
    return trigger;
  }

  addFilter({ hook, command, commandArg, rule, priority = 0, isCatch = false }) {
    if (this._onAddFilter != null) {
      this._onAddFilter(hook, command, commandArg, rule, priority, isCatch);
    }

    const action = { command, args: commandArg };
    const filter = { type: ListenerType.Filter, priority, hook, action, rule, isCatch };

    this.addListener(ListenerType.Filter, hook, filter);
    return filter;
  }

  removeListener(type, listener) {
    const typeListners = this._listeners[type];
    if (typeListners === void 0) {
      return false;
    }

    const listenerList = typeListners[listener.hook];
    if (listenerList === void 0) {
      return false;
    }

    for (let i = 0; i < listenerList.length; i++) {
      const l = listenerList[i];
      if (l === listener) {
        listenerList.splice(i, 1);
        return true;
      }
    }

    return false;
  }

  removeTrigger(trigger) {
    return this.removeListener(ListenerType.Trigger, trigger);
  }

  removeFilter(filter) {
    return this.removeListener(ListenerType.Filter, filter);
  }

  hasAnyListeners(type, hook) {
    const typeListeners = this._listeners[type];
    if (typeListeners === void 0) {
      return false;
    }

    const hookListeners = typeListeners[hook];
    if (hookListeners === void 0) {
      return false;
    }

    if (hookListeners.length === 0) {
      return false;
    }

    return true;
  }

  hasAnyTriggers(hook) {
    return this.hasAnyListeners(ListenerType.Trigger, hook);
  }

  hasAnyFilters(hook) {
    return this.hasAnyListeners(ListenerType.Filter, hook);
  }

  applyFilters(hook, defaultValue, hookState) {
    if (this._whenApplyFilters != null) {
      this._whenApplyFilters(hook, defaultValue, hookState);
    }

    const filterMap = this._listeners[ListenerType.Filter];
    if (filterMap === void 0) {
      return defaultValue;
    }

    const filterList = filterMap[hook];
    if (filterList === void 0) {
      return defaultValue;
    }

    let filteredValue = defaultValue;
    for (let i = 0; i < filterList.length; i++) {
      const filter = filterList[i];
      try {
        filteredValue = filter.action.command(filteredValue, hookState, filter.action.args);
      } catch (e) {
        console.error(e);
        if (filter.isCatch === void 0 || filter.isCatch === false) {
          throw e;
        }
      }
    }

    return filteredValue;
  }

  doTriggers(hook, hookState) {
    if (this._onDoTrigger != null) {
      this._onDoTrigger(hook, hookState);
    }

    const triggerMap = this._listeners[ListenerType.Trigger];
    if (triggerMap === void 0) {
      return;
    }

    const triggerList = triggerMap[hook];
    if (triggerList === void 0) {
      return;
    }

    for (let i = 0; i < triggerList.length; i++) {
      const trigger = triggerList[i];
      try {
        trigger.action.command(hookState, trigger.action.args);
      } catch (e) {
        console.error(e);
        if (trigger.isCatch === void 0 || trigger.isCatch === false) {
          throw e;
        }
      }
    }
  }
}