let resolveRemoteUrl;
export function setRemoteUrlResolver(_resolveRemoteUrl) {
  resolveRemoteUrl = _resolveRemoteUrl;
}

let remoteUrlDefinitions;
export function setRemoteDefinitions(definitions) {
  remoteUrlDefinitions = definitions;
}

let remoteModuleMap = new Map();
let remoteContainerMap = new Map();
export async function loadRemoteModule(remoteName, moduleName) {
  const remoteModuleKey = `${remoteName}:${moduleName}`;
  if (remoteModuleMap.has(remoteModuleKey)) {
    return remoteModuleMap.get(remoteModuleKey);
  }

  const container = remoteContainerMap.has(remoteName)
    ? remoteContainerMap.get(remoteName)
    : await loadRemoteContainer(remoteName);
  const factory = await container.get(moduleName);
  const Module = factory();
  remoteModuleMap.set(remoteModuleKey, Module);
  return Module;
}

function loadModule(url) {
  return import(/* webpackIgnore:true */ url);
}
let initialSharingScopeCreated = false;
async function loadRemoteContainer(remoteName) {
  if (!resolveRemoteUrl && !remoteUrlDefinitions) {
    throw new Error('Call setRemoteDefinitions or setRemoteUrlResolver to allow Dynamic Federation to find the remote apps correctly.');
  }
  
  if (!initialSharingScopeCreated) {
    initialSharingScopeCreated = true;
    await __webpack_init_sharing__('default');
  }

  const remoteUrl = remoteUrlDefinitions
    ? remoteUrlDefinitions[remoteName]
    : await resolveRemoteUrl(remoteName);
  const containerUrl = `${remoteUrl}${remoteUrl.endsWith('/') ? '' : '/'}remoteEntry.mjs`;
  const container = await loadModule(containerUrl);
  await container.init(__webpack_share_scopes__.default);
  remoteContainerMap.set(remoteName, container);
  return container;
}