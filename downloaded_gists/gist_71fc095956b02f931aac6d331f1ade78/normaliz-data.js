const objectifySchema = (schema) => {
  return schema.reduce((acc, item) => {
    if (Array.isArray(item)) {
      acc[item[0]] = Array.isArray(item[1]) ? [item[1], item[2]] : [[], item[1]];
    } else {
      acc[item] = [[]];
    }
    return acc;
  }, {});
};

export function normaliz(
  data,
  { entityName, from, schema, options = {} } = {},
  outputEntity = {},
  _clone = true
) {
  if (!data) {
    return data;
  }

  if (_clone) {
    data = JSON.parse(JSON.stringify(data));
  }

  if (!Array.isArray(schema)) {
    throw new Error('Invalid schema - expecting an array. Got: ' + schema);
  }

  if (typeof entityName !== 'string') {
    throw new Error('Invalid entityName - expecting a string. Got: ' + entityName);
  }

  const dataIsArray = Array.isArray(data);
  if (!dataIsArray) {
    data = [data];
  }

  const collection = options.mapping || entityName;

  return data.reduce((result, item) => {
    const id = typeof options.key === 'function' ? options.key(item) : item[options.key || 'id'];

    Object.entries(objectifySchema(schema)).forEach(
      ([innerEntityName, [innerSchema, innerOptions = {}]]) => {
        const entityValue = item[innerEntityName];
        if (!entityValue) {
          return;
        }

        const innerKeyId =
          typeof innerOptions.key === 'function'
            ? innerOptions.key
            : (obj) => obj[innerOptions.key || 'id'];

        normaliz(
          entityValue,
          {
            entityName: innerEntityName,
            schema: innerSchema,
            options: innerOptions,
          },
          result,
          false
        );

        if (innerOptions.normalize === false) {
          item[innerEntityName] = entityValue;
        } else if (Array.isArray(entityValue)) {
          item[innerEntityName] = entityValue.map((v) => innerKeyId(v));
        } else {
          item[innerEntityName] = innerKeyId(entityValue);
        }
      }
    );

    if (options.normalize === false) {
      return result;
    }

    (result[collection] ||= {})[id] = item;

    if (from) {
      Object.entries(from).forEach(([fromEntity, fromId]) => {
        result[fromEntity] ||= {};
        result[fromEntity][fromId] ||= {};

        if (dataIsArray) {
          (result[fromEntity][fromId][collection] ||= []).push(id);
        } else {
          result[fromEntity][fromId][collection] = id;
        }
      });
    }

    return result;
  }, outputEntity);
}

export function denormaliz(entryEntity, { entities, schema } = {}) {
  if (!entryEntity) {
    return entryEntity;
  }

  if (!Array.isArray(schema)) {
    throw new Error('Invalid schema - expecting an array. Got: ' + schema);
  }

  Object.entries(objectifySchema(schema)).forEach(
    ([innerEntityName, [innerSchema, innerOptions = {}]]) => {
      const entityValue = entryEntity[innerEntityName];
      if (!entityValue) {
        return;
      }

      const collection = innerOptions.mapping || innerEntityName;
      const dontNormalize = innerOptions.normalize === false;

      const denormalize = (_entity) =>
        denormaliz(_entity, { entities, schema: innerSchema, options: innerOptions });

      if (Array.isArray(entityValue)) {
        entryEntity[innerEntityName] = entryEntity[innerEntityName].map((value) =>
          denormalize(dontNormalize ? value : entities[collection][value])
        );
      } else {
        entryEntity[innerEntityName] = denormalize(
          dontNormalize ? entityValue : entities[collection][entityValue]
        );
      }
    }
  );

  return JSON.parse(JSON.stringify(entryEntity));
}
