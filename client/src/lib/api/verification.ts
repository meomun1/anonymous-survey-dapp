import { apiClient } from './client';
import { AxiosResponse } from 'axios';

export interface MerkleProof {
  commitment: string;
  siblings: string[];
  index: number;
  root: string;
}

export interface VerificationResult {
  isValid: boolean;
  commitment: string;
  merkleRoot: string;
  proof?: MerkleProof;
  message?: string;
}

export interface CampaignVerificationData {
  campaignId: string;
  campaignName: string;
  responsesMerkleRoot?: string;
  claimedReceiptsRoot?: string;
  totalResponses?: number;
  totalClaimed?: number;
  blockchainClosed: boolean;
  canVerifyResponses: boolean;
  canVerifyParticipation: boolean;
}

export const verificationApi = {
  // Get campaign verification data
  getCampaignVerificationData: (campaignId: string): Promise<AxiosResponse<CampaignVerificationData>> =>
    apiClient.get(`/campaigns/${campaignId}/verification`),

  // Verify response commitment (Tree #1)
  verifyResponseCommitment: (
    campaignId: string,
    commitment: string
  ): Promise<AxiosResponse<VerificationResult>> =>
    apiClient.post(`/verification/response`, { campaignId, commitment }),

  // Verify participation claim (Tree #2)
  verifyParticipationClaim: (
    campaignId: string,
    receiptHash: string
  ): Promise<AxiosResponse<VerificationResult>> =>
    apiClient.post(`/verification/participation`, { campaignId, receiptHash }),

  // Get Merkle proof for response
  getResponseProof: (
    campaignId: string,
    commitment: string
  ): Promise<AxiosResponse<MerkleProof>> =>
    apiClient.get(`/verification/response/proof`, {
      params: { campaignId, commitment }
    }),

  // Get Merkle proof for participation
  getParticipationProof: (
    campaignId: string,
    receiptHash: string
  ): Promise<AxiosResponse<MerkleProof>> =>
    apiClient.get(`/verification/participation/proof`, {
      params: { campaignId, receiptHash }
    }),
};
