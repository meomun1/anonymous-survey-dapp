import { apiClient } from './client';
import { AxiosResponse } from 'axios';

export interface Token {
  id: string;
  token: string;
  surveyId: string;
  studentEmail: string;
  used: boolean;
  isCompleted: boolean;
  createdAt: string;
  usedAt?: string;
  completedAt?: string;
}

export interface TokenStatus {
  isValid: boolean;
  isUsed: boolean;
  isCompleted: boolean;
  surveyId: string;
}

export interface TokenValidationResponse {
  valid: boolean;
  token: string;
  surveyId: string;
  studentEmail: string;
  isCompleted: boolean;
}

export interface TokenUsageResponse {
  token: string;
  used: boolean;
  isCompleted: boolean;
}

export interface BatchGenerateTokensData {
  surveyId: string;
  students: { email: string }[];
}

export interface BatchGenerateTokensResponse {
  message: string;
  count: number;
  emailsSent?: number;
  emailsFailed?: number;
  tokens: { token: string; email: string }[];
  emailDetails?: any;
  info?: string;
  warning?: string;
  error?: string;
}

export const tokensApi = {
  validate: (token: string) =>
    apiClient.post<TokenStatus>('/tokens/validate', { token }),
  
  getStatus: (token: string) =>
    apiClient.get<TokenStatus>(`/tokens/status/${token}`),
  
  generate: (surveyId: string, emails: string[]) =>
    apiClient.post<{ count: number }>('/tokens/generate', {
      surveyId,
      emails,
    }),
  
  distribute: (surveyId: string) =>
    apiClient.post<{ count: number }>('/tokens/distribute', {
      surveyId,
    }),

  validateToken: (token: string): Promise<AxiosResponse<TokenValidationResponse>> =>
    apiClient.get(`/tokens/validate/${token}`),

  markTokenAsUsed: (token: string): Promise<AxiosResponse<Token>> =>
    apiClient.post(`/tokens/${token}/use`),

  markTokenAsCompleted: (token: string): Promise<AxiosResponse<Token>> =>
    apiClient.post(`/tokens/${token}/complete`),

  getSurveyTokens: (surveyId: string): Promise<AxiosResponse<Token[]>> =>
    apiClient.get(`/tokens/survey/${surveyId}`),

  batchGenerateTokens: (data: BatchGenerateTokensData): Promise<AxiosResponse<BatchGenerateTokensResponse>> =>
    apiClient.post('/tokens/batch-generate', data),

  deleteToken: (tokenId: string): Promise<AxiosResponse<void>> =>
    apiClient.delete(`/tokens/${tokenId}`),

  regenerateToken: (tokenId: string): Promise<AxiosResponse<Token>> =>
    apiClient.post(`/tokens/${tokenId}/regenerate`),

  resendTokenEmail: (tokenId: string): Promise<AxiosResponse<{ success: boolean }>> =>
    apiClient.post(`/tokens/${tokenId}/resend-email`),

  getTokenStats: (surveyId: string): Promise<AxiosResponse<{
    totalTokens: number;
    usedTokens: number;
    completedTokens: number;
    pendingTokens: number;
  }>> => apiClient.get(`/tokens/survey/${surveyId}/stats`),

  testEmailService: (): Promise<AxiosResponse<{ available: boolean; smtpTested: boolean; message: string }>> =>
    apiClient.get('/tokens/test-email'),
}; 