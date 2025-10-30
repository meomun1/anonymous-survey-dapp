'use client';

import { useState } from 'react';
import { Campaign } from '@/lib/api/campaigns';
import { MerkleRootData } from '@/lib/api/analytics';

interface PublishResultsProps {
  campaign: Campaign;
  onCalculateMerkle: () => Promise<MerkleRootData>;
  existingMerkleRoot?: MerkleRootData | null;
}

export const PublishResults = ({ campaign, onCalculateMerkle, existingMerkleRoot }: PublishResultsProps) => {
  const [loading, setLoading] = useState(false);
  const [merkleRoot, setMerkleRoot] = useState<MerkleRootData | null>(existingMerkleRoot || null);
  const [error, setError] = useState('');

  const handleCalculate = async () => {
    try {
      setLoading(true);
      setError('');
      const result = await onCalculateMerkle();
      setMerkleRoot(result);
    } catch (err: any) {
      setError(err.message || 'Failed to calculate Merkle root');
    } finally {
      setLoading(false);
    }
  };

  // Only show for closed or published campaigns
  // (Results can only be published after campaign is closed and responses are processed)
  if (!['closed', 'published'].includes(campaign.status)) {
    return null;
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Publish Results</h3>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      <div className="space-y-4">
        {merkleRoot ? (
          <div className="space-y-4">
            {/* Merkle Root Display */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-medium text-green-900 mb-1">Merkle Root Generated</h4>
                  <p className="text-sm text-green-700">
                    Results are ready for verification
                  </p>
                </div>
                <span className="bg-green-600 text-white px-3 py-1 rounded-full text-xs font-medium">
                  ✓ Ready
                </span>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-green-900 block mb-1">Merkle Root</label>
                  <div className="bg-white border border-green-300 rounded p-3">
                    <p className="text-sm font-mono text-gray-900 break-all">
                      {merkleRoot.merkleRoot}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-green-900 block mb-1">Total Commitments</label>
                    <p className="text-lg font-bold text-green-900">
                      {merkleRoot.totalCommitments}
                    </p>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-green-900 block mb-1">Calculated At</label>
                    <p className="text-sm text-green-800">
                      {new Date(merkleRoot.calculatedAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Verification Instructions */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">Verification Instructions</h4>
              <p className="text-sm text-blue-800 mb-3">
                Students can verify their responses are included using:
              </p>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Their response commitment hash</li>
                <li>• The campaign Merkle root above</li>
                <li>• The verification endpoint in the student portal</li>
              </ul>
            </div>

            {campaign.status !== 'published' && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  ⓘ Use the "Publish Results" button in Campaign Management to make results public.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
              <h4 className="font-medium text-gray-900 mb-2">Generate Merkle Root</h4>
              <p className="text-sm text-gray-600 mb-4">
                Calculate the Merkle root for all decrypted responses. This creates a cryptographic proof
                that allows students to verify their submissions were included.
              </p>

              <button
                onClick={handleCalculate}
                disabled={loading}
                className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-full md:w-auto"
              >
                {loading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                    <span>Calculating...</span>
                  </div>
                ) : (
                  'Calculate Merkle Root'
                )}
              </button>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-2">
                <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">Before generating Merkle root:</p>
                  <ul className="space-y-1 text-xs">
                    <li>• Ensure all responses have been ingested from blockchain</li>
                    <li>• Verify all responses have been decrypted</li>
                    <li>• Review analytics to confirm data accuracy</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
