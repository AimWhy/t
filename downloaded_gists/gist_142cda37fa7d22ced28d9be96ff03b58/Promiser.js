/*
Using Es6 Proxies, I created an object that can resolve promises from a chained object accessor pattern. 
simply await the values, or supply a callback to .then() and watch the magic. 
*/

Symbol.queue = Symbol("queue"); //using Symbols to hide properties from being used or altered
Symbol.data = Symbol("data");
function Promiser( obj ) {
    return new Proxy(obj, {
        get(target, prop){
            var new_prop = false;
            if(prop == "then" && this[Symbol.queue]){ //if "then" is accessed, and there is something in the queue
                let resolve = this[Symbol.queue];
                let promise = resolve[1]((data)=>{
                        let obj = this[Symbol.data] //resolved data from last promise
                        obj[resolve[0]] = data;
                        return new Promise((res,rej)=>{
                            this[Symbol.data] = {}; //erase data
                            delete this[Symbol.queue];//erase queue
                            res(obj);//resolve then
                            if(obj)
                                Object.assign(target, obj ); //Assign resolved values to the proxy target, so that promise wont have to be called again.
                        })
                });
                let then = promise.then.bind(promise);
                return then;
    
            }
            let promise;
            if(target[prop] instanceof Promise == false && prop !== "then"){ //if the prop is not "then" or a promise. (a real value)
                if(this[Symbol.queue]){ //if there is a queue
                    let resolve = this[Symbol.queue], obj = this[Symbol.data];
                    promise = resolve[1]((data)=>{ //resolve last promise
                        obj[resolve[0]] = data;
                        return new Promise((res,rej)=>{ //create immediately resolving promise with value
                            res(target[prop])
                        })
                    });
                    promise = promise.then.bind(promise); //bind to keep this
                }else{
                    promise = new Promise((res,rej)=>{ //else simply create a new promise with value
                            res(target[prop])
                    })
                    promise = promise.then.bind(promise);
                }
            }
            if(this[Symbol.queue]){ //if  it is a promise and there is a queue
                let resolve = this[Symbol.queue], obj = this[Symbol.data];
                promise = resolve[1]((data)=>{ //resolve last promise
                    obj[resolve[0]] = data;
                    return target[prop]; //return this promise
                });
                promise = promise.then.bind(promise); //bind
            }
            else if (!promise) {
                this[Symbol.data] = {}; //if there after all the alternations, there is still no promise, erase the data. start from scratch.
                promise = target[prop].then.bind(target[prop]);
            }
            this[Symbol.queue] = [ prop, promise ]; //supply the promise and the property.
            //all alternations ensure that no matter what the value, a promise is always given which must be resolved.
            return new Proxy(target, this);
        }
    })
}

var obj = Promiser({
    a: new Promise((res,rej)=>setTimeout(()=>res(1), 1300)),
    b: new Promise((res,rej)=>setTimeout(()=>res(2), 1300)),
    c: new Promise((res,rej)=>setTimeout(()=>res(3), 1300)),
    d:1,
    e:2,
    f:3,
});


console.log( await obj.a.b.c.f.e ); //prints { a:1, b:2, c:3, f:3, e:2 } 