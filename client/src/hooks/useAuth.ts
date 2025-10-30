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
  user?: {
    id: string;
    role: 'admin' | 'teacher' | 'student';
    email: string;
    name?: string;
  };
}

export const useAuth = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<AuthResponse['user'] | null>(null);

  const login = useCallback(async (credentials: LoginCredentials): Promise<AuthResponse> => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.post<AuthResponse>('/auth/login', credentials);
      const authData = response.data;
      
      // Store tokens and user data in localStorage (client-side only)
      if (typeof window !== 'undefined') {
        localStorage.setItem('token', authData.token);
        localStorage.setItem('refreshToken', authData.refreshToken);
        if (authData.user) {
          localStorage.setItem('user', JSON.stringify(authData.user));
          setUser(authData.user);
        }
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
        if (authData.user) {
          localStorage.setItem('user', JSON.stringify(authData.user));
          setUser(authData.user);
        }
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
      localStorage.removeItem('user');
      setUser(null);
    }
  }, []);

  const getToken = useCallback(() => {
    return typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  }, []);

  const isAuthenticated = useCallback(() => {
    return !!getToken();
  }, [getToken]);

  const getUser = useCallback(() => {
    if (user) return user;
    if (typeof window !== 'undefined') {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          return JSON.parse(storedUser);
        } catch (e) {
          return null;
        }
      }
    }
    return null;
  }, [user]);

  const hasRole = useCallback((role: 'admin' | 'teacher' | 'student') => {
    const currentUser = getUser();
    return currentUser?.role === role;
  }, [getUser]);

  return {
    loading,
    error,
    user,
    login,
    refreshToken,
    logout,
    getToken,
    isAuthenticated,
    getUser,
    hasRole,
  };
}; 