export const mySlice = (str, pStart, pEnd = str.length) => {
  let result = ''; // 结果信息
  let pIndex = 0; // 码点索引
  let cIndex = 0; // 码元信息

  while (pIndex < pEnd && cIndex < str.length) {
    let charPoint = str.codePointAt(cIndex);

    if (pIndex >= pStart) {
      result += String.fromCodePoint(charPoint);
    }

    pIndex += 1;
    cIndex += charPoint > 0xffff ? 2 : 1;
  }

  return result;
};