import { pluralize, underscore } from "inflected"

class BaseExtend {
  constructor(config) {
    this.request = new RequestFactory(config)
    this.config = config
  }

  All(token = null) {
    const { includes, sort, limit, offset, filter } = this

    this.call = this.request.send(
      buildURL(this.endpoint, { includes, sort, limit, offset, filter }),
      "GET",
      undefined,
      token,
      this
    )

    return this.call
  }

  Get(id, token = null) {
    this.call = this.request.send(
      buildURL(`${this.endpoint}/${id}`, { includes: this.includes }),
      "GET",
      undefined,
      token,
      this
    )

    return this.call
  }

  Filter(filter) {
    this.filter = filter
    return this
  }

  Limit(value) {
    this.limit = value
    return this
  }

  Offset(value) {
    this.offset = value
    return this
  }

  Sort(value) {
    this.sort = value
    return this
  }

  With(includes) {
    if (includes) {
      this.includes = includes.toString().toLowerCase()
    }
    return this
  }
}

class CRUDExtend extends BaseExtend {
  Create(body) {
    return this.request.send(this.endpoint, "POST", {
      ...body,
      type: singularize(this.endpoint),
    })
  }

  Delete(id) {
    return this.request.send(`${this.endpoint}/${id}`, "DELETE")
  }

  Update(id, body, token = null) {
    return this.request.send(
      `${this.endpoint}/${id}`,
      "PUT",
      {
        ...body,
        type: singularize(this.endpoint),
      },
      token
    )
  }
}

function buildRelationshipData(type, ids) {
  let data = []

  if (ids === null || ids.length === 0) return data

  if (typeof ids === "string") {
    const obj = { type: underscore(type), id: ids }

    if (type === "main-image") return obj

    return [obj]
  }

  if (Array.isArray(ids)) {
    data = ids.map(id => ({
      type: underscore(type),
      id,
    }))
  }

  return data
}

function formatUrlResource(type) {
  if (type === "main-image") return type

  return pluralize(type)
}

function createCartIdentifier() {
  return "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx".replace(/[x]/g, () =>
    ((Math.random() * 16) | 0).toString(16)
  )
}

function cartIdentifier(storage) {
  const cartId = createCartIdentifier()

  if (storage.get("mcart") !== null) {
    return storage.get("mcart")
  }

  storage.set("mcart", cartId)

  return cartId
}

function parseJSON(response) {
  return new Promise(resolve => {
    response.text().then(body => {
      resolve({
        status: response.status,
        ok: response.ok,
        json: body !== "" ? JSON.parse(body) : "{}",
      })
    })
  })
}

function formatFilterString(type, filter) {
  const filterStringArray = Object.keys(filter).map(key => {
    const value = filter[key]
    let queryString = `${key},${value}`

    if (typeof value === "object")
      queryString = Object.keys(value).map(
        attr => `${key}.${attr},${value[attr]}`
      )

    return `${type}(${queryString})`
  })

  return filterStringArray.join(":")
}

function formatQueryString(key, value) {
  if (key === "limit" || key === "offset") {
    return `page${value}`
  }

  if (key === "filter") {
    const filterValues = Object.keys(value).map(filter =>
      formatFilterString(filter, value[filter])
    )

    return `${key}=${filterValues.join(":")}`
  }

  return `${key}=${value}`
}

function buildQueryParams({ includes, sort, limit, offset, filter }) {
  const query = {}

  if (includes) {
    query.include = includes
  }

  if (sort) {
    query.sort = `${sort}`
  }

  if (limit) {
    query.limit = `[limit]=${limit}`
  }

  if (offset) {
    query.offset = `[offset]=${offset}`
  }

  if (filter) {
    query.filter = filter
  }

  return Object.keys(query)
    .map(k => formatQueryString(k, query[k]))
    .join("&")
}

function buildURL(endpoint, params) {
  if (
    params.includes ||
    params.sort ||
    params.limit ||
    params.offset ||
    params.filter
  ) {
    const paramsString = buildQueryParams(params)

    return `${endpoint}?${paramsString}`
  }

  return endpoint
}

function buildRequestBody(body) {
  let parsedBody

  if (body) {
    parsedBody = `{
      "data": ${JSON.stringify(body)}
    }`
  }

  return parsedBody
}

function buildCartItemData(id, quantity = null, type = "cart_item") {
  const payload = {
    type,
  }

  if (type === "cart_item") {
    Object.assign(payload, {
      id,
      quantity: parseInt(quantity, 10),
    })
  }

  if (type === "promotion_item") {
    Object.assign(payload, {
      code: id,
    })
  }

  return payload
}

