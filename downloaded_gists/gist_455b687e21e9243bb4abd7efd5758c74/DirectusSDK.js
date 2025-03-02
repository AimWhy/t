;(function(exports, base64, axios) {
  "use strict"

  axios = axios && axios.hasOwnProperty("default") ? axios["default"] : axios

  var isType = function(t, v) {
    return Object.prototype.toString.call(v) === "[object " + t + "]"
  }

  var isString = function(v) {
    return v && typeof v === "string" && /\S/.test(v)
  }

  var isNumber = function(v) {
    return isType("Number", v) && isFinite(v) && !isNaN(parseFloat(v))
  }

  var isFunction = function(v) {
    return v instanceof Function
  }

  function getPayload(token) {
    if (!token || token.length < 0 || token.split(".").length <= 0) {
      return {}
    }

    try {
      var payloadBase64 = token
        .split(".")[1]
        .replace("-", "+")
        .replace("_", "/")
      var payloadDecoded = base64.decode(payloadBase64)
      var payloadObject = JSON.parse(payloadDecoded)
      if (isNumber(payloadObject.exp)) {
        payloadObject.exp = new Date(payloadObject.exp * 1000)
      }
      return payloadObject
    } catch (err) {
      return {}
    }
  }

  function concurrencyManager(axios, limit) {
    if (limit === void 0) {
      limit = 10
    }
    if (limit < 1) {
      throw new Error(
        "ConcurrencyManager Error: minimun concurrent requests is 1"
      )
    }
    var instance = {
      limit: limit,
      queue: [],
      running: [],
      interceptors: {
        request: null,
        response: null,
      },
      push: function(reqHandler) {
        instance.queue.push(reqHandler)
        instance.shiftInitial()
      },
      shiftInitial: function() {
        setTimeout(function() {
          if (instance.running.length < instance.limit) {
            instance.shift()
          }
        }, 0)
      },
      shift: function() {
        if (instance.queue.length) {
          var queued = instance.queue.shift()
          queued.resolver(queued.request)
          instance.running.push(queued)
        }
      },
      requestHandler: function(req) {
        return new Promise(function(resolve) {
          instance.push({ request: req, resolver: resolve })
        })
      },
      responseHandler: function(res) {
        instance.running.shift()
        instance.shift()
        return res
      },
      detach: function() {
        axios.interceptors.request.eject(instance.interceptors.request)
        axios.interceptors.response.eject(instance.interceptors.response)
      },
      attach: function(limitConcurrentRequestsTo) {
        if (limitConcurrentRequestsTo) {
          instance.limit = limitConcurrentRequestsTo
        }
        instance.interceptors.request = axios.interceptors.request.use(
          instance.requestHandler
        )
        instance.interceptors.response = axios.interceptors.response.use(
          instance.responseHandler,
          instance.responseHandler
        )
      },
    }
    return instance
  }

  function defaultSerializeTransform(key, value) {
    return key + "=" + encodeURIComponent(value)
  }

  function querify(obj, prefix, serializer = defaultSerializeTransform) {
    var qs = []
    var prop

    for (prop in obj) {
      if (obj.hasOwnProperty(prop)) {
        var key = prefix ? prefix + "[" + prop + "]" : prop
        var val = obj[prop]
        qs.push(
          val !== null && typeof val === "object"
            ? querify(val, key)
            : serializer(key, val)
        )
      }
    }
    return qs.join("&")
  }

  const STORAGE_KEY = "directus-sdk-js"

  class Configuration {
    constructor(initialConfig = {}, storage) {
      let dehydratedConfig = Boolean(storage && initialConfig.persist)
        ? this.dehydratedInitialConfiguration(storage)
        : {}
      const mode =
        dehydratedConfig.mode ||
        initialConfig.mode ||
        Configuration.defaults.mode
      const persist = Boolean(dehydratedConfig.persist || initialConfig.persist)
      const project =
        dehydratedConfig.project ||
        initialConfig.project ||
        Configuration.defaults.project
      const tokenExpirationTime =
        dehydratedConfig.tokenExpirationTime ||
        initialConfig.tokenExpirationTime ||
        Configuration.defaults.tokenExpirationTime

      this.storage = storage
      this.internalConfiguration = Object.assign(
        {},
        initialConfig,
        dehydratedConfig,
        { mode, persist, project, tokenExpirationTime }
      )
    }

    get mode() {
      return this.internalConfiguration.mode
    }
    set mode(mode) {
      this.internalConfiguration.mode = mode
    }
    get persist() {
      return this.internalConfiguration.persist
    }
    set persist(persist) {
      this.internalConfiguration.persist = persist
    }
    get project() {
      return this.internalConfiguration.project
    }
    set project(project) {
      this.partialUpdate({ project: project || "_" })
    }
    get tokenExpirationTime() {
      return this.internalConfiguration.tokenExpirationTime
    }
    set tokenExpirationTime(tokenExpirationTime) {
      this.partialUpdate({
        tokenExpirationTime: tokenExpirationTime * 60000,
      })
    }
    get url() {
      return this.internalConfiguration.url
    }
    set url(url) {
      this.partialUpdate({ url })
    }
    get token() {
      return this.internalConfiguration.token
    }
    set token(token) {
      this.partialUpdate({ token })
    }
    get localExp() {
      return this.internalConfiguration.localExp
    }
    set localExp(localExp) {
      this.partialUpdate({ localExp })
    }

    reset() {
      delete this.internalConfiguration.token
      delete this.internalConfiguration.url
      delete this.internalConfiguration.localExp
      this.internalConfiguration.project = "_"
      this.deleteHydratedConfig()
    }
    update(config) {
      this.internalConfiguration = config
      this.setHydratedConfig(config)
    }
    partialUpdate(config) {
      this.internalConfiguration = Object.assign(
        {},
        this.internalConfiguration,
        config
      )
      this.setHydratedConfig(this.internalConfiguration)
    }
    setHydratedConfig(props) {
      if (!this.storage || !this.persist) {
        return
      }
      this.storage.setItem(STORAGE_KEY, JSON.stringify(props))
    }
    deleteHydratedConfig() {
      if (!this.storage || !this.persist) {
        return
      }
      this.storage.removeItem(STORAGE_KEY)
    }
    dehydrate() {
      if (!this.storage || !this.persist) {
        return
      }
      const nativeValue = this.storage.getItem(STORAGE_KEY)
      if (!nativeValue) {
        return
      }
      const parsedConfig = JSON.parse(nativeValue)
      this.internalConfiguration = parsedConfig
      return parsedConfig
    }
    dehydratedInitialConfiguration(storage) {
      if (!storage) {
        return {}
      }
      const nativeValue = storage.getItem(STORAGE_KEY)
      if (!nativeValue) {
        return
      }
      try {
        return JSON.parse(nativeValue)
      } catch (err) {
        return {}
      }
    }
  }

  Configuration.defaults = {
    project: "_",
    tokenExpirationTime: 5 * 6 * 1000,
    mode: "jwt",
  }

  class Authentication {
    constructor(config, inject) {
      this.config = config
      this.inject = inject
      if (config.token && config.token.includes(".")) {
        this.startInterval(true)
      }
    }

    signup(form) {
      return new Promise((resolve, reject) => {
        this.inject
          .post("/auth/signup", {
            email: form.email,
            password: form.password,
            phone: form.phone,
          })
          .then(response => {
            resolve(response)
          })
          .catch(reject)
      })
    }

    login(credentials, options = {}) {
      this.config.token = null
      if (isString(credentials.url)) {
        this.config.url = credentials.url
      }
      if (isString(credentials.project)) {
        this.config.project = credentials.project
      }
      if (isString(options.mode)) {
        this.config.mode = options.mode
      }
      if (credentials.persist || options.persist || this.config.persist) {
        this.startInterval()
      }

      if (this.config.mode === "cookie") {
        return new Promise((resolve, reject) => {
          this.inject
            .post("/auth/authenticate", {
              email: credentials.email,
              password: credentials.password,
              mode: "cookie",
            })
            .then(() => {
              resolve({
                project: this.config.project,
                url: this.config.url,
              })
            })
            .catch(reject)
        })
      }

      if (this.config.mode === "jwt") {
        return new Promise((resolve, reject) => {
          this.inject
            .post("/auth/authenticate", {
              email: credentials.email,
              password: credentials.password,
            })
            .then(res => {
              this.config.token = res.data.token
              this.config.localExp = new Date(
                Date.now() + this.config.tokenExpirationTime
              ).getTime()

              resolve({
                localExp: this.config.localExp,
                token: this.config.token,
                project: this.config.project,
                url: this.config.url,
              })
            })
            .catch(reject)
        })
      }
    }

    logout() {
      return this.inject.post("/auth/logout").then(response => {
        this.config.reset()
        if (this.refreshInterval) {
          this.stopInterval()
        }
        return response
      })
    }

    refreshIfNeeded() {
      const payload = this.getPayload()
      const { token, url, project, localExp } = this.config
      if (!isString(token) || !isString(url) || !isString(project)) {
        return
      }
      if (!payload || !payload.exp) {
        return
      }

      const timeDiff = (localExp || 0) - Date.now()

      if (timeDiff <= 0) {
        if (isFunction(this.onAutoRefreshError)) {
          this.onAutoRefreshError({ code: 102, message: "auth_expired_token" })
        }
        return
      }

      if (timeDiff < 30000) {
        return new Promise(resolve => {
          this.refresh(token)
            .then(res => {
              this.config.localExp = new Date(
                Date.now() + this.config.tokenExpirationTime
              ).getTime()
              this.config.token = res.data.token || token

              if (isFunction(this.onAutoRefreshSuccess)) {
                this.onAutoRefreshSuccess(this.config)
              }
              resolve([true])
            })
            .catch(error => {
              if (isFunction(this.onAutoRefreshError)) {
                this.onAutoRefreshError(error)
              }
              resolve([true, error])
            })
        })
      } else {
        return Promise.resolve([false])
      }
    }

    refresh(token) {
      return this.inject.post("/auth/refresh", { token })
    }

    startInterval(fireImmediately) {
      if (fireImmediately) {
        this.refreshIfNeeded()
      }
      this.refreshInterval = setInterval(this.refreshIfNeeded.bind(this), 10000)
    }

    stopInterval() {
      clearInterval(this.refreshInterval)
      this.refreshInterval = null
    }

    getPayload() {
      if (!isString(this.config.token)) {
        return null
      }
      return getPayload(this.config.token)
    }
  }

  class APIError extends Error {
    constructor(message, info) {
      super(message)
      this.message = message
      this.info = info
      Object.setPrototypeOf(this, new.target.prototype)
    }
    get url() {
      return this.info.url
    }
    get method() {
      return this.info.method.toUpperCase()
    }
    get code() {
      return `${this.info.code || -1}`
    }
    get params() {
      return this.info.params || {}
    }
    toString() {
      return `Directus call failed: ${this.method} ${this.url} ${JSON.stringify(
        this.params
      )} - ${this.message} (code ${this.code})`
    }
  }

  class API {
    constructor(config) {
      this.config = config
      this.xhr = axios.create({
        paramsSerializer: querify,
        withCredentials: true,
        timeout: 10 * 60 * 1000,
      })
      this.concurrent = concurrencyManager(this.xhr, 10)
      this.auth = new Authentication(config, { post: this.post.bind(this) })
    }

    reset() {
      this.auth.logout()
      this.config.deleteHydratedConfig()
    }

    get(endpoint, params = {}) {
      return this.request("get", endpoint, params)
    }

    post(endpoint, body = {}, params = {}) {
      return this.request("post", endpoint, params, body)
    }

    patch(endpoint, body = {}, params = {}) {
      return this.request("patch", endpoint, params, body)
    }

    put(endpoint, body = {}, params = {}) {
      return this.request("put", endpoint, params, body)
    }

    delete(endpoint) {
      return this.request("delete", endpoint)
    }

    getPayload() {
      if (!isString(this.config.token)) {
        return null
      }
      return getPayload(this.config.token)
    }

    request(
      method,
      endpoint,
      params = { _isGlobalEnv: false, _skipParseToJSON: false },
      data = {},
      headers = {}
    ) {
      if (!this.config.url) {
        throw new Error(
          "API has no URL configured to send requests to, please check the docs."
        )
      }
      let baseURL = `${this.config.url}/`
      let isGlobalEnv = params._isGlobalEnv
      let skipParseToJSON = params._skipParseToJSON

      delete params._isGlobalEnv
      delete params._skipParseToJSON

      if (!isGlobalEnv) {
        baseURL += `${this.config.project}/`
      }
      const requestOptions = {
        baseURL,
        data,
        headers,
        method,
        params,
        url: endpoint,
      }
      if (
        this.config.token &&
        isString(this.config.token) &&
        this.config.token.length > 0
      ) {
        requestOptions.headers = headers
        requestOptions.headers.Authorization = `Bearer ${this.config.token}`
      }
      return this.xhr
        .request(requestOptions)
        .then(res => res.data)
        .then(responseData => {
          if (!responseData || responseData.length === 0) {
            return responseData
          }

          if (typeof responseData !== "object") {
            try {
              return skipParseToJSON ? responseData : JSON.parse(responseData)
            } catch (error) {
              throw { response: { data: responseData, error, json: true } }
            }
          }
          return responseData
        })
        .catch(error => {
          const errorResponse = error ? error.response || {} : {}
          const errorResponseData = errorResponse.data || {}
          const baseErrorInfo = {
            error,
            url: requestOptions.url,
            method: requestOptions.method,
            params: requestOptions.params,
            code: errorResponseData.error
              ? errorResponseData.error.code || error.code
              : -1,
          }
          if (error.response) {
            if (error.response.json === true) {
              throw new APIError(
                "API returned invalid JSON",
                Object.assign({}, baseErrorInfo, { code: 422 })
              )
            } else {
              throw new APIError(
                errorResponseData.error.message || "Unknown error occured",
                baseErrorInfo
              )
            }
          } else {
            throw new APIError(
              "Network error",
              Object.assign({}, baseErrorInfo, { code: -1 })
            )
          }
        })
    }
  }

  var DIRECTUS_COLLECTION_PREFIX = "directus_"

  function getCollectionItemPath(collection) {
    if (collection.startsWith(DIRECTUS_COLLECTION_PREFIX)) {
      return "/" + collection.substr(9)
    }
    return "/items/" + collection
  }

  class SDK {
    constructor(options) {
      this.config = new Configuration(options)
      this.api = new API(this.config)
    }

    get payload() {
      if (!this.config.token) {
        return null
      }
      return this.api.getPayload()
    }

    login(credentials, options) {
      return this.api.auth.login(credentials, options)
    }

    logout() {
      return this.api.auth.logout()
    }

    reset() {
      this.api.reset()
    }

    refreshIfNeeded() {
      return this.api.auth.refreshIfNeeded()
    }

    refresh(token) {
      return this.api.auth.refresh(token)
    }

    requestPasswordReset(email) {
      return this.api.post("/auth/password/request", { email })
    }

    getThirdPartyAuthProviders() {
      return this.api.get("/auth/sso")
    }

    getItem(collection, primaryKey, params = {}) {
      const collectionBasePath = getCollectionItemPath(collection)
      return this.api.get(`${collectionBasePath}/${primaryKey}`, params)
    }

    getItems(collection, params = {}) {
      const collectionBasePath = getCollectionItemPath(collection)
      return this.api.get(collectionBasePath, params)
    }

    createItem(collection, body) {
      const collectionBasePath = getCollectionItemPath(collection)
      return this.api.post(collectionBasePath, body)
    }

    createItems(collection, body) {
      const collectionBasePath = getCollectionItemPath(collection)
      return this.api.post(collectionBasePath, body)
    }

    deleteItem(collection, primaryKey) {
      const collectionBasePath = getCollectionItemPath(collection)
      return this.api.delete(`${collectionBasePath}/${primaryKey}`)
    }

    deleteItems(collection, primaryKeys) {
      const collectionBasePath = getCollectionItemPath(collection)
      return this.api.delete(`${collectionBasePath}/${primaryKeys.join()}`)
    }

    updateItem(collection, primaryKey, body, params = {}) {
      const collectionBasePath = getCollectionItemPath(collection)
      return this.api.patch(`${collectionBasePath}/${primaryKey}`, body, params)
    }

    updateItems(collection, body, params = {}) {
      const collectionBasePath = getCollectionItemPath(collection)
      return this.api.patch(collectionBasePath, body, params)
    }

    getItemRevisions(collection, primaryKey, params = {}) {
      const collectionBasePath = getCollectionItemPath(collection)
      return this.api.get(
        `${collectionBasePath}/${primaryKey}/revisions`,
        params
      )
    }

    revert(collection, primaryKey, revisionID) {
      const collectionBasePath = getCollectionItemPath(collection)
      return this.api.patch(
        `${collectionBasePath}/${primaryKey}/revert/${revisionID}`
      )
    }

    getCollection(collection, params = {}) {
      return this.api.get(`/collections/${collection}`, params)
    }

    getCollections(params = {}) {
      return this.api.get("/collections", params)
    }

    createCollection(data) {
      return this.api.post("/collections", data)
    }

    deleteCollection(collection) {
      return this.api.delete(`/collections/${collection}`)
    }

    updateCollection(collection, data) {
      return this.api.patch(`/collections/${collection}`, data)
    }

    getMyBookmarks(params = {}) {
      return this.getCollectionPresets(params)
    }

    getMyListingPreferences(collection, params = {}) {
      const payload = this.api.getPayload()
      return Promise.all([
        this.api.get("/collection_presets", {
          "filter[collection][eq]": collection,
          "filter[role][null]": 1,
          "filter[title][null]": 1,
          "filter[user][null]": 1,
          limit: 1,
          sort: "-id",
        }),
        this.api.get("/collection_presets", {
          "filter[collection][eq]": collection,
          "filter[role][eq]": payload.role,
          "filter[title][null]": 1,
          "filter[user][null]": 1,
          limit: 1,
          sort: "-id",
        }),
        this.api.get("/collection_presets", {
          "filter[collection][eq]": collection,
          "filter[role][eq]": payload.role,
          "filter[title][null]": 1,
          "filter[user][eq]": payload.id,
          limit: 1,
          sort: "-id",
        }),
      ]).then(values => {
        const [col, role, user] = values
        if (user.data && user.data.length > 0) {
          return user.data[0]
        }
        if (role.data && role.data.length > 0) {
          return role.data[0]
        }
        if (col.data && col.data.length > 0) {
          return col.data[0]
        }
        return {}
      })
    }

    getCollectionPresets() {
      const payload = this.api.getPayload()
      return Promise.all([
        this.api.get("/collection_presets", {
          "filter[title][nnull]": 1,
          "filter[user][eq]": payload.id,
        }),
        this.api.get("/collection_presets", {
          "filter[role][eq]": payload.role,
          "filter[title][nnull]": 1,
          "filter[user][null]": 1,
        }),
      ]).then(values => {
        const [user, role] = values
        return [...(user.data || []), ...(role.data || [])]
      })
    }

    createCollectionPreset(data) {
      return this.api.post("/collection_presets", data)
    }

    deleteCollectionPreset(primaryKey) {
      return this.api.delete(`/collection_presets/${primaryKey}`)
    }

    updateCollectionPreset(primaryKey, data) {
      return this.api.patch(`/collection_presets/${primaryKey}`, data)
    }

    getField(collection, fieldName, params = {}) {
      return this.api.get(`/fields/${collection}/${fieldName}`, params)
    }

    getFields(collection, params = {}) {
      return this.api.get(`/fields/${collection}`, params)
    }

    getAllFields(params = {}) {
      return this.api.get("/fields", params)
    }

    createField(collection, fieldInfo) {
      return this.api.post(`/fields/${collection}`, fieldInfo)
    }

    deleteField(collection, fieldName) {
      return this.api.delete(`/fields/${collection}/${fieldName}`)
    }

    updateField(collection, fieldName, fieldInfo) {
      return this.api.patch(`/fields/${collection}/${fieldName}`, fieldInfo)
    }

    updateFields(collection, fieldsInfoOrFieldNames, fieldInfo = null) {
      if (fieldInfo) {
        return this.api.patch(
          `/fields/${collection}/${fieldsInfoOrFieldNames.join(",")}`,
          fieldInfo
        )
      }
      return this.api.patch(`/fields/${collection}`, fieldsInfoOrFieldNames)
    }

    getFile(fileName, params = {}) {
      const files = typeof fileName === "string" ? fileName : fileName.join(",")
      return this.api.get(`/files/${files}`, params)
    }

    getFiles(params = {}) {
      return this.api.get("/files", params)
    }

    uploadFiles(data, onUploadProgress = () => ({})) {
      const headers = {
        Authorization: `Bearer ${this.config.token}`,
        "Content-Type": "multipart/form-data",
      }

      this.api.concurrent.attach(5)

      return this.api.xhr
        .post(`${this.config.url}/${this.config.project}/files`, data, {
          headers,
          onUploadProgress,
        })
        .then(res => {
          this.api.concurrent.detach()
          return res.data
        })
        .catch(error => {
          this.api.concurrent.detach()
          if (error.response) {
            throw error.response.data.error
          } else {
            throw { code: -1, error, message: "Network Error" }
          }
        })
    }

    getMyPermissions(params = {}) {
      return this.api.get("/permissions/me", params)
    }

    getPermissions(params = {}) {
      return this.getItems("directus_permissions", params)
    }

    createPermissions(data) {
      return this.api.post("/permissions", data)
    }

    updatePermissions(data) {
      return this.api.patch("/permissions", data)
    }

    getRelations(params = {}) {
      return this.api.get("/relations", params)
    }

    getCollectionRelations(collection, params = {}) {
      return Promise.all([
        this.api.get("/relations", {
          "filter[collection_a][eq]": collection,
        }),
        this.api.get("/relations", {
          "filter[collection_b][eq]": collection,
        }),
      ])
    }

    createRelation(data) {
      return this.api.post("/relations", data)
    }

    updateRelation(primaryKey, data) {
      return this.api.patch(`/relations/${primaryKey}`, data)
    }

    getRole(primaryKey, params = {}) {
      return this.api.get(`/roles/${primaryKey}`, params)
    }

    getRoles(params = {}) {
      return this.api.get("/roles", params)
    }

    createRole(body) {
      return this.createItem("directus_roles", body)
    }

    deleteRole(primaryKey) {
      return this.deleteItem("directus_roles", primaryKey)
    }

    updateRole(primaryKey, body) {
      return this.updateItem("directus_roles", primaryKey, body)
    }

    getSettings(params = {}) {
      return this.api.get("/settings", params)
    }

    getSettingsFields(params = {}) {
      return this.api.get("/settings/fields", params)
    }

    getMe(params = {}) {
      return this.api.get("/users/me", params)
    }

    getUser(primaryKey, params = {}) {
      return this.api.get(`/users/${primaryKey}`, params)
    }

    getUsers(params = {}) {
      return this.api.get("/users", params)
    }

    updateUser(primaryKey, body) {
      return this.updateItem("directus_users", primaryKey, body)
    }

    getActivity(params = {}) {
      return this.api.get("/activity", params)
    }

    updateDatabase() {
      return this.api.post("/update")
    }

    projectInfo() {
      return this.api.request("get", "/")
    }

    serverInfo() {
      return this.api.request("get", "/", { _isGlobalEnv: true })
    }

    getInterfaces() {
      return this.api.request("get", "/interfaces", { _isGlobalEnv: true })
    }

    getLayouts() {
      return this.api.request("get", "/layouts", { _isGlobalEnv: true })
    }

    getPages() {
      return this.api.request("get", "/pages", { _isGlobalEnv: true })
    }

    ping() {
      return this.api.request("get", "/server/ping", {
        _isGlobalEnv: true,
        _skipParseToJSON: true,
      })
    }
  }

  SDK.getPayload = getPayload

  exports.SDK = SDK
  exports.getPayload = getPayload
  exports.Configuration = Configuration
  exports.concurrencyManager = concurrencyManager
  exports.getCollectionItemPath = getCollectionItemPath
})((window.DirectusSDK = {}), window.base64, window.axios)
