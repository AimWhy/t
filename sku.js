const data = {
    '颜色': ['黑', '白', '蓝', '紫'],
    '产地': ['a', 'b', 'c', 'd'],
    '大小': ['超大', '大号', '小号', '超小']
};

function generateSKUList(obj) {
    const keys = Object.keys(obj);
    return keys.reduce((acc, key) => {
        const values = obj[key];
        if (acc.length === 0) {
            return values.map(value => ({ [key]: value }));
        }
        const newAcc = [];
        acc.forEach(item => {
            values.forEach(value => {
                newAcc.push({ ...item, [key]: value });
            });
        });
        return newAcc;
    }, []);
}

const skuList = generateSKUList(data);
console.log(skuList);