(function () {
  function AppBridge() {
    this.callbacks = {};
    this.callbackId = 0;
  }

  AppBridge.prototype.invoke = function (action, data, callback) {
    var callbackId = this.callbackId++;
    this.callbacks[callbackId] = callback;
    uni.postMessage({
      data: {
        action: action,
        data: data,
        callbackId: callbackId
      }
    });
  };

  AppBridge.prototype.handleResponse = function (callbackId, response) {
    if (this.callbacks[callbackId]) {
      this.callbacks[callbackId](response);
      delete this.callbacks[callbackId];
    }
  };

  window.appBridge = new AppBridge();
})();


/*********************************/
在 pages/camera/camera.vue 文件中，监听 WebView 中的 message 事件，并根据 action 参数执行相应的操作：
vue

Copy

<template>
  <view>
    <web-view
      :src="url"
      @message="onMessage"
    ></web-view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      url: '/camera'
    };
  },
  methods: {
    onMessage(e) {
      const { action, data, callbackId } = e.detail.data;
      if (typeof uni[action] === 'function') {
        uni[action](data, (response) => {
          this.postMessageResponse(callbackId, response);
        });
      } else {
        console.error('未知的 action：', action);
      }
    },
    postMessageResponse(callbackId, response) {
      this.$refs.webview.postMessage({
        callbackId: callbackId,
        response: response
      });
    }
  }
};
</script>

/****************************/
在 pages/camera/camera.html 文件中，使用封装好的 appBridge 对象调用 App 的能力：
html

Copy

<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Camera Demo</title>
  <script src="https://cdn.jsdelivr.net/npm/vue@2.6.12"></script>
  <script src="/bridge.js"></script>
</head>
<body>
  <div id="app">
    <button @click="requestAction('chooseImage', { count: 1, sourceType: ['camera'] })">拍</button>
    <button @click="requestAction('chooseImage', { count: 1, sourceType: ['album'] })">选择图片</button>
    <button @click="requestAction('', { type: 'gcj02' })">获取位置</button>
    <!-- 其他 App 能力的调用按钮 -->
  </div>
  <script>
    new Vue({
      el: '#app',
      methods: {
        requestAction: function(action, data) {
          if (window.appBridge) {
            appBridge.invoke(action, data, function(response) {
              if (response.success) {
                alert('操作成功');
              } else {
                alert('操作失败：' + response.error.message);
              }
            });
          } else {
            alert('此功能仅在 App 环境下可用');
          }
        }
      }
    });
  </script>
</body>
</html>


现在，你可以在 WebView 中的 H5 页面中调用所有的 App 能力了。只需要在调用 invoke 方法时传递不同的 action 参数即可。在 App 端，根据 action 参数来执行相应的操作。
GPT-3.5

avatar
uniapp 提供app能力的所有api，列举一下

a minute ago



Software Engineer
以下是 UniApp 提供的一些常用的 App 能力 API：
选择图片：uni.chooseImage
预览图片：uni.previewImage
保存图片到相册：uni.saveImageToPhotosAlbum
获取地理位置：uni.getLocation
扫码：uni.scanCode
拨打电话：uni.makePhoneCall
发送短信：uni.sendSms
获取系统信息：uni.getSystemInfo
获取网络状态：uni.getNetworkType
监听网络状态变化：uni.onNetworkStatusChange
获取屏幕亮度：.getBrightness
设置屏幕亮度：uni.setBrightness
获取剪贴板内容：uni.getClipboardData
设置剪贴板内容：uni.setClipboardData
获取电量信息：uni.getBatteryInfo . 获取屏幕方向：uni.getScreenOrientation
设置屏幕方向：uni.setScreenOrientation
获取系统剪贴板内容变化：uni.onClipboardChange
获取用户信息：uni.getUserInfo 20.录：uni.login
获取用户手机号：uni.getUserPhone
支付：uni.requestPayment
分享：uni.share
获取推送消息：uni.onPush 25 获取本地存储：uni.getStorageSync
设置本地存储：uni.setStorageSync
清除本地存储：uni.removeStorageSync
获取全局唯一的版本更新管理器：uni.getUpdateManager
获取全局唯一的转发管理器：uni.getShareInfo
获取全局唯一的广告管理器：uni.createRewardedVideoAd
以上仅是一些常用的 App 能力 API，UniApp 还提供了许多其他的 API，你可以在官方文档中查看完整的 API 列表。
GPT-3.5

