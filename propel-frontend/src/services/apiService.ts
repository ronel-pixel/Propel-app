import axios from 'axios';
import { auth } from '../firebase';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
});

// send token automatically in every request
api.interceptors.request.use(async (config) => {
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken();
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/* ═══════════════════════════════════════════════
   Analysis Service
   ═══════════════════════════════════════════════ */

export const analysisService = {
  /**
   * Send new project for analysis.
   * Supports language: 'en' | 'he'
   */
  analyzeProject: async (
    title: string,
    description: string,
    currentCredits: number,
    language: 'en' | 'he' = 'en',
  ) => {
    if (currentCredits <= 0) {
      throw new Error('NO_CREDITS');
    }
    const response = await api.post('/analysis/analyze', { title, description, language });
    return response.data;
  },

  /** Get all projects */
  getProjects: async () => {
    const response = await api.get('/analysis/projects');
    return response.data;
  },
};

/* ═══════════════════════════════════════════════
   Subscription Service
   ═══════════════════════════════════════════════ */

export const subscriptionService = {
  /**
   * Activate a subscription or refuel credits.
   * Sends the PayPal order ID to the backend for server-side capture & verification.
   * Uses the shared `api` instance so the auth token is attached automatically.
   */
  activate: async (paypalOrderId: string, isRefuel: boolean) => {
    const response = await api.post('/subscription/activate', {
      paypalOrderId,
      isRefuel,
    });
    return response.data;
  },

  /**
   * Cancel subscription. Credits remain active until the next billing cycle.
   * Sets cancelAtPeriodEnd: true on the backend.
   */
  cancel: async () => {
    const response = await api.post('/subscription/cancel');
    return response.data;
  },
};

export default api;
