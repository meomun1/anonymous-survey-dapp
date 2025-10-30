'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  useEffect(() => {
    // Check if student is authenticated
    const sessionToken = sessionStorage.getItem('studentToken');
    if (!sessionToken) {
      // Redirect to login if not authenticated
      router.push('/login/student');
    }
  }, [router]);

  const handleLogout = () => {
    // Clear student session
    sessionStorage.removeItem('studentToken');
    sessionStorage.removeItem('studentTokenData');
    router.push('/login/student');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="bg-black/20 backdrop-blur-sm border-b border-white/10">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link href="/student" className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <div className="text-white font-bold text-lg">Anonymous Survey</div>
                <div className="text-white/60 text-xs">Student Portal</div>
              </div>
            </Link>

            <nav className="flex items-center space-x-6">
              <Link
                href="/student/surveys"
                className="text-white/80 hover:text-white transition-colors text-sm font-medium"
              >
                My Surveys
              </Link>
              <button
                onClick={handleLogout}
                className="bg-white/10 backdrop-blur-sm border border-white/30 text-white px-4 py-2 rounded-lg hover:bg-white/20 transition-all duration-200 text-sm font-medium"
              >
                Logout
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-black/20 backdrop-blur-sm border-t border-white/10 mt-16">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between text-sm">
            <div className="text-white/60">
              Anonymous Survey System - Powered by Blockchain
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-white/40 text-xs">
                All responses are encrypted and anonymous
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
