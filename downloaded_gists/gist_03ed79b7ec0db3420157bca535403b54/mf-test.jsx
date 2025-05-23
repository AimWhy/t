import React from 'react';
import ErrorBoundary from '@erxes/ui/src/components/ErrorBoundary';
import { NavItem } from 'modules/layout/components/QuickNavigation';

const useDynamicScript = (args) => {
  const [ready, setReady] = React.useState(false);
  const [failed, setFailed] = React.useState(false);

  React.useEffect(() => {
    if (!args.url) {
      return;
    }
    const element = document.createElement('script');
    element.src = args.url;
    element.type = 'text/javascript';
    element.async = true;
    setReady(false);
    setFailed(false);
    element.onload = () => {
      console.log(`Dynamic Script Loaded: ${args.url}`);
      setReady(true);
    };
    element.onerror = () => {
      console.error(`Dynamic Script Error: ${args.url}`);
      setReady(false);
      setFailed(true);
    };
    document.head.appendChild(element);
    return () => {
      console.log(`Dynamic Script Removed: ${args.url}`);
      document.head.removeChild(element);
    };
  }, [args.url]);

  return { ready, failed };
};

export const loadComponent = (scope, module) => {
  return async () => {
    // Initializes the share scope. This fills it with known provided modules from this build and all remotes
    await __webpack_init_sharing__('default');
    const container = window[scope]; // or get the container somewhere else
    // Initialize the container, it may provide shared modules
    await container.init(__webpack_share_scopes__.default);
    const factory = await window[scope].get(module);
    const Module = factory();
    return Module;
  };
};

class CustomComponent extends React.Component {
  constructor(props) {
    super(props);
    this.renderComponent = () => {
      if (!this.state.showComponent) {
        return null;
      }
      const { scope, component } = this.props;
      const Component = React.lazy(loadComponent(scope, component));
      return (
        <React.Suspense fallback="">
          <Component />
        </React.Suspense>
      );
    };
    this.state = { showComponent: false };
  }
  componentDidMount() {
    const interval = setInterval(() => {
      if (window[this.props.scope]) {
        window.clearInterval(interval);
        this.setState({ showComponent: true });
      }
    }, 500);
  }
  render() {
    if (this.props.isTopNav) {
      return <NavItem>{this.renderComponent()}</NavItem>;
    }
    return this.renderComponent();
  }
}

const PluginsWrapper = ({ itemName, callBack, plugins }) => {
  return (plugins || []).map((plugin) => {
    const item = plugin[itemName];
    if (!item) {
      return void 0;
    }
    return callBack(plugin, item);
  });
};

const renderPluginSidebar = (itemName, type, object) => {
  const plugins = window.plugins || [];
  return (
    <PluginsWrapper
      itemName={itemName}
      plugins={plugins}
      callBack={(_plugin, sections) => {
        return (sections || []).map((section) => {
          if (!window[section.scope]) {
            return null;
          }
          const Component = React.lazy(loadComponent(section.scope, section.component));
          return (
            <Component
              key={Math.random()}
              id={object._id}
              mainType={type}
              mainTypeId={object._id}
            />
          );
        });
      }}
    />
  );
};

const System = (props) => {
  if (props.loadScript) {
    const { ready, failed } = useDynamicScript({
      url: props.system && props.system.url,
    });
    if (!props.system || !ready || failed) {
      return null;
    }
  }
  const Component = React.lazy(loadComponent(props.system.scope, props.system.module));
  return (
    <ErrorBoundary pluginName={props.pluginName}>
      <React.Suspense fallback="">
        <Component />
      </React.Suspense>
    </ErrorBoundary>
  );
};

