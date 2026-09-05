"use strict";
/* Fowler service worker.
 *
 * Precaches the whole app on first visit so it works with no connection
 * afterwards. The app is one multi-MB document with its data baked in, so
 * the install is deliberately all-or-nothing: a half-cached app that loads
 * its shell and then fails to find its word pool is worse than one that
 * admits it is offline.
 */

// Bump this on every deploy that changes fowler.html or views.js. The fetch
// handler below is cache-first and `activate` only deletes caches whose key
// differs from this one — so if the name does not change, a browser that has
// visited once keeps serving the old app forever. The bump is the whole
// update mechanism: changing this file's bytes is what makes the browser
// fetch a new worker at all.
const CACHE_NAME = "fowler-v2";
const SHELL = [
  "./",
  "index.html",
  "fowler.html",
  "views.js",
  "manifest.webmanifest",
  "icons/icon.svg"
];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(function (c) { return c.addAll(SHELL); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(keys.map(function (k) {
          return k === CACHE_NAME ? null : caches.delete(k);
        }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET") return;
  // Cache first: nothing here changes without a redeploy, and the whole point
  // is that a dead network is indistinguishable from a live one.
  e.respondWith(
    caches.match(e.request).then(function (hit) {
      return hit || fetch(e.request).then(function (res) {
        if (res && res.ok && res.type === "basic") {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(function (c) { c.put(e.request, copy); });
        }
        return res;
      });
    })
  );
});
