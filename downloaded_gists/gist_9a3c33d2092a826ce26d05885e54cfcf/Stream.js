
export const onMessageListeners = new Map();
const sendMessage = () => { /* onMessageListeners.get(messageID); */ };
const receiveMessage = (messageID, callback) => onMessageListeners.set(messageID, callback);
const createNanoEvents = () => { };

class Stream {
  constructor(t) {
    this.internalInfo = t;
    this.emitter = createNanoEvents();
    this.isClosed = false;

    this.handleStreamClose = () => {
      if (!this.isClosed) {
        this.isClosed = true;
        this.emitter.emit('closed', true);
        this.emitter.events = {};
      }
    };

    // 中心调度器
    if (!Stream.initDone) {
      receiveMessage('__crx_bridge_stream_transfer__', (msg) => {
        const { streamId, streamTransfer, action } = msg.data;
        const stream = Stream.openStreams.get(streamId);

        if (stream && !stream.isClosed) {
          if (action === 'transfer')
            stream.emitter.emit('message', streamTransfer);
          if (action === 'close') {
            Stream.openStreams.delete(streamId);
            stream.handleStreamClose();
          }
        }
      });
      Stream.initDone = true;
    }

    Stream.openStreams.set(t.streamId, this);
  }

  get info() {
    return this.internalInfo;
  }

  send(msg) {
    if (this.isClosed) {
      throw new Error('Attempting to send a message over closed stream. Use stream.onClose(<callback>) to keep an eye on stream status');
    }

    sendMessage('__crx_bridge_stream_transfer__', {
      streamId: this.internalInfo.streamId,
      streamTransfer: msg,
      action: 'transfer',
    }, this.internalInfo.endpoint);
  }

  close(msg) {
    msg && this.send(msg);

    this.handleStreamClose();

    sendMessage('__crx_bridge_stream_transfer__', {
      streamId: this.internalInfo.streamId,
      streamTransfer: null,
      action: 'close',
    }, this.internalInfo.endpoint);
  }

  onMessage(callback) {
    return this.getDisposable('message', callback);
  }

  onClose(callback) {
    return this.getDisposable('closed', callback);
  }

  getDisposable(event, callback) {
    const off = this.emitter.on(event, callback);

    return Object.assign(off, { dispose: off, close: off });
  }
}

Stream.initDone = false;
Stream.openStreams = new Map();

export { Stream };