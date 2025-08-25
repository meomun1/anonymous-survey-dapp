'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { tokensApi } from '@/lib/api/tokens';

interface TokenRow {
  id: string;
  token: string;
  surveyId: string;
  studentEmail: string;
  used: boolean;
  isCompleted: boolean;
  createdAt: string;
  usedAt?: string;
  completedAt?: string;
}

export default function AttendancePage({ params }: { params: { id: string } }) {
  const surveyId = params.id;
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const [rows, setRows] = useState<TokenRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }
    load();
  }, [surveyId]);

  const load = async () => {
    try {
      setLoading(true);
      const res = await tokensApi.getSurveyTokens(surveyId);
      setRows(res.data);
    } catch (e: any) {
      setError(e?.message || 'Failed to load attendance');
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => {
    const total = rows.length;
    const used = rows.filter(r => r.used).length;
    const completed = rows.filter(r => r.isCompleted).length;
    return { total, used, completed };
  }, [rows]);

  const exportCsv = () => {
    const header = ['email', 'used', 'completed', 'token'];
    const body = rows.map(r => [
      r.studentEmail,
      r.used ? 'yes' : 'no',
      r.isCompleted ? 'yes' : 'no',
      r.token
    ]);
    const csv = [header, ...body].map(line => line.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-${surveyId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-slate-600 border-t-transparent rounded-full mx-auto"></div>
          <p className="text-gray-600 mt-4">Loading attendance...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Failed to load attendance</h2>
          <p className="text-gray-600 mb-8">{error}</p>
          <Link href={`/admin/surveys/${surveyId}`} className="inline-block bg-slate-700 text-white px-6 py-3 rounded-lg">Back</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <h1 className="text-2xl font-bold text-gray-900">Attendance</h1>
            <div className="space-x-3">
              <button onClick={exportCsv} className="bg-slate-700 text-white px-4 py-2 rounded hover:bg-slate-800">Export CSV</button>
              <Link href={`/admin/surveys/${surveyId}`} className="text-gray-600 hover:text-gray-900">← Back</Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm text-gray-700">
                Total: <span className="font-semibold">{stats.total}</span> · Used: <span className="font-semibold">{stats.used}</span> · Completed: <span className="font-semibold">{stats.completed}</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="py-2 pr-4">Email</th>
                    {/* <th className="py-2 pr-4">Used</th> */}
                    <th className="py-2 pr-4">Completed</th>
                    <th className="py-2 pr-4">Token</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(r => (
                    <tr key={r.id} className="border-b">
                      <td className="py-2 pr-4 text-gray-900">{r.studentEmail}</td>
                      {/* <td className="py-2 pr-4">{r.used ? 'Yes' : 'No'}</td> */}
                      <td className="py-2 pr-4">{r.isCompleted ? 'Yes' : 'No'}</td>
                      <td className="py-2 pr-4 text-gray-500">{r.token}</td>
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-gray-500">No tokens found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}


