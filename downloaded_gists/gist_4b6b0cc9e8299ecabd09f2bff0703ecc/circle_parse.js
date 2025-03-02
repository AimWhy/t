function primitives(value) {
  return value instanceof String ? String(value) : value;
}

function Primitives(key, value) {
  return typeof value === 'string' ? new String(value) : value;
}

function noop(key, value) {
  return value;
}

function set(known, input, value) {
  var index = String(input.push(value) - 1);
  known.set(value, index);
  return index;
}

function revive(input, parsed, output, $) {
  return Object.keys(output).reduce(function (output, key) {
    var value = output[key];
    if (value instanceof String) {
      var tmp = input[value];
      if (typeof tmp === 'object' && !parsed.has(tmp)) {
        parsed.add(tmp);
        output[key] = $.call(output, key, revive(input, parsed, tmp, $));
      } else {
        output[key] = $.call(output, key, tmp);
      }
    } else {
      output[key] = $.call(output, key, value);
    }
    return output;
  }, output);
}

export default {
  parse(text, reviver = noop) {
    var input = JSON.parse(text, Primitives).map(primitives);
    var value = input[0];
    return (typeof value === 'object' && value) ? revive(input, new Set, value, reviver) : value;
  },
  stringify(value, replacer = noop, space) {
    var known = new Map;
    var input = [];
    var output = [];
    var $ = Array.isArray(replacer) ? function (k, v) {
      return (k === '' || replacer.includes(k)) ? v : undefined
    } : replacer;
    var replace = function (key, value) {
      if (key === '') {
        return value;
      }
      var after = $.call(this, key, value);
      switch (typeof after) {
        case 'object':
          return (after === null) ? after : (known.get(after) || set(known, input, after));
        case 'string':
          return known.get(after) || set(known, input, after);
        default:
          return after;
      }
    }
    set(known, input, value)
    for (var i = 0; i < input.length; i++) {
      output[i] = JSON.stringify(input[i], replace, space);
    }
    return '[' + output.join(',') + ']';
  }
};
