function p(...data) {
  const literals = data[0];
  const result = [];
  let i = 0;
  let logicVal = true;

  while (i < literals.length) {
    let literal = literals[i];
    if (logicVal) {
      const logicType = typeof logicVal;
      if (logicType === 'boolean') {
        result.push(literal);
      } else if (Array.isArray(logicVal)) {
        literal = logicVal.map((item, index) => {
          if (item) {
            item.$idx = index;
            item.$arr = logicVal;
          }
          return p2(`\${item}${literal}`, { item })
        });
        result.push(...literal);
      } else if (logicType === 'object') {
        literal = Object.keys(logicVal).reduce(function (acc, key) {
          return acc.replaceAll(key, logicVal[key]);
        }, literal);
        result.push(literal);
      } else {
        result.push(logicVal);
        result.push(literal);
      }
    }
    i = i + 1;

    if (i < data.length) {
      logicVal = data[i];
    }
  }

  return result.join('');
}

function p2(str, others) {
  let parms = Object.keys(others);
  let values = parms.map(k => others[k]);
  parms.unshift('p');
  values.unshift(p);
  return (new Function(parms.toString(), 'return p`' + str + '`;'))(...values);
}