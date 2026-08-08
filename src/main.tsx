import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import App from './App.tsx'
import { initTheme } from '@/stores/uiStore'
import './index.css'

// Paint the persisted theme before the first render so there is no light flash,
// and keep `system` in sync with the OS afterwards.
initTheme()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
