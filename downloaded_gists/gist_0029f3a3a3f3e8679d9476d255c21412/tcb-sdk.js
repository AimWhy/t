import axios from "axios"

function mitt(all) {
  all = all || Object.create(null)

  return {
    on: function on(type, handler) {
      ;(all[type] || (all[type] = [])).push(handler)
    },

    off: function off(type, handler) {
      if (all[type]) {
        all[type].splice(all[type].indexOf(handler) >>> 0, 1)
      }
    },

    emit: function emit(type, evt) {
      ;(all[type] || []).slice().map(function(handler) {
        handler(evt)
      })
      ;(all["*"] || []).slice().map(function(handler) {
        handler(type, evt)
      })
    },
  }
}

const ee = mitt()

function addEventListener(event, listener) {
  ee.on(event, listener)
}

function activateEvent(event, data) {
  ee.emit(event, data)
}

class TcbObject {
  constructor() {
    if (!window["tcbObject"]) {
      window["tcbObject"] = {}
    }
  }

  setItem(key, value) {
    window["tcbObject"][key] = value
  }

  getItem(key) {
    return window["tcbObject"][key]
  }

  removeItem(key) {
    delete window["tcbObject"][key]
  }

  clear() {
    delete window["tcbObject"]
  }
}

class Cache {
  constructor(persistence) {
    if (persistence === "local") {
      this.storageClass = localStorage
    } else if (persistence === "none") {
      this.storageClass = new TcbObject()
    } else {
      this.storageClass = sessionStorage
    }
  }

  setStore(key, value, version = "localCacheV1") {
    let data = {
      version: version,
      content: value,
    }

    this.storageClass.setItem(key, JSON.stringify(data))
  }

  getStore(key, version = "localCacheV1") {
    let content = this.storageClass.getItem(key)

    if (content && content.indexOf(version) >= 0) {
      let data = JSON.parse(content)
      return data.content
    } else {
      return ""
    }
  }

  removeStore(key) {
    this.storageClass.removeItem(key)
  }
}

const getQuery = function(name, url) {
  const matches = (url || window.location.search).match(
    new RegExp(`[#\?&\/]${name}=([^&#]*)`)
  )
  return matches ? matches[1] : ""
}

const getHash = function(name) {
  const matches = window.location.hash.match(
    new RegExp(`[#\?&\/]${name}=([^&#]*)`)
  )
  return matches ? matches[1] : ""
}

const removeParam = function(key, sourceURL) {
  let rtn = sourceURL.split("?")[0]
  let param
  let params_arr = []
  let queryString = sourceURL.indexOf("?") !== -1 ? sourceURL.split("?")[1] : ""

  if (queryString !== "") {
    params_arr = queryString.split("&")
    for (let i = params_arr.length - 1; i >= 0; i -= 1) {
      param = params_arr[i].split("=")[0]
      if (param === key) {
        params_arr.splice(i, 1)
      }
    }
    rtn = rtn + "?" + params_arr.join("&")
  }
  return rtn
}

const createPromiseCallback = function() {
  let cb
  const promise = new Promise(function(resolve, reject) {
    cb = function(err, data) {
      return err ? reject(err) : resolve(data)
    }
  })
  cb.promise = promise
  return cb
}

const getWeixinCode = function() {
  return getQuery("code") || getHash("code")
}

const BASE_URL = "//tcb-api.tencentcloudapi.com/web"

const actionsWithoutAccessToken = [
  "auth.getJwt",
  "auth.logout",
  "auth.signInWithTicket",
]

const ACCESS_TOKEN = "access_token"
const ACCESS_TOKEN_Expire = "access_token_expire"
const REFRESH_TOKEN = "refresh_token"

const AllowedScopes = {
  snsapi_base: "snsapi_base",
  snsapi_userinfo: "snsapi_userinfo",
  snsapi_login: "snsapi_login",
}

const LoginModes = {
  redirect: "redirect",
  prompt: "prompt",
}

class Request {
  constructor(config) {
    this.config = config
    this.cache = new Cache(config.persistence)

    this.accessTokenKey = `${ACCESS_TOKEN}_${config.env}`
    this.accessTokenExpireKey = `${ACCESS_TOKEN_Expire}_${config.env}`
    this.refreshTokenKey = `${REFRESH_TOKEN}_${config.env}`
  }

