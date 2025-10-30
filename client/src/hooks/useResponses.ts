import { useState, useCallback } from 'react';
import { responsesApi, SubmitStudentResponsesData } from '@/lib/api/responses';

export const useResponses = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitResponses = useCallback(async (data: SubmitStudentResponsesData) => {
    try {
      setLoading(true);
      setError(null);
      const response = await responsesApi.submitStudentResponses(data);
      return response.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit responses';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const ingestFromBlockchain = useCallback(async (campaignId: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await responsesApi.ingestFromBlockchain(campaignId);
      return response.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to ingest responses from blockchain';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const decryptCampaignResponses = useCallback(async (campaignId: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await responsesApi.decryptCampaignResponses(campaignId);
      return response.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to decrypt responses';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getParsedResponsesBySurvey = useCallback(async (surveyId: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await responsesApi.getParsedResponsesBySurvey(surveyId);
      return response.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch parsed responses';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getResponseByCommitment = useCallback(async (commitmentHex: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await responsesApi.getResponseByCommitment(commitmentHex);
      return response.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch response';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const verifyResponseIntegrity = useCallback(async (decryptedResponseId: string) => {
    try {
      setLoading(true);
      setError(null);
      const response = await responsesApi.verifyResponseIntegrity(decryptedResponseId);
      return response.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to verify response integrity';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    submitResponses,
    ingestFromBlockchain,
    decryptCampaignResponses,
    getParsedResponsesBySurvey,
    getResponseByCommitment,
    verifyResponseIntegrity,
  };
};
