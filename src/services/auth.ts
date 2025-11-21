/**
 * Authentication service for Databricks OBO (On-Behalf-Of) authentication
 */

export interface AuthConfig {
  databricksHost: string;
  token?: string;
}

export interface AuthToken {
  accessToken: string;
  expiresAt: number;
  refreshToken?: string;
}

class AuthService {
  private token: AuthToken | null = null;
  private config: AuthConfig;

  constructor() {
    // In development, use relative URLs to leverage Vite proxy
    // In production, use the actual Databricks host
    const isDevelopment = import.meta.env.DEV;
    const runtimeConfig = (window as any).APP_CONFIG;
    
    this.config = {
      databricksHost: isDevelopment ? '' : (runtimeConfig?.databricksHost || import.meta.env.VITE_DATABRICKS_HOST || window.location.origin),
      token: import.meta.env.VITE_DATABRICKS_TOKEN,
    };
    
    console.log('🔧 Auth service initialized:', {
      isDevelopment,
      databricksHost: this.config.databricksHost || 'using proxy',
    });
  }

  /**
   * Initialize authentication with OBO token
   */
  async initialize(): Promise<void> {
    try {
      // In Databricks Apps with OBO, authentication is handled automatically
      // via the X-Forwarded-Access-Token header
      const isDevelopment = import.meta.env.DEV;
      
      if (isDevelopment) {
        // Local development: use token from .env
        const token = this.config.token;
        if (token) {
          this.token = {
            accessToken: token,
            expiresAt: Date.now() + 3600000,
          };
        }
      } else {
        // Production (Databricks Apps): OBO handles auth automatically
        // No need to fetch/store token - it's passed via headers
        console.log('✅ Running in Databricks Apps - using OBO authentication');
        this.token = {
          accessToken: 'obo-handled',
          expiresAt: Date.now() + 36000000, // Long expiry for OBO
        };
      }
    } catch (error) {
      console.error('Failed to initialize authentication:', error);
      throw new Error('Authentication failed');
    }
  }


  /**
   * Get current authentication token
   */
  getToken(): string | null {
    if (!this.token) {
      return null;
    }

    // Check if token is expired
    if (Date.now() >= this.token.expiresAt) {
      this.token = null;
      return null;
    }

    return this.token.accessToken;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.getToken() !== null;
  }

  /**
   * Get Databricks host URL
   */
  getDatabricksHost(): string {
    return this.config.databricksHost;
  }

  /**
   * Refresh the authentication token
   */
  async refresh(): Promise<void> {
    this.token = null;
    await this.initialize();
  }

  /**
   * Logout and clear authentication
   */
  logout(): void {
    this.token = null;
  }

  /**
   * Get current user information
   */
  async getCurrentUser(): Promise<any> {
    try {
      const isDevelopment = import.meta.env.DEV;
      const baseURL = isDevelopment ? '' : '';
      
      const response = await fetch(`${baseURL}/api/2.0/preview/scim/v2/Me`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user info');
      }

      const userData = await response.json();
      console.log('👤 Current user:', userData);
      return {
        id: userData.id,
        userName: userData.userName,
        displayName: userData.displayName,
        emails: userData.emails,
        photos: userData.photos,
      };
    } catch (error) {
      console.error('Failed to get current user:', error);
      return null;
    }
  }
}

export const authService = new AuthService();

