import { useState, useCallback } from 'react';
import { apiClient } from '@/lib/api/client';

interface LoginCredentials {
  email: string;
  password: string;
  [key: string]: string;
}

interface AuthResponse {
  token: string;
  refreshToken: string;
}

export const useAuth = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = useCallback(async (credentials: LoginCredentials): Promise<AuthResponse> => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.post<AuthResponse>('/auth/login', credentials);
      const authData = response.data;
      
      // Store tokens in localStorage (client-side only)
      if (typeof window !== 'undefined') {
        localStorage.setItem('token', authData.token);
        localStorage.setItem('refreshToken', authData.refreshToken);
      }
      
      return authData;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to login');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshToken = useCallback(async (): Promise<AuthResponse> => {
    try {
      setLoading(true);
      setError(null);
      const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('refreshToken') : null;
      
      if (!refreshToken) {
        throw new Error('No refresh token found');
      }

      const response = await apiClient.post<AuthResponse>('/auth/refresh', { token: refreshToken });
      const authData = response.data;
      
      // Update tokens in localStorage (client-side only)
      if (typeof window !== 'undefined') {
        localStorage.setItem('token', authData.token);
        localStorage.setItem('refreshToken', authData.refreshToken);
      }
      
      return authData;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh token');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
    }
  }, []);

  const getToken = useCallback(() => {
    return typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  }, []);

  const isAuthenticated = useCallback(() => {
    return !!getToken();
  }, [getToken]);

  return {
    loading,
    error,
    login,
    refreshToken,
    logout,
    getToken,
    isAuthenticated,
  };
}; 