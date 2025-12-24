'use client';

import { useState } from 'react';
import { Campaign } from '@/lib/api/campaigns';

interface MerkleRootManagerProps {
  campaign: Campaign;
  onPublishResponses: () => Promise<{ merkleRoot: string; totalResponses: number }>;
  onPublishClaims: () => Promise<{ merkleRoot: string; totalClaimed: number }>;
}

export const MerkleRootManager = ({ campaign, onPublishResponses, onPublishClaims }: MerkleRootManagerProps) => {
  const [responsesLoading, setResponsesLoading] = useState(false);
  const [claimsLoading, setClaimsLoading] = useState(false);
  const [error, setError] = useState('');

  const handlePublishResponses = async () => {
    try {
      setResponsesLoading(true);
      setError('');
      await onPublishResponses();
    } catch (err: any) {
      setError(err.message || 'Failed to publish responses Merkle root');
    } finally {
      setResponsesLoading(false);
    }
  };

  const handlePublishClaims = async () => {
    try {
      setClaimsLoading(true);
      setError('');
      await onPublishClaims();
    } catch (err: any) {
      setError(err.message || 'Failed to publish claims Merkle root');
    } finally {
      setClaimsLoading(false);
    }
  };

  // Only show this section if campaign is closed or published
  if (!['closed', 'published'].includes(campaign.status)) {
    return null;
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Publish Merkle Roots For Verification</h3>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      <div className="space-y-4">
        {/* Merkle Tree #1: Response Commitments */}
        <div className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h4 className="font-medium text-gray-900 mb-1">
                Response Commitments Root
              </h4>
              <p className="text-sm text-gray-600">
                Calculate and publish Merkle root of all survey response commitments
              </p>
            </div>
            {campaign.responsesMerkleRoot && (
              <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-medium">
                ✓ Published
              </span>
            )}
          </div>

          {campaign.responsesMerkleRoot && (
            <div className="bg-green-50 border border-green-200 rounded p-3 mb-3">
              <p className="text-xs text-green-700 font-mono mb-1">
                Root: {campaign.responsesMerkleRoot}
              </p>
              <p className="text-sm text-green-800">
                Total responses: {campaign.totalResponses || 0}
              </p>
              {campaign.responsesPublishedAt && (
                <p className="text-xs text-green-600 mt-1">
                  Published: {new Date(campaign.responsesPublishedAt).toLocaleString()}
                </p>
              )}
            </div>
          )}

          <button
            onClick={handlePublishResponses}
            disabled={responsesLoading || !!campaign.responsesMerkleRoot}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-full md:w-auto"
          >
            {responsesLoading ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                <span>Publishing...</span>
              </div>
            ) : campaign.responsesMerkleRoot ? (
              'Already Published'
            ) : (
              'Publish Responses Root'
            )}
          </button>
        </div>

        {/* Merkle Tree #2: Claimed Receipts */}
        <div className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h4 className="font-medium text-gray-900 mb-1">
                Participation Claims Root
              </h4>
              <p className="text-sm text-gray-600">
                Calculate and publish Merkle root of all participation claim receipts
              </p>
            </div>
            {campaign.claimedReceiptsRoot && (
              <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-medium">
                ✓ Published
              </span>
            )}
          </div>

          {campaign.claimedReceiptsRoot && (
            <div className="bg-green-50 border border-green-200 rounded p-3 mb-3">
              <p className="text-xs text-green-700 font-mono mb-1">
                Root: {campaign.claimedReceiptsRoot}
              </p>
              <p className="text-sm text-green-800">
                Total claimed: {campaign.totalClaimed || 0}
              </p>
              {campaign.claimsUpdatedAt && (
                <p className="text-xs text-green-600 mt-1">
                  Published: {new Date(campaign.claimsUpdatedAt).toLocaleString()}
                </p>
              )}
            </div>
          )}

          <button
            onClick={handlePublishClaims}
            disabled={claimsLoading || !!campaign.claimedReceiptsRoot || !campaign.responsesMerkleRoot}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-full md:w-auto"
          >
            {claimsLoading ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                <span>Publishing...</span>
              </div>
            ) : campaign.claimedReceiptsRoot ? (
              'Already Published'
            ) : (
              'Publish Claims Root'
            )}
          </button>

          {!campaign.responsesMerkleRoot && (
            <p className="text-xs text-gray-500 mt-2">
              ⓘ Publish responses root first before publishing claims root
            </p>
          )}
        </div>

      </div>
    </div>
  );
};
