import { apiClient } from './client';
import { AxiosResponse } from 'axios';

export interface Survey {
  id: string;
  title: string;
  description: string;
  templateId: string;
  totalQuestions: number;
  totalResponses: number;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSurveyData {
  title: string;
  description: string;
  templateId?: string;
}

export const surveysApi = {
  getAll: (): Promise<AxiosResponse<Survey[]>> => apiClient.get('/surveys'),
  
  getById: (id: string): Promise<AxiosResponse<Survey>> => apiClient.get(`/surveys/${id}`),
  
  getKeys: (id: string): Promise<AxiosResponse<{ blindSignaturePublicKey: string; encryptionPublicKey: string }>> =>
    apiClient.get(`/surveys/${id}/keys`),
  
  create: (data: CreateSurveyData): Promise<AxiosResponse<Survey>> => 
    apiClient.post('/surveys', data),
  
  update: (id: string, data: Partial<CreateSurveyData>): Promise<AxiosResponse<Survey>> =>
    apiClient.put(`/surveys/${id}`, data),
  
  delete: (id: string): Promise<AxiosResponse<void>> =>
    apiClient.delete(`/surveys/${id}`),
  
  publish: (id: string): Promise<AxiosResponse<Survey>> =>
    apiClient.post(`/surveys/${id}/publish-with-proof`),
  
  getResults: (id: string): Promise<AxiosResponse<{
    surveyId: string;
    shortId: string;
    title: string;
    templateId: string;
    totalQuestions: number;
    totalResponses: number;
    isPublished: boolean;
    publishedAt: string | null;
    merkleRoot: string | null;
    questionStatistics: Record<number, Record<number, number>>;
    overallStatistics: {
      averageScore: number;
      totalResponses: number;
      scoreDistribution: Record<number, number>;
    };
    answerDistribution: Record<number, Record<number, number>>;
  }>> => apiClient.get(`/surveys/${id}/results`),
  
  getStats: (id: string): Promise<AxiosResponse<{
    totalTokens: number;
    usedTokens: number;
    completedTokens: number;
    totalResponses: number;
    participationRate: number;
    completionRate: number;
  }>> => apiClient.get(`/surveys/${id}/stats`),
}; 