function getDataLevel(data) {
  let queue = [data];
  let result = 0;
  let temp = [];

  while (queue.length) {
    let item = queue.shift();
    let keys = Object.keys(item);

    for (let k of keys) {
      if (item[k] && typeof item[k] === 'object') {
        temp.push(item[k]);
      }
    }

    if (!queue.length) {
      result += 1;
      queue = temp;
      temp = [];
    }
  }

  return result;
}
