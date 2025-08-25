"use client";
import { useState } from 'react';
import { surveysApi } from '@/lib/api/surveys';
import { CryptoUtils, base64ToUint8Array } from '@/lib/crypto/blindSignatures';

export default function VerifyResponsePage() {
  const [surveyId, setSurveyId] = useState('');
  const [preparedMsgB64, setPreparedMsgB64] = useState('');
  const [signatureB64, setSignatureB64] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<null | { valid: boolean; title?: string }>(null);
  const [error, setError] = useState<string | null>(null);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      if (!surveyId || !preparedMsgB64 || !signatureB64) {
        throw new Error('Please fill all fields');
      }

      // 1) fetch public keys for the survey
      const { data: keys } = await surveysApi.getKeys(surveyId);

      // 2) import blind signature public key
      const publicKey = await CryptoUtils.importPublicKey(keys.blindSignaturePublicKey, 'blindSignature');

      // 3) convert inputs
      const preparedMsg = base64ToUint8Array(preparedMsgB64);
      const signature = base64ToUint8Array(signatureB64);

      // 4) verify
      const isValid = await CryptoUtils.verifySignature(publicKey, signature, preparedMsg);

      // 5) optionally fetch survey title
      let title: string | undefined;
      try {
        const surveyRes = await surveysApi.getById(surveyId);
        title = surveyRes.data.title;
      } catch {}

      setResult({ valid: isValid, title });
    } catch (err: any) {
      setError(err?.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Verify Your Response</h1>
      <p className="text-sm text-gray-600 mb-6">Enter your details from step 6 to verify your blind signature.</p>
      <form onSubmit={handleVerify} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Survey ID</label>
          <input
            className="w-full border rounded px-3 py-2"
            value={surveyId}
            onChange={(e) => setSurveyId(e.target.value)}
            placeholder="e.g. 2bdd663b-..."
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Prepared Message (base64)</label>
          <textarea
            className="w-full border rounded px-3 py-2 h-24"
            value={preparedMsgB64}
            onChange={(e) => setPreparedMsgB64(e.target.value)}
            placeholder="oILENND4e3k6..."
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Signature (base64)</label>
          <textarea
            className="w-full border rounded px-3 py-2 h-24"
            value={signatureB64}
            onChange={(e) => setSignatureB64(e.target.value)}
            placeholder="c6aQU9K9W/KR/..."
          />
        </div>
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          disabled={loading}
        >
          {loading ? 'Verifying...' : 'Verify'}
        </button>
      </form>

      {error && (
        <div className="mt-4 text-red-600 text-sm">{error}</div>
      )}

      {result && (
        <div className="mt-6 p-4 rounded border">
          {result.valid ? (
            <div>
              <div className="text-green-700 font-semibold mb-1">Yes, your response is valid.</div>
              {result.title && (
                <div className="text-sm text-gray-700">Survey: {result.title}</div>
              )}
            </div>
          ) : (
            <div className="text-red-700 font-semibold">The signature does not verify for this survey.</div>
          )}
        </div>
      )}
    </div>
  );
}


