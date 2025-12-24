'use client';

import { useState } from 'react';
import { Campaign } from '@/lib/api/campaigns';

interface BlockchainFinalizerProps {
  campaign: Campaign;
  onFinalize: () => Promise<{ signature: string; success: boolean }>;
}

export const BlockchainFinalizer = ({ campaign, onFinalize }: BlockchainFinalizerProps) => {
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [error, setError] = useState('');

  const canFinalize =
    campaign.status === 'published' &&
    !!campaign.responsesMerkleRoot &&
    !!campaign.claimedReceiptsRoot &&
    !campaign.blockchainClosed;

  const handleFinalize = async () => {
    if (confirmText.toUpperCase() !== 'FINALIZE') {
      setError('Please type FINALIZE to confirm');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await onFinalize();
      setShowConfirm(false);
      setConfirmText('');
    } catch (err: any) {
      setError(err.message || 'Failed to finalize campaign on blockchain');
    } finally {
      setLoading(false);
    }
  };

  // Don't show if campaign is not published or already finalized
  if (campaign.status !== 'published') {
    return null;
  }

  return (
    <div className="bg-red-50 border-2 border-red-300 rounded-lg p-6">
      <div className="flex items-start space-x-3 mb-4">
        <svg className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-red-900 mb-1">Delete Campaign</h3>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-300 rounded-lg p-3 mb-4">
          <p className="text-red-900 text-sm font-medium">{error}</p>
        </div>
      )}

      {campaign.blockchainClosed ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start space-x-2">
            <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-medium text-green-900 mb-1">✓ Campaign Finalized on Blockchain</p>
              <p className="text-xs text-green-700 font-mono mb-2">
                Signature: {campaign.blockchainSignature}
              </p>
              {campaign.blockchainClosedAt && (
                <p className="text-xs text-green-600">
                  Finalized: {new Date(campaign.blockchainClosedAt).toLocaleString()}
                </p>
              )}
              <p className="text-xs text-green-700 mt-2">
                This campaign is now immutable. No further changes can be made.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <>
          {!showConfirm ? (
            <div className="space-y-4">
              <div className="bg-white border border-red-200 rounded-lg p-4">

                <button
                  onClick={() => setShowConfirm(true)}
                  disabled={!canFinalize}
                  className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-full"
                >
                  {!canFinalize && (!campaign.responsesMerkleRoot || !campaign.claimedReceiptsRoot)
                    ? 'Publish Both Merkle Roots First'
                    : 'Finalize on Blockchain'}
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white border-2 border-red-300 rounded-lg p-4">
              <h4 className="font-medium text-red-900 mb-3">FINAL CONFIRMATION REQUIRED</h4>

              <div className="bg-red-100 border border-red-200 rounded p-3 mb-4">
                <p className="text-sm font-bold text-red-900 mb-2">WARNING: THIS ACTION IS IRREVERSIBLE</p>
                <p className="text-xs text-red-800 mb-2">
                  This will permanently close the campaign on the blockchain. No further changes can be made after this point.
                </p>
                <ul className="space-y-1 text-xs text-red-700">
                  <li>• Campaign data becomes immutable</li>
                  <li>• Merkle roots are permanently sealed</li>
                  <li>• Students can verify their data indefinitely</li>
                  <li>• This action cannot be undone</li>
                </ul>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Type <span className="font-mono bg-gray-100 px-2 py-1 rounded">FINALIZE</span> to confirm:
                </label>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="Type FINALIZE here"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  disabled={loading}
                />
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={handleFinalize}
                  disabled={loading || confirmText.toUpperCase() !== 'FINALIZE'}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
                      <span>Finalizing on Blockchain...</span>
                    </div>
                  ) : (
                    'Confirm Finalization'
                  )}
                </button>

                <button
                  onClick={() => {
                    setShowConfirm(false);
                    setConfirmText('');
                    setError('');
                  }}
                  disabled={loading}
                  className="px-6 py-3 border-2 border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
