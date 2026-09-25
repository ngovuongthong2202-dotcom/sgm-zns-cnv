import React, {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AuthProvider } from './modules/iam/ui/AuthContext.tsx';
import { Toaster } from 'react-hot-toast';
import { ErrorBoundary } from './design-system';

const originalConsoleError = console.error;
console.error = (...args) => {
  if (
    typeof args[0] === 'string' &&
    args[0].includes("Can't perform a React state update on a component that hasn't mounted yet")
  ) {
    return;
  }
  originalConsoleError(...args);
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>

    <ErrorBoundary>
      <AuthProvider>
        <App />
        <Toaster 
          position="top-right" 
          toastOptions={{
            className: 'bg-white text-slate-800 font-medium shadow-premium-lg border border-slate-100 rounded-xl px-4 py-3 min-w-[300px]',
            duration: 3000,
            success: {
              iconTheme: { primary: '#10b981', secondary: '#fff' },
            },
            error: {
              iconTheme: { primary: '#ef4444', secondary: '#fff' },
            }
          }}
        />
      </AuthProvider>
    </ErrorBoundary>
  </StrictMode>,
);
