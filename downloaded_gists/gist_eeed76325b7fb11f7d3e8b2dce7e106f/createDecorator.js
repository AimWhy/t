const DI_TARGET = 'di$target';
const DI_DEPENDENCIES = 'di$dependencies';

export const serviceRegistry = new Map();
export function getServiceDependencies(ctor) {
  return ctor[DI_DEPENDENCIES] || [];
}

function storeServiceDependency(id, target, index) {
  if (target[DI_TARGET] === target) {
    target[DI_DEPENDENCIES].push({ id, index });
  } else {
    target[DI_DEPENDENCIES] = [{ id, index }];
    target[DI_TARGET] = target;
  }
}

export function createDecorator(id) {
  if (serviceRegistry.has(id)) {
    return serviceRegistry.get(id);
  }

  const decorator = function (target, key, index) {
    if (arguments.length !== 3) {
      throw new Error('@IServiceName-decorator can only be used to decorate a parameter');
    }
    storeServiceDependency(decorator, target, index);
  };
  decorator.toString = () => id;

  serviceRegistry.set(id, decorator);
  return decorator;
}

export const IBufferService = createDecorator('BufferService');
export const ICoreMouseService = createDecorator('CoreMouseService');
export const ICoreService = createDecorator('CoreService');
export const ICharsetService = createDecorator('CharsetService');
export const IInstantiationService = createDecorator('InstantiationService');

export const LogLevelEnum = (function (_LogLevelEnum) {
  _LogLevelEnum[(_LogLevelEnum.DEBUG = 0)] = 'DEBUG';
  _LogLevelEnum[(_LogLevelEnum.INFO = 1)] = 'INFO';
  _LogLevelEnum[(_LogLevelEnum.WARN = 2)] = 'WARN';
  _LogLevelEnum[(_LogLevelEnum.ERROR = 3)] = 'ERROR';
  _LogLevelEnum[(_LogLevelEnum.OFF = 4)] = 'OFF';
})({});

export const ILogService = createDecorator('LogService');
export const IOptionsService = createDecorator('OptionsService');
export const IOscLinkService = createDecorator('OscLinkService');
export const IUnicodeService = createDecorator('UnicodeService');
export const IDecorationService = createDecorator('DecorationService');