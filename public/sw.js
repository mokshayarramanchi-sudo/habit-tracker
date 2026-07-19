self.addEventListener('push', function(event) {
    const data = event.data ? event.data.json() : {};
    const title = data.title || "Daily Habit Tracker";
    
    const options = {
        body: data.body || "You have a new notification.",
        icon: '/images/logo.png', // Assuming you have a logo image
        badge: '/images/logo.png',
        data: {
            url: data.url || '/home'
        }
    };

    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    event.waitUntil(
        clients.openWindow(event.notification.data.url)
    );
});

// Required for Chrome to recognize the app as an installable PWA
self.addEventListener('fetch', function(event) {
    // Just pass the request through to the network
    event.respondWith(fetch(event.request));
});
