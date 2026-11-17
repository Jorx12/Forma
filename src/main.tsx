import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { ensureSeed } from './db/seed';
import { registerSW } from 'virtual:pwa-register';
import './index.css';

registerSW({ immediate: true });

ensureSeed().finally(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
