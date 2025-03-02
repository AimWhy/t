``` html
<svg viewBox="0 0 32 32">
  <circle r="16" cx="16" cy="16"></circle>
</svg>

<div>
  <span>dssd</span>
  <span>中</span>
  <span style="position:absolute">国</span>
</div>

<div class="wrap">
  <div class="text">Lorem ipsum dolor sit amet, consectetur adipisicing elit. Dignissimos labore sit vel itaque delectus atque quos magnam assumenda quod architecto perspiciatis animi.   </div>
</div>
```

```javascript
// ios 通过 iframe 进行跨域存储
/**
 * iOS 禁止 localStorage 跨域傳值
 * iOS 的 Safari 設定中，預設關閉 cookie
 * iOS 的 Chrome 跟一般 Chrome 不太一樣，封鎖了跨域的 localStorage 儲存
 */

var searchSet = decodeURIComponent(window.location.search).substring(1).split('&'),
  i, token, userId

// 从URL上找出需要跨域写入的值
for (i in searchSet) {
  if (searchSet[i].indexOf('token') === 0) {
    token = searchSet[i].split('=')[1]
  }
  if (searchSet[i].indexOf('userId') === 0) {
    userId = searchSet[i].split('=')[1]
  }
}

// 跨域傳值寫入 localStorage, for Safari
localStorage.token = token
localStorage.userId = userId

// 跨域傳值寫入 cookie, for Chrome
$.cookie('token', token, {
  expires: 365,
  path: '/'
})
$.cookie('userId', userId, {
  expires: 365,
  path: '/'
})

```

``` css
svg {
    width:200px;
    height:200px;
    transform: rotate(-90deg);
    border-radius: 50%;
    border: 2px solid lightgray;
    box-sizing: content-box;
}

svg > circle {
    fill: #E8E2D6;
    stroke: #b4a078;
    stroke-width: 32;
    stroke-dasharray: calc(3.14159265358979 * 32 * 0.1) calc(3.14159265358979 * 32);
}

.wrap {
  height: 40px;
  line-height: 20px;
  overflow: hidden;
}
.wrap .text {
  float: right;
  margin-left: -5px;
  width: 100%;
  word-break:break-all;
}
.wrap::before {
  float: left;
  width: 5px;
  content: '';
  height: 40px;
}
.wrap::after {
  float: right;
  content: "...";
  height: 20px;
  line-height: 20px;
  padding-right: 5px;
  text-align: right;
  width: 3em;
  margin-left: -3em;
  position: relative;
  left: 100%;
  top: -20px;
  /* 显示更好的效果 */
  background: linear-gradient(to right, rgba(255, 255, 255, 0), white 50%, white);
}
```