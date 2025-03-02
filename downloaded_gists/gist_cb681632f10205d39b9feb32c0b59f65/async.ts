type AsyncCheckArrLimit = <T>(
  array: T[],
  testFn: (value: T, index: number, a: T[]) => Promise<boolean> | boolean,
  limit?: number
) => Promise<boolean>;

const everySeries: AsyncCheckArrLimit = async (array, testFn) => {
  for (let i = 0; i < array.length; i++) {
    try {
      const result = await testFn(array[i], i, array);
      if (!result) {
        return result;
      }
    } catch (e) {
      console.warn(e);
      return false;
    }
  }

  return true;
};

const everyLimit: AsyncCheckArrLimit = (array, testFn, limit = 1) => {
  return new Promise((resolve) => {
    let count = array.length;
    if (count === 0) {
      resolve(true);
    }

    let index = 0;
    const send = () => {
      const i = index++;
      if (i < array.length) {
        const P = new Promise((res) => {
          const result = testFn(array[i], i, array);
          res(result);
        });

        P.then((result) => (!result ? resolve(false) : null))
          .catch((e) => (console.warn(e), resolve(false)))
          .finally(() => (--count <= 0 ? resolve(true) : send()));
      }
    };

    const len = Math.min(array.length, Math.max(limit, 1));
    for (let i = 0; i < len; i++) {
      send();
    }
  });
};

const every: AsyncCheckArrLimit = (array, testFn) => everyLimit(array, testFn, Infinity);

const someSeries: AsyncCheckArrLimit = async (array, testFn) => {
  for (let i = 0; i < array.length; i++) {
    try {
      const result = await testFn(array[i], i, array);
      if (result) {
        return result;
      }
    } catch (e) {
      console.warn(e);
    }
  }

  return false;
};

const someLimit: AsyncCheckArrLimit = (array, testFn, limit = 1) => {
  return new Promise((resolve) => {
    let count = array.length;
    if (count === 0) {
      resolve(true);
    }

    let index = 0;
    const send = () => {
      const i = index++;
      if (i < array.length) {
        const P = new Promise((res) => {
          const result = testFn(array[i], i, array);
          res(result);
        });

        P.then((result) => (result ? resolve(true) : null))
          .catch((e) => console.warn(e))
          .finally(() => (--count <= 0 ? resolve(false) : send()));
      }
    };

    const len = Math.min(array.length, Math.max(limit, 1));
    for (let i = 0; i < len; i++) {
      send();
    }
  });
};

const some: AsyncCheckArrLimit = (array, testFn) => someLimit(array, testFn, Infinity);

export const async = { every, everySeries, everyLimit, some, someSeries, someLimit };
