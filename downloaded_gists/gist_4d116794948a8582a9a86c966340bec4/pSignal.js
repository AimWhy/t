function createAbortErrorClass() {
  if (typeof DOMException === "undefined") {
    return class AbortError extends Error {
      constructor(message) {
        super(message ?? "The operation was aborted.");
        this.name = "AbortError";
      }
    };
  }

  return class AbortError extends DOMException {
    constructor(message) {
      super(message ?? "The operation was aborted.", "AbortError");
    }
  };
}

export const AbortError = createAbortErrorClass();

export const isAbortError = (value) => {
  if (typeof DOMException === "undefined") {
    return (
      value instanceof Error &&
      (value.name === "AbortError" || value.name === "TimeoutError")
    );
  }
  return (
    value instanceof DOMException &&
    (value.name === "AbortError" || value.name === "TimeoutError")
  );
};

export default async function pSignal(signal, value) {
  const unwrappedValue = typeof value === "function" ? value() : value;

  if (signal === void 0) {
    return await unwrappedValue;
  }

  if (signal.aborted) {
    throw new AbortError();
  }

  class AbortedValue {}

  let removeAbortListener = () => {};

  const abortPromise = new Promise((resolve) => {
    const onAbort = () => resolve(new AbortedValue());
    signal.addEventListener("abort", onAbort);
    removeAbortListener = () => signal.removeEventListener("abort", onAbort);
  });
  let result;

  try {
    result = await Promise.race([abortPromise, unwrappedValue]);
  } catch (err) {
    removeAbortListener();
    throw err;
  }
  removeAbortListener();

  if (result instanceof AbortedValue) {
    throw new AbortError();
  }

  return result;
}
