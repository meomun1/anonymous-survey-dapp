'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated, hasRole, logout } = useAuth();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);

    if (!isAuthenticated()) {
      router.push('/login');
      return;
    }

    if (!hasRole('admin')) {
      router.push('/');
      return;
    }
  }, [isAuthenticated, hasRole, router]);

  // Prevent hydration mismatch by only rendering after client mount
  if (!isClient) {
    return null;
  }

  if (!isAuthenticated() || !hasRole('admin')) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-700 via-purple-600 to-slate-700">
      {/* Animated Background */}
      <div className="absolute inset-0 opacity-25 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-400/8 to-purple-400/8"></div>
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 25% 25%, rgba(147, 51, 234, 0.12) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(59, 130, 246, 0.12) 0%, transparent 50%)`
        }}></div>
      </div>

      {/* Header */}
      <header className="bg-black/20 backdrop-blur-sm border-b border-white/10">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link href="/admin" className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <div className="text-white font-bold text-lg">Anonymous Survey</div>
                <div className="text-white/60 text-xs">Admin Portal</div>
              </div>
            </Link>

            <nav className="flex items-center space-x-6">
              <Link
                href="/admin"
                className="text-white/80 hover:text-white transition-colors text-sm font-medium"
              >
                Semesters
              </Link>
              <Link
                href="/admin/university"
                className="text-white/80 hover:text-white transition-colors text-sm font-medium"
              >
                Schools
              </Link>
              <button
                onClick={() => {
                  logout();
                  router.push('/');
                }}
                className="bg-white/10 backdrop-blur-sm border border-white/30 text-white px-4 py-2 rounded-lg hover:bg-white/20 transition-all duration-200 text-sm font-medium"
              >
                Logout
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
