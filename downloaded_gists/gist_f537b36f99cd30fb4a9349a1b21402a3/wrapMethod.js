function wrapMethod(methodName, messenger, logger) {
  const originMethod = messenger[methodName];
  messenger[methodName] = function () {
    const stack = new Error().stack.split('\n').slice(1).join('\n');
    logger.warn(`agent can't call %s before server started\n%s`, methodName, stack);
    originMethod.apply(this, arguments);
  };
  messenger.prependOnceListener('egg-ready', () => {
    messenger[methodName] = originMethod;
  });
}

/******* wrapMethod ******/

listProto.wrapMethod = function (methodName, injectFunction) {
  let originalMethod = this[methodName];
  if (typeof originalMethod !== 'function') {
    return;
  }
  this.__wrappedMethods = this.__wrappedMethods || [];
  this.__wrappedMethods.push(methodName);
  this[methodName] = function (...args) {
    let res = originalMethod.apply(this, args);
    return injectFunction.apply(this, [res].concat(args));
  };
};
