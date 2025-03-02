function fetchCount(id) {
    return new Promise(res => setTimeout(res, 5, id));
}

async function addCount(id) {
    count += await fetchCount(id)
}

async function addCount2(id) {
    let temp = await fetchCount(id)
    count += temp;
}

let count = 0;
addCount(1);
addCount(2);

setTimeout(() => {
    console.log(count);
}, 100)