const getUniqueId = function getUniqueId() {
  return Date.now() + '-' + Math.random();
}

const getSendChannel = function getSendChannel(channel) {
  return 'send-channel-' + channel;
}

const getResponseChannels = function getResponseChannels(channel) {
  const id = getUniqueId();
  return {
    sendChannel: getSendChannel(channel),
    dataChannel: 'response-data-channel-' + channel + '-' + id,
    errorChannel: 'response-error-channel-' + channel + '-' + id,
  };
};

const ipc = {
  call: function call({ reference, channel, data, targetOrigin = '*', transfer }) {
    return new Promise(function (resolve, reject) {
      if (!reference || !channel) {
        throw new Error('reference & channel: required');
      }

      const { sendChannel, dataChannel, errorChannel } = getResponseChannels(channel);

      const receiveMessage = function receiveMessage(event) {
        const { receiveChannel, resultData } = event.data;

        if (receiveChannel !== dataChannel && receiveChannel !== errorChannel) {
          return;
        }

        if (receiveChannel === dataChannel) {
          resolve(resultData);
        } else {
          reject(resultData);
        }

        self.removeEventListener('message', receiveMessage);
      };

      self.addEventListener('message', receiveMessage);

      const completeData = {
        sendChannel,
        dataChannel,
        errorChannel,
        userData: data,
      };

      reference.postMessage(completeData, targetOrigin, transfer);
    });
  },

  answer: function answer({
    reference,
    channel,
    callback,
    targetOrigin = '*',
    transfer,
  }) {
    if (!reference || !channel || !callback) {
      throw new Error('reference & channel & callback: required');
    }

    const sendChannel2 = getSendChannel(channel);

    const listener = function listener(event) {
      const { sendChannel, dataChannel, errorChannel, userData } = event.data;

      if (sendChannel !== sendChannel2) {
        return;
      }

      const send = function send(channel, result) {
        reference.postMessage(
          {
            receiveChannel: channel,
            resultData: result,
          },
          targetOrigin,
          transfer
        );
      };

      Promise.resolve(callback(userData)).then(function (result) {
        send(dataChannel, result);
      }).catch(function (error) {
        send(errorChannel, { name: error.name, message: error.message });
      });
    };

    self.addEventListener('message', listener);

    return function remove() {
      self.removeEventListener('message', listener);
    };
  },
};
