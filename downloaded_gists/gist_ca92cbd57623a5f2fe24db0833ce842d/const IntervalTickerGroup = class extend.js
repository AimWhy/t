const IntervalTickerGroup = class extends EventTarget {
  constructor(rate = 1000 / 60) {
    super();
    this.setRate(rate);
  }
  tick() {
    this.dispatchEvent({ type: 'tick', target: this });
  }
  setRate(rate) {
    clearInterval(this._interval);
    this._interval = setInterval(() => this.tick(), rate);
  }
  destroy() {
    clearInterval(this._interval);
  }
};

export const Ticker = class extends EventTarget {
  _group = null;
  _isAlive = false;
  _tickable = null;

  get tickable() {
    return this._tickable;
  }
  get tickerGroup() {
    this._group ||= Ticker.defaultTickerGroup ||= new IntervalTickerGroup();
    return this._group;
  }

  constructor(obj) {
    super();
    this.setTickable(obj);
  }

  setTickable(tickable) {
    this._tickable = tickable;
    this._tickable.getTicker ||= () => this;
  }
  setTickerGroup(group) {
    this._isAlive && this.stop();
    this._group = group;
    this._isAlive && this.start();
  }
  tick() {
    this._tickable.tick();
  }
  start() {
    this._isAlive = true;
    this.tickerGroup.addEventListener('tick', this.tick);
    this.dispatchEvent({ type: 'start', target: this });
  }
  stop() {
    this._isAlive = false;
    this.tickerGroup.removeEventListener('tick', this.tick);
    this.dispatchEvent({ type: 'stop', target: this });
  }

  static defaultTickerGroup = null;
  static destroy() {
    if (Ticker.defaultTickerGroup) {
      Ticker.defaultTickerGroup.destroy();
      Ticker.defaultTickerGroup = null;
    }
  }
};