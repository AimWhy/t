function* iter(input, sep = '.', key = '') {
    const prefix = key === '' ? key : (key + sep);
    if (input === null || typeof input !== 'object') {
        yield [key, input]
    } else if (Array.isArray(input)) {
        for (let k = 0; k < input.length; k++) {
            yield* iter(input[k], sep, prefix + k);
        }
    } else {
        for (let k in input) {
            yield* iter(input[k], sep, prefix + k);
        }
    }
}

function flatObj(nestObjValue, sep = '.') {
    const output = {};
    for (const [key, value] of iter(nestObjValue, sep)) {
        output[key] = value;
    }
    return output;
}

function nestObj(flatValueObj, sep = '.') {
    let output;
    const empty = key => key === key ? [] : {};

    for (let k in flatValueObj) {
        const arr = k.split(sep);
        if (output === void 0) {
            output = empty(+arr[0]);
        }

        let tmp = output;
        for (let i = 0; i < arr.length - 1; i++) {
            let key = arr[i];
            tmp[key] = (key in tmp) ? tmp[key] : empty(+arr[i + 1]);
            tmp = tmp[key]
        }
        tmp[arr[arr.length - 1]] = flatValueObj[k];
    }

    return output;
}

function convert(nestObjValue, replacer, onlyOrAcc = false) {
    if (typeof replacer !== 'function') {
        const replaceMap = replacer instanceof Map ? replacer : new Map(Object.entries(replacer))
        const newReplaceMap = new Map();

        for (const [pattern, replacement] of replaceMap) {
            const patternReg = pattern instanceof RegExp ? pattern : new RegExp(pattern);
            let replacementAction = replacement;

            if (typeof replacement !== 'function') {
                const tempReplacement = Array.isArray(replacement) ? replacement : [replacement];

                replacementAction = ((p, r, key, _value, _meta) => {
                    return r.map((v) => key.replace(p, v))
                }).bind(null, patternReg, tempReplacement)
            }

            newReplaceMap.set(patternReg, replacementAction)
        }

        replacer = (key, value, meta) => {
            for (const [patternReg, replacementAction] of newReplaceMap) {
                if (patternReg.test(key)) {
                    return replacementAction(key, value, meta)
                }
            }
            return onlyOrAcc ? null : key
        }
    }

    const input = flatObj(nestObjValue);
    const newFlatObj = {};

    for (const [key, value] of Object.entries(input)) {
        let newKey = replacer(key, value, input, onlyOrAcc);
        let newKeyList = Array.isArray(newKey) ? newKey : [newKey];

        for (let i = 0; i < newKeyList.length; i++) {
            if (newKeyList[i]) {
                newFlatObj[newKeyList[i]] = value;
            }
        }
    }

    return nestObj(newFlatObj)
}

let x = [
    {
        "id": 'n1',
        "pid": null,
        "name": "根节点"
    },
    {
        "id": 'n2',
        "pid": 'n1',
        "name": "子节点1"
    },
    {
        "id": 'n3',
        "pid": 'n1',
        "name": "子节点2"
    },
    {
        "id": 'n4',
        "pid": 'n2',
        "name": "孙子节点1"
    },
    {
        "id": 'n5',
        "pid": 'n2',
        "name": "孙子节点2"
    },
    {
        "id": 'n6',
        "pid": 'n3',
        "name": "孙子节点3"
    },
    {
        "id": 'n7',
        "pid": 'n3',
        "name": "孙子节点4"
    },
    {
        "id": 'n8',
        "pid": 'n4',
        "name": "曾孙节点1"
    }
]

let y = convert(x, (k, v, m, count) => {
    const match = k.match(/^(\d+)\./)
    if (match) {
        const id = m[`${match[1]}.id`]
        const pid = m[`${match[1]}.pid`]
        if (!pid) {
            return k.replace(match[1], id)
        }

        if (!count.has(pid)) {
            count.set(pid, new Set())
        }
        count.get(pid).add(id)

        return [
            k.replace(match[1], id),
            k.replace(match[1], `${pid}.children.${count.get(pid).size - 1}`),
        ]
    }
}, new Map())
console.dir(y)