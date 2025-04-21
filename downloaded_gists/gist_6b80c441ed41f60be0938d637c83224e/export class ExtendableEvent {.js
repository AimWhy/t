export class ExtendableEvent {
  queue = [];

  get ready() {
    return (async () => {
      while (this.queue.length > 0) {
        await this.queue.shift();
      }
    })();
  }

  waitUntil(promise) {
    this.queue.push(promise);
  }
}

export class FetchEvent extends ExtendableEvent {
  preloadResponse = Promise.resolve();
  handled = Promise.resolve(void 0);
  response = Promise.resolve(void 0);

  constructor(request, clientId, resultingClientId) {
    super();
  }

  respondWith(r) {
    this.response = Promise.resolve(r);
  }
}

/********************************************************/

class Context {
  eventHandlers = new Map();
  constructor() {
  }

  addEventListener(type, listener, options) {
    this.eventHandlers.set(type, listener);
  }

  removeEventListener(type, listener, options) {
    this.eventHandlers.delete(type);
  }

  handleFetch(req, clientId = '') {
    if (!this.eventHandlers.has('fetch')) {
      throw new Error('No fetch handler registered');
    }

    const event = new FetchEvent(null, '', '');
    this.eventHandlers.get('fetch').call(this, event);

    return [event.response, event.ready];
  }
}

const context = new Context();
await Promise.all(context.handleFetch(new Request('https://example.com')));