function buildCartCheckoutData(customer, billing_address, shipping_address) {
  let parsedCustomer = customer

  if (typeof customer === "string") parsedCustomer = { id: customer }

  return {
    customer: parsedCustomer,
    billing_address,
    shipping_address,
  }
}

function resetProps(instance) {
  const inst = instance
  ;["includes", "sort", "limit", "offset", "filter"].forEach(
    e => delete inst[e]
  )
}

class ProductsEndpoint extends CRUDExtend {
  constructor(endpoint) {
    super(endpoint)
    this.endpoint = "products"
  }

  CreateRelationships(id, type, resources) {
    const body = buildRelationshipData(type, resources)
    const parsedType = formatUrlResource(type)

    return this.request.send(
      `${this.endpoint}/${id}/relationships/${parsedType}`,
      "POST",
      body
    )
  }

  DeleteRelationships(id, type, resources) {
    const body = buildRelationshipData(type, resources)
    const parsedType = formatUrlResource(type)

    return this.request.send(
      `${this.endpoint}/${id}/relationships/${parsedType}`,
      "DELETE",
      body
    )
  }

  UpdateRelationships(id, type, resources = null) {
    const body = buildRelationshipData(type, resources)
    const parsedType = formatUrlResource(type)

    return this.request.send(
      `${this.endpoint}/${id}/relationships/${parsedType}`,
      "PUT",
      body
    )
  }
}

class CurrenciesEndpoint extends BaseExtend {
  constructor(config) {
    super(config)
    this.endpoint = "currencies"
    this.storage = config.storage
  }

  Create(body) {
    return this.request.send(`${this.endpoint}`, "POST", body)
  }

  Delete(id) {
    return this.request.send(`${this.endpoint}/${id}`, "DELETE")
  }

  Update(id, body) {
    return this.request.send(`${this.endpoint}/${id}`, "PUT", body)
  }

  Set(currency) {
    const { config, storage } = this

    storage.set("mcurrency", currency)
    config.currency = currency

    const promise = new Promise((resolve, reject) => {
      const request = storage.get("mcurrency")

      try {
        resolve(request)
      } catch (err) {
        reject(new Error(err))
      }
    })

    return promise
  }

  Active() {
    const { storage } = this

    const promise = new Promise((resolve, reject) => {
      const request = storage.get("mcurrency")

      try {
        resolve(request)
      } catch (err) {
        reject(new Error(err))
      }
    })

    return promise
  }
}

class BrandsEndpoint extends CRUDExtend {
  constructor(endpoint) {
    super(endpoint)
    this.endpoint = "brands"
  }
}

class CartEndpoint extends BaseExtend {
  constructor(request, id) {
    super(...arguments)
    this.request = request
    this.cartId = id
    this.endpoint = "carts"
  }

  Get() {
    return this.request.send(`${this.endpoint}/${this.cartId}`, "GET")
  }

  Items() {
    const { includes, sort, limit, offset, filter } = this

    this.call = this.request.send(
      buildURL(`${this.endpoint}/${this.cartId}/items`, {
        includes,
        sort,
        limit,
        offset,
        filter,
      }),
      "GET"
    )

    return this.call
  }

  AddProduct(productId, quantity = 1, data = {}) {
    const body = buildCartItemData(productId, quantity)

    return this.request.send(`${this.endpoint}/${this.cartId}/items`, "POST", {
      ...body,
      ...data,
    })
  }

  AddCustomItem(body) {
    const itemObject = Object.assign(body, {
      type: "custom_item",
    })

    return this.request.send(
      `${this.endpoint}/${this.cartId}/items`,
      "POST",
      itemObject
    )
  }

  AddPromotion(code) {
    const body = buildCartItemData(code, null, "promotion_item")

    return this.request.send(
      `${this.endpoint}/${this.cartId}/items`,
      "POST",
      body
    )
  }

  RemoveItem(itemId) {
    return this.request.send(
      `${this.endpoint}/${this.cartId}/items/${itemId}`,
      "DELETE"
    )
  }

  UpdateItemQuantity(itemId, quantity) {
    const body = buildCartItemData(itemId, quantity)

    return this.request.send(
      `${this.endpoint}/${this.cartId}/items/${itemId}`,
      "PUT",
      body
    )
  }

  AddItemTax(itemId, taxData) {
    const body = Object.assign(taxData, {
      type: "tax_item",
    })

    return this.request.send(
      `${this.endpoint}/${this.cartId}/items/${itemId}/taxes`,
      "POST",
      body
    )
  }