  // 调用接口刷新 access token，并且返回
  refreshAccessToken() {
    this.cache.removeStore(this.accessTokenKey)
    this.cache.removeStore(this.accessTokenExpireKey)

    let refreshToken = this.cache.getStore(this.refreshTokenKey)

    if (!refreshToken) {
      throw new Error("[tcb-js-sdk] 未登录CloudBase")
    }

    return this.request("auth.getJwt", {
      refresh_token: refreshToken,
    }).then(response => {
      if (
        response.data.code === "SIGN_PARAM_INVALID" ||
        response.data.code === "REFRESH_TOKEN_EXPIRED"
      ) {
        activateEvent("loginStateExpire")
        this.cache.removeStore(this.refreshTokenKey)

        throw new Error(
          `[tcb-js-sdk] 刷新access token失败：${response.data.code}`
        )
      }

      if (response.data.access_token) {
        activateEvent("refreshAccessToken")
        this.cache.setStore(this.accessTokenKey, response.data.access_token)
        this.cache.setStore(
          this.accessTokenExpireKey,
          response.data.access_token_expire + Date.now()
        )

        return {
          accessToken: response.data.access_token,
          accessTokenExpire: response.data.access_token_expire,
        }
      }
    })
  }

  // 获取access token
  getAccessToken() {
    // 如果没有access token或者过期，那么刷新
    let accessToken = this.cache.getStore(this.accessTokenKey)
    let accessTokenExpire = this.cache.getStore(this.accessTokenExpireKey)

    let result = Promise.resolve(
      this._shouldRefreshAccessTokenHook
        ? this._shouldRefreshAccessTokenHook(accessToken, accessTokenExpire)
        : true
    )

    return result.then(shouldRefreshAccessToken => {
      if (
        (!accessToken ||
          !accessTokenExpire ||
          accessTokenExpire < Date.now()) &&
        shouldRefreshAccessToken
      ) {
        // 返回新的access token
        return this.refreshAccessToken()
      } else {
        // 返回本地的access token
        return {
          accessToken,
          accessTokenExpire,
        }
      }
    })
  }

  async request(action, params, options) {
    let contentType = "application/x-www-form-urlencoded"

    const tmpObj = {
      action,
      env: this.config.env,
      dataVersion: "2019-08-16",
      ...params,
    }

    // 下面几种 action 不需要 access token
    if (actionsWithoutAccessToken.indexOf(action) === -1) {
      tmpObj.access_token = (await this.getAccessToken()).accessToken
    }

    // 拼body和content-type
    let payload
    if (action === "storage.uploadFile") {
      payload = new FormData()
      for (let key in payload) {
        if (payload.hasOwnProperty(key) && payload[key] !== undefined) {
          payload.append(key, tmpObj[key])
        }
      }
      contentType = "multipart/form-data"
    } else {
      contentType = "application/json;charset=UTF-8"
      payload = tmpObj
    }

    let opts = { headers: { "content-type": contentType } }

    if (options && options["onUploadProgress"]) {
      opts.onUploadProgress = options["onUploadProgress"]
    }

    // 新的 url 需要携带 env 参数进行 CORS 校验
    const newUrl = `${BASE_URL}?env=${this.config.env}`
    const res = await axios.post(newUrl, payload, opts)

    if (Number(res.status) !== 200 || !res.data) {
      throw new Error("network request error")
    }

    return res
  }

  async send(action, data = {}) {
    const slowQueryWarning = setTimeout(function() {
      console.warn(
        "Database operation is longer than 3s. Please check query performance and your network environment."
      )
    }, 3000)

    let response = await this.request(action, data, {
      onUploadProgress: data.onUploadProgress,
    })

    clearTimeout(slowQueryWarning)

    if (
      response.data.code === "ACCESS_TOKEN_EXPIRED" &&
      actionsWithoutAccessToken.indexOf(action) === -1
    ) {
      // access_token过期，重新获取
      await this.refreshAccessToken()

      response = await this.request(action, data, {
        onUploadProgress: data.onUploadProgress,
      })
    }

    if (response.data.code) {
      throw new Error(`[${response.data.code}] ${response.data.message}`)
    }

    return response.data
  }
}

