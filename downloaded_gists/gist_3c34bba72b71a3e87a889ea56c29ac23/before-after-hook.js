function register(state, name, method, options = {}) {
  if (typeof method !== "function") {
    throw new Error("method for before hook must be a function");
  }

  if (Array.isArray(name)) {
    return name.reverse().reduce((callback, name) => {
      return register.bind(null, state, name, callback, options);
    }, method)();
  }

  return Promise.resolve().then(() => {
    if (!state.registry[name]) {
      return method(options);
    }

    return state.registry[name].reduce((method, registered) => {
      return registered.hook.bind(null, method, options);
    }, method)();
  });
}

function addHook(state, kind, name, hook) {
  const orig = hook;
  state.registry[name] = state.registry[name] || [];

  if (kind === "before") {
    hook = (method, options) => {
      return Promise.resolve()
        .then(orig.bind(null, options))
        .then(method.bind(null, options));
    };
  }

  if (kind === "after") {
    hook = (method, options) => {
      let result;
      return Promise.resolve()
        .then(method.bind(null, options))
        .then((result_) => {
          result = result_;
          return orig(result, options);
        })
        .then(() => {
          return result;
        });
    };
  }

  if (kind === "error") {
    hook = (method, options) => {
      return Promise.resolve()
        .then(method.bind(null, options))
        .catch((error) => {
          return orig(error, options);
        });
    };
  }

  state.registry[name].push({ hook, orig });
}

function removeHook(state, name, method) {
  if (!state.registry[name]) {
    return;
  }

  const index = state.registry[name]
    .map((registered) => {
      return registered.orig;
    })
    .indexOf(method);

  if (index === -1) {
    return;
  }

  state.registry[name].splice(index, 1);
}

const bind = Function.bind;
const bindable = bind.bind(bind);

function bindApi(hook, state, name) {
  const removeRef = bindable(removeHook, null).apply(null, name ? [state, name] : [state]);

  hook.api = { remove: removeRef };
  hook.remove = removeRef;

  ["before", "error", "after", "wrap"].forEach((kind) => {
    const args = name ? [state, kind, name] : [state, kind];
    hook[kind] = hook.api[kind] = bindable(addHook, null).apply(null, args);
  });
}

function Singular() {
  const singularName = Symbol("Singular");
  const singularState = { registry: {} };
  const singularHook = register.bind(null, singularState, singularName);
  bindApi(singularHook, singularState, singularName);
  return singularHook;
}

function Collection() {
  const state = { registry: {} };
  const hook = register.bind(null, state);
  bindApi(hook, state);
  return hook;
}

export default { Singular, Collection };