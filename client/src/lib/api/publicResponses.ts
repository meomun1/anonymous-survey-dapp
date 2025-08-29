import { apiClient } from './client';

export interface PublicResponseItem {
  responseId: string;
  isPositive: boolean;
}

export interface PublicResponseWithDetails {
  id: string;
  surveyId: string;
  responseId: string;
  isPositive: boolean;
  publishedAt: string;
  createdAt: string;
  updatedAt: string;
  decryptedAnswer: string;
  commitmentHash: string;
}

export interface PublicResponseStats {
  totalSelected: number;
  positiveCount: number;
  negativeCount: number;
  positiveRate: number;
  negativeRate: number;
}

export interface ResponseForSelection {
  id: string;
  decryptedAnswer: string;
  commitmentHash: string;
  createdAt: string;
  isPublic: boolean;
  isPositive: boolean | null;
}

export const publicResponsesApi = {
  // Get all responses for admin selection
  getResponsesForSelection: (surveyId: string) =>
    apiClient.get<{ success: boolean; data: ResponseForSelection[] }>(`/public-responses/survey/${surveyId}/selection`),

  // Update public responses
  updatePublicResponses: (surveyId: string, items: PublicResponseItem[]) =>
    apiClient.post<{ success: boolean; message: string }>(`/public-responses/survey/${surveyId}`, { items }),

  // Toggle public survey visibility
  togglePublicVisibility: (surveyId: string, isPublicEnabled: boolean) =>
    apiClient.put<{ success: boolean; message: string }>(`/public-responses/survey/${surveyId}/visibility`, { isPublicEnabled }),

  // Get public response statistics
  getPublicResponseStats: (surveyId: string) =>
    apiClient.get<{ success: boolean; data: PublicResponseStats }>(`/public-responses/survey/${surveyId}/stats`),

  // Get public survey results (public endpoint)
  getPublicSurveyResults: (surveyId: string) =>
    apiClient.get<{
      success: boolean;
      data: {
        survey: {
          id: string;
          title: string;
          description: string;
          question: string;
          isPublished: boolean;
          publishedAt: string;
        };
        responses: PublicResponseWithDetails[];
        stats: PublicResponseStats;
      };
    }>(`/surveys/${surveyId}/public-results`),
};
