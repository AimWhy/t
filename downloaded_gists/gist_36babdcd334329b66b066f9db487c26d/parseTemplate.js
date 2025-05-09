function parseSearch(search) {
  // remove first '?'
  if (search.indexOf('?') === 0) {
    search = search.slice(1);
  }
  const result = {};
  let pairs = search.split('&');
  for (let j = 0; j < pairs.length; j++) {
    const value = pairs[j];
    const index = value.indexOf('=');
    if (index > -1) {
      const k = value.slice(0, index);
      const v = value.slice(index + 1);
      result[k] = v;
    } else if (value) {
      result[value] = '';
    }
  }
  return result;
}

export default function getRequestContext(location, serverContext = {}) {
  const { pathname, search } = location;
  const query = parseSearch(search);
  const requestContext = {
    ...serverContext,
    pathname,
    query,
  };
  return requestContext;
}

let dataLoaderFetcher;
export function setFetcher(customFetcher) {
  dataLoaderFetcher = customFetcher;
}

export function parseTemplate(config) {
  const queryParams = {};
  const getQueryParams = () => {
    if (Object.keys(queryParams).length === 0) {
      if (location.search.includes('?')) {
        location.search
          .substring(1)
          .split('&')
          .forEach((query) => {
            const res = query.split('=');
            // ?test=1&hello=world
            if (res[0] !== void 0 && res[1] !== void 0) {
              queryParams[res[0]] = res[1];
            }
          });
      }
    }
    return queryParams;
  };
  const cookie = {};
  const getCookie = () => {
    if (Object.keys(cookie).length === 0) {
      document.cookie.split(';').forEach((c) => {
        const [key, value] = c.split('=');
        if (key !== void 0 && value !== void 0) {
          cookie[key.trim()] = value.trim();
        }
      });
    }
    return cookie;
  };
  // Match all template of query cookie and storage.
  let strConfig = JSON.stringify(config) || '';
  const regexp = /\$\{(queryParams|cookie|storage)(\.(\w|-)+)?}/g;
  let cap = [];
  let matched = [];
  while ((cap = regexp.exec(strConfig)) !== null) {
    matched.push(cap);
  }
  matched.forEach((item) => {
    const [origin, key, value] = item;
    if (item && origin && key && value && value.startsWith('.')) {
      if (key === 'queryParams') {
        // Replace query params.
        strConfig = strConfig.replace(origin, getQueryParams()[value.substring(1)]);
      } else if (key === 'cookie') {
        // Replace cookie.
        strConfig = strConfig.replace(origin, getCookie()[value.substring(1)]);
      } else if (key === 'storage') {
        // Replace storage.
        strConfig = strConfig.replace(origin, localStorage.getItem(value.substring(1)));
      }
    }
  });
  // Replace url.
  strConfig = strConfig.replace('${url}', location.href);
  return JSON.parse(strConfig);
}

export function loadDataByCustomFetcher(config) {
  let parsedConfig = config;
  try {
    if (typeof window !== 'undefined') {
      parsedConfig = parseTemplate(config);
    }
  } catch (error) {
    console.error('parse template error: ', error);
  }
  return dataLoaderFetcher(parsedConfig);
}

/**
 * Handle for different dataLoader.
 */
export function callDataLoader(dataLoader, requestContext) {
  if (Array.isArray(dataLoader)) {
    const loaders = dataLoader.map((loader) => {
      return typeof loader === 'object' ? loadDataByCustomFetcher(loader) : loader(requestContext);
    });
    return Promise.all(loaders);
  }

  if (typeof dataLoader === 'object') {
    return loadDataByCustomFetcher(dataLoader);
  }

  return dataLoader(requestContext);
}
const cache = new Map();
/**
 * Start getData once data-loader.js is ready in client, and set to cache.
 */
function loadInitialDataInClient(loaders) {
  const context = window.__APP_CONTEXT__ || {};
  const matchedIds = context.matchedIds || [];
  const routesData = context.routesData || {};
  const { renderMode } = context;
  const ids = ['_app'].concat(matchedIds);
  ids.forEach((id) => {
    const dataFromSSR = routesData[id];
    if (dataFromSSR) {
      cache.set(renderMode === 'SSG' ? `${id}_ssg` : id, {
        value: dataFromSSR,
        status: 'RESOLVED',
      });
    }
    const dataLoader = loaders[id];
    if (dataLoader) {
      const requestContext = getRequestContext(window.location);
      const loader = callDataLoader(dataLoader, requestContext);
      cache.set(id, {
        value: loader,
        status: 'LOADING',
      });
    }
  });
}
/**
 * Init data loader in client side.
 * Load initial data and register global loader.
 * In order to load data, JavaScript modules, CSS and other assets in parallel.
 */
export async function init(dataloaderConfig, options) {
  const { fetcher, runtimeModules, appExport } = options;
  const runtimeApi = {
    appContext: { appExport },
  };
  if (runtimeModules) {
    await Promise.all(
      runtimeModules
        .map((module) => {
          const runtimeModule = module.default || module;
          return runtimeModule(runtimeApi);
        })
        .filter(Boolean)
    );
  }
  if (fetcher) {
    setFetcher(fetcher);
  }

  try {
    loadInitialDataInClient(dataloaderConfig);
  } catch (error) {
    console.error('Load initial data error: ', error);
  }

  window.__DATA_LOADER__ = {
    getData: async (id) => {
      let result;
      // first render for ssg use data from build time.
      // second render for ssg will use data from data loader.

      result = cache.get(id);

      // Already send data request.
      if (result) {
        const { status, value } = result;
        if (status === 'RESOLVED') {
          return result;
        }
        if (Array.isArray(value)) {
          return await Promise.all(value);
        }
        return await value;
      }

      const dataLoader = dataloaderConfig[id];
      // No data loader.
      if (!dataLoader) {
        return null;
      }
      // Call dataLoader.
      // In CSR, all dataLoader is called by global data loader to avoid bundle dataLoader in page bundle duplicate.
      const requestContext = getRequestContext(window.location);
      return await callDataLoader(dataLoader, requestContext);
    },
  };
}
