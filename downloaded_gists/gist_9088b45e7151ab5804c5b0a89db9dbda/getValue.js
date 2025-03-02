var nullPattern = /^null | null$|^[^(]* null /i;
var undefinedPattern = /^undefined | undefined$|^[^(]* undefined /i;

function x() { }
x.p = [];

export const V1 = new Proxy(x, {
  get: function (target, propKey, receiver) {
    target.p.push(propKey);
    return receiver;
  },
  apply: function (target, thisBinding, args) {
    try {
      let result = args[0];
      while (target.p.length) {
        const current = target.p.shift();
        result = result[current];
      }
      return result;
    } catch (error) {
      if (error instanceof TypeError) {
        if (nullPattern.test(error)) {
          return null;
        } else if (undefinedPattern.test(error)) {
          return undefined;
        }
      }
      throw error;
    } finally {
      target.p = [];
    }
  },
});

/************************************************************************/

export function V2(stringArr, context) {
  try {
    const fn = new Function('return this' + stringArr[1]);
    return fn.call(context)
  } catch (error) {
    if (error instanceof TypeError) {
      if (nullPattern.test(error)) {
        return null;
      } else if (undefinedPattern.test(error)) {
        return undefined;
      }
    }
    throw error;
  }
}

// var x = {a: {}};
// V1.a.b.c(x)
// V2`${x}.a.b.c`