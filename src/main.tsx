import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';

// In development / AI Studio preview, unregister any active service worker
// to avoid aggressive autoUpdate reload loops.
if (import.meta.env.DEV && typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.unregister().catch(() => {});
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary fallbackTitle="Error al iniciar la aplicación">
    <App />
  </ErrorBoundary>
);
