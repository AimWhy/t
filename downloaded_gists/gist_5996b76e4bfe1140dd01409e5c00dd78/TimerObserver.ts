export const TimerObserver = (() => {
  let times = 0;
  const funcList = new Set();
  const loop = () => {
    times++;
    funcList.forEach((func) => {
      try {
        func(times);
      } catch (e) {
        console.error(e);
      }
    });
    setTimeout(loop, 1000);
  };
  loop();

  return class InnerTimerObserver {
    oldValue = null;
    newValue = null;
    getValue = null;
    interval = null;
    handlerList = new Set();

    constructor(getValue, interval = 1) {
      this.getValue = getValue;
      this.interval = interval;
      funcList.add(this.calcValue.bind(this));
    }

    on(handler) {
      this.handlerList.add(handler);
      return () => {
        this.handlerList.delete(handler);
      };
    }

    async calcValue(times) {
      if (times % this.interval !== 0) {
        return;
      }

      const curValue = await this.getValue();
      this.oldValue = this.newValue;
      this.newValue = curValue;
      if (this.oldValue === this.newValue) {
        return
      }

      for (let handler of this.handlerList) {
        try {
          handler(this.newValue, this.oldValue);
        } catch (e) {
          console.error(e);
        }
      }
    }
  };
})();

let temp = 0;
const onlineObserver = new TimerObserver(() => {
  return new Promise((resolve) => {
    resolve(temp++);
  });
}, 5);

onlineObserver.on((newValue, oldValue) => {
  console.log(newValue, oldValue);
});

/*****************************/

export class FpsObserver {
  private readonly timestamps: number[] = [];

  private callbackId = 0;

  constructor(private readonly videoElement: HTMLVideoElement) {
    const FPS_MEASUREMENT_MAX_SAMPLE_COUNT = 100;
    const updateFps = () => {
      this.timestamps.push(performance.now());
      if (this.timestamps.length > FPS_MEASUREMENT_MAX_SAMPLE_COUNT) {
        this.timestamps.shift();
      }
      this.callbackId = this.videoElement.requestVideoFrameCallback(updateFps);
    };
    this.callbackId = this.videoElement.requestVideoFrameCallback(updateFps);
  }

  getAverageFps(): number | null {
    if (this.timestamps.length <= 1) {
      return null;
    }
    return (
      ((this.timestamps.length - 1) /
        (this.timestamps[this.timestamps.length - 1] - this.timestamps[0])) *
      1000
    );
  }

  stop(): void {
    this.videoElement.cancelVideoFrameCallback(this.callbackId);
  }
}


const $instances = Symbol('instances');
const $activateListener = Symbol('activateListener');
const $deactivateListener = Symbol('deactivateListener');
const $notifyInstances = Symbol('notifyInstances');
const $notify = Symbol('notify');
const $scrollCallback = Symbol('callback');

type ScrollObserverCallback = () => void;

/**
 * This internal helper is intended to work as a reference-counting manager of
 * scroll event listeners. Only one scroll listener is ever registered for all
 * instances of the class, and when the last ScrollObserver "disconnects", that
 * event listener is removed. This spares us from thrashing
 * the {add,remove}EventListener API (the binding cost of these methods has been
 * known to show up in performance analyses) as well as potential memory leaks.
 */
export class ScrollObserver {
  private static[$notifyInstances]() {
    for (const instance of ScrollObserver[$instances]) {
      instance[$notify]();
    }
  }
  private static[$instances]: Set<ScrollObserver> = new Set();
  private static[$activateListener]() {
    window.addEventListener('scroll', this[$notifyInstances], {passive: true});
  }
  private static[$deactivateListener]() {
    window.removeEventListener('scroll', this[$notifyInstances]);
  }

  private[$scrollCallback]: ScrollObserverCallback;

  constructor(callback: ScrollObserverCallback) {
    this[$scrollCallback] = callback;
  }

  /**
   * Listen for scroll events. The configured callback (passed to the
   * constructor) will be invoked for subsequent global scroll events.
   */
  observe() {
    if (ScrollObserver[$instances].size === 0) {
      ScrollObserver[$activateListener]();
    }
    ScrollObserver[$instances].add(this);
  }

  /**
   * Stop listening for scroll events.
   */
  disconnect() {
    ScrollObserver[$instances].delete(this);
    if (ScrollObserver[$instances].size === 0) {
      ScrollObserver[$deactivateListener]();
    }
  }

  private[$notify]() {
    this[$scrollCallback]();
  };
}