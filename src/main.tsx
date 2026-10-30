import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

try {
  const nativeFetch = window.fetch?.bind(window);
  if (nativeFetch) {
    let activeFetch = nativeFetch;
    Object.defineProperty(window, 'fetch', {
      configurable: true,
      enumerable: true,
      get: () => activeFetch,
      set: (fn) => {
        if (typeof fn === 'function') activeFetch = fn;
      },
    });
  }
} catch {
  // Ignore if window.fetch is already locked by the host environment
}

createRoot(document.getElementById('root')!).render(<App />);
