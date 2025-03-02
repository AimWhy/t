"use strict";

self.addEventListener('install', (event) => {
    event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener('message', (event) => {
    switch (event.data.type) {
        case "broadcast":
            const message = event.data;
            message.sender_id = event.source.id;

            event.waitUntil(messageClients(message));
            break;
        default:
            console.info("Service Worker: unknown message", event);
    }
});

self.addEventListener("notificationclick", (event) => {
    const notification = event.notification;
    const localURL = ensureLocalURL(notification.data ? notification.data.url : void 0);
    event.waitUntil(focusWindow(localURL));
});

// Relay a message to all clients (including the sender)
function messageClients(message) {
    return self.clients.matchAll().then((clientList) => {
        clientList.forEach((client) => {
            client.postMessage(message);
        })
    });
}

// Try to focus a tab with the given url. When such a tab is not found, a new one will be opened.
function focusWindow(url) {
    return clients.matchAll({ type: "window" }).then((clientList) => {
        // Check if there already is a tab with has this url open.
        for (const client of clientList) {
            if ((client.url === url) && ('focus' in client)) {
                return client.focus();
            }
        }

        if (clients.openWindow) {
            return clients.openWindow(url);
        }
    });
}