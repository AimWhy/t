function idx(input, accessor) {
  try {
    return accessor(input);
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

/**
 * Some actual error messages for null:
 *
 * TypeError: Cannot read property 'bar' of null
 * TypeError: Cannot convert null value to object
 * TypeError: foo is null
 * TypeError: null has no properties
 * TypeError: null is not an object (evaluating 'foo.bar')
 * TypeError: null is not an object (evaluating '(" undefined ", null).bar')
 */
var nullPattern = /^null | null$|^[^(]* null /i;
var undefinedPattern = /^undefined | undefined$|^[^(]* undefined /i;

idx.default = idx;
module.exports = idx;