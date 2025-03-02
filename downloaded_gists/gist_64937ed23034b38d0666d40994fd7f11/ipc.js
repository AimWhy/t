'use strict';

function ipcSetup() {
  const getUniqueId = function getUniqueId() {
    return Date.now() + '-' + Math.random();
  };

  const getSendChannel = function getSendChannel(channel) {
    return 'send-channel-' + channel;
  };

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
          throw new Error('[ipc]: reference & channel: required');
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

      const matchSendChannel = getSendChannel(channel);

      const listener = function listener(event) {
        const { sendChannel, dataChannel, errorChannel, userData } = event.data;

        if (sendChannel !== matchSendChannel) {
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

  return ipc;
}

function ipcSetup2() {
  const getUniqueId = function getUniqueId() {
    return Date.now() + '-' + Math.random();
  };

  return {
    call: function call({ reference, channel, data, targetOrigin = '*', transfer }) {
      return new Promise(function (resolve, reject) {
        if (!reference || !channel) {
          throw new Error('[SEF] ipc: reference & channel: required');
        }

        const sendId = getUniqueId();

        const receiveMessage = function receiveMessage(event) {
          const { isOk, confirmSendId, resultData } = event.data;

          if (confirmSendId === sendId) {
            isOk ? resolve(resultData) : reject(resultData);
            self.removeEventListener('message', receiveMessage);
          }
        };

        self.addEventListener('message', receiveMessage);

        reference.postMessage({ confirmChannel: channel, sendId, userData: data }, targetOrigin, transfer);
      });
    },

    answer: function answer({ reference, channel, callback, targetOrigin = '*', transfer }) {
      if (!reference || !channel || !callback) {
        throw new Error('reference & channel & callback: required');
      }

      const listener = function listener(event) {
        const { confirmChannel, sendId, userData } = event.data;

        if (channel === confirmChannel) {
          const send = function send(isOk, result) {
            reference.postMessage(
              { isOk, confirmSendId: sendId, resultData: result },
              targetOrigin,
              transfer
            );
          };

          Promise.resolve(callback(userData)).then(function (result) {
            send(true, result);
          }).catch(function (error) {
            send(false, { name: error.name, message: error.message });
          });
        }
      };

      self.addEventListener('message', listener);

      return function remove() { self.removeEventListener('message', listener); };
    },
  };
}

module.exports = {
  ipcSetup,
  ipc: ipcSetup(),
  ipc2: ipcSetup2()
};
