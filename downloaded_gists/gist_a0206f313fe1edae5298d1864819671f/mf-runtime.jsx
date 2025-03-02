import { lazy, Suspense } from 'react';

const remotes = {};
export function registerMfRemote(opts) {
  const aliasName = opts.aliasName || opts.remoteName;

  if (remotes[aliasName]) {
    return console.warn(`registerMfRemote: ${aliasName} is already registered as`, remotes[aliasName]);
  }

  remotes[aliasName] = { ...opts, aliasName }
}

export async function safeMfImport(moduleSpecifier, fallback) {
  try {
    const i = moduleSpecifier.indexOf('/');

    if (i < 0) {
      console.error(
        `safeMfImport: bad Module Name ${moduleSpecifier}, should match pattern 'remote/moduleName'`,
        moduleSpecifier,
      );

      return fallback;
    }

    const aliasName = moduleSpecifier.slice(0, i);
    const module = moduleSpecifier.slice(i + 1);
    const entry = remotes[aliasName]?.entry;
    const remoteName = remotes[aliasName]?.remoteName;

    if (!entry) {
      console.error(
        `safeMfImport: bad Module Name ${moduleSpecifier}, no remote for "aliasName"`,
        moduleSpecifier,
      );
      return fallback;
    }

    await loadRemoteScriptWithCache(remoteName, entry);

    return getRemoteModule(remoteName, module);
  } catch (e) {
    console.error('safeMfImport: Module', moduleSpecifier, 'failed', e);
    return fallback;
  }
}

export async function rawMfImport(opts) {
  await loadRemoteScriptWithCache(opts.remoteName, opts.entry);

  return getRemoteModule(opts.remoteName, opts.moduleName);
}

async function loadScript(url) {
  const element = document.createElement('script');
  element.src = url;
  element.type = 'text/javascript';
  element.async = true;

  const loadScriptQ = new Promise((resolve, reject) => {
    element.onload = () => {
      document.head.removeChild(element);
      resolve();
    };
    element.onerror = (e) => {
      document.head.removeChild(element);
      reject(e);
    };
  });

  document.head.appendChild(element);

  return loadScriptQ;
}

const scriptLoadedMap = {};
async function loadRemoteScriptWithCache(remoteName, url) {
  const loadCache = scriptLoadedMap[remoteName];

  // script Already loaded
  if (loadCache === 0) {
    return;
  } else if (loadCache) {
    await loadCache
  } else {
    const p = loadScript(url).then(() => {
      scriptLoadedMap[remoteName] = 0;
    }, (e) => {
      scriptLoadedMap[remoteName] = undefined;
      throw e;
    });
    scriptLoadedMap[remoteName] = p;
    await p;
  }
}

async function getRemoteModule(remoteName, moduleName) {
  await __webpack_init_sharing__('default');

  const container = window[remoteName];

  await container.init(__webpack_share_scopes__.default);

  const factory = await window[remoteName].get(`./${moduleName}`);

  return factory();
}

export function safeRemoteComponent(opts) {
  const Lazy = lazy(() => safeMfImport(opts.moduleSpecifier, { default: opts.fallbackComponent }));

  return (props) => (<Suspense fallback={opts.loadingElement}><Lazy {...props} /></Suspense>)
}

export function safeRemoteComponentWithMfConfig(opts) {
  const Lazy = lazy(() => rawMfImport(opts.mfConfig).catch(() => ({ default: opts.fallbackComponent })));

  return (props) => (<Suspense fallback={opts.loadingElement}><Lazy {...props} /></Suspense>)
}