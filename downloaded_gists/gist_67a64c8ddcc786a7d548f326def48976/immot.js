const isMap = (obj) => obj instanceof Map;

const isArray = Array.isArray;

function shadowAssign(state, keyPath, value) {
  if (isArray(state)) {
    const result = state.slice(0);
    result[keyPath] = value;
    return result;
  }

  if (isMap(state)) {
    return new Map(state).set(keyPath, value);
  }

  return { ...state, [keyPath]: value };
}

function baseUpdate(state, keyPath, updater) {
  const origin = isMap(state) ? state.get(keyPath) : state[keyPath];
  const value = updater(origin);

  return value === origin ? state : shadowAssign(state, keyPath, value);
}

function initKeyPath(key, value) {
  if (Number.isInteger(key)) {
    const result = [];
    result[key] = value;
    return result;
  }

  return { [key]: value };
}

function baseUpdateIn(state, keyPath, updater) {
  let index = -1;
  let lastItem;
  const pathState = [state];
  const pathLength = keyPath.length;

  while (++index < pathLength) {
    const currKeyPath = keyPath[index];
    const parent = pathState[index];
    const cursor = isMap(parent) ? parent.get(currKeyPath) : parent?.[currKeyPath];
    if (index === pathLength - 1) {
      lastItem = cursor;
    } else {
      pathState.push(cursor);
    }
  }

  const value = updater(lastItem);

  if (lastItem === value) {
    return state;
  }

  let result = value;
  let resultIndex = pathLength;

  // reverse order
  while (resultIndex-- > 0) {
    const origin = pathState[resultIndex];
    const currKeyPath = keyPath[resultIndex];
    const current = origin !== undefined
      ? shadowAssign(origin, currKeyPath, result)
      : initKeyPath(currKeyPath, result);
    result = current;
  }
  return result;
}

export const $set = (state, keyPath, value) => {
  return baseUpdate(state, keyPath, () => value);
};

export const $setIn = (state, keyPath, value) => {
  return baseUpdateIn(state, keyPath, () => value);
};

export const $merge = (state, values) => {
  if (isArray(state)) {
    return Object.assign([], state, values);
  }
  return { ...state, ...values };
};

export const $mergeIn = (state, keyPath, values) => {
  return baseUpdateIn(state, keyPath, (prev) => $merge(prev, values));
};

export const $update = baseUpdate;

export const $updateIn = (state, keyPath, updater) => {
  return baseUpdateIn(state, keyPath, updater);
};

export const $delete = (state, keyPath) => {
  if (isArray(state)) {
    if (isArray(keyPath)) {
      return state.filter((n, i) => !keyPath.includes(i));
    } else {
      return $splice(state, keyPath, 1);
    }
  }

  if (isMap(state)) {
    const result = new Map(state);
    if (isArray(keyPath)) {
      keyPath.forEach((key) => {
        result.delete(key);
      });
    } else {
      result.delete(keyPath);
    }
    return result;
  }

  const result = {};
  const keys = Object.keys(state);
  keys.forEach((key) => {
    if (isArray(keyPath) ? !keyPath.includes(key) : keyPath !== key) {
      result[key] = state[key];
    }
  });
  return result;
};

export const $push = (state, ...values) => {
  return state.concat(values);
};

export const $pop = (state) => {
  return state.slice(0, -1);
};

export const $shift = (state) => {
  return state.slice(1);
};

export const $unshift = (state, ...values) => {
  return values.concat(state);
};

export const $splice = (state, start, deleteCount, ...values) => {
  const next = [...state];
  next.splice(start, deleteCount, ...values);
  return next;
};
