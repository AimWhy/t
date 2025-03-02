const containerMap = {};
const remoteMap = {};
let isDefaultScopeInitialized = false;

async function lookupExposedModule(key, exposedModule) {
  const container = containerMap[key];
  const factory = await container.get(exposedModule);
  const Module = factory();
  return Module;
}

async function initRemote(container, key) {
  // container = window[key], Do we still need to initialize the remote?
  if (remoteMap[key]) {
    return container;
  }

  // Do we still need to initialize the share scope?
  if (!isDefaultScopeInitialized) {
    await __webpack_init_sharing__('default');
    isDefaultScopeInitialized = true;
  }

  await container.init(__webpack_share_scopes__.default);
  remoteMap[key] = true;
  return container;
}

async function loadRemoteModuleEntry(remoteEntry) {
  if (containerMap[remoteEntry]) {
    return Promise.resolve();
  }

  return await import(remoteEntry).then(container => {
    initRemote(container, remoteEntry);
    containerMap[remoteEntry] = container;
  });
}

async function loadRemoteScriptEntry(remoteEntry, remoteName) {
  return new Promise((resolve, reject) => {
    if (containerMap[remoteName]) {
      return resolve();
    }

    const script = document.createElement('script');
    script.src = remoteEntry;
    script.onerror = reject;
    script.onload = () => {
      const container = window[remoteName];
      initRemote(container, remoteName);
      containerMap[remoteName] = container;
      resolve();
    };
    document.body.appendChild(script);
  });
}

export async function loadRemoteEntry(remoteEntryOrOptions, remoteName) {
  if (typeof remoteEntryOrOptions === 'string') {
    const remoteEntry = remoteEntryOrOptions;
    return await loadRemoteScriptEntry(remoteEntry, remoteName);
  } else if (remoteEntryOrOptions.type === 'script') {
    const options = remoteEntryOrOptions;
    return await loadRemoteScriptEntry(options.remoteEntry, options.remoteName);
  } else if (remoteEntryOrOptions.type === 'module') {
    const options = remoteEntryOrOptions;
    await loadRemoteModuleEntry(options.remoteEntry);
  }
}

export async function loadRemoteModule(options) {
  let loadRemoteEntryOptions;
  let key;

  if (!options.type) {
    options.type = 'script';
  }

  if (options.type === 'script') {
    loadRemoteEntryOptions = {
      type: 'script',
      remoteEntry: options.remoteEntry,
      remoteName: options.remoteName
    };
    key = options.remoteName;
  } else if (options.type === 'module') {
    loadRemoteEntryOptions = {
      type: 'module',
      remoteEntry: options.remoteEntry,
    };
    key = options.remoteEntry;
  }

  if (options.remoteEntry) {
    await loadRemoteEntry(loadRemoteEntryOptions);
  }

  return await lookupExposedModule(key, options.exposedModule);
}

// https://github.com/angular-architects/module-federation-plugin/blob/78916f611a3ea8bed2f316dcceb767b2df127573/libs/mf/tutorial/tutorial.md