export const isPromise = (value) => {
  return (
    value instanceof Promise ||
    ((typeof value === "object" || typeof value === "function") &&
      typeof value.then === "function" &&
      typeof value.catch === "function")
  );
};

const ensureError = (error) => {
  if (error instanceof Error) {
    return error;
  } else if (typeof error === "string") {
    return new Error(error);
  }

  try {
    return new Error(JSON.stringify(error));
  } catch (err) {
    return new Error(`settle-it failed to convert`);
  }
};

export const settle = (value, fallback) => {
  const getDefaultValue = (err) => {
    return typeof fallback === "function" ? fallback(err) : fallback;
  };

  try {
    const unwrappedValue = typeof value === "function" ? value() : value;
    if (isPromise(unwrappedValue)) {
      return new Promise((resolve) => {
        return unwrappedValue
          .then((value) => {
            resolve([value, void 0]);
          })
          .catch((err) => {
            const ensured = ensureError(err);
            resolve([getDefaultValue(ensured), ensured]);
          });
      });
    }
    return [unwrappedValue, void 0];
  } catch (err) {
    const ensured = ensureError(err);
    return [getDefaultValue(ensured), ensured];
  }
};
