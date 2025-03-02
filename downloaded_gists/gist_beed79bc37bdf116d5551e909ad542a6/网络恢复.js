importScripts(
  "https://storage.googleapis.com/workbox-cdn/releases/6.1.5/workbox-sw.js"
);

const { precacheAndRoute } = workbox.precaching;
const { registerRoute } = workbox.routing;

// 预缓存静态资源
precacheAndRoute([
  { url: "/index.html", revision: "1" },
  { url: "/styles.css", revision: "1" },
  { url: "/script.js", revision: "1" },
]);

// 拦截 post 和 patch 请求
workbox.routing.registerRoute(
  ({ url, request }) => request.method === "POST" || request.method === "PATCH",
  async ({ url, request, event }) => {
    try {
      // 将请求存储在缓存中，并携带请求数据
      const cache = await caches.open("update-requests");
      const data = await request.clone().json();
      await cache.put(
        request,
        new Response(
          JSON.stringify({ url: url.href, method: request.method, data: data })
        )
      );
    } catch (error) {
      console.error("Error storing request in cache:", error);
    }
  }
);

// 监听网络连接恢复事件
self.addEventListener("fetch", (event) => {
  if (event.request.method === "GET" && event.request.url === "/online") {
    event.respondWith(
      fetch(event.request).then((response) => {
        // 从缓存中取出更新请求并发送给服务器
        caches.open("update-requests").then((cache) => {
          cache.keys().then((keys) => {
            keys.forEach((key) => {
              cache.match(key).then(async (cachedRequest) => {
                const data = await cachedRequest.json();
                fetch(data.url, {
                  method: data.method,
                  body: JSON.stringify(data.data),
                });
                cache.delete(key);
              });
            });
          });
        });
        return response;
      })
    );
  }
});
