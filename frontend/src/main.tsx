import '@ifrc-go/ui/index.css';
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import * as React from 'react';
console.log('React version at runtime:', React.version, 'createContext exists?', !!React.createContext);


createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
