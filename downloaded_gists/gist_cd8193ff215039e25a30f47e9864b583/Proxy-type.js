//通过 Proxy 对 Proxy 本身做代理，然后赋值给 Proxy
Proxy = new Proxy(Proxy, {
  //拦截 new 操作符，生成 Proxy 实例的时候来拦截
  construct: function (target, argumentsList) {
    //result是new Proxy()生成的原本的实例
    const result = new target(...argumentsList);
    //获取原本实例reslut的类型
    const originToStringTag = Object.prototype.toString.call(result).slice(1,-1).split(' ')[1]
    //改写result的[Symbol.toStringTag]属性，加上被代理的标志
    result[Symbol.toStringTag] = 'Proxy-' + originToStringTag;
    return result;
  },
});

let a = new Proxy([],{})
//通过Object.prototype.toString.call方法获取a的类型
Object.prototype.toString.call(a)
//"[object Proxy-Array]" 达到效果，表示a是一个被代理过一次的Array

let b = new Proxy({},{})
//通过Object.prototype.toString.call方法获取b的类型
Object.prototype.toString.call(b)
//"[object Proxy-Object]" 达到效果，表示b是一个被代理过一次的Object

let c = new Proxy(function(){},{})
//通过Object.prototype.toString.call方法获取c的类型
Object.prototype.toString.call(c)
//"[object Proxy-Function]" 达到效果，表示c是一个被代理过一次的Function

//继续对a做代理，赋值给d
let d = new Proxy(a,{})
//通过Object.prototype.toString.call方法获取d的类型
Object.prototype.toString.call(d)
//"[object Proxy-Proxy-Array]" 达到效果，表示d是一个被代理过两次的Array
