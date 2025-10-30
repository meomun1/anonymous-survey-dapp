import { apiClient } from './client';
import { AxiosResponse } from 'axios';

export interface StudentResponse {
  surveyId: string;
  encryptedData: string;
  commitment: string;
}

export interface SubmitStudentResponsesData {
  token: string;
  responses: StudentResponse[];
}

export interface SubmitStudentResponsesResponse {
  success: boolean;
  transactionHash: string;
  message: string;
}

export interface ParsedResponse {
  id: string;
  decryptedResponseId: string;
  surveyId: string;
  courseCode: string;
  teacherId: string;
  answers: number[];
  createdAt: string;
  updatedAt: string;
}

export interface ResponseByCommitment {
  responseId: string;
  campaignId: string;
  commitment: string;
  decryptedId?: string;
  answerString?: string;
  surveyId?: string;
  answers?: number[];
}

export interface ResponseIntegrityResult {
  isValid: boolean;
}

export const responsesApi = {
  // Submit student responses to blockchain
  submitStudentResponses: (data: SubmitStudentResponsesData): Promise<AxiosResponse<SubmitStudentResponsesResponse>> =>
    apiClient.post('/responses/submit', data),
  
  // Ingest responses from blockchain
  ingestFromBlockchain: (campaignId: string): Promise<AxiosResponse<{ success: boolean; inserted: number }>> =>
    apiClient.post(`/responses/ingest/${campaignId}`),
  
  // Decrypt campaign responses
  decryptCampaignResponses: (campaignId: string): Promise<AxiosResponse<{ success: boolean; processed: number }>> =>
    apiClient.post(`/responses/decrypt-campaign/${campaignId}`),
  
  // Get parsed responses by survey
  getParsedResponsesBySurvey: (surveyId: string): Promise<AxiosResponse<{ total: number; rows: ParsedResponse[] }>> =>
    apiClient.get(`/responses/parsed/survey/${surveyId}`),
  
  // Get response by commitment
  getResponseByCommitment: (commitmentHex: string): Promise<AxiosResponse<ResponseByCommitment>> =>
    apiClient.get(`/responses/commitment/${commitmentHex}`),
  
  // Verify response integrity
  verifyResponseIntegrity: (decryptedResponseId: string): Promise<AxiosResponse<ResponseIntegrityResult>> =>
    apiClient.get(`/responses/verify/${decryptedResponseId}`),
};
