export class asyncLooping {
  /**   
   * @param {*} interval 轮询的间隔时间   
   * @param {*} func 轮询的请求函数   
   * @param {*} callback 请求响应数据的处理函数   
   * * callback的参数   
   * *  @param params, 原请求参数   
   * *  @param res,请求的响应数据   
   * *  @param isRefresh, 有新的轮询在运行，响应数据可能已过时   
   */
  constructor(interval, func, callback) {
    this.interval = interval;
    this.func = func;
    this.callback = callback;
    this.params = {};
  }

  run(params) {
    this.isFinished = false;
    // 每次run时params设同一个引用，当再次run时可用来判断isRefresh。即可区分不同run，很方便  
    this.params = { ...params };
    this.runTurn(this.params);
  }

  stop() {
    this.isFinished = true;
  }

  destroy() {
    clearTimeout(this.timeout);
  }

  async runTurn(params) {
    clearTimeout(this.timeout);

    const res = await this.func(params);
    const isRefresh = params !== this.params;

    this.callback(params, res, isRefresh);

    if (!isRefresh && !this.isFinished) {
      this.timeout = setTimeout(() => this.runTurn(params), this.interval);
    }
  }

  setCallBack(callback) {
    // 由于函数组件的闭包陷阱，需要重新设置callback以保证在调用该方法时能拿到最新的state    
    this.callback = callback;
  }
}