  RemoveItemTax(itemId, taxItemId) {
    return this.request.send(
      `${this.endpoint}/${this.cartId}/items/${itemId}/taxes/${taxItemId}`,
      "DELETE"
    )
  }

  UpdateItem(itemId, quantity, data = {}) {
    const body = buildCartItemData(itemId, quantity)

    return this.request.send(
      `${this.endpoint}/${this.cartId}/items/${itemId}`,
      "PUT",
      { ...body, ...data }
    )
  }

  Checkout(customer, billing_address, shipping_address = billing_address) {
    const body = buildCartCheckoutData(
      customer,
      billing_address,
      shipping_address
    )

    return this.request.send(
      `${this.endpoint}/${this.cartId}/checkout`,
      "POST",
      body
    )
  }

  Delete() {
    return this.request.send(`${this.endpoint}/${this.cartId}`, "DELETE")
  }
}

class CategoriesEndpoint extends CRUDExtend {
  constructor(endpoint) {
    super(endpoint)
    this.endpoint = "categories"
  }

  Tree() {
    return this.request.send(`${this.endpoint}/tree`, "GET")
  }
}

class CollectionsEndpoint extends CRUDExtend {
  constructor(endpoint) {
    super(endpoint)
    this.endpoint = "collections"
  }
}

class IntegrationsEndpoint extends CRUDExtend {
  constructor(endpoint) {
    super(endpoint)
    this.endpoint = "integrations"
  }
}

class OrdersEndpoint extends BaseExtend {
  constructor(endpoint) {
    super(endpoint)
    this.endpoint = "orders"
  }

  Items(id) {
    return this.request.send(`${this.endpoint}/${id}/items`, "GET")
  }

  Payment(id, body) {
    return this.request.send(`${this.endpoint}/${id}/payments`, "POST", body)
  }

  Transactions(id) {
    console.warn(
      `DeprecationWarning: 'Order.Transactions(id)' will soon be deprecated. It's recommended you use Transactions class directly to get all, capture and refund transactions.`
    )
    return this.request.send(`${this.endpoint}/${id}/transactions`, "GET")
  }

  Update(id, body) {
    return this.request.send(`${this.endpoint}/${id}`, "PUT", {
      ...body,
      type: "order",
    })
  }
}

class GatewaysEndpoint extends BaseExtend {
  constructor(endpoint) {
    super(endpoint)
    this.endpoint = "gateways"
  }

  Update(slug, body) {
    return this.request.send(`${this.endpoint}/${slug}`, "PUT", body)
  }

  Enabled(slug, enabled) {
    return this.request.send(`${this.endpoint}/${slug}`, "PUT", {
      type: "gateway",
      enabled,
    })
  }
}

class CustomersEndpoint extends CRUDExtend {
  constructor(endpoint) {
    super(endpoint)
    this.endpoint = "customers"
  }

  Token(email, password) {
    return this.request.send(`${this.endpoint}/tokens`, "POST", {
      email,
      password,
      type: "token",
    })
  }
}

class InventoriesEndpoint extends BaseExtend {
  constructor(endpoint) {
    super(endpoint)
    this.endpoint = "inventories"
  }

  Get(productId) {
    return this.request.send(`${this.endpoint}/${productId}`, "GET")
  }

  IncrementStock(productId, quantity) {
    return this.request.send(
      `${this.endpoint}/${productId}/transactions`,
      "POST",
      { action: "increment", quantity, type: "stock-transaction" }
    )
  }

  DecrementStock(productId, quantity) {
    return this.request.send(
      `${this.endpoint}/${productId}/transactions`,
      "POST",
      { action: "decrement", quantity, type: "stock-transaction" }
    )
  }

  AllocateStock(productId, quantity) {
    return this.request.send(
      `${this.endpoint}/${productId}/transactions`,
      "POST",
      { action: "allocate", quantity, type: "stock-transaction" }
    )
  }

  DeallocateStock(productId, quantity) {
    return this.request.send(
      `${this.endpoint}/${productId}/transactions`,
      "POST",
      { action: "deallocate", quantity, type: "stock-transaction" }
    )
  }

  GetTransactions(productId) {
    return this.request.send(
      `${this.endpoint}/${productId}/transactions`,
      "GET"
    )
  }
}

class JobsEndpoint extends BaseExtend {
  constructor(endpoint) {
    super(endpoint)
    this.endpoint = "jobs"
  }

  Create(body) {
    return this.request.send(this.endpoint, "POST", body)
  }
}

class FlowsEndpoint extends CRUDExtend {
  constructor(endpoint) {
    super(endpoint)
    this.endpoint = "flows"
  }

