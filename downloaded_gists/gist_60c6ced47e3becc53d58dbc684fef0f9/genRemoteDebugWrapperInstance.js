'use strict';
const Webpack = require("webpack");
const ConcatSource = require("webpack-sources").ConcatSource;
const ModuleFilenameHelpers = require("webpack/lib/ModuleFilenameHelpers");
const { RemoteDebugWrapperRuntimeModule, penddingDeclare, wrapPrefix, wrapSuffix } = require('./WrapperRuntimeModule');
const { ipcSetup } = require('#build-system/webpak/utils/ipc');
const { AsyncQueueSetup } = require('#build-system/webpak/utils/AsyncQueue');
const { loadScript } = require('#build-system/webpak/utils/loadScript');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { RuntimeGlobals } = Webpack;
const ExternalModule = require("webpack/lib/ExternalModule");

/**
 * 对编译的输出文件源码添加 阻塞逻辑的包裹
 * 同时把一些公共方法直接插入 html 顶部，减少代码体积
 * 所有阻塞逻辑都放在 window.__pendding_scope__ 下，避免冲突
 */

class WrapperModulePlugin {
  constructor(args) {
    if (typeof args !== 'object') {
      throw new TypeError('Argument "args" must be an object.');
    }

    this.header = args.hasOwnProperty('header') ? args.header : '';
    this.footer = args.hasOwnProperty('footer') ? args.footer : '';
    this.afterOptimizations = args.hasOwnProperty('afterOptimizations') ? !!args.afterOptimizations : false;
    this.test = args.hasOwnProperty('test') ? args.test : '';
  }

  apply(compiler) {
    const header = this.header;
    const footer = this.footer;
    const tester = { test: this.test };

    const wrapChunks = (compilation, footer, header) => {
      const chunks = compilation.chunks;

      const moduleIdSet = new Set();
      const moduleArr = [...compilation.modules];

      for (let module of moduleArr) {
        if (module instanceof ExternalModule || !module.rawRequest) {
          continue;
        }

        const moduleInNodeModules = module.resource && module.resource.includes('node_modules');

        if (moduleInNodeModules) {
          let tempModule = module;
          let pIssuer;
          while ((pIssuer = compilation.moduleGraph.getIssuer(tempModule)) && pIssuer.resource && pIssuer.resource.includes('node_modules')) {
            tempModule = pIssuer;
          }
          const tempModuleId = compilation.chunkGraph.getModuleId(tempModule);

          moduleIdSet.add(tempModuleId);
        }
      }
      const moduleIdArr = [...moduleIdSet];

      for (const chunk of chunks) {
        /** Skip already rendered (cached) chunks to avoid rebuilding unchanged code. */
        // if (!chunk.rendered) {
        //   continue;
        // }

        for (const fileName of chunk.files) {
          if (ModuleFilenameHelpers.matchObject(tester, fileName)) {
            const headerContent = (typeof header === 'function') ? header({
              compilation,
              chunk,
              fileName,
              moduleIdArr
            }) : header;
            const footerContent = (typeof footer === 'function') ? footer({
              compilation,
              chunk,
              fileName,
              moduleIdArr
            }) : footer;

            compilation.assets[fileName] = new ConcatSource(
              String(headerContent),
              compilation.assets[fileName],
              String(footerContent),
            );
          }
        }
      }
    }


    /** 
     * 避免和线上 module 重名 
     * antd 在入口请求时添加映射  修改拦截器逻辑
     * 需要在用户页面有个勾选线上 入库 moduleId 的弹窗 
     * ModuleName 相同, 来创建映射关系
     * */

    compiler.hooks.compilation.tap('WrapperRemoteModule', (compilation, { normalModuleFactory }) => {

      // 添加 module 方法定义获取的拦截器
      compilation.hooks.additionalTreeRuntimeRequirements.tap("WrapperRemoteModule", (chunk, runtimeRequirements) => {
        runtimeRequirements.add(RuntimeGlobals.interceptModuleExecution);
        runtimeRequirements.add(RuntimeGlobals.moduleCache);
        compilation.addRuntimeModule(
          chunk,
          new RemoteDebugWrapperRuntimeModule()
        );
      });

      // 对 Module 方法定义的包裹逻辑
      compilation.hooks.processAssets.tapAsync('WrapperRemoteModule', (assets, done) => {
        wrapChunks(compilation, footer, header);
        done();
      });

      // 插入公共的功能方法 ipc、loadScript 等
      HtmlWebpackPlugin.getHooks(compilation).afterTemplateExecution.tap('insertWrapperCommonJS', (htmlPluginData) => {
        const htmlStr = htmlPluginData.html.toString();
        htmlPluginData.html = htmlStr.replace(/<head>/, `
          <head>
          <script>
            window.__pendding_scope__ = window.__pendding_scope__ || {};
            window.__pendding_scope__.ipc = (${ipcSetup.toString()})();
            window.__pendding_scope__.AsyncQueue = (${AsyncQueueSetup.toString()})();
            window.__pendding_scope__.loadScript = ${loadScript.toString()};
          </script>
          <script>${penddingDeclare()}</script>
        `)
      })
    });
  }
}

/**
 * 提供一个工厂方法直接生成实例
 * 参数比较确定、由外部提供还需要理解 chunk 的一些内容
 * 简化使用方式
 */
function genRemoteDebugWrapperInstance() {
  return new WrapperModulePlugin({
    header: function ({ compilation, chunk, fileName, moduleIdArr }) {
      if (!chunk.canBeInitial()) {
        return '';
      }

      let chunkInfo = {
        id: chunk.id,
        name: chunk.name,
        fileName,
        // hasAsyncChunks: chunk.hasAsyncChunks(),
        moduleIdArr,
        includes: compilation.chunkGraph.getChunkModules(chunk).reduce(function (acc, item) {
          if (item.rawRequest) {
            let moduleId = compilation.chunkGraph.getModuleId(item);
            moduleId && acc.push(moduleId);
          }
          return acc;
        }, [])
      };

      return wrapPrefix(chunkInfo);
    },

    footer: function ({ chunk }) {
      if (!chunk.canBeInitial()) {
        return '';
      }
      return wrapSuffix();
    }
  })
}

module.exports = genRemoteDebugWrapperInstance
