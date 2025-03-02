// Service Worker script (sw.js)

// Install event - triggered when the service worker is installed
self.addEventListener('install', (event) => {
  console.log('Service Worker installed');
  // Skip waiting to ensure the service worker activates immediately
  self.skipWaiting();
});

// Activate event - triggered when the service worker is activated
self.addEventListener('activate', (event) => {
  console.log('Service Worker activated');
  // Claim clients to ensure the service worker controls all pages immediately
  event.waitUntil(clients.claim());
});

// Fetch event - intercept all network requests
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Check if the request path contains '/download'
  if (url.pathname.includes('/download')) {
    console.log('Download request intercepted:', url.pathname);
    
    // Handle the download request
    event.respondWith(handleDownloadRequest(event.request, url));
  } else {
    // For all other requests, just fetch normally
    event.respondWith(fetch(event.request));
  }
});

// Function to handle download requests
async function handleDownloadRequest(request, url) {
  try {
    // Extract filename from the URL or query parameters
    // This example extracts from the last part of the path, but you might want to customize this
    const pathParts = url.pathname.split('/');
    let fileName = pathParts[pathParts.length - 1];
    
    // Alternatively, get filename from query parameter if present
    const urlParams = new URLSearchParams(url.search);
    if (urlParams.has('filename')) {
      fileName = urlParams.get('filename');
    }
    
    // Ensure we have a filename
    if (!fileName) {
      fileName = 'download';
    }
    
    // Encode the filename for Content-Disposition header
    const encodedFileName = encodeURIComponent(fileName);
    
    // Fetch the original resource
    const response = await fetch(request);
    
    // Create a TransformStream for streaming the response
    const { readable, writable } = new TransformStream();
    
    // Process the response body
    response.body.pipeTo(writable);
    
    // Create new headers based on the original response
    const responseHeaders = new Headers(response.headers);
    
    // Add Content-Disposition header to trigger download
    responseHeaders.set('Content-Disposition', `attachment; filename*=UTF-8''${encodedFileName}`);
    
    // Return a new Response with the modified headers and streamed body
    return new Response(readable, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders
    });
  } catch (error) {
    console.error('Error handling download request:', error);
    return new Response('Download failed', { status: 500 });
  }
}


//----------------------------

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('ServiceWorker registered:', registration.scope);
      })
      .catch(error => {
        console.error('ServiceWorker registration failed:', error);
      });
  });
}