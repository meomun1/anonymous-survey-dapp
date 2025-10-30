'use client';

import { useState, useEffect } from 'react';
import { Campaign } from '@/lib/api/campaigns';

interface ProcessResponsesProps {
  campaign: Campaign;
  onIngest: () => Promise<{ success: boolean; inserted: number }>;
  onDecrypt: () => Promise<{ success: boolean; processed: number }>;
}

export const ProcessResponses = ({ campaign, onIngest, onDecrypt }: ProcessResponsesProps) => {
  const [ingestLoading, setIngestLoading] = useState(false);
  const [decryptLoading, setDecryptLoading] = useState(false);
  const [ingestResult, setIngestResult] = useState<{ success: boolean; inserted: number } | null>(null);
  const [decryptResult, setDecryptResult] = useState<{ success: boolean; processed: number } | null>(null);
  const [error, setError] = useState('');

  // Check if responses have already been processed
  useEffect(() => {
    const checkProcessingStatus = async () => {
      try {
        const { apiClient } = await import('@/lib/api/client');

        // Check for encrypted responses
        const encryptedRes = await apiClient.get(`/responses/encrypted/${campaign.id}`);
        if (encryptedRes.data && encryptedRes.data.length > 0) {
          setIngestResult({ success: true, inserted: encryptedRes.data.length });
        }

        // Check for decrypted responses
        const decryptedRes = await apiClient.get(`/responses/decrypted/${campaign.id}`);
        if (decryptedRes.data && decryptedRes.data.length > 0) {
          setDecryptResult({ success: true, processed: decryptedRes.data.length });
        }
      } catch (err) {
        // Endpoints might not exist or return errors, that's okay
        console.log('Could not check processing status:', err);
      }
    };

    if (campaign.id) {
      checkProcessingStatus();
    }
  }, [campaign.id]);

  const handleIngest = async () => {
    try {
      setIngestLoading(true);
      setError('');
      const result = await onIngest();
      setIngestResult(result);
    } catch (err: any) {
      setError(err.message || 'Failed to ingest responses');
    } finally {
      setIngestLoading(false);
    }
  };

  const handleDecrypt = async () => {
    try {
      setDecryptLoading(true);
      setError('');
      const result = await onDecrypt();
      setDecryptResult(result);
    } catch (err: any) {
      setError(err.message || 'Failed to decrypt responses');
    } finally {
      setDecryptLoading(false);
    }
  };

  // Only show this section if campaign is closed or published
  // (Responses can only be processed after campaign is closed)
  if (!['closed', 'published'].includes(campaign.status)) {
    return null;
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Process Responses</h3>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      <div className="space-y-4">
        {/* Step 1: Ingest from Blockchain */}
        <div className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h4 className="font-medium text-gray-900 mb-1">Step 1: Ingest from Blockchain</h4>
              <p className="text-sm text-gray-600">
                Fetch encrypted responses from the Solana blockchain
              </p>
            </div>
            {ingestResult && (
              <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-medium">
                ✓ Complete
              </span>
            )}
          </div>

          {ingestResult && (
            <div className="bg-green-50 border border-green-200 rounded p-3 mb-3">
              <p className="text-sm text-green-800">
                Successfully ingested {ingestResult.inserted} encrypted responses
              </p>
            </div>
          )}

          <button
            onClick={handleIngest}
            disabled={ingestLoading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-full md:w-auto"
          >
            {ingestLoading ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                <span>Ingesting...</span>
              </div>
            ) : (
              'Ingest Responses'
            )}
          </button>
        </div>

        {/* Step 2: Decrypt Responses */}
        <div className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h4 className="font-medium text-gray-900 mb-1">Step 2: Decrypt Responses</h4>
              <p className="text-sm text-gray-600">
                Decrypt ingested responses using campaign private keys
              </p>
            </div>
            {decryptResult && (
              <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-medium">
                ✓ Complete
              </span>
            )}
          </div>

          {decryptResult && (
            <div className="bg-green-50 border border-green-200 rounded p-3 mb-3">
              <p className="text-sm text-green-800">
                Successfully decrypted {decryptResult.processed} responses
              </p>
            </div>
          )}

          <button
            onClick={handleDecrypt}
            disabled={decryptLoading || !ingestResult}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-full md:w-auto"
          >
            {decryptLoading ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                <span>Decrypting...</span>
              </div>
            ) : (
              'Decrypt Responses'
            )}
          </button>

          {!ingestResult && (
            <p className="text-xs text-gray-500 mt-2">
              ⓘ Ingest responses first before decrypting
            </p>
          )}
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start space-x-2">
            <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Processing Workflow</p>
              <ul className="space-y-1 text-xs">
                <li>1. Ingest: Fetch encrypted responses from blockchain</li>
                <li>2. Decrypt: Decrypt responses using campaign private keys</li>
                <li>3. Analytics: View results in the analytics section below</li>
                <li>4. Publish: Generate Merkle root and make results public</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
