function isSame(arr1, arr2) {
    if (arr1.length !== arr2.length) {
        return false;
    }
    for (let i = 0; i < arr1.length; i++) {
        if (arr1[i] !== arr2[i]) {
            return false;
        }
    }
    return true;
}
export function singleton(className) {
    let instance = null;
    let parameters;
    return new Proxy(className, {
        constructor (target, ...args) {  
            if (!instance) {
                instance = new className(...args);
                parameters = args;
            }
            if(!isSame(parameters, args)) {
                throw new Error('不能数据混了');
            }
            return instance; 
        }
    })
}