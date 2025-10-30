import { apiClient } from './client';
import { AxiosResponse } from 'axios';

export interface CampaignAnalytics {
  campaignId: string;
  campaignName: string;
  totalSurveys: number;
  totalResponses: number;
  totalTokens: number;
  usedTokens: number;
  completionRate: number;
  participationRate: number;
  averageScore: number;
  scoreDistribution: Record<number, number>;
  questionStatistics: Record<number, Record<number, number>>;
  schoolBreakdown: Array<{
    schoolId: string;
    schoolName: string;
    responseCount: number;
    averageScore: number;
  }>;
  teacherPerformance: Array<{
    teacherId: string;
    teacherName: string;
    courseCode: string;
    courseName: string;
    schoolId: string;
    responseCount: number;
    averageScore: number;
  }>;
}

export interface MerkleRootData {
  campaignId: string;
  merkleRoot: string;
  totalCommitments: number;
  calculatedAt: string;
}

export interface CalculateMerkleRootData {
  campaignId: string;
}

export const analyticsApi = {
  // Get campaign analytics
  getCampaignAnalytics: (campaignId: string): Promise<AxiosResponse<CampaignAnalytics>> =>
    apiClient.post(`/analytics/campaigns/${campaignId}/analytics`),

  // Calculate Merkle root for campaign
  calculateMerkleRoot: (data: CalculateMerkleRootData): Promise<AxiosResponse<MerkleRootData>> =>
    apiClient.post(`/analytics/merkle/${data.campaignId}/calculate-root`),

  // Get Merkle root for campaign
  getMerkleRoot: (campaignId: string): Promise<AxiosResponse<MerkleRootData>> =>
    apiClient.get(`/analytics/merkle/${campaignId}/root`),
};
