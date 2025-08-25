// Create client/src/lib/api/auth.ts
import { apiClient } from './client';

export const authApi = {
  login: (credentials: { email: string; password: string }) =>
    apiClient.post('/auth/login', credentials),
  
  refresh: (token: string) =>
    apiClient.post('/auth/refresh', { token }),
};