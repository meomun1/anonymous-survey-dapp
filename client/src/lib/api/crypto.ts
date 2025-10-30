import { apiClient } from './client';
import { AxiosResponse } from 'axios';

export interface BlindSignatureRequest {
  blindedMessage: string;
}

export interface BlindSignatureResponse {
  blindSignature: string;
  publicKey: string;
}

export interface DecryptResponseRequest {
  encryptedData: string;
}

export interface DecryptResponseResponse {
  decryptedData: string;
}

export interface CampaignPublicKeys {
  blindSignaturePublicKey: string;
  encryptionPublicKey: string;
}

export const cryptoApi = {
  // Generate blind signature for campaign
  generateBlindSignature: (campaignId: string, data: BlindSignatureRequest): Promise<AxiosResponse<BlindSignatureResponse>> =>
    apiClient.post(`/crypto/campaigns/${campaignId}/blind-sign`, data),
  
  // Decrypt response for campaign
  decryptResponse: (campaignId: string, data: DecryptResponseRequest): Promise<AxiosResponse<DecryptResponseResponse>> =>
    apiClient.post(`/crypto/campaigns/${campaignId}/decrypt`, data),
  
  // Get campaign public keys
  getCampaignPublicKeys: (campaignId: string): Promise<AxiosResponse<CampaignPublicKeys>> =>
    apiClient.get(`/crypto/campaigns/${campaignId}/public-keys`),
};
