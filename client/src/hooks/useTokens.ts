import { useState, useCallback } from 'react';
import { tokensApi, TokenValidationResponse, BatchGenerateTokensData, BatchGenerateTokensResponse, Token } from '@/lib/api/tokens';

export const useTokens = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateToken = useCallback(async (token: string): Promise<TokenValidationResponse> => {
    try {
      setLoading(true);
      setError(null);
      const response = await tokensApi.validateToken(token);
      return response.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to validate token');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const markTokenAsUsed = useCallback(async (token: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      const response = await tokensApi.markTokenAsUsed(token);
      // Server returns updated token object; treat any 2xx as success
      const _updated: Token = response.data;
      return !!_updated;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark token as used');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const markTokenAsCompleted = useCallback(async (token: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      const response = await tokensApi.markTokenAsCompleted(token);
      const _updated: Token = response.data;
      return !!_updated;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark token as completed');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const generateTokens = useCallback(async (data: BatchGenerateTokensData): Promise<BatchGenerateTokensResponse> => {
    try {
      setLoading(true);
      setError(null);
      const response = await tokensApi.batchGenerateTokens(data);
      return response.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate tokens');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    validateToken,
    markTokenAsUsed,
    markTokenAsCompleted,
    generateTokens,
  };
}; 