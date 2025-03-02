const Webpack = require("webpack");
const RuntimeModule = require("webpack/lib/RuntimeModule.js");
const { RuntimeGlobals } = Webpack;
const OuterModuleMapName = '__webpack_modules_outer__';

/**
 * webpack 执行 require 前的拦截逻辑， 可在此时替换 npm Module 的定义方法
 * 由于在入口处替换，其内部依赖的 npm ModueId 也会变成本地的
 * 这也是为什么我们要按照入口、把相关依赖文件 输出到一个文件下的原因
 */
class RemoteDebugWrapperRuntimeModule extends RuntimeModule {
  constructor() {
    super("module replacement", RuntimeModule.STAGE_BASIC);
  }
  generate() {
    return `
    $interceptModuleExecution$.push(function (options) {
      if(typeof ${OuterModuleMapName} !== 'undefined' && ${OuterModuleMapName}[options.id]){
        options.factory = ${OuterModuleMapName}[options.id];
      }
    })
    `.replace(
      /\$interceptModuleExecution\$/g,
      RuntimeGlobals.interceptModuleExecution
    )
  }
}

/**
 * 阻塞自运行逻辑 [生成消费者模式]
 * 前一个阻塞 resolve 时自动执行，并把上一个的返回值传进来供消费
 * 这里只对非异步脚本添加了阻塞逻辑 【足够用了】
 * 注： 异步脚本阻塞会影响其取值，因为它 <script> 完成后就去从scope中拿值了，
 * 用 promise 阻塞、 要修改源码中的拿值方式 【也不太好改】
 */
function initPenddingScopeSetup() {
  ;
  window.__pendding_scope__ = Object.assign({
    isRunning: false,
    nameInfo: null,
    penddingQueue: null,
    syncModuleMap: [],
  }, (window.__pendding_scope__ || {}));

  window.__pendding_scope__.penddingQueue = new window.__pendding_scope__.AsyncQueue();

  (function loopGet(lastValue) {
    window.__pendding_scope__.penddingQueue.get().then(function (currentValue) {
      var result = typeof currentValue === 'function'
        ? currentValue(lastValue)
        : currentValue;
      
      return result;
    }).then(loopGet);
  })();
  ;
}

/**
 * 用 js 的方式写代码，方便编辑器提示错误， 
 * unWrapperFunction 在拿到 function 的方法体[字符串]
 * 使用编辑器的提示能力，更好发现问题
 */
function unWrapperFunction(fun) {
  return Function.prototype.toString.call(fun).replace(/(^.*\{|\}.*$|\n\s*)/g, '');
}

/**
 * 把源文件内容用 window.__pendding_scope__.penddingQueue.put([content]) 进行包裹
 * 实现脚本代码的阻塞执行、增加参数 __webpack_modules_outer__， 代表阻塞拿到的值： npm Module 的定义
 * 在 webpack 内部 __require_require__ 时走拦截，先从此变量中去获取定义
 * 拦截逻辑 => 由 RemoteDebugWrapperRuntimeModule 提供
 */
function wrapPrefix(chunkInfo) {
  return `;
    window.__pendding_scope__.syncModuleMap[${JSON.stringify(chunkInfo.fileName)}] = ${JSON.stringify(chunkInfo)};

    if (!window.__pendding_scope__.nameInfo) {
      var nameInfo;
      try {
        nameInfo = JSON.parse(window.name);
      } catch (e) {
        nameInfo = {};
      }
      window.__pendding_scope__.nameInfo = nameInfo;
    }

    if (window.opener && !window.__pendding_scope__.isRunning && window.__pendding_scope__.nameInfo.token) {
      window.__pendding_scope__.isRunning = true;
      
      var data = ${JSON.stringify({
        moduleIdArr: chunkInfo.moduleIdArr
      })};
      data.token = window.__pendding_scope__.nameInfo.token;
      data.fileName = ${JSON.stringify(chunkInfo.fileName)};

      var getReplaceConfirmPromise = window.__pendding_scope__.ipc.call({
        reference: window.opener, 
        channel: 'getModuleMap', 
        data: data,
      }).then(function(response) {
        return response;
      }).catch(e => {
        console.error(e);
        return {};
      });

      window.__pendding_scope__.penddingQueue.put(getReplaceConfirmPromise);

      window.__pendding_scope__.penddingQueue.put(function(moduleInfo) {
        var npmModuleUrlMap = moduleInfo.npmModuleUrlMap;
        var SEFModuleMap = moduleInfo.SEFModuleMap;
        // 保存应用单元信息
        window.__pendding_scope__.SEFModuleMap = SEFModuleMap;

        if(npmModuleUrlMap && typeof npmModuleUrlMap === 'object' && Object.keys(npmModuleUrlMap).length > 0) {
          // 加载特定入口(及依赖)的脚本文件，返回 { moduleId: defineFunc }
          // 插入脚本标签 <script>, 映射对象放在 window 上 
          // 返回值为 Promise、 result 为 映射对象  
          return Promise.all(
            Object.values(npmModuleUrlMap).map(function(url) {
              return window.__pendding_scope__.loadScript(url);
            })
          ).then(function () {
            return window.__pendding_scope__.JSModuleDefinedMap;
          });
        }
        return {};
      });
    } else {
      window.__pendding_scope__.penddingQueue.put(window.__pendding_scope__.JSModuleDefinedMap || {})
    }

    window.__pendding_scope__.penddingQueue.put(function(${OuterModuleMapName}){
  `;
}

function wrapSuffix() {
  return `});`;
}

// 插入 window.__pendding_scope__ 声明的语句
function penddingDeclare() {
  return unWrapperFunction(initPenddingScopeSetup);
}


module.exports = {
  RemoteDebugWrapperRuntimeModule,
  penddingDeclare,
  wrapPrefix,
  wrapSuffix,
};