self.addEventListener('push', function(event) {
    let data = {};
    if (event.data) {
        try {
            data = event.data.json();
        } catch (e) {
            data = { body: event.data.text() };
        }
    }
    const title = data.title || "Daily Habit Tracker";
    
    const options = {
        body: data.body || "You have a new notification.",
        icon: '/images/logo.png',
        badge: '/images/logo.png',
        vibrate: [100, 50, 100],
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
    const targetUrl = event.notification.data ? event.notification.data.url : '/home';
    
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
            for (let i = 0; i < clientList.length; i++) {
                const client = clientList[i];
                if (client.url.includes(targetUrl) && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(targetUrl);
            }
        })
    );
});

// Required for Chrome to recognize the app as an installable PWA
self.addEventListener('fetch', function(event) {
    // Never intercept API requests or non-GET requests in service worker
    if (event.request.url.includes('/api/') || event.request.method !== 'GET') {
        return;
    }
    // Pass standard GET requests through to the network
    event.respondWith(fetch(event.request));
});