  GetEntries(slug) {
    const { limit, offset } = this

    return this.request.send(
      buildURL(`${this.endpoint}/${slug}/entries`, {
        limit,
        offset,
      }),
      "GET"
    )
  }

  GetEntry(slug, entryId) {
    return this.request.send(
      `${this.endpoint}/${slug}/entries/${entryId}`,
      "GET"
    )
  }

  CreateEntry(slug, body) {
    return this.request.send(`${this.endpoint}/${slug}/entries`, "POST", {
      ...body,
      type: "entry",
    })
  }

  UpdateEntry(slug, entryId, body) {
    return this.request.send(
      `${this.endpoint}/${slug}/entries/${entryId}`,
      "PUT",
      { ...body, type: "entry" }
    )
  }

  DeleteEntry(slug, entryId) {
    return this.request.send(
      `${this.endpoint}/${slug}/entries/${entryId}`,
      "DELETE"
    )
  }
}

class FieldsEndpoint extends CRUDExtend {
  constructor(endpoint) {
    super(endpoint)
    this.endpoint = "fields"
  }
}

class FilesEndpoint extends BaseExtend {
  constructor(endpoint) {
    super(endpoint)
    this.endpoint = "files"
  }

  Delete(id) {
    return this.request.send(`${this.endpoint}/${id}`, "DELETE")
  }
}

class AddressesEndpoint extends BaseExtend {
  constructor(endpoint) {
    super(endpoint)
    this.endpoint = "addresses"
  }

  All({ customer, token = null }) {
    return this.request.send(
      `customers/${customer}/${this.endpoint}`,
      "GET",
      undefined,
      token
    )
  }

  Get({ customer, address, token = null }) {
    return this.request.send(
      `customers/${customer}/${this.endpoint}/${address}`,
      "GET",
      undefined,
      token
    )
  }

  Create({ customer, body, token = null }) {
    return this.request.send(
      `customers/${customer}/${this.endpoint}`,
      "POST",
      { ...body, type: singularize(this.endpoint) },
      token
    )
  }

  Delete({ customer, address, token = null }) {
    return this.request.send(
      `customers/${customer}/${this.endpoint}/${address}`,
      "DELETE",
      undefined,
      token
    )
  }

  Update({ customer, address, body, token = null }) {
    return this.request.send(
      `customers/${customer}/${this.endpoint}/${address}`,
      "PUT",
      { ...body, type: singularize(this.endpoint) },
      token
    )
  }
}

class TransactionsEndpoint extends BaseExtend {
  constructor(endpoint) {
    super(endpoint)
    this.endpoint = "transactions"
  }

  All({ order }) {
    return this.request.send(`orders/${order}/${this.endpoint}`, "GET")
  }

  Capture({ order, transaction }) {
    return this.request.send(
      `orders/${order}/transactions/${transaction}/capture`,
      "POST"
    )
  }

  Refund({ order, transaction }) {
    return this.request.send(
      `orders/${order}/transactions/${transaction}/refund`,
      "POST"
    )
  }
}

class SettingsEndpoint {
  constructor(config) {
    this.request = new RequestFactory(config)
    this.endpoint = "settings"
  }

  All() {
    return this.request.send(this.endpoint, "GET")
  }

  Update(body) {
    return this.request.send(this.endpoint, "PUT", {
      type: "settings",
      ...body,
    })
  }
}

class Credentials {
  constructor(client_id, access_token, expires) {
    this.client_id = client_id
    this.access_token = access_token
    this.expires = expires
  }

  toObject() {
    return {
      client_id: this.client_id,
      access_token: this.access_token,
      expires: this.expires,
    }
  }
}

class RequestFactory {
  constructor(config) {
    this.config = config
    this.storage = config.storage
  }

