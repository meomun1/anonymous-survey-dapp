import { apiClient } from './client';
import { AxiosResponse } from 'axios';

export interface Campaign {
  id: string;
  name: string;
  type: 'course' | 'event';
  status: 'draft' | 'teachers_input' | 'open' | 'launched' | 'closed' | 'published';
  semesterId: string;
  semesterName?: string;
  createdBy: string;
  createdByName?: string;
  blockchainAddress?: string;
  createdAt: string;
  updatedAt: string;

  // NEW: Merkle root fields
  responsesMerkleRoot?: string;
  totalResponses?: number;
  responsesPublishedAt?: string;
  claimedReceiptsRoot?: string;
  totalClaimed?: number;
  claimsUpdatedAt?: string;
  blockchainClosed?: boolean;
  blockchainClosedAt?: string;
  blockchainSignature?: string;
}

export interface CreateCampaignData {
  name: string;
  type: 'course' | 'event';
  semesterId: string;
}

export interface CampaignFilters {
  status?: string;
  type?: string;
  semesterId?: string;
}

export const campaignsApi = {
  // Get all campaigns with optional filtering
  getAll: (filters?: CampaignFilters): Promise<AxiosResponse<Campaign[]>> => {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.type) params.append('type', filters.type);
    if (filters?.semesterId) params.append('semesterId', filters.semesterId);
    
    const queryString = params.toString();
    return apiClient.get(`/campaigns${queryString ? `?${queryString}` : ''}`);
  },
  
  // Get campaign by ID
  getById: (id: string): Promise<AxiosResponse<Campaign>> => 
    apiClient.get(`/campaigns/${id}`),
  
  // Create new campaign
  create: (data: CreateCampaignData): Promise<AxiosResponse<Campaign>> => 
    apiClient.post('/campaigns', data),
  
  // Update campaign
  update: (id: string, data: Partial<CreateCampaignData>): Promise<AxiosResponse<Campaign>> =>
    apiClient.put(`/campaigns/${id}`, data),
  
  // Delete campaign
  delete: (id: string): Promise<AxiosResponse<void>> =>
    apiClient.delete(`/campaigns/${id}`),
  
  // Campaign lifecycle management
  open: (id: string): Promise<AxiosResponse<Campaign>> =>
    apiClient.post(`/campaigns/${id}/open`),
  
  close: (id: string): Promise<AxiosResponse<Campaign>> =>
    apiClient.post(`/campaigns/${id}/close`),
  
  launch: (id: string): Promise<AxiosResponse<{ message: string; surveysCreated: number; tokensGenerated: number }>> =>
    apiClient.post(`/campaigns/${id}/launch`),
  
  publish: (id: string, merkleRoot: string): Promise<AxiosResponse<Campaign>> =>
    apiClient.post(`/campaigns/${id}/publish`, { merkleRoot }),

  // NEW: Blockchain integration endpoints
  publishResponses: (id: string): Promise<AxiosResponse<{ merkleRoot: string; totalResponses: number }>> =>
    apiClient.post(`/campaigns/${id}/publish-responses`),

  publishClaims: (id: string): Promise<AxiosResponse<{ merkleRoot: string; totalClaimed: number }>> =>
    apiClient.post(`/campaigns/${id}/publish-claims`),

  closeBlockchain: (id: string): Promise<AxiosResponse<{ signature: string; success: boolean }>> =>
    apiClient.post(`/campaigns/${id}/close-blockchain`),
};
