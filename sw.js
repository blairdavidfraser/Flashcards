const CACHE = 'dotlingo-v1';

const PRECACHE = [
    './',
    './manifest.json',
    './assets/css/styles.css',
    './assets/scripts/app.js',
    './assets/scripts/ApplicationDropdownMenu.js',
    './assets/scripts/ApplicationScreenCardEdit.js',
    './assets/scripts/ApplicationScreenDatasetEdit.js',
    './assets/scripts/ApplicationScreenStatistics.js',
    './assets/scripts/ApplicationScreenStudy.js',
    './assets/scripts/Card.js',
    './assets/scripts/Comment.js',
    './assets/scripts/Dataset.js',
    './assets/scripts/Game.js',
    './assets/scripts/Gameplay.js',
    './assets/scripts/GitHubService.js',
    './assets/scripts/Persistence.js',
    './assets/scripts/Statistics.js',
    './assets/scripts/Utilities.js',
];

self.addEventListener('install', e => {
    e.waitUntil(caches.open(CACHE).then(c => c.addAll(PRECACHE)));
    self.skipWaiting();
});

self.addEventListener('activate', e => {
    e.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
        )
    );
    self.clients.claim();
});

// Network-first: always try the server, fall back to cache if offline.
self.addEventListener('fetch', e => {
    if (e.request.method !== 'GET') return;
    e.respondWith(
        fetch(e.request)
            .then(response => {
                const clone = response.clone();
                caches.open(CACHE).then(c => c.put(e.request, clone));
                return response;
            })
            .catch(() => caches.match(e.request))
    );
});
