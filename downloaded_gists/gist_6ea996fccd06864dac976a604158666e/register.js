if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator
      .serviceWorker
      .register('cache.js', { scope: '/' })
      .then(registration => {
        console.log('ServiceWorker registration')
      }, err => {
        console.error('ServiceWorker registration failed', err)
      })
  })
}