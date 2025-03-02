/**
 * Cache to store model related data.
 */
export class ArtifactCache {
  private scope: string;
  private cache?: Cache;

  constructor(scope: string) {
    this.scope = scope;
  }

  async fetchWithCache(url: string) {
    const request = new Request(url);
    if (this.cache === void 0) {
      this.cache = await caches.open(this.scope);
    }
    let result = await this.cache.match(request);
    if (result === void 0) {
      await this.cache.add(request);
      result = await this.cache.match(request);
    }
    if (result === void 0) {
      throw Error("Cannot fetch " + url);
    }
    return result;
  }

  async hasAllKeys(keys: string[]) {
    if (this.cache === void 0) {
      this.cache = await caches.open(this.scope);
    }
    return this.cache.keys()
      .then(requests => requests.map(request => request.url))
      .then(cacheKeys => keys.every(key => cacheKeys.indexOf(key) !== -1))
      .catch(err => false);
  }

  async deleteInCache(url: string) {
    if (this.cache === void 0) {
      this.cache = await caches.open(this.scope);
    }
    const result = await this.cache.delete(url);
    return result;
  }
}