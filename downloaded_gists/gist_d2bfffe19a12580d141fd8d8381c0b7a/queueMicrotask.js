let resolvedPromise;
export default function queueMicrotask(callback) {
  if (arguments.length < 1) {
    throw new TypeError(
      "queueMicrotask must be called with at least one argument (a function to call)"
    );
  }
  if (typeof callback !== "function") {
    throw new TypeError("The argument to queueMicrotask must be a function.");
  }
  // Try to reuse a lazily allocated resolved promise from closure.
  (resolvedPromise || (resolvedPromise = Promise.resolve()))
    .then(callback)
    .catch((error) =>
      // Report the exception until the next tick.
      setTimeout(() => {
        throw error;
      }, 0)
    );
}