class SettingsCustomBox extends React.Component {
  constructor(props) {
    super(props);
    this.renderComponent = () => {
      if (!this.state.showComponent) {
        return null;
      }
      const { scope, component } = this.props.settingsNav;
      const Component = React.lazy(loadComponent(scope, component));
      return (
        <React.Suspense fallback="">
          <Component />
        </React.Suspense>
      );
    };
    this.load = () => {
      this.setState({ showComponent: true });
    };
    this.state = { showComponent: false };
  }
  render() {
    const { renderBox, settingsNav, color, hasComponent } = this.props;
    const box = renderBox(
      settingsNav.text,
      settingsNav.image,
      settingsNav.to,
      settingsNav.action,
      settingsNav.permissions,
      settingsNav.scope,
      color
    );
    if (settingsNav.component && hasComponent) {
      return (
        <div onClick={this.load}>
          {this.renderComponent()}
          {box}
        </div>
      );
    }
    return box;
  }
}
export const pluginsSettingsNavigations = (renderBox) => {
  const plugins = window.plugins || [];
  const navigationMenus = [];
  for (let i = 0; i < plugins.length; i++) {
    const hasComponent = Object.keys(plugins[i].exposes).includes('./settings');
    for (const menu of plugins[i].menus || []) {
      if (menu.location === 'settings') {
        navigationMenus.push(
          <React.Fragment key={menu.text}>
            <SettingsCustomBox
              settingsNav={menu}
              color={plugins[i].color}
              renderBox={renderBox}
              hasComponent={hasComponent}
            />
          </React.Fragment>
        );
      }
    }
  }
  return navigationMenus;
};
export const pluginsOfTopNavigations = () => {
  const plugins = window.plugins || [];
  const topNavigationMenus = [];
  for (const plugin of plugins) {
    for (const menu of plugin.menus || []) {
      if (menu.location === 'topNavigation') {
        topNavigationMenus.push(
          <React.Fragment key={menu.text}>
            <CustomComponent scope={menu.scope} component={menu.component} isTopNav />
          </React.Fragment>
        );
      }
    }
  }
  return topNavigationMenus;
};
export const pluginLayouts = (currentUser) => {
  const plugins = window.plugins || [];
  const layouts = [];
  for (const plugin of plugins) {
    if (plugin.layout) {
      layouts.push(
        <System
          key={Math.random()}
          loadScript={true}
          system={plugin.layout}
          currentUser={currentUser}
          pluginName={plugin.name}
        />
      );
    }
  }
  return layouts;
};
export const pluginRouters = () => {
  const plugins = window.plugins || [];
  const pluginRoutes = [];
  for (const plugin of plugins) {
    if (plugin.routes) {
      pluginRoutes.push(
        <System
          key={Math.random()}
          loadScript={true}
          system={plugin.routes}
          pluginName={plugin.name}
        />
      );
    }
  }
  return pluginRoutes;
};
export const pluginsOfCustomerSidebar = (customer) => {
  return renderPluginSidebar('customerRightSidebarSection', 'customer', customer);
};
export const pluginsOfCompanySidebar = (company) => {
  return renderPluginSidebar('companyRightSidebarSection', 'company', company);
};
export const pluginsOfItemSidebar = (item, type) => {
  return renderPluginSidebar(`${type}RightSidebarSection`, type, item);
};
export const pluginsOfPaymentForm = (renderPaymentsByType) => {
  const plugins = window.plugins || [];
  return (
    <PluginsWrapper
      itemName={'payments'}
      plugins={plugins}
      callBack={(_plugin, payments) => {
        const paymentsTypes = [];
        for (const perPayment of payments) {
          if (perPayment.component) {
            paymentsTypes.push(perPayment.component({ ...perPayment }));
          } else {
            paymentsTypes.push(renderPaymentsByType({ ...perPayment }));
          }
        }
        return paymentsTypes;
      }}
    />
  );
};
export const pluginsOfProductCategoryActions = (category) => {
  const plugins = window.plugins || [];
  return (
    <PluginsWrapper
      plugins={plugins}
      itemName={'productCategoryActions'}
      callBack={(_plugin, actions) => {
        return actions.map((action) => {
          const Component = React.lazy(loadComponent(action.scope, action.component));
          return <Component key={Math.random()} productCategory={category} />;
        });
      }}
    />
  );
};
export const customNavigationLabel = () => {
  const plugins = window.plugins || [];
  const customLabels = [];
  for (const plugin of plugins) {
    for (const lbl of plugin.customNavigationLabel || []) {
      customLabels.push(
        <React.Fragment key={lbl.text}>
          <CustomComponent scope={lbl.scope} component={lbl.component} />
        </React.Fragment>
      );
    }
  }
  return customLabels;
};
export const pluginsOfJobCategoryActions = (productCategoryId) => {
  const plugins = window.plugins || [];
  return (
    <PluginsWrapper
      plugins={plugins}
      itemName={'jobCategoryActions'}
      callBack={(_plugin, actions) => {
        return actions.map((action) => {
          const Component = React.lazy(loadComponent(action.scope, action.component));
          return <Component key={Math.random()} productCategoryId={productCategoryId} />;
        });
      }}
    />
  );
};
