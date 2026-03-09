const CACHE_NAME = "poddy-calculator-v1";

const urlsToCache = [

"/pages/tarifs.html",
"/assets/js/calculs.js",
"/assets/js/postal-codes.js",
"/assets/css/templatemo-space-dynamic.css"

];

self.addEventListener("install", event => {

    self.skipWaiting();

event.waitUntil(

caches.open(CACHE_NAME)
.then(cache => cache.addAll(urlsToCache))

);

});

self.addEventListener("activate", event => {

self.clients.claim();

});

self.addEventListener("fetch", event => {

event.respondWith(

caches.match(event.request)
.then(response => response || fetch(event.request))

);

});