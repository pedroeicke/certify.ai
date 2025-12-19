
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';

// Ensure process.env exists globally to prevent crashes in the browser
if (typeof (window as any).process === 'undefined') {
  (window as any).process = { env: {} };
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
