import { useState, useCallback } from 'react';
import { surveysApi, Survey, CreateSurveyData } from '@/lib/api/surveys';

export const useSurveys = () => {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSurveys = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await surveysApi.getAll();
      setSurveys(response.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch surveys');
    } finally {
      setLoading(false);
    }
  }, []);

  const createSurvey = useCallback(async (data: CreateSurveyData) => {
    try {
      setLoading(true);
      setError(null);
      const response = await surveysApi.create(data);
      const newSurvey = response.data;
      setSurveys((prev) => [...prev, newSurvey]);
      return newSurvey;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create survey');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateSurvey = useCallback(async (id: string, data: Partial<CreateSurveyData>) => {
    try {
      setLoading(true);
      setError(null);
      const response = await surveysApi.update(id, data);
      const updatedSurvey = response.data;
      setSurveys((prev) =>
        prev.map((survey) => (survey.id === id ? updatedSurvey : survey))
      );
      return updatedSurvey;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update survey');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteSurvey = useCallback(async (id: string) => {
    try {
      setLoading(true);
      setError(null);
      await surveysApi.delete(id);
      setSurveys((prev) => prev.filter((survey) => survey.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete survey');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    surveys,
    loading,
    error,
    fetchSurveys,
    createSurvey,
    updateSurvey,
    deleteSurvey,
  };
}; 