class AuthProvider {
  constructor(config) {
    this.httpRequest = new Request(config)
    this.cache = new Cache(config.persistence)

    this.accessTokenKey = `${ACCESS_TOKEN}_${config.env}`
    this.accessTokenExpireKey = `${ACCESS_TOKEN_Expire}_${config.env}`
    this.refreshTokenKey = `${REFRESH_TOKEN}_${config.env}`
  }

  setRefreshToken(refreshToken) {
    // refresh token设置前，先清掉 access token
    this.cache.removeStore(this.accessTokenKey)
    this.cache.removeStore(this.accessTokenExpireKey)
    this.cache.setStore(this.refreshTokenKey, refreshToken)
  }
}

class WeixinAuthProvider extends AuthProvider {
  constructor(config, appid, scope, loginMode, state) {
    super(config)

    this.config = config
    this.appid = appid
    this.scope = scope
    this.state = state || "weixin"
    this.loginMode = loginMode || "redirect"
  }

  getRefreshTokenByWXCode(appid, loginType, code) {
    const action = "auth.getJwt"

    return this.httpRequest
      .send(action, { appid, loginType, code })
      .then(res => {
        if (res.code) {
          throw new Error(`[tcb-js-sdk] 微信登录失败: ${res.code}`)
        }

        if (res.refresh_token) {
          return { refreshToken: res.refresh_token }
        } else {
          throw new Error(`[tcb-js-sdk] getJwt未返回refreshToken`)
        }
      })
  }

  async signIn() {
    let accessToken = this.cache.getStore(this.accessTokenKey)
    let accessTokenExpire = this.cache.getStore(this.accessTokenExpireKey)

    if (accessToken) {
      if (accessTokenExpire && accessTokenExpire > Date.now()) {
        // access存在且没有过期，那么直接返回
        return {
          credential: {
            accessToken,
            refreshToken: this.cache.getStore(this.refreshTokenKey),
          },
        }
      } else {
        // access token存在但是过期了，那么删除掉重新拉
        this.cache.removeStore(this.accessTokenKey)
        this.cache.removeStore(this.accessTokenExpireKey)
      }
    }

    if (
      Object.values(AllowedScopes).includes(AllowedScopes[this.scope]) === false
    ) {
      throw new Error("错误的scope类型")
    }

    const code = getWeixinCode()

    // 没有code，拉起OAuth
    if (!code) {
      return this.redirect()
    }

    // 有code，用code换refresh token
    const loginType =
      this.scope === "snsapi_login" ? "WECHAT-OPEN" : "WECHAT-PUBLIC"
    const { refreshToken } = await this.getRefreshTokenByWXCode(
      this.appid,
      loginType,
      code
    )

    // 本地存下
    this.cache.setStore(this.refreshTokenKey, refreshToken)

    return {
      credential: {
        refreshToken,
      },
    }
  }

  redirect() {
    let currUrl = removeParam("code", location.href)
    currUrl = removeParam("state", currUrl)
    currUrl = encodeURIComponent(currUrl)

    let host =
      this.scope === "snsapi_login"
        ? "//open.weixin.qq.com/connect/qrconnect"
        : "//open.weixin.qq.com/connect/oauth2/authorize"

    if (LoginModes[this.loginMode] === "redirect") {
      location.href = `${host}?appid=${
        this.appid
      }&redirect_uri=${currUrl}&response_type=code&scope=${this.scope}&state=${
        this.state
      }#wechat_redirect`
    }
  }
}

class Auth extends AuthProvider {
  constructor(config) {
    super(config)
    this.config = config
    this.customAuthProvider = new AuthProvider(this.config)
  }

  weixinAuthProvider({ appid, scope, loginMode, state }) {
    return new WeixinAuthProvider(this.config, appid, scope, loginMode, state)
  }

