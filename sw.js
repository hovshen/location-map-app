const CACHE_NAME = "loc-map-app-v1";
const ASSETS = [
-  "./",
-  "./index.html",
-  "./style.css",
-  "./script.js",
-  "./manifest.json",
+  "/",              // ← 保留 root 快取
+  "/index.html",
+  "/style.css",
+  "/script.js",
+  "/manifest.json",
+  "/sw.js",         // ← 快取自己，保證更新時也能取到
   "https://www.gstatic.com/firebasejs/10.10.0/firebase-app-compat.js",
   /* …其他 SDK 與 Maps URL… */
];

self.addEventListener("install", e=>{
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())  // ← 安裝後直接接手
  );
});

self.addEventListener("activate", e=>{
  e.waitUntil(self.clients.claim()); // ← 立刻控制所有 clients
});

self.addEventListener("fetch", e=>{
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});
