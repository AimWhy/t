function likeToRegexp(likeQuery) {
  const regexp = `^${likeQuery}$`.replace(/%/g, '.*').replace(/_/g, '.');
  return new RegExp(regexp, 'is');
}

const between = (left, [lower, upper]) => left >= lower && left <= upper;

const rawFieldEquals = (left, right) => left === right;

const rawFieldNotEquals = (left, right) => !(left === right);

const noNullComparisons = (operator) => (left, right) => {
  if (left == null || right == null) {
    return false;
  }

  return operator(left, right);
};

// Same as `a > b`, but `5 > undefined` is also true
const weakGt = (left, right) => left > right || (left != null && right == null);

const handleLikeValue = (v, defaultV) => (typeof v === 'string' ? v : defaultV);

const like = (left, right) => {
  const leftV = handleLikeValue(left, '');
  return likeToRegexp(right).test(leftV);
};

export const notLike = (left, right) => {
  // Mimic SQLite behaviour
  if (left === null) {
    return false;
  }

  const leftV = handleLikeValue(left, '');
  return !likeToRegexp(right).test(leftV);
};

const oneOf = (value, values) => values.includes(value);
const notOneOf = (value, values) => !values.includes(value);

const gt = (a, b) => a > b;
const gte = (a, b) => a >= b;
const lt = (a, b) => a < b;
const lte = (a, b) => a <= b;
const includes = (a, b) => typeof a === 'string' && a.includes(b);

const operators = {
  eq: rawFieldEquals,
  notEq: rawFieldNotEquals,
  gt: noNullComparisons(gt),
  gte: noNullComparisons(gte),
  weakGt,
  lt: noNullComparisons(lt),
  lte: noNullComparisons(lte),
  oneOf,
  notIn: noNullComparisons(notOneOf),
  between,
  like,
  notLike,
  includes,
};

export default operators;
