// service-worker.js
// Este script se encarga de la gestión de caché para el funcionamiento offline
// y la mejora del rendimiento de la aplicación.

const CACHE_NAME = 'gestionapp-cache-v1'; // Nombre de la caché y versión
const urlsToCache = [
    '/admin/', // La raíz de la aplicación en GitHub Pages
    '/admin/index.html', // La página principal
    '/admin/clientes.js', // El archivo JavaScript de clientes
    '/admin/manifest.json', // El manifiesto de la aplicación
    '/admin/cervezas.jpeg', // La imagen de fondo
    // Asegúrate de incluir las rutas a tus iconos si los tienes en una carpeta 'icons'
    '/admin/icons/icon-192x192.png',
    '/admin/icons/icon-512x512.png',
    // Puedes añadir más archivos aquí a medida que los crees (ej. ventas.js, inventario.js, etc.)
];

// Evento 'install': Se ejecuta cuando el Service Worker se instala por primera vez.
// Aquí es donde precargamos los recursos esenciales en la caché.
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Service Worker: Cache abierta');
                return cache.addAll(urlsToCache); // Añade todos los archivos especificados a la caché
            })
            .then(() => self.skipWaiting()) // Fuerza la activación del nuevo Service Worker
            .catch((error) => {
                console.error('Service Worker: Fallo en la instalación de la caché', error);
            })
    );
});

// Evento 'activate': Se ejecuta cuando el Service Worker se activa.
// Aquí es donde gestionamos las cachés antiguas para limpiar las versiones no utilizadas.
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Service Worker: Eliminando caché antigua', cacheName);
                        return caches.delete(cacheName); // Elimina las cachés que no coinciden con la actual
                    }
                })
            );
        }).then(() => self.clients.claim()) // Toma control de las páginas existentes
    );
});

// Evento 'fetch': Se ejecuta cada vez que el navegador intenta cargar un recurso.
// Aquí interceptamos las solicitudes y servimos desde la caché si es posible.
self.addEventListener('fetch', (event) => {
    // Para todas las solicitudes, intenta servir desde la caché, luego desde la red.
    event.respondWith(
        caches.match(event.request).then((response) => {
            // Si el recurso está en caché, lo devolvemos.
            if (response) {
                return response;
            }
            // Si no está en caché, intentamos obtenerlo de la red.
            return fetch(event.request).then((networkResponse) => {
                // Clonamos la respuesta porque un stream de respuesta solo puede ser consumido una vez.
                // Una copia va a la caché y la original se devuelve al navegador.
                return caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, networkResponse.clone());
                    return networkResponse;
                });
            }).catch(() => {
                // Esto se ejecuta si la red falla y el recurso no está en caché.
                console.warn('Service Worker: Fallo al cargar recurso desde la red o caché:', event.request.url);
                // Aquí podrías servir una página offline o un recurso de fallback.
                // return caches.match('/admin/offline.html'); // Si tuvieras una página offline
            });
        })
    );
});

