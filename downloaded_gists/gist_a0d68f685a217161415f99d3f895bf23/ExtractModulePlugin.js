'use strict';
const fs = require('fs');
const JavascriptModulesPlugin = require("webpack/lib/javascript/JavascriptModulesPlugin");
const ExternalModule = require("webpack/lib/ExternalModule");
const HtmlWebpackPlugin = require('html-webpack-plugin');

/**
 * 此插件在 SEF-Module npm start 时使用， 
 * 把自身可调试的  npm Modules 塞到了 html 中， window.__moduleIdMap__ => ModuleId: jsFile
 * 当 debugbox[app] 发消息过来时、  会带有 debugbox 上的 npm Modules，
 * 本地弹框取两集合交集 让开发者 选择要调试的 npm Modules、 响应给 debugbox
 * debugbox 在使用  Promise <script 来加载本地生成的文件 jsFile
 */
class ExtractModulePlugin {
  constructor() {
    /* 写文件时用 */
    this.tempMap = { main: { _file: 'main.js' } };

    /* moduleId To file */
    this.moduleIdMap = {};

    this.timer = null;
  }

  apply(compiler) {
    compiler.hooks.compilation.tap('ExtractPlugin', (compilation, { normalModuleFactory }) => {
      // 重命名 Module Name
      compilation.hooks.optimizeModuleIds.tap("ReNamedModuleIdsPlugin", modules => {
        Array.from(modules).forEach(module => {
          const origName = compilation.chunkGraph.getModuleId(module);
          /**
           * 修改 ModuleId, 添加前缀 ./local/ 与 debugbox 上的 ModuleId 进行分辨
           */
          if (origName) {
            compilation.chunkGraph.setModuleId(module, `./local/${origName}`);
          }
        });
      })


      // 输出 Module 方法定义到文件
      const hooks = JavascriptModulesPlugin.getCompilationHooks(compilation);
      hooks.renderModulePackage.tap("GenLocalModulePlugin", (source, module, { runtimeTemplate, chunkGraph }) => {
        if (module instanceof ExternalModule || !module.rawRequest) {
          return;
        }

        const content = source.source();
        const moduleId = chunkGraph.getModuleId(module);
        const moduleInNodeModules = module.resource && module.resource.includes('node_modules');

        if (moduleInNodeModules) {
          let tempModule = module;
          let pIssuer;
          while ((pIssuer = compilation.moduleGraph.getIssuer(tempModule)) && pIssuer.resource && pIssuer.resource.includes('node_modules')) {
            tempModule = pIssuer;
          }
          const tempModuleId = chunkGraph.getModuleId(tempModule);
          // 文件名太长 fs.writeFileSync 会报错， 这里进行截取
          const fileName = tempModuleId.replace(/[<>:"/\\|?*\u0000-\u001F]/g, '!').slice(-100);

          this.tempMap[tempModuleId] = this.tempMap[tempModuleId] || {
            _file: `${fileName}.js`
          }
          this.tempMap[tempModuleId][moduleId] = content;
          this.moduleIdMap[tempModuleId] = fileName;
        } else {
          this.tempMap.main[moduleId] = content;
          this.moduleIdMap[moduleId] = 'main.js';
        }

        /**
         * 每个 Moduld 生成是都会触发
         * 按 npm Moduld 的入口把相关 Module 放在一个文件里
         * 按开发人员的勾选来加载响应的 文件
         * 避免频繁写文件 [大概 4800个 Module], 这里用 setTimeout 来延迟写文件 [防抖]
         */

        this.timer && clearTimeout(this.timer);

        this.timer = setTimeout(() => {
          Object.keys(this.tempMap).forEach(file => {
            const isExists = fs.existsSync('./node_modules/.localModule');
            if (!isExists) {
              fs.mkdirSync('./node_modules/.localModule', { recursive: true });
            }
            const group = this.tempMap[file];

            fs.writeFileSync(
              `./node_modules/.localModule/${group._file}`,
              `
                window.__pendding_scope__ = window.__pendding_scope__ || {};
                window.__pendding_scope__.JSModuleDefinedMap = window.__pendding_scope__.JSModuleDefinedMap || {};
                Object.assign(
                  window.__pendding_scope__.JSModuleDefinedMap,
                  {
                    ${Object.keys(group).map(k => `${JSON.stringify(k)}: ${group[k]}`).join(',')}
                  }
                );
              `
            );
          })
        }, 1000)

      });

      /**
       * 把本地的 ModuleId : jsFile 的映射字典写入到 html 中
       * 选择要调试的 npm Module 时需与 debugbox 传过来的 npm Modules 
       * 做集合的交集处理后，在提供弹窗勾选的能力
       */
      HtmlWebpackPlugin.getHooks(compilation).afterTemplateExecution.tap('outputModuleIdMap', (htmlPluginData) => {
        const htmlStr = htmlPluginData.html.toString();
        htmlPluginData.html = htmlStr.replace(/<head>/, `
          <head>
          <script>
            window.__moduleIdMap__ = ${JSON.stringify(this.moduleIdMap)};
          </script>
        `)
      })
    });
  }
}

module.exports = ExtractModulePlugin
