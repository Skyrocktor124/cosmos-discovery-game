import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './wallet.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

// Offline is the whole point — a ticket wallet that needs signal at the gate is
// no better than the inbox it replaces. Production only: in dev the cache just
// gets in the way of hot reloads.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      await navigator.serviceWorker.register(new URL('../wanderpass-sw.js', location.href));
      const reg = await navigator.serviceWorker.ready;
      // The worker cannot see the requests that loaded this page, so hand it
      // the list — otherwise the app is only offline-ready on the second visit.
      const urls = performance
        .getEntriesByType('resource')
        .map(e => e.name)
        .filter(name => name.startsWith(location.origin));
      reg.active?.postMessage({ type: 'cache-urls', urls: [location.href, ...urls] });
    } catch {
      // Service workers are blocked (private mode, http origin) — the app still
      // works, it just will not open without a connection.
    }
  });
}
