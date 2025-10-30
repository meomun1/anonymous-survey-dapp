'use client';

import { useState } from 'react';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { ErrorMessage } from '@/components/shared/ErrorMessage';
import {
  generateCommitment,
  verifyBlindSignature,
  hexToUint8Array,
  base64ToArrayBuffer,
  type ProofFile,
  type SurveyProof
} from '@/lib/crypto-utils';
import { responsesApi } from '@/lib/api/responses';
import { cryptoApi } from '@/lib/api/crypto';

interface VerificationResult {
  surveyId: string;
  courseCode: string;
  courseName: string;
  teacherName?: string;
  commitmentValid: boolean;
  blindSignatureValid: boolean;
  blockchainIncluded: boolean;
  overallValid: boolean;
  error?: string;
}

export default function VerifyPage() {
  const [proofFile, setProofFile] = useState<ProofFile | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState<VerificationResult[]>([]);
  const [transactionHashValid, setTransactionHashValid] = useState(false);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const proof: ProofFile = JSON.parse(content);

        // Validate proof file structure
        if (!proof.token || !proof.campaignId || !proof.surveys || !Array.isArray(proof.surveys)) {
          setError('Invalid proof file format');
          return;
        }

        setProofFile(proof);
        setError('');
        setVerified(false);
        setResults([]);
      } catch (err) {
        console.error('Failed to parse proof file:', err);
        setError('Failed to parse proof file. Please ensure it is a valid JSON file.');
      }
    };

    reader.readAsText(file);
  };

  const handleVerify = async () => {
    if (!proofFile) return;

    try {
      setVerifying(true);
      setError('');
      const verificationResults: VerificationResult[] = [];

      console.log(`Verifying ${proofFile.surveys.length} survey responses...`);

      // Get campaign public keys for signature verification
      const publicKeysResponse = await cryptoApi.getCampaignPublicKeys(proofFile.campaignId);
      const publicKeys = publicKeysResponse.data;

      // Verify each survey
      for (const survey of proofFile.surveys) {
        const result: VerificationResult = {
          surveyId: survey.surveyId,
          courseCode: survey.courseCode,
          courseName: survey.courseName,
          teacherName: survey.teacherName,
          commitmentValid: false,
          blindSignatureValid: false,
          blockchainIncluded: false,
          overallValid: false
        };

        try {
          // Step 1: Verify commitment matches answer string
          const recomputedCommitment = await generateCommitment(survey.answerString);
          result.commitmentValid = recomputedCommitment === survey.commitment;

          if (!result.commitmentValid) {
            result.error = 'Commitment hash does not match answer string';
          }

          // Step 2: Verify blind signature using RSA-BSSA protocol
          try {
            const blindSignaturePublicKeyBuffer = base64ToArrayBuffer(publicKeys.blindSignaturePublicKey);
            const signatureBytes = hexToUint8Array(survey.blindSignature);

            result.blindSignatureValid = await verifyBlindSignature(
              blindSignaturePublicKeyBuffer,
              signatureBytes,
              survey.answerString
            );

            if (!result.blindSignatureValid) {
              result.error = 'Blind signature verification failed';
            }
          } catch (err: any) {
            console.error('Blind signature verification error:', err);
            result.blindSignatureValid = false;
            result.error = `Blind signature verification error: ${err.message}`;
          }

          // Step 3: Check blockchain inclusion
          try {
            const blockchainResponse = await responsesApi.getResponseByCommitment(survey.commitment);
            result.blockchainIncluded = !!blockchainResponse.data &&
                                       blockchainResponse.data.commitment === survey.commitment;

            if (!result.blockchainIncluded) {
              result.error = 'Response not found on blockchain';
            }
          } catch (err: any) {
            result.blockchainIncluded = false;
            result.error = 'Failed to check blockchain inclusion';
            console.error('Blockchain check failed:', err);
          }

          // Overall validity
          result.overallValid = result.commitmentValid &&
                               result.blindSignatureValid &&
                               result.blockchainIncluded;

        } catch (err: any) {
          console.error(`Failed to verify survey ${survey.surveyId}:`, err);
          result.error = err.message || 'Verification failed';
        }

        verificationResults.push(result);
      }

      // Check transaction hash validity (basic check)
      setTransactionHashValid(!!proofFile.transactionHash && proofFile.transactionHash.length > 0);

      setResults(verificationResults);
      setVerified(true);

      console.log('Verification complete:', verificationResults);

    } catch (err: any) {
      console.error('Verification failed:', err);
      setError(err.message || 'Verification failed. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  const allValid = results.length > 0 && results.every(r => r.overallValid) && transactionHashValid;
  const validCount = results.filter(r => r.overallValid).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-pink-500 to-red-500 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-block p-4 bg-white/20 backdrop-blur-sm rounded-full mb-6">
            <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h1 className="text-5xl font-bold text-white mb-4">Verify Survey Proof</h1>
          <p className="text-xl text-white/90">
            Upload your proof file to verify that your responses were included in the blockchain
          </p>
        </div>

        {error && <ErrorMessage message={error} onDismiss={() => setError('')} />}

        {/* Upload Section */}
        {!proofFile && (
          <div className="bg-white rounded-lg shadow-2xl p-12">
            <div className="text-center">
              <svg className="mx-auto h-24 w-24 text-gray-400 mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">Upload Proof File</h2>
              <p className="text-gray-600 mb-8">
                Select your proof.json file to verify your survey responses
              </p>

              <label className="inline-block">
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-4 rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition-all duration-200 transform hover:scale-105 cursor-pointer inline-flex items-center space-x-3">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Choose Proof File</span>
                </div>
              </label>

              <p className="text-sm text-gray-500 mt-6">
                The proof file was downloaded after you completed all surveys
              </p>
            </div>
          </div>
        )}

        {/* Proof File Info */}
        {proofFile && !verified && (
          <div className="bg-white rounded-lg shadow-2xl p-8 mb-6">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">Proof File Details</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <div className="text-sm text-gray-600 mb-1">Campaign</div>
                <div className="font-semibold text-gray-900">{proofFile.campaignName}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-1">Submitted</div>
                <div className="font-semibold text-gray-900">
                  {new Date(proofFile.timestamp).toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-1">Total Surveys</div>
                <div className="font-semibold text-gray-900">{proofFile.surveys.length}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-1">Transaction Hash</div>
                <div className="font-mono text-xs text-gray-700 break-all">
                  {proofFile.transactionHash || 'N/A'}
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-3">Surveys in this proof:</h3>
              <ul className="space-y-2">
                {proofFile.surveys.map((survey, index) => (
                  <li key={index} className="flex items-center space-x-2 text-gray-700">
                    <svg className="w-5 h-5 text-purple-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>{survey.courseCode} - {survey.courseName}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-8 flex items-center justify-between">
              <button
                onClick={() => {
                  setProofFile(null);
                  setVerified(false);
                  setResults([]);
                }}
                className="text-gray-600 hover:text-gray-900 font-medium"
              >
                ← Upload Different File
              </button>

              <button
                onClick={handleVerify}
                disabled={verifying}
                className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {verifying ? 'Verifying...' : 'Start Verification'}
              </button>
            </div>
          </div>
        )}

        {/* Verification in Progress */}
        {verifying && (
          <div className="bg-white rounded-lg shadow-2xl p-12">
            <LoadingSpinner message="Verifying your responses on the blockchain..." />
            <p className="text-center text-gray-600 mt-4">
              This may take a moment as we check each response...
            </p>
          </div>
        )}

        {/* Verification Results */}
        {verified && results.length > 0 && (
          <div className="bg-white rounded-lg shadow-2xl p-8">
            {/* Overall Status */}
            <div className={`rounded-lg p-6 mb-6 ${
              allValid
                ? 'bg-green-50 border-2 border-green-500'
                : 'bg-yellow-50 border-2 border-yellow-500'
            }`}>
              <div className="flex items-center space-x-4">
                <div className={`flex-shrink-0 p-3 rounded-full ${
                  allValid ? 'bg-green-500' : 'bg-yellow-500'
                }`}>
                  {allValid ? (
                    <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <div className="flex-1">
                  <h2 className={`text-2xl font-bold mb-1 ${
                    allValid ? 'text-green-900' : 'text-yellow-900'
                  }`}>
                    {allValid ? 'All Verifications Passed!' : 'Verification Issues Detected'}
                  </h2>
                  <p className={`text-sm ${
                    allValid ? 'text-green-800' : 'text-yellow-800'
                  }`}>
                    {validCount} of {results.length} surveys verified successfully
                  </p>
                </div>
              </div>
            </div>

            {/* Individual Results */}
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Detailed Results</h3>
            <div className="space-y-4">
              {results.map((result, index) => (
                <div
                  key={index}
                  className={`border-2 rounded-lg p-6 ${
                    result.overallValid
                      ? 'border-green-200 bg-green-50'
                      : 'border-red-200 bg-red-50'
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h4 className="font-semibold text-gray-900 text-lg">
                        {result.courseCode} - {result.courseName}
                      </h4>
                      {result.teacherName && (
                        <p className="text-sm text-gray-600">Instructor: {result.teacherName}</p>
                      )}
                    </div>
                    {result.overallValid ? (
                      <svg className="w-8 h-8 text-green-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg className="w-8 h-8 text-red-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="flex items-center space-x-2">
                      {result.commitmentValid ? (
                        <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      )}
                      <span className={result.commitmentValid ? 'text-green-800' : 'text-red-800'}>
                        Commitment Valid
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      {result.blindSignatureValid ? (
                        <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      )}
                      <span className={result.blindSignatureValid ? 'text-green-800' : 'text-red-800'}>
                        Signature Valid
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      {result.blockchainIncluded ? (
                        <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      )}
                      <span className={result.blockchainIncluded ? 'text-green-800' : 'text-red-800'}>
                        On Blockchain
                      </span>
                    </div>
                  </div>

                  {result.error && (
                    <div className="mt-4 p-3 bg-red-100 border border-red-300 rounded text-sm text-red-800">
                      <strong>Error:</strong> {result.error}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="mt-8 pt-6 border-t border-gray-200 flex items-center justify-center">
              <button
                onClick={() => {
                  setProofFile(null);
                  setVerified(false);
                  setResults([]);
                }}
                className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition-all duration-200 transform hover:scale-105"
              >
                Verify Another Proof
              </button>
            </div>
          </div>
        )}

        {/* Info Section */}
        {!proofFile && (
          <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-lg p-8 mt-8">
            <h2 className="text-2xl font-semibold text-white mb-4">About Proof Verification</h2>
            <div className="text-white/90 space-y-3">
              <p>
                The proof file contains cryptographic evidence that your survey responses were submitted and included in the blockchain. Verification checks:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Commitment Integrity:</strong> Ensures your answers haven't been tampered with</li>
                <li><strong>Blind Signature:</strong> Confirms the server signed your response without knowing its content</li>
                <li><strong>Blockchain Inclusion:</strong> Verifies your response is permanently stored on the blockchain</li>
              </ul>
              <p className="mt-4 text-sm text-white/70">
                This verification process is completely public and can be performed by anyone with a valid proof file.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
