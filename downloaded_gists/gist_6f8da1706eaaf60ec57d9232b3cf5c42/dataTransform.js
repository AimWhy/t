const _Retain_ = Symbol.for("retain");

const _Remove_ = Symbol.for("remove");

const Value = (v) => () => v;

const concatPath = (a, b) => a + ((a === "" || b === "") ? "" : ".") + b;

const recordData = (data, recordMap = {}, path = "") => {
  recordMap[path] = data;

  if (!data) {
    return recordMap;
  }

  if (Array.isArray(data) || typeof data === "object") {
    const keys = Object.keys(data);
    for (const k of keys) {
      const subPath = concatPath(path, k);
      recordData(data[k], recordMap, subPath);
    }
  }

  return recordMap;
};

const genPatternData = RecordMap => {
  return function genInnerData(pattern, path = "", referBase = "") {
    if (typeof pattern === "string") {
      const realPath = (pattern.startsWith("#") ? pattern.slice(1) : concatPath(referBase, pattern));
      return RecordMap[realPath];
    }

    if (typeof pattern === "function") {
      return pattern(RecordMap, path, referBase);
    }

    if (Array.isArray(pattern)) {
      return pattern.map((item, index) => genInnerData(item, concatPath(path, index), referBase));
    }

    if (pattern && typeof pattern === "object") {
      const result = {};
      const keys = Object.keys(pattern);

      for (const key of keys) {
        let realKey = key;
        let referPath = referBase;
        let subPattern = pattern[key];
        let overwrite = _ => _;
        const arrMath = key.match(/^(.+)\[(.+)\]$/);
        const objMath = arrMath ? null : key.match(/^(.+)\{(.+)\}$/);

        if (arrMath || objMath) {
          realKey = arrMath ? arrMath[1] : objMath[1];
          referPath = arrMath ? arrMath[2] : objMath[2];
          overwrite = (oldPattern, data) => {
            if (Object.prototype.toString.call(oldPattern) === "[object Object]") {
              const origin = JSON.parse(JSON.stringify(data));
              const keyList = Object.keys(origin);
              const retainKeySet = new Set(_Retain_ in oldPattern ? oldPattern[_Retain_] : keyList);
              const removeKeySet = new Set(_Remove_ in oldPattern ? oldPattern[_Remove_] : []);
              const temp = {};

              keyList.forEach((k) => {
                if (retainKeySet.has(k) && !removeKeySet.has(k)) {
                  temp[k] = Value(origin[k]);
                }
              });

              return { ...temp, ...oldPattern };
            }

            return oldPattern;
          };
        }

        if (arrMath) {
          result[realKey] = RecordMap[referPath].map((item, index) => {
            const newPattern = overwrite(subPattern, item);
            return genInnerData(newPattern, concatPath(path, `${realKey}.${index}`), concatPath(referPath, index));
          });
        } else {
          const newPattern = overwrite(subPattern, RecordMap[referPath]);
          result[realKey] = genInnerData(newPattern, concatPath(path, realKey), referPath);
        }
      }

      return result;
    }

    return pattern;
  };
};

export function dataTransform(data, pattern) {
  const recordMap = recordData(data);
  return genPatternData(recordMap)(pattern);
}