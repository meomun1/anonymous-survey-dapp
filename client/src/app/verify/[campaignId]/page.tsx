'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { verificationApi, CampaignVerificationData, VerificationResult } from '@/lib/api/verification';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { ErrorMessage } from '@/components/shared/ErrorMessage';

export default function StudentVerificationPage() {
  const [campaignData, setCampaignData] = useState<CampaignVerificationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Receipt file upload
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [loadedCommitments, setLoadedCommitments] = useState<string[]>([]);

  // Response verification
  const [responseCommitment, setResponseCommitment] = useState('');
  const [responseVerifying, setResponseVerifying] = useState(false);
  const [responseResult, setResponseResult] = useState<VerificationResult | null>(null);

  // Participation verification
  const [receiptHash, setReceiptHash] = useState('');
  const [participationVerifying, setParticipationVerifying] = useState(false);
  const [participationResult, setParticipationResult] = useState<VerificationResult | null>(null);

  const params = useParams();
  const router = useRouter();
  const campaignId = params.campaignId as string;

  const loadCampaignData = useCallback(async () => {
    if (!campaignId) return;
    
    try {
      setLoading(true);
      setError('');
      const response = await verificationApi.getCampaignVerificationData(campaignId);
      setCampaignData(response.data);
    } catch (err: any) {
      console.error('Failed to load campaign verification data:', err);
      setError(err.response?.data?.error || 'Failed to load campaign verification data');
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    loadCampaignData();
  }, [loadCampaignData]);

  const handleVerifyResponse = async () => {
    if (!responseCommitment.trim()) {
      setError('Please enter your response commitment hash');
      return;
    }

    try {
      setResponseVerifying(true);
      setError('');
      const response = await verificationApi.verifyResponseCommitment(campaignId, responseCommitment.trim());
      setResponseResult(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to verify response commitment');
      setResponseResult(null);
    } finally {
      setResponseVerifying(false);
    }
  };

  const handleVerifyParticipation = async () => {
    if (!receiptHash.trim()) {
      setError('Please enter your participation receipt hash');
      return;
    }

    try {
      setParticipationVerifying(true);
      setError('');
      const response = await verificationApi.verifyParticipationClaim(campaignId, receiptHash.trim());
      setParticipationResult(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to verify participation claim');
      setParticipationResult(null);
    } finally {
      setParticipationVerifying(false);
    }
  };

  const handleReceiptUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const receiptData = JSON.parse(text);

      // Validate receipt structure
      if (!receiptData.campaignId || !receiptData.commitments) {
        throw new Error('Invalid receipt file format. Missing campaignId or commitments.');
      }

      // Check if campaignId matches
      if (receiptData.campaignId !== campaignId) {
        throw new Error(`This receipt is for a different campaign (${receiptData.campaignId}). Please use the correct verification page.`);
      }

      setReceiptFile(file);
      setLoadedCommitments(receiptData.commitments || []);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to read receipt file. Please ensure it\'s a valid survey-receipt.json file.');
      setReceiptFile(null);
      setLoadedCommitments([]);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading verification data..." fullScreen />;
  }

  if (!campaignData) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-4">⚠️</div>
        <h2 className="text-xl font-semibold mb-2">Campaign Not Found</h2>
        <p className="text-gray-600 mb-6">The campaign you're looking for doesn't exist or is not available for verification yet.</p>
        <Link
          href="/student"
          className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      {error && <ErrorMessage message={error} onDismiss={() => setError('')} />}

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Verify Your Data</h1>
        <p className="text-gray-600 mb-4">
          Verify that your survey responses and participation claims are included in the blockchain Merkle roots
        </p>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span className="font-medium">Campaign:</span>
          <span>{campaignData.campaignName}</span>
        </div>
      </div>


      {/* Campaign Status */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
        <h3 className="font-semibold text-blue-900 mb-3">Blockchain Status</h3>
        {campaignData.responsesMerkleRoot && (
          <div className="mt-4 pt-4 border-t border-blue-200">
            <p className="text-xs text-blue-700 mb-1">Response Merkle Root:</p>
            <p className="font-mono text-xs bg-white rounded px-3 py-2 break-all">
              {campaignData.responsesMerkleRoot}
            </p>
          </div>
        )}

        {campaignData.claimedReceiptsRoot && (
          <div className="mt-3">
            <p className="text-xs text-blue-700 mb-1">Participation Merkle Root:</p>
            <p className="font-mono text-xs bg-white rounded px-3 py-2 break-all">
              {campaignData.claimedReceiptsRoot}
            </p>
          </div>
        )}
      </div>

      {/* Response Verification */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4">Verify Survey Response</h3>

        {!campaignData.canVerifyResponses ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              Response verification is not yet available. The admin must publish the responses Merkle root first.
            </p>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-600 mb-4">
              Enter your response commitment hash to verify it's included in the blockchain Merkle tree.
              You received this hash when you submitted your survey responses.
            </p>

            <div className="space-y-4">
              {loadedCommitments.length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-green-900 mb-2">
                    Loaded {loadedCommitments.length} commitment(s) from receipt file
                  </p>
                  <select
                    onChange={(e) => setResponseCommitment(e.target.value)}
                    className="w-full px-4 py-2 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 font-mono text-sm bg-white"
                    value={responseCommitment}
                  >
                    <option value="">-- Select a commitment to verify --</option>
                    {loadedCommitments.map((commit, idx) => (
                      <option key={idx} value={commit}>
                        Commitment {idx + 1}: {commit.substring(0, 32)}...
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Response Commitment Hash {loadedCommitments.length > 0 && '(or enter manually)'}
                </label>
                <input
                  type="text"
                  value={responseCommitment}
                  onChange={(e) => setResponseCommitment(e.target.value)}
                  placeholder="Enter your response commitment hash"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                  disabled={responseVerifying}
                />
              </div>

              <button
                onClick={handleVerifyResponse}
                disabled={responseVerifying || !responseCommitment.trim()}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {responseVerifying ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                    <span>Verifying...</span>
                  </div>
                ) : (
                  'Verify Response'
                )}
              </button>

              {responseResult && (
                <div className={`border rounded-lg p-4 ${
                  responseResult.isValid
                    ? 'bg-green-50 border-green-200'
                    : 'bg-red-50 border-red-200'
                }`}>
                  <div className="flex items-start space-x-3">
                    <div className={`text-2xl ${responseResult.isValid ? 'text-green-600' : 'text-red-600'}`}>
                      {responseResult.isValid ? '✓' : '✗'}
                    </div>
                    <div className="flex-1">
                      <p className={`font-semibold mb-2 ${
                        responseResult.isValid ? 'text-green-900' : 'text-red-900'
                      }`}>
                        {responseResult.isValid
                          ? 'Response Verified Successfully!'
                          : 'Response Not Found'}
                      </p>
                      <p className={`text-sm ${
                        responseResult.isValid ? 'text-green-800' : 'text-red-800'
                      }`}>
                        {responseResult.message || (
                          responseResult.isValid
                            ? 'Your response commitment is included in the blockchain Merkle tree. Your survey response has been permanently recorded and cannot be altered.'
                            : 'This commitment was not found in the blockchain Merkle tree. Please check your commitment hash and try again.'
                        )}
                      </p>
                      {responseResult.proof && (
                        <details className="mt-3">
                          <summary className="text-xs font-medium cursor-pointer hover:underline">
                            View Merkle Proof Details
                          </summary>
                          <div className="mt-2 bg-white rounded p-3 text-xs font-mono space-y-1">
                            <div><strong>Root:</strong> {responseResult.proof.root}</div>
                            <div><strong>Index:</strong> {responseResult.proof.index}</div>
                            <div><strong>Siblings:</strong> {responseResult.proof.siblings.length}</div>
                          </div>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Participation Verification */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4">Verify Participation Claim</h3>

        {!campaignData.canVerifyParticipation ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              Participation verification is not yet available. The admin must publish the participation claims Merkle root first.
            </p>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-600 mb-4">
              Enter your participation receipt hash to verify it's included in the blockchain Merkle tree.
              You received this hash when you claimed your participation.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Participation Receipt Hash
                </label>
                <input
                  type="text"
                  value={receiptHash}
                  onChange={(e) => setReceiptHash(e.target.value)}
                  placeholder="Enter your participation receipt hash"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                  disabled={participationVerifying}
                />
              </div>

              <button
                onClick={handleVerifyParticipation}
                disabled={participationVerifying || !receiptHash.trim()}
                className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {participationVerifying ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                    <span>Verifying...</span>
                  </div>
                ) : (
                  'Verify Participation'
                )}
              </button>

              {participationResult && (
                <div className={`border rounded-lg p-4 ${
                  participationResult.isValid
                    ? 'bg-green-50 border-green-200'
                    : 'bg-red-50 border-red-200'
                }`}>
                  <div className="flex items-start space-x-3">
                    <div className={`text-2xl ${participationResult.isValid ? 'text-green-600' : 'text-red-600'}`}>
                      {participationResult.isValid ? '✓' : '✗'}
                    </div>
                    <div className="flex-1">
                      <p className={`font-semibold mb-2 ${
                        participationResult.isValid ? 'text-green-900' : 'text-red-900'
                      }`}>
                        {participationResult.isValid
                          ? 'Participation Verified Successfully!'
                          : 'Participation Not Found'}
                      </p>
                      <p className={`text-sm ${
                        participationResult.isValid ? 'text-green-800' : 'text-red-800'
                      }`}>
                        {participationResult.message || (
                          participationResult.isValid
                            ? 'Your participation claim is included in the blockchain Merkle tree. Your participation has been permanently recorded and cannot be altered.'
                            : 'This receipt hash was not found in the blockchain Merkle tree. Please check your receipt hash and try again.'
                        )}
                      </p>
                      {participationResult.proof && (
                        <details className="mt-3">
                          <summary className="text-xs font-medium cursor-pointer hover:underline">
                            View Merkle Proof Details
                          </summary>
                          <div className="mt-2 bg-white rounded p-3 text-xs font-mono space-y-1">
                            <div><strong>Root:</strong> {participationResult.proof.root}</div>
                            <div><strong>Index:</strong> {participationResult.proof.index}</div>
                            <div><strong>Siblings:</strong> {participationResult.proof.siblings.length}</div>
                          </div>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

    </div>
  );
}
