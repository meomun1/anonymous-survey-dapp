import { useState, useCallback } from 'react';
import { campaignsApi, Campaign, CreateCampaignData, CampaignFilters } from '@/lib/api/campaigns';

export const useCampaigns = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);

  const fetchCampaigns = useCallback(async (filters?: CampaignFilters) => {
    try {
      setLoading(true);
      setError(null);
      const response = await campaignsApi.getAll(filters);
      setCampaigns(response.data);
      return response.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch campaigns';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const createCampaign = useCallback(async (data: CreateCampaignData) => {
    try {
      setLoading(true);
      setError(null);
      const response = await campaignsApi.create(data);
      setCampaigns(prev => [response.data, ...prev]);
      return response.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create campaign';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateCampaign = useCallback(async (id: string, data: Partial<CreateCampaignData>) => {
    try {
      setLoading(true);
      setError(null);
      const response = await campaignsApi.update(id, data);
      setCampaigns(prev => prev.map(campaign => 
        campaign.id === id ? response.data : campaign
      ));
      return response.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update campaign';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteCampaign = useCallback(async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      await campaignsApi.delete(id);
      setCampaigns(prev => prev.filter(campaign => campaign.id !== id));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete campaign';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const openCampaign = useCallback(async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await campaignsApi.open(id);
      setCampaigns(prev => prev.map(campaign => 
        campaign.id === id ? response.data : campaign
      ));
      return response.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to open campaign';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const closeCampaign = useCallback(async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await campaignsApi.close(id);
      setCampaigns(prev => prev.map(campaign => 
        campaign.id === id ? response.data : campaign
      ));
      return response.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to close campaign';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const launchCampaign = useCallback(async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await campaignsApi.launch(id);
      // Refresh campaigns to get updated status
      await fetchCampaigns();
      return response.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to launch campaign';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchCampaigns]);

  const publishCampaign = useCallback(async (id: string, merkleRoot: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await campaignsApi.publish(id, merkleRoot);
      setCampaigns(prev => prev.map(campaign =>
        campaign.id === id ? response.data : campaign
      ));
      return response.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to publish campaign';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    campaigns,
    fetchCampaigns,
    createCampaign,
    updateCampaign,
    deleteCampaign,
    openCampaign,
    closeCampaign,
    launchCampaign,
    publishCampaign,
  };
};
