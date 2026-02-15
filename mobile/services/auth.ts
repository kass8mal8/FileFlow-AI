import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';
import axios from 'axios';
import { AuthTokens } from '../types';
import { secureStorage, appStorage } from '../utils/storage';
import {
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_SCOPES,
  GOOGLE_AUTH_ENDPOINT,
  GOOGLE_TOKEN_ENDPOINT,
  GOOGLE_REVOKE_ENDPOINT,
} from '../utils/constants';

// Enable browser dismissal on iOS
WebBrowser.maybeCompleteAuthSession();

/**
 * Authentication Service
 * Handles Google OAuth2 flow and token management
 */
class AuthService {
  private redirectUri: string;

  constructor() {
    this.redirectUri = AuthSession.makeRedirectUri({
      scheme: Platform.OS === 'web' ? undefined : 'fileflow',
      path: 'auth',
    });
    console.log('[AuthService] Current Platform:', Platform.OS);
    console.log('[AuthService] Redirect URI:', this.redirectUri);
  }

  /**
   * Get Discovery document
   */
  private async getDiscovery(): Promise<AuthSession.DiscoveryDocument> {
    return {
      authorizationEndpoint: GOOGLE_AUTH_ENDPOINT,
      tokenEndpoint: GOOGLE_TOKEN_ENDPOINT,
      revocationEndpoint: GOOGLE_REVOKE_ENDPOINT,
    };
  }

  /**
   * Initiate OAuth2 login flow
   */
  async login(): Promise<AuthTokens> {
    try {
      const discovery = await this.getDiscovery();
      
      const authRequestConfig: AuthSession.AuthRequestConfig = {
        clientId: GOOGLE_CLIENT_ID,
        scopes: GOOGLE_SCOPES,
        redirectUri: this.redirectUri,
        responseType: AuthSession.ResponseType.Code,
        usePKCE: true,
      };

      const authRequest = new AuthSession.AuthRequest(authRequestConfig);
      
      // On Web, COOP errors are common. Testing on a physical device with Expo Go is recommended.
      const result = await authRequest.promptAsync(discovery);

      if (result.type !== 'success') {
        throw new Error(`Authentication ${result.type}`);
      }

      // If usePKCE is true, AuthRequest generates its own codeVerifier
      if (!authRequest.codeVerifier) {
        throw new Error('No code verifier generated');
      }

      // Exchange code for tokens
      const tokens = await this.exchangeCodeForTokens(
        result.params.code,
        authRequest.codeVerifier
      );

      // Store tokens securely
      await secureStorage.setTokens(tokens);

      // Fetch and store user info
      await this.fetchAndStoreUserInfo(tokens.accessToken);

      this.notify();
      return tokens;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  /**
   * Exchange authorization code for access tokens
   */
  private async exchangeCodeForTokens(
    code: string,
    codeVerifier: string
  ): Promise<AuthTokens> {
    try {
      const response = await axios.post(GOOGLE_TOKEN_ENDPOINT, {
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: this.redirectUri,
        grant_type: 'authorization_code',
        code_verifier: codeVerifier,
      });

      return {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token,
        expiresIn: response.data.expires_in,
        tokenType: response.data.token_type,
        scope: response.data.scope,
      };
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        console.error('Token exchange error response:', JSON.stringify(error.response.data, null, 2));
      } else {
        console.error('Token exchange error:', error);
      }
      throw new Error('Failed to exchange code for tokens');
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(): Promise<string> {
    try {
      const refreshToken = await secureStorage.getRefreshToken();
      
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await axios.post(GOOGLE_TOKEN_ENDPOINT, {
        refresh_token: refreshToken,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        grant_type: 'refresh_token',
      });

      const tokens: AuthTokens = {
        accessToken: response.data.access_token,
        refreshToken: refreshToken, // Keep existing refresh token
        expiresIn: response.data.expires_in,
        tokenType: response.data.token_type,
        scope: response.data.scope,
      };

      await secureStorage.setTokens(tokens);

      return tokens.accessToken;
    } catch (error) {
      console.error('Token refresh error:', error);
      throw new Error('Failed to refresh access token');
    }
  }

  /**
   * Get valid access token (refresh if needed)
   */
  async getValidAccessToken(): Promise<string | null> {
    try {
      const accessToken = await secureStorage.getAccessToken();
      if (!accessToken) return null; // No token at all, not authenticated

      const isValid = await secureStorage.isTokenValid();
      if (isValid) return accessToken;

      // Token exists but is expired, try to refresh
      return await this.refreshAccessToken();
    } catch (error) {
      // If refresh fails or no token, treat as unauthenticated
      console.log('Authentication expired or invalid');
      return null;
    }
  }

  /**
   * Fetch user info from Google
   */
  private async fetchAndStoreUserInfo(accessToken: string): Promise<void> {
    try {
      const response = await axios.get(
        'https://www.googleapis.com/oauth2/v2/userinfo',
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      await appStorage.setUserInfo(response.data);
    } catch (error) {
      console.error('Error fetching user info:', error);
    }
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const token = await this.getValidAccessToken();
    return token !== null;
  }

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    try {
      const accessToken = await secureStorage.getAccessToken();
      
      if (accessToken) {
        // Revoke token with Google
        await axios.post(GOOGLE_REVOKE_ENDPOINT, null, {
          params: { token: accessToken },
        });
      }
    } catch (error) {
      console.error('Error revoking token:', error);
    } finally {
      // Clear all stored data
      await secureStorage.clearTokens();
      await appStorage.clearAll();
      this.notify();
    }
  }

  // Event support for auth changes
  private listeners: (() => void)[] = [];
  subscribe(listener: () => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }
  private notify() {
    this.listeners.forEach(l => l());
  }
}

export default new AuthService();
