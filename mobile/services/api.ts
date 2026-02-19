import axios from 'axios';
import authService from './auth';
import { router } from 'expo-router';

// Create a configured axios instance
const api = axios.create({
  headers: {
    'ngrok-skip-browser-warning': 'true'
  }
});

// Response Interceptor
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error;
    
    // Retry logic for 429 Too Many Requests
    if (response?.status === 429 && !config._retry) {
      config._retry = true;
      const delay = config._retryCount ? config._retryCount * 1000 : 1000;
      config._retryCount = (config._retryCount || 1) + 1;
      
      if (config._retryCount <= 3) {
        console.warn(`[API] 429 detected. Retrying in ${delay}ms... (Attempt ${config._retryCount-1})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return api(config);
      }
    }

    // If we get a 401 (Unauthorized) and it's not a login request
    if (response?.status === 401) {
      console.warn('[API] 401 Unauthorized detected. Logging out...');
      
      // Perform logout to clear tokens
      await authService.logout();
      
      // Redirect to login
      router.replace('/auth/login');
    }
    return Promise.reject(error);
  }
);

export default api;