  authenticate() {
    const { config, storage } = this

    if (!config.client_id) {
      throw new Error("You must have a client_id set")
    }

    if (!config.host) {
      throw new Error("You have not specified an API host")
    }

    const body = {
      grant_type: config.client_secret ? "client_credentials" : "implicit",
      client_id: config.client_id,
    }

    if (config.client_secret) {
      body.client_secret = config.client_secret
    }

    const promise = new Promise((resolve, reject) => {
      config.auth.fetch
        .bind()(`${config.protocol}://${config.host}/${config.auth.uri}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "X-MOLTIN-SDK-LANGUAGE": config.sdk.language,
            "X-MOLTIN-SDK-VERSION": config.sdk.version,
          },
          body: Object.keys(body)
            .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(body[k])}`)
            .join("&"),
        })
        .then(parseJSON)
        .then(response => {
          if (response.ok) {
            resolve(response.json)
          }

          reject(response.json)
        })
        .catch(error => reject(error))
    })

    promise
      .then(response => {
        const credentials = new Credentials(
          config.client_id,
          response.access_token,
          response.expires
        )
        storage.set("moltinCredentials", JSON.stringify(credentials))
      })
      .catch(() => {})

    return promise
  }

  send(uri, method, body = undefined, token = undefined, instance) {
    const { config, storage } = this

    const promise = new Promise((resolve, reject) => {
      const credentials = JSON.parse(storage.get("moltinCredentials"))
      const req = ({ access_token }) => {
        const headers = {
          Authorization: `Bearer: ${access_token}`,
          "Content-Type": "application/json",
          "X-MOLTIN-SDK-LANGUAGE": config.sdk.language,
          "X-MOLTIN-SDK-VERSION": config.sdk.version,
        }

        if (config.application) {
          headers["X-MOLTIN-APPLICATION"] = config.application
        }

        if (config.currency) {
          headers["X-MOLTIN-CURRENCY"] = config.currency
        }

        if (token) {
          headers["X-MOLTIN-CUSTOMER-TOKEN"] = token
        }

        fetch(`${config.protocol}://${config.host}/${config.version}/${uri}`, {
          method: method.toUpperCase(),
          headers,
          body: buildRequestBody(body),
        })
          .then(parseJSON)
          .then(response => {
            if (response.ok) {
              resolve(response.json)
            }

            reject(response.json)
          })
          .catch(error => reject(error))
      }

      if (
        !credentials ||
        !credentials.access_token ||
        credentials.client_id !== config.client_id ||
        Math.floor(Date.now() / 1000) >= credentials.expires
      ) {
        return this.authenticate()
          .then(() => req(JSON.parse(storage.get("moltinCredentials"))))
          .catch(error => reject(error))
      }
      return req(credentials)
    })

    if (instance) resetProps(instance)

    return promise
  }
}

class LocalStorageFactory {
  constructor() {
    this.localStorage = window.localStorage
  }

  set(key, value) {
    return this.localStorage.setItem(key, value)
  }

  get(key) {
    return this.localStorage.getItem(key)
  }

  delete(key) {
    return this.localStorage.removeItem(key)
  }
}

class MemoryStorageFactory {
  constructor() {
    this.state = new Map()
  }

  set(key, value) {
    this.state.set(key, value)
  }

  get(key) {
    return this.state.get(key) || null
  }

  delete(key) {
    this.state.delete(key)
  }
}

class Config {
  constructor(options) {
    const {
      application,
      client_id,
      client_secret,
      currency,
      host,
      storage,
      custom_fetch,
    } = options

    this.application = application
    this.client_id = client_id
    this.client_secret = client_secret
    this.host = host || "api.moltin.com"
    this.protocol = "https"
    this.version = "v2"
    this.currency = currency
    this.auth = {
      expires: 3600,
      uri: "oauth/access_token",
      fetch: custom_fetch || fetch,
    }
    this.sdk = {
      version: "v2",
      language: "JS",
    }
    this.storage = storage || new LocalStorageFactory()
  }
}

export default class Moltin {
  constructor(config) {
    this.config = config
    this.cartId = cartIdentifier(config.storage)

    this.request = new RequestFactory(config)
    this.storage = config.storage

    this.Products = new ProductsEndpoint(config)
    this.Currencies = new CurrenciesEndpoint(config)
    this.Brands = new BrandsEndpoint(config)
    this.Categories = new CategoriesEndpoint(config)
    this.Collections = new CollectionsEndpoint(config)
    this.Integrations = new IntegrationsEndpoint(config)
    this.Orders = new OrdersEndpoint(config)
    this.Gateways = new GatewaysEndpoint(config)
    this.Customers = new CustomersEndpoint(config)
    this.Inventories = new InventoriesEndpoint(config)
    this.Jobs = new JobsEndpoint(config)
    this.Files = new FilesEndpoint(config)
    this.Flows = new FlowsEndpoint(config)
    this.Fields = new FieldsEndpoint(config)
    this.Addresses = new AddressesEndpoint(config)
    this.Transactions = new TransactionsEndpoint(config)
    this.Settings = new SettingsEndpoint(config)
  }

  Cart(id = this.cartId) {
    return new CartEndpoint(this.request, id)
  }

  Authenticate() {
    return this.request.authenticate()
  }
}

const gateway = config => new Moltin(new Config(config))

export { gateway, MemoryStorageFactory, LocalStorageFactory }
