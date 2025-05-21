function toChinese(str) {
    const parts = String(str).split(/(?=(?:.{4})+$)/g);
    const digits = '零一二三四五六七八九';
    const units = ['', '万', '亿', '兆', '京'];
    const unitDigits = ['', '十', '百', '千'];
    const len = parts.length - 1;
    const trim0 = s => s.replace(/零[十百千万亿兆京]/g, '零')
        .replace(/零+/, '零').replace(/零+$/, '') || '零';

    const result = parts.map(part => {
        let item = '', l = part.length;
        for (let i = 0; i < l; i++) {
            item = item + digits[part[i]] + unitDigits[l - i - 1];
        }
        return trim0(item);
    }).map((part, index) => part += units[len - index]).join('');

    return trim0(result);
}
console.log(toChinese(10000000001));

