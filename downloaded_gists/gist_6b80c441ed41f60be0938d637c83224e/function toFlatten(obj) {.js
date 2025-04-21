function toFlatten(obj) {
    const result = [null];
    const map = new Map();
    const getVal = (v) => {
        const type = typeof v;
        if (null === v || ('object' !== type && 'string' !== type)) {
            return v;
        }

        if (map.has(v)) {
            return map.get(v);
        }

        if ('string' === type) {
            const i = String(result.push(v) - 1);
            map.set(v, i);
            return i;
        }

        const item = Array.isArray(v) ? [] : {};
        const index = String(result.push(item) - 1);
        map.set(v, index);

        for (const key in v) {
            if (v.hasOwnProperty(key)) {
                item[key] = getVal(v[key]);
            }
        }

        return index;
    }

    result[0] = getVal(obj);
    return result;
}

function fromFlatten(arr) {
    const set = new Set();
    const toVal = (v) => {
        const type = typeof v;

        if (null === v || ('object' !== type && 'string' !== type)) {
            return v;
        }

        if ('string' === type) {
            return (null === arr[v] || ('object' !== typeof arr[v])) ? arr[v] : toVal(arr[v]);
        }

        if (!set.has(v)) {
            set.add(v);
            for (const key in v) {
                if (v.hasOwnProperty(key)) {
                    v[key] = toVal(v[key]);
                }
            }
        }

        return v;
    }

    return toVal(arr[0]);
}

export const stringify = (value) => JSON.stringify(toFlatten(value));
export const parse = (text) => fromFlatten(JSON.parse(text));