export class Resolver {
  constructor(options) {
    this.options = options;
  }

  async resolveProperty(name, data, context, status = {}) {
    const resolver = this.options.properties[name];
    const value = data[name];
    const { path = [], stack = [] } = status || {};
    // This prevents circular dependencies
    if (stack.includes(resolver)) {
      return undefined;
    }
    const resolverStatus = {
      ...status,
      path: [...path, name],
      stack: [...stack, resolver]
    };
    return resolver(value, data, context, resolverStatus);
  }

  async resolve(_data, context, status) {
    const { properties: resolvers, schema, validate } = this.options;
    const data = schema && validate === 'before' ? await schema.validate(_data) : _data;
    
    // By default get all data and resolver keys but remove duplicates
    const propertyList = Array.isArray(status?.properties) ? status?.properties : [...new Set(Object.keys(data).concat(Object.keys(resolvers)))];
    
    const result = {};
    const errors = {};
    let hasErrors = false;

    // Not the most elegant but better performance
    await Promise.all(propertyList.map(async (name) => {
      const value = data[name];
      if (resolvers[name]) {
        try {
          const resolved = await this.resolveProperty(name, data, context, status);
          if (resolved !== undefined) {
            result[name] = resolved;
          }
        } catch (error) {
          errors[name] = typeof error.toJSON === 'function' ? error.toJSON() : { message: error.message || error };
          hasErrors = true;
        }
      } else if (value !== undefined) {
        result[name] = value;
      }
    }));

    if (hasErrors) {
      const propertyName = status?.properties ? ` ${status.properties.join('.')}` : '';
      throw new Error('Error resolving data' + propertyName, errors);
    }

    return schema && validate === 'after' ? await schema.validate(result) : result;
  }
}
