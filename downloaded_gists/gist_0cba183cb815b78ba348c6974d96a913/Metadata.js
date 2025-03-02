const Metadata = new WeakMap();

function decorateProperty(decorators, target, propertyKey, descriptor) {
  return decorators.reduceRight((acc, decorator) => (decorator(target, propertyKey, acc) || acc), descriptor);
}

function decorateConstructor(decorators, target) {
  return decorators.reduceRight((acc, decorator) => (decorator(acc) || acc), target)
}

function decorate(decorators, target, propertyKey, attributes) {
  if (!Array.isArray(decorators) || decorators.length === 0) {
    throw new TypeError();
  }
  if (propertyKey !== undefined) {
    return decorateProperty(decorators, target, propertyKey, attributes);
  }
  if ('function' === typeof target) {
    return decorateConstructor(decorators, target);
  }
}

function createMetadataMap(target, propertyKey) {
  const targetMetadata = Metadata.get(target) || new Map();
  Metadata.set(target, targetMetadata);
  const metadataMap = targetMetadata.get(propertyKey) || new Map();
  targetMetadata.set(propertyKey, metadataMap);
  return metadataMap;
}

function getMetadataMap(target, propertyKey) {
  return Metadata.get(target) && Metadata.get(target).get(propertyKey);
}

function ordinaryDefineOwnMetadata(metadataKey, metadataValue, target, propertyKey) {
  if (propertyKey && !['string', 'symbol'].includes(typeof propertyKey)) {
    throw new TypeError();
  }
  const metadataMap = getMetadataMap(target, propertyKey) || createMetadataMap(target, propertyKey);
  metadataMap.set(metadataKey, metadataValue);
}

function ordinaryGetOwnMetadata(metadataKey, target, propertyKey) {
  if (target === undefined) {
    throw new TypeError();
  }
  const metadataMap = getMetadataMap(target, propertyKey);
  return metadataMap && metadataMap.get(metadataKey);
}

function ordinaryGetMetadata(metadataKey, target, propertyKey) {
  const result = ordinaryGetOwnMetadata(metadataKey, target, propertyKey);
  if (result) {
    return result;
  }
  const parent = Object.getPrototypeOf(target);
  return parent ? ordinaryGetMetadata(metadataKey, parent, propertyKey) : undefined;
}

function metadata(metadataKey, metadataValue) {
  return function decorator(target, propertyKey) {
    ordinaryDefineOwnMetadata(metadataKey, metadataValue, target, propertyKey);
  };
}

function defineMetadata(metadataKey, metadataValue, target, propertyKey) {
  ordinaryDefineOwnMetadata(metadataKey, metadataValue, target, propertyKey);
}

function getOwnMetadata(metadataKey, target, propertyKey) {
  return ordinaryGetOwnMetadata(metadataKey, target, propertyKey);
}

function hasOwnMetadata(metadataKey, target, propertyKey) {
  return !!ordinaryGetOwnMetadata(metadataKey, target, propertyKey);
}

function getMetadata(metadataKey, target, propertyKey) {
  return ordinaryGetMetadata(metadataKey, target, propertyKey);
}

function hasMetadata(metadataKey, target, propertyKey) {
  return !!ordinaryGetMetadata(metadataKey, target, propertyKey);
}

const Reflection = {
  decorate,
  metadata,
  defineMetadata,
  getMetadata,
  hasMetadata,
  getOwnMetadata,
  hasOwnMetadata,
};

Object.assign(Reflect, Reflection);
