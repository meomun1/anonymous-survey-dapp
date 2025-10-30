import { useState, useCallback } from 'react';
import { analyticsApi, CampaignAnalytics, MerkleRootData, CalculateMerkleRootData } from '@/lib/api/analytics';

export const useAnalytics = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<CampaignAnalytics | null>(null);
  const [merkleRoot, setMerkleRoot] = useState<MerkleRootData | null>(null);

  const fetchCampaignAnalytics = useCallback(async (campaignId: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await analyticsApi.getCampaignAnalytics(campaignId);
      setAnalytics(response.data);
      return response.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch analytics';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const calculateMerkleRoot = useCallback(async (data: CalculateMerkleRootData) => {
    try {
      setLoading(true);
      setError(null);
      const response = await analyticsApi.calculateMerkleRoot(data);
      setMerkleRoot(response.data);
      return response.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to calculate Merkle root';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMerkleRoot = useCallback(async (campaignId: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await analyticsApi.getMerkleRoot(campaignId);
      setMerkleRoot(response.data);
      return response.data;
    } catch (err: any) {
      // If Merkle root not calculated yet, this is expected - don't treat as error
      if (err.response?.status === 404) {
        setMerkleRoot(null);
        return null;
      }
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch Merkle root';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    analytics,
    merkleRoot,
    fetchCampaignAnalytics,
    calculateMerkleRoot,
    fetchMerkleRoot,
  };
};
