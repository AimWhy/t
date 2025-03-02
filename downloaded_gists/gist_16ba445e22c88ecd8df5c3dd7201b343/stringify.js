const { parse: $parse, stringify: $stringify } = JSON;

const Primitive = String;
const isObject = (value) => value && typeof value === 'object';
const isString = (value) => typeof value === 'string';
const ignore = {};
const noop = (_, value) => value;

const set = (map, input, value) => {
  const index = Primitive(input.push(value) - 1);
  map.set(value, index);
  return index;
};

const revive = (input, parsed, output, $reviver) => {
  const lazy = [];
  for (let keyList = Object.keys(output), length = keyList.length, y = 0; y < length; y++) {
    const key = keyList[y];
    const value = output[key];

    if (value instanceof Primitive) {
      const tmp = input[Primitive(value)];
      // 指针指向的对象，暂存
      if (isObject(tmp)) {
        parsed.add(tmp);
        output[key] = ignore;
        lazy.push({ key, arr: [input, parsed, tmp, $reviver] });
      } else {
        output[key] = $reviver.call(output, key, tmp);
      }
    } else if (output[key] !== ignore) {
      output[key] = $reviver.call(output, key, value);
    }
  }
  // 处理暂存的对象
  for (let length = lazy.length, i = 0; i < length; i++) {
    const { key, arr } = lazy[i];
    output[key] = $reviver.call(output, key, revive(...arr));
  }
  return output;
};

export const parse = (text, reviver) => {
  // 对象中的字符串类是指针、数组中的字符串是值
  const input = $parse(text, (_, value) => {
    return isString(value) ? new Primitive(value) : value;
  }).map((value) => {
    return value instanceof Primitive ? Primitive(value) : value;
  });
  const value = input[0];
  const $reviver = reviver || noop;
  const tmp = isObject(value) ? revive(input, new Set(), value, $reviver) : value;
  return $reviver.call({ '': tmp }, '', tmp);
};

export const stringify = (value, replacer, space) => {
  const $replacer = isObject(replacer)
    ? (k, v) => (k === '' || -1 < replacer.indexOf(k) ? v : void 0)
    : replacer || noop;
  const known = new Map();
  const input = [];
  const output = [];

  let index = set(known, input, $replacer.call({ '': value }, '', value));
  let firstRun = index === '0';

  const replace = function (_key, _value) {
    if (firstRun) {
      firstRun = false;
      // 排序 Key, 让序列化稳定
      if (Object.prototype.toString.call(_value) === '[object Object]') {
        const temp = { ..._value };
        const keys = Object.keys(temp).sort();
        for (let key of keys) {
          delete _value[key];
          _value[key] = temp[key];
        }
      }
      return _value;
    }
    const after = $replacer.call(this, _key, _value);
    if (after === null) {
      return after;
    }
    if (isString(after) || isObject(after)) {
      return known.get(after) || set(known, input, after);
    }
    return after;
  };

  while (index < input.length) {
    firstRun = true;
    output[index] = $stringify(input[index++], replace, space);
  }
  return '[' + output.join(',') + ']';
};

export const toJSON = (any) => $parse(stringify(any));
export const fromJSON = (any) => parse($stringify(any));
