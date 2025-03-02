export const logic = {
  context: { sum: 0, funQueue: [] },
  regist: function (...callbacks) {
    logic.context.sum = logic.context.sum + 1;
    logic.context.funQueue.push(callbacks);
  },
  run: function (index, params) {
    if (logic.context.sum === 0) {
      const funs = logic.context.funQueue.pop();
      
      if (typeof funs[index] === 'function') {
        funs[index](params);
      }
      
      // 可以 reject 之前的，或者其他逻辑
      logic.context.funQueue.map(callbacks => {
        callbacks[1]('[skip]');
      });
      
      logic.context.funQueue.length = 0;
    } else {
      logic.context.sum = logic.context.sum - 1;
    }
  }
}

export function wrapPromise(promise) {
  logic.context.sum = logic.context.sum + 1;
  
  return new Promise((resolve, reject) => {
    logic.regist(resolve, reject);
    
    promise.then(result => {
      logic.run(0, result);
    }).catch(error => {
      logic.run(1, error);
    })
  })
}
