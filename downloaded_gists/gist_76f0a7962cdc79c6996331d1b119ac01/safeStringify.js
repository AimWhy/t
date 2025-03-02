// eslint-disable-next-line @typescript-eslint/ban-types
export function isObject(obj: unknown): obj is Object {
  // The method can't do a type cast since there are type (like strings) which
  // are subclasses of any put not positvely matched by the function. Hence type
  // narrowing results in wrong results.
  return (
    typeof obj === 'object' &&
    obj !== null &&
    !Array.isArray(obj) &&
    !(obj instanceof RegExp) &&
    !(obj instanceof Date)
  );
}

export function safeStringify(obj: any): string {
  const seenMap = new Map();

  return JSON.stringify(obj, (_, value) => {
    if (isObject(value) || Array.isArray(value)) {
      if (seenMap.has(value)) {
        const result = seenMap.get(value);
        // 第 3+ 次访问
        if (result) {
          return result;
        }

        // 第 2 次访问、进行自依赖检查
        try {
          JSON.stringify(value);
          // 仅重复
          seenMap.set(value, value);
        } catch (err) {
          // 自依赖
          seenMap.set(value, '[Circular]');
        }
        return seenMap.get(value);
      } else {
        // 第 1 次访问
        seenMap.set(value, false);
      }
    }
    return value;
  });
}
