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
    // If we get a 401 (Unauthorized) and it's not a login request
    if (error.response?.status === 401) {
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
