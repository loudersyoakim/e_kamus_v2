"use strict";

const CACHE = "E-Kamus-V10";

const CORE_ASSETS = [
  "./index.html",
  "./manifest.json",
  "./data/kosakata.json",
  "./data/quiz.json",
  "./js/quiz.js",
  "./page/front_cover.html",
  "./page/introduction.html",
  "./page/biodatapengembang.html",
  "./page/learningachievment.html",
  "./page/learningobjectives.html",
  "./page/userguide.html",
  "./page/quiz.html",
  "./page/back_cover.html",
  "./assets/icon-192.png",
  "./assets/icon-512.png",
  "./font/GeorgiaPro-Regular.ttf",
  "./font/GeorgiaPro-SemiBold.ttf",
  "./font/NunitoSans-Italic.ttf",
  "https://cdn.jsdelivr.net/npm/page-flip@2.0.7/dist/js/page-flip.browser.js",

  "./img/tableofcontent.png",
  "./img/shortcut_bg.png",
  "./img/start-quiz.png",
  "./img/think1.png",
  "./img/think2.png",
  "./img/happy1.png",
  "./img/happy2.png",
  "./img/sad1.png",
  "./img/sad2.png",
  "./img/score-100.png",
  "./img/score-90.png",
  "./img/score-80.png",
  "./img/score-70.png",
  "./img/score-60.png",
  "./img/score-50.png",
];

/* ─────────────────────────────────────────
   INSTALL
   ───────────────────────────────────────── */
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then(async (cache) => {
      await Promise.allSettled(
        CORE_ASSETS.map((url) =>
          cache
            .add(url)
            .catch((err) =>
              console.warn("[SW] Skip Core Asset:", url, err.message),
            ),
        ),
      );

      try {
        const response = await fetch("./data/kosakata.json");
        const data = await response.json();
        const dynamicImages = [];

        if (data && data.chapters) {
          data.chapters.forEach((bab) => {
            if (bab.bg_img) dynamicImages.push(bab.bg_img);
            if (bab.words) {
              bab.words.forEach((w) => {
                if (w.img && w.img !== "null" && w.img !== "") {
                  dynamicImages.push(w.img);
                }
              });
            }
          });
        }

        await Promise.allSettled(
          dynamicImages.map((imgUrl) =>
            cache
              .add(imgUrl)
              .catch((err) => console.warn("[SW] Skip Dynamic Image:", imgUrl)),
          ),
        );
      } catch (err) {
        console.warn("[SW] Gagal membaca JSON untuk dynamic caching", err);
      }

      return self.skipWaiting();
    }),
  );
});

/* ─────────────────────────────────────────
   ACTIVATE
   ───────────────────────────────────────── */
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.map((k) => k !== CACHE && caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

/* ─────────────────────────────────────────
   FETCH 
   ───────────────────────────────────────── */
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  if (!e.request.url.startsWith("http")) return;

  const url = e.request.url;

  /* JSON */
  if (url.includes("/data/")) {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE).then((c) => c.put(e.request, clone));
          }
          return res;
        })
        .catch(() =>
          caches.match(e.request).then(
            (cached) =>
              cached ||
              new Response(JSON.stringify({ chapters: [] }), {
                headers: { "Content-Type": "application/json" },
              }),
          ),
        ),
    );
    return;
  }

  /* Gambar & font */
  if (url.includes("/img/") || url.includes("/font/")) {
    e.respondWith(
      caches.match(e.request).then((cached) => {
        if (cached) return cached;
        return fetch(e.request).then((fresh) => {
          if (fresh && fresh.ok) {
            const clone = fresh.clone();
            caches.open(CACHE).then((c) => c.put(e.request, clone));
          }
          return fresh;
        });
      }),
    );
    return;
  }

  /* HTML & JS (Perbaikan Logika Fallback) */
  e.respondWith(
    caches.match(e.request).then((cached) => {
      const networkFetch = fetch(e.request)
        .then((fresh) => {
          if (fresh && fresh.ok) {
            const clone = fresh.clone();
            caches.open(CACHE).then((c) => c.put(e.request, clone));
          }
          return fresh;
        })
        .catch(() => null);

      if (cached) {
        networkFetch;
        return cached;
      }

      return networkFetch.then((res) => {
        if (res) return res;

        // PERBAIKAN FATAL:
        // Jangan pernah kembalikan index.html jika browser sedang meminta file JS!
        if (e.request.destination === "document" || url.includes(".html")) {
          return caches.match("./index.html");
        }
        return new Response("", { status: 404, statusText: "Offline" });
      });
    }),
  );
});
