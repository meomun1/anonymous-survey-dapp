'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { publicResponsesApi, ResponseForSelection, PublicResponseItem } from '@/lib/api/publicResponses';
import { surveysApi } from '@/lib/api/surveys';

interface Survey {
  id: string;
  title: string;
  description: string;
  question: string;
  isPublished: boolean;
  isPublicEnabled: boolean;
}

export default function SurveyPublicationPage() {
  const params = useParams();
  const router = useRouter();
  const surveyId = params.id as string;

  const [survey, setSurvey] = useState<Survey | null>(null);
  const [responses, setResponses] = useState<ResponseForSelection[]>([]);
  const [selectedResponses, setSelectedResponses] = useState<Set<string>>(new Set());
  const [positiveResponses, setPositiveResponses] = useState<Set<string>>(new Set());
  const [negativeResponses, setNegativeResponses] = useState<Set<string>>(new Set());
  const [isPublicEnabled, setIsPublicEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [surveyId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load survey details and normalize shape (snake_case → camelCase)
      const surveyResponse = await surveysApi.getById(surveyId);
      const s: any = surveyResponse.data;
      const normalized: Survey = {
        id: s.id,
        title: s.title,
        description: s.description ?? '',
        question: s.question ?? '',
        isPublished: s.isPublished ?? s.is_published ?? false,
        isPublicEnabled: s.isPublicEnabled ?? s.is_public_enabled ?? false,
      };
      setSurvey(normalized);
      setIsPublicEnabled(normalized.isPublicEnabled);

      // Load responses for selection
      const responsesResponse = await publicResponsesApi.getResponsesForSelection(surveyId);
      const responsesData = responsesResponse.data.data;
      setResponses(responsesData);

      // Initialize selections based on existing public responses
      const selected = new Set<string>();
      const positive = new Set<string>();
      const negative = new Set<string>();

      responsesData.forEach(response => {
        if (response.isPublic) {
          selected.add(response.id);
          if (response.isPositive === true) {
            positive.add(response.id);
          } else if (response.isPositive === false) {
            negative.add(response.id);
          }
        }
      });

      setSelectedResponses(selected);
      setPositiveResponses(positive);
      setNegativeResponses(negative);

    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load survey data');
    } finally {
      setLoading(false);
    }
  };

  const handleResponseToggle = (responseId: string) => {
    const newSelected = new Set(selectedResponses);
    if (newSelected.has(responseId)) {
      newSelected.delete(responseId);
      // Remove from positive/negative sets as well
      const newPositive = new Set(positiveResponses);
      const newNegative = new Set(negativeResponses);
      newPositive.delete(responseId);
      newNegative.delete(responseId);
      setPositiveResponses(newPositive);
      setNegativeResponses(newNegative);
    } else {
      newSelected.add(responseId);
    }
    setSelectedResponses(newSelected);
  };

  const handlePositiveToggle = (responseId: string) => {
    if (!selectedResponses.has(responseId)) return;

    const newPositive = new Set(positiveResponses);
    const newNegative = new Set(negativeResponses);

    if (newPositive.has(responseId)) {
      newPositive.delete(responseId);
    } else {
      newPositive.add(responseId);
      newNegative.delete(responseId); // Can't be both positive and negative
    }

    setPositiveResponses(newPositive);
    setNegativeResponses(newNegative);
  };

  const handleNegativeToggle = (responseId: string) => {
    if (!selectedResponses.has(responseId)) return;

    const newPositive = new Set(positiveResponses);
    const newNegative = new Set(negativeResponses);

    if (newNegative.has(responseId)) {
      newNegative.delete(responseId);
    } else {
      newNegative.add(responseId);
      newPositive.delete(responseId); // Can't be both positive and negative
    }

    setPositiveResponses(newPositive);
    setNegativeResponses(newNegative);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      // Prepare items for API
      const items: PublicResponseItem[] = Array.from(selectedResponses).map(responseId => ({
        responseId,
        isPositive: positiveResponses.has(responseId)
      }));

      // Update public responses
      await publicResponsesApi.updatePublicResponses(surveyId, items);

      // Update public visibility if needed
      await publicResponsesApi.togglePublicVisibility(surveyId, isPublicEnabled);

      alert('Public responses updated successfully!');
      router.push(`/admin/surveys/${surveyId}`);

    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const truncateText = (text: string, maxLength: number = 100) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!survey) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Survey not found</h1>
        </div>
      </div>
    );
  }

  if (!survey.isPublished) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Survey must be published first</h1>
          <p className="text-gray-600 mt-2">Please publish the survey before managing public responses.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold text-gray-900">Public Survey Management</h1>
          <button
            onClick={() => router.push(`/admin/surveys/${surveyId}`)}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            ← Back to Survey
          </button>
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h2 className="text-xl font-semibold text-blue-900 mb-2">{survey.title}</h2>
          <p className="text-blue-800 mb-2">{survey.description}</p>
          <p className="text-blue-700 font-medium">Question: {survey.question}</p>
        </div>

        {/* Public Visibility Toggle */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Public Survey Visibility</h3>
              <p className="text-gray-600">Enable or disable public access to the curated survey page</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isPublicEnabled}
                onChange={(e) => setIsPublicEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              <span className="ml-3 text-sm font-medium text-gray-900">
                {isPublicEnabled ? 'Public' : 'Private'}
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Instructions */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <h3 className="text-lg font-semibold text-yellow-900 mb-2">Instructions</h3>
        <ul className="text-yellow-800 space-y-1">
          <li>• Check the responses you want to make public</li>
          <li>• For each selected response, mark it as Positive or Negative</li>
          <li>• Responses can be either Positive or Negative, not both</li>
          <li>• Click "Save Changes" to update the public survey</li>
        </ul>
      </div>

      {/* Responses List */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Survey Responses ({responses.length} total)
          </h3>
          <p className="text-gray-600">Select responses to make public and mark them as positive or negative</p>
        </div>

        {responses.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500">No responses found for this survey.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {responses.map((response) => (
              <div key={response.id} className="p-6">
                <div className="flex items-start space-x-4">
                  {/* Selection Checkbox */}
                  <div className="flex-shrink-0 pt-1">
                    <input
                      type="checkbox"
                      checked={selectedResponses.has(response.id)}
                      onChange={() => handleResponseToggle(response.id)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </div>

                  {/* Response Content */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-gray-900 mb-2">
                      {truncateText(response.decryptedAnswer, 200)}
                    </div>
                    <div className="text-xs text-gray-500">
                      Submitted: {new Date(response.createdAt).toLocaleDateString()}
                    </div>
                  </div>

                  {/* Positive/Negative Toggles */}
                  {selectedResponses.has(response.id) && (
                    <div className="flex-shrink-0 space-x-2">
                      <button
                        onClick={() => handlePositiveToggle(response.id)}
                        className={`px-3 py-1 text-xs font-medium rounded-full border ${
                          positiveResponses.has(response.id)
                            ? 'bg-green-100 text-green-800 border-green-300'
                            : 'bg-gray-100 text-gray-600 border-gray-300 hover:bg-green-50'
                        }`}
                      >
                        Positive
                      </button>
                      <button
                        onClick={() => handleNegativeToggle(response.id)}
                        className={`px-3 py-1 text-xs font-medium rounded-full border ${
                          negativeResponses.has(response.id)
                            ? 'bg-red-100 text-red-800 border-red-300'
                            : 'bg-gray-100 text-gray-600 border-gray-300 hover:bg-red-50'
                        }`}
                      >
                        Negative
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="mt-8 flex justify-end space-x-4">
        <button
          onClick={() => router.push(`/admin/surveys/${surveyId}`)}
          className="px-6 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
          disabled={saving}
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {/* Summary */}
      <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Summary</h3>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Selected Responses:</span>
            <span className="ml-2 font-semibold">{selectedResponses.size}</span>
          </div>
          <div>
            <span className="text-gray-600">Positive:</span>
            <span className="ml-2 font-semibold text-green-600">{positiveResponses.size}</span>
          </div>
          <div>
            <span className="text-gray-600">Negative:</span>
            <span className="ml-2 font-semibold text-red-600">{negativeResponses.size}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
