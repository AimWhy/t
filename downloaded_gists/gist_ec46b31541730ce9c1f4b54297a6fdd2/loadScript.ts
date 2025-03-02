import loader from '@monaco-editor/loader'

function getGlobalThis() {
  try {
    if (typeof self !== 'undefined') {
      return self
    }
  } catch (e) {}
  try {
    if (typeof globalThisPolyfill !== 'undefined') {
      return globalThisPolyfill
    }
  } catch (e) {}
  try {
    if (typeof global !== 'undefined') {
      return global
    }
  } catch (e) {}
  return Function('return this')()
}
export const globalThisPolyfill: Window = getGlobalThis()

const Registry = {
  cdn: '//cdn.jsdelivr.net/npm',
}

export const setNpmCDNRegistry = (registry: string) => {
  Registry.cdn = registry
  loader.config({
    paths: {
      vs: `${registry}/monaco-editor@0.30.1/min/vs`,
    },
  })
}

export const getNpmCDNRegistry = () => String(Registry.cdn).replace(/\/$/, '')

export interface ILoadScriptProps {
  package: string
  entry: string
  root: string
  base?: string
}

export const loadScript = async (props: ILoadScriptProps) => {
  const options: ILoadScriptProps = {
    base: getNpmCDNRegistry(),
    ...props,
  }
  if (globalThisPolyfill[props.root]) return globalThisPolyfill[options.root]
  const path = `${options.base}/${options.package}/${options.entry}`
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.type = 'text/javascript'
    script.async = false
    script.src = path
    script.onload = () => {
      const module = globalThisPolyfill[options.root]
      globalThisPolyfill['define'] = define
      resolve(module)
      script.remove()
    }
    script.onerror = (err) => {
      reject(err)
    }
    const define = globalThisPolyfill['define']
    globalThisPolyfill['define'] = undefined
    document.body.appendChild(script)
  })
}