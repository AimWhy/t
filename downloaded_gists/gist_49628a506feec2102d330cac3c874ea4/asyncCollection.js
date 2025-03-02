export function toCollection(generator) {
  async function* unboxIter() {
    const last = yield* generator();
    if (last !== undefined) {
      yield last;
    }
  }

  const iterable = {
    [Symbol.asyncIterator]: unboxIter,
  };

  return Object.assign(iterable, {
    flatten: () => toCollection(() => delegateGenerator(generator(), flatten)),
    filter: (predicate) => toCollection(() => filterGenerator(generator(), predicate)),
    map: (fn) => toCollection(() => mapGenerator(generator(), fn)),
    take: (count) => toCollection(() => delegateGenerator(generator(), takeFrom(count))),
    promise: () => promise(iterable),
    toMap: (selector) => asyncIterableToMap(iterable, selector),
    iterator: generator,
  });
}

async function* mapGenerator(generator, fn) {
  while (true) {
    const { value, done } = await generator.next();
    if (done) {
      return value !== undefined ? fn(value) : undefined;
    }

    if (value !== undefined) {
      yield fn(value);
    }
  }
}

async function* filterGenerator(generator, predicate) {
  while (true) {
    const { value, done } = await generator.next();

    if (value === undefined || !predicate(value)) {
      if (done) {
        break;
      }
      continue;
    }

    if (done) {
      return value;
    }

    yield value;
  }
}

async function* delegateGenerator(generator, fn) {
  while (true) {
    let last;
    const { value, done } = await generator.next();

    if (value !== undefined) {
      const delegate = fn(value, generator.return.bind(generator));

      while (true) {
        const sub = await delegate.next();

        if (sub.done) {
          break;
        }

        last = sub.value;

        if (!done) {
          yield last;
        }
      }
    }

    if (done) {
      return last;
    }
  }
}

async function* flatten(item) {
  if (isIterable(item)) {
    yield* item;
  } else {
    yield item;
  }
}

function takeFrom(count) {
  return async function* (item, ret) {
    if (--count < 0) {
      return ret();
    }
    yield item;
  };
}

function isIterable(obj) {
  return obj !== undefined && typeof obj[Symbol.iterator] === 'function';
}

async function promise(iterable) {
  const result = [];

  for await (const item of iterable) {
    result.push(item);
  }

  return result;
}

function addToMap(map, selector, item) {
  const key = typeof selector === 'function' ? selector(item) : item[selector];

  if (key) {
    if (map.has(key)) {
      throw new Error(`Duplicate key found when converting AsyncIterable to map: ${key}`);
    } else {
      map.set(key, item);
    }
  }
}

async function asyncIterableToMap(iterable, selector) {
  const result = new Map();

  for await (const item of iterable) {
    addToMap(result, selector, item);
  }

  return result;
}