  async signOut() {
    const {
      cache,
      refreshTokenKey,
      accessTokenKey,
      accessTokenExpireKey,
    } = this.httpRequest

    const action = "auth.logout"
    await this.httpRequest.send(action, {
      refresh_token: cache.getStore(refreshTokenKey),
    })

    cache.removeStore(refreshTokenKey)
    cache.removeStore(accessTokenKey)
    cache.removeStore(accessTokenExpireKey)
  }

  async getAccessToken() {
    return {
      accessToken: (await this.httpRequest.getAccessToken()).accessToken,
      env: this.config.env,
    }
  }

  onLoginStateExpire(callback) {
    addEventListener("loginStateExpire", callback)
  }

  async getLoginState() {
    const { cache, refreshTokenKey, accessTokenKey } = this.httpRequest
    const refreshToken = cache.getStore(refreshTokenKey)
    if (refreshToken) {
      try {
        await this.httpRequest.refreshAccessToken()
      } catch (e) {
        return
      }

      return {
        credential: {
          refreshToken,
          accessToken: cache.getStore(accessTokenKey),
        },
      }
    }
  }

  async signInWithTicket(ticket) {
    if (typeof ticket !== "string") {
      throw new Error("ticket must be a string")
    }
    const res = await this.httpRequest.send("auth.signInWithTicket", { ticket })

    if (res.refresh_token) {
      this.customAuthProvider.setRefreshToken(res.refresh_token)
      return {
        credential: {
          refreshToken: res.refresh_token,
        },
      }
    } else {
      throw new Error("[tcb-js-sdk] 自定义登录失败")
    }
  }

  shouldRefreshAccessToken(hook) {
    this.httpRequest._shouldRefreshAccessTokenHook = hook.bind(this)
  }

  getUserInfo() {
    const action = "auth.getUserInfo"

    return this.httpRequest.send(action, {}).then(function(res) {
      if (res.code) {
        return res
      } else {
        return {
          ...res.data,
          requestId: res.seqId,
        }
      }
    })
  }
}

export const callFunction = function({ name, data }, callback) {
  callback = callback || createPromiseCallback()

  try {
    data = data ? JSON.stringify(data) : ""
  } catch (e) {
    return Promise.reject(e)
  }

  if (!name) {
    return Promise.reject(new Error("函数名不能为空"))
  }

  const action = "functions.invokeFunction"
  let params = {
    function_name: name,
    request_data: data,
  }

  let httpRequest = new Request(this.config)

  httpRequest
    .send(action, params)
    .then(function(res) {
      if (res.code) {
        callback(null, res)
      } else {
        let result = res.data.response_data
        try {
          result = JSON.parse(res.data.response_data)
          callback(null, { result, requestId: res.requestId })
        } catch (e) {
          callback(new Error("response data must be json"))
        }
      }

      return callback.promise
    })
    .catch(callback)

  return callback.promise
}

/*
 * 上传文件
 * @param {string} cloudPath 上传后的文件路径
 * @param {fs.ReadStream} filePath  上传文件的临时路径
 */
export const uploadFile = function(params, callback) {
  callback = callback || createPromiseCallback()

  const metaData = "storage.getUploadMetadata"
  const httpRequest = new Request(this.config)
  const { cloudPath, filePath, onUploadProgress } = params

  httpRequest
    .send(metaData, {
      path: cloudPath,
    })
    .then(metaData => {
      const {
        data: { url, authorization, token, fileId, cosFileId },
        requestId,
      } = metaData

      // 使用临时密匙上传文件
      // https://cloud.tencent.com/document/product/436/14048
      const formData = new FormData()
      formData.append("key", cloudPath)
      formData.append("signature", authorization)
      formData.append("x-cos-meta-fileid", cosFileId)
      formData.append("success_action_status", "201")
      formData.append("x-cos-security-token", token)
      formData.append("file", filePath)

      axios
        .post(url, formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
          onUploadProgress,
        })
        .then(function(res) {
          if (res.status === 201) {
            callback(null, { fileID: fileId, requestId })
          } else {
            callback(new Error(`STORAGE_REQUEST_FAIL: ${res.data}`))
          }
        })
        .catch(callback)
    })
    .catch(callback)

  return callback.promise
}

/**
 * 删除文件
 * @param {Array.<string>} fileList 文件id数组
 */
