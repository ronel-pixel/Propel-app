import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { PayPalScriptProvider } from '@paypal/react-paypal-js'
import '@/index.css'
import App from '@/App'
import { AuthProvider } from '@/contexts/AuthContext'

const initialOptions = {
  clientId: import.meta.env.VITE_PAYPAL_CLIENT_ID, 
  currency: "USD",
  intent: "capture",
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>

    <PayPalScriptProvider options={initialOptions}>
  <AuthProvider>
    <App />
  </AuthProvider>
</PayPalScriptProvider>
  </StrictMode>,
)
