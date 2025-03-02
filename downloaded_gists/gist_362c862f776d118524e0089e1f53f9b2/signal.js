{

  const effects = [Function.prototype];
  const disposed = new WeakSet();

  function signal(value) {
    const subs = new Set();
    return (newVal) => {
      if (newVal === undefined) {
        subs.add(effects.at(-1));
        return value;
      }
      if (newVal !== value) {
        value = newVal?.call ? newVal(value) : newVal;
        for (let eff of subs) disposed.has(eff) ? subs.delete(eff) : eff();
      }
    };
  }

  function effect(fn) {
    effects.push(fn);
    try {
      fn();
      return () => disposed.add(fn);
    } finally {
      effects.pop();
    }
  }

}

function computed(fn) {
  const s = signal();
  s.dispose = effect(() => s(fn()));
  return s;
}