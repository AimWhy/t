function isCallable(thing) {
  return thing instanceof Function || typeof thing === "function";
}

function isObject(value) {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  if (Array.isArray(value)) {
    return false;
  }
  return true;
}

function isReactElement(value) {
  return (
    typeof value === "object" &&
    value !== null &&
    String(value["$$typeof"]) === "Symbol(react.element)"
  );
}

const types = [
  {
    is: (val) => val === undefined,
    match: (str) => str === "!undefined",
    serialize: () => "!undefined",
    deserialize: () => undefined
  },
  {
    is: (val) => val === Infinity,
    match: (str) => str === "!Infinity",
    serialize: () => "!Infinity",
    deserialize: () => Infinity
  },
  {
    is: (val) => val === -Infinity,
    match: (str) => str === "!-Infinity",
    serialize: () => "!-Infinity",
    deserialize: () => -Infinity
  },
  {
    is: (val) => typeof val === "number" && isNaN(val),
    match: (str) => str === "!NaN",
    serialize: () => "!NaN",
    deserialize: () => NaN
  },
  {
    is: (val) => val instanceof Date,
    match: (str) => str.startsWith("!Date:"),
    serialize: (val) => "!Date:" + val.toISOString(),
    deserialize: (str) => new Date(str.slice("!Date:".length))
  },
  {
    is: (val) => typeof val === "bigint",
    match: (str) => str.startsWith("!BigInt:"),
    serialize: (val) => "!BigInt:" + val.toString(),
    deserialize: (str) => {
      if (typeof BigInt === "undefined") {
        throw new Error("Your JavaScript environement does not support BigInt. Consider adding a polyfill.");
      }
      return BigInt(str.slice("!BigInt:".length));
    }
  },
  {
    is: (val) => val instanceof RegExp,
    match: (str) => str.startsWith("!RegExp:"),
    serialize: (val) => "!RegExp:" + val.toString(),
    deserialize: (str) => {
      str = str.slice("!RegExp:".length);
      // const args: string[] = str.match(/\/(.*?)\/([gimy])?$/)!
      const args = str.match(/\/(.*)\/(.*)?/);
      const pattern = args[1];
      const flags = args[2];
      return new RegExp(pattern, flags);
    }
  },
  {
    is: (val) => val instanceof Map,
    match: (str) => str.startsWith("!Map:"),
    serialize: (val, serializer) => "!Map:" + serializer(Array.from(val.entries())),
    deserialize: (str, deserializer) => new Map(deserializer(str.slice("!Map:".length)))
  },
  {
    is: (val) => val instanceof Set,
    match: (str) => str.startsWith("!Set:"),
    serialize: (val, serializer) => "!Set:" + serializer(Array.from(val.values())),
    deserialize: (str, deserializer) => new Set(deserializer(str.slice("!Set:".length)))
  },
  {
    is: (val) => typeof val === "string" && val.startsWith("!"),
    match: (str) => str.startsWith("!"),
    serialize: (val) => "!" + val,
    deserialize: (str) => str.slice(1)
  }
];

export function stringify(value, { forbidReactElements, space, valueName = "value", sortObjectKeys } = {}) {
  const path = [];
  const serializer = (val) => JSON.stringify(val, replacer, space);
  return serializer(value);

  function replacer(key, value) {
    if (key !== "") {
      path.push(key);
    }

    if (forbidReactElements && isReactElement(value)) {
      throw new Error(genErrMsg("React element"));
    }

    if (isCallable(value)) {
      const functionName = value.name;
      throw new Error(genErrMsg("function", path.length === 0 ? functionName : undefined));
    }

    const valueOriginal = this[key];
    for (const { is, serialize } of types.slice().reverse()) {
      if (is(valueOriginal)) {
        return serialize(valueOriginal, serializer);
      }
    }

    if (sortObjectKeys && isObject(value)) {
      const copy = {};
      Object.keys(value).sort().forEach((key) => {
        copy[key] = value[key];
      });
      value = copy;
    }

    return value;
  }

  function genErrMsg(valueType, valName) {
    const name = valName ? " `" + valName + "`" : "";
    const location = path.length === 0 ? "" : ` ${name ? "at " : ""}\`${valueName}[${path.map((p) => `'${p}'`).join("][")}]\``;
    const fallback = name === "" && location === "" ? ` ${valueName}` : "";
    return `Cannot serialize${name}${location}${fallback} because it is a ${valueType} (https://github.com/brillout/json-serializer)`;
  }
}

export function parse(str) {
  const value = JSON.parse(str);
  return modifier(value);
}

function modifier(value) {
  if (typeof value === "string") {
    return reviver(value);
  }

  if (typeof value === "object" && value !== null) {
    Object.entries(value).forEach(([key, val]) => {
      value[key] = modifier(val);
    });
  }

  return value;
}

function reviver(value) {
  for (const { match, deserialize } of types) {
    if (match(value)) {
      return deserialize(value, parse);
    }
  }
  return value;
}
