import functionExecutor from '@/utils/functionExecutor';
import { createHtmlTagObject, formatScripts8StylesTagAlias, renderHtmlTagObjectsToFragment, renderHtmlTagObjectToHtmlElement, } from '@/utils/htmlTag';
import heap from '../Heap';

export class Hook {
  constructor() {
    this.tap = (tasks) => {
      tasks instanceof Array ? this.tasks.push(...tasks) : this.tasks.push(tasks);
    };

    this.call = (args) => {
      return this.tasks.reduce((preReturn, task) => {
        return preReturn.then((data) => task(args, data));
      }, Promise.resolve(args));
    };
    
    this.tasks = [];
  }
}

export var MagicHooks;
(function (MagicHooks) {
  MagicHooks["beforeOptionsInit"] = "beforeOptionsInit";
  MagicHooks["alterHTMLTags"] = "alterHTMLTags";
  MagicHooks["beforeElementDefinition"] = "beforeElementDefinition";
})(MagicHooks || (MagicHooks = {}));

export var AliasTagTypes;
(function (AliasTagTypes) {
  AliasTagTypes["scripts"] = "scripts";
  AliasTagTypes["styles"] = "styles";
})(AliasTagTypes || (AliasTagTypes = {}));

export class CustomElementType extends HTMLElement {
}

export default class LifeCycle {
  constructor(magicInput) {
    this.hooks = {};

    this.componentBuilder = () => customElements.define(this.name, this.customElement);

    this.run = () => {
      const runHook = new Hook();
      runHook.tap([this.generateModule, this.formatAliasTagTypes, this.defineCustomElement]);
      return runHook.call();
    };

    this.generateModule = () => {
      return this.hooks.beforeOptionsInit.call(this).then(() => Promise.resolve(functionExecutor(this.magicInput.module, this.name, this.options)).then((moduleObj) => {
        this.module = moduleObj;
      }));
    };

    this.formatAliasTagTypes = () => {
      const { options } = this;
      Object.values(AliasTagTypes).forEach((tag) => {
        options[tag] = options[tag]?.map((item) => formatScripts8StylesTagAlias(tag, item)) || [];
      });
      return this.hooks.alterHTMLTags.call(this);
    };

    this.buildFragment = () => {
      const { options } = this;
      const renderHtmlTags = (options.htmlTags || []).concat(...Object.values(AliasTagTypes).map((tagType) => options[tagType]));
      const htmlTagFragment = renderHtmlTagObjectsToFragment(renderHtmlTags);
      const contentWrapper = renderHtmlTagObjectToHtmlElement(createHtmlTagObject('div', {
        id: 'magic-wrapper',
        style: 'height: 100%; width: 100%;',
      }));
      htmlTagFragment.appendChild(contentWrapper);
      return {
        htmlTagFragment,
        contentWrapper,
      };
    };

    this.defineCustomElement = () => {
      this.customElement = this.generateCustomElement();
      return this.hooks.beforeElementDefinition.call(this).then(this.componentBuilder);
    };

    this.generateCustomElement = () => {
      const { options, module, buildFragment } = this;
      return class CustomElement extends CustomElementType {
        constructor() {
          super();
          this.attributesObj = {};
          this.webComponentsIns = options.shadow ? this.attachShadow({ mode: 'open' }) : this;
          module.bootstrap && module.bootstrap(this);
        }
        // for attributeChangedCallback
        static get observedAttributes() {
          return Object.keys(options.propTypes || {});
        }
        connectedCallback() {
          const { contentWrapper, htmlTagFragment } = buildFragment();
          this.contentWrapper = contentWrapper;
          this.htmlTagFragment = htmlTagFragment;
          this.webComponentsIns.appendChild(this.htmlTagFragment);
          module.mount(this.contentWrapper, this.attributesObj, this);
        }
        disconnectedCallback() {
          module.unmount && module.unmount(this, this.contentWrapper);
        }
        attributeChangedCallback(attributeName, _oldValue, newValue) {
          const oldAttributesObj = {
            ...this.attributesObj,
          };
          const propsValue = heap.getPropsValue(attributeName, newValue, options.propTypes);
          const prevValue = this.attributesObj[attributeName];
          this.attributesObj[attributeName] = propsValue;
          (attributeName in oldAttributesObj ? module.updated : module.firstUpdated)?.(attributeName, propsValue, this.contentWrapper, this.attributesObj, this, prevValue);
        }
      };
    };

    this.magicInput = magicInput;
    this.name = this.magicInput.name;
    this.options = this.magicInput.options;

    const hooks = Object.values(MagicHooks);
    hooks.forEach((hook) => {
      this.hooks[hook] = new Hook();
    });

    const plugins = this.options.plugins || [];
    plugins.forEach((plugin) => {
      plugin.apply(this)
    });
  }
}