export const deleteFile = function({ fileList }, callback) {
  callback = callback || createPromiseCallback()

  if (!fileList || !Array.isArray(fileList)) {
    return {
      code: "INVALID_PARAM",
      message: "fileList必须是非空的数组",
    }
  }

  for (let file of fileList) {
    if (!file || typeof file !== "string") {
      return {
        code: "INVALID_PARAM",
        message: "fileList的元素必须是非空的字符串",
      }
    }
  }

  const action = "storage.batchDeleteFile"
  const params = { fileid_list: fileList }

  let httpRequest = new Request(this.config)

  httpRequest
    .send(action, params)
    .then(function(res) {
      if (res.code) {
        callback(null, res)
      } else {
        callback(null, {
          fileList: res.data.delete_list,
          requestId: res.requestId,
        })
      }
    })
    .catch(callback)

  return callback.promise
}

/**
 * 获取文件下载链接
 * @param {Array.<Object>} fileList
 */
export const getTempFileURL = function({ fileList }, callback) {
  callback = callback || createPromiseCallback()

  if (!fileList || !Array.isArray(fileList)) {
    callback(null, {
      code: "INVALID_PARAM",
      message: "fileList必须是非空的数组",
    })
  }

  let file_list = []
  for (let file of fileList) {
    if (typeof file === "object") {
      if (!file.hasOwnProperty("fileID") || !file.hasOwnProperty("maxAge")) {
        callback(null, {
          code: "INVALID_PARAM",
          message: "fileList的元素必须是包含fileID和maxAge的对象",
        })
      }

      file_list.push({ fileid: file.fileID, max_age: file.maxAge })
    } else if (typeof file === "string") {
      file_list.push({ fileid: file })
    } else {
      callback(null, {
        code: "INVALID_PARAM",
        message: "fileList的元素必须是字符串",
      })
    }
  }

  const action = "storage.batchGetDownloadUrl"
  const params = { file_list }

  let httpRequest = new Request(this.config)

  httpRequest
    .send(action, params)
    .then(function(res) {
      if (res.code) {
        callback(null, res)
      } else {
        callback(null, {
          fileList: res.data.download_list,
          requestId: res.requestId,
        })
      }
    })
    .catch(callback)

  return callback.promise
}

export const downloadFile = function({ fileID }, callback) {
  callback = callback || createPromiseCallback()

  let promise = getTempFileURL.call(this, {
    fileList: [{ fileID, maxAge: 600 }],
  })

  promise.then(function(tmpUrlRes) {
    const res = tmpUrlRes.fileList[0]

    if (res.code !== "SUCCESS") {
      return callback(res)
    }

    let tmpUrl = encodeURI(res.download_url)

    axios
      .get(tmpUrl, {
        responseType: "blob",
      })
      .then(function(response) {
        const url = window.URL.createObjectURL(new Blob([response.data]))
        const link = document.createElement("a")
        link.href = url
        link.setAttribute("download", "file.pdf")
        document.body.appendChild(link)
        link.click()
      })
  })
  return callback.promise
}

class TCB {
  constructor(config) {
    this.config = config ? config : this.config
    this.authObj = undefined
  }

  init(config) {
    this.config = { env: config.env, timeout: config.timeout || 15000 }

    return new TCB(this.config)
  }

  auth({ persistence }) {
    if (this.authObj) {
      console.warn("tcb实例只能存在一个auth对象")
      return this.authObj
    }

    Object.assign(this.config, { persistence: persistence || "session" })
    this.authObj = new Auth(this.config)
    return this.authObj
  }

  on(eventName, callback) {
    return addEventListener.apply(this, [eventName, callback])
  }

  callFunction(params, callback) {
    return callFunction.apply(this, [params, callback])
  }

  deleteFile(params, callback) {
    return Storage.deleteFile.apply(this, [params, callback])
  }

  getTempFileURL(params, callback) {
    return Storage.getTempFileURL.apply(this, [params, callback])
  }

  downloadFile(params, callback) {
    return Storage.downloadFile.apply(this, [params, callback])
  }

  uploadFile(params, callback) {
    return Storage.uploadFile.apply(this, [params, callback])
  }
}

let tcb = new TCB()
window.tcb = tcb
