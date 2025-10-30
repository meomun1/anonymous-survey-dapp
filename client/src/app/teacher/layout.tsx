'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';

export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { logout, isAuthenticated, hasRole, getUser } = useAuth();

  // Check authentication and role
  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/login/teacher');
      return;
    }

    // Verify teacher role
    if (!hasRole('teacher')) {
      // If user is authenticated but not a teacher, redirect appropriately
      const user = getUser();
      if (user?.role === 'admin') {
        router.push('/admin');
      } else {
        router.push('/login/teacher');
      }
    }
  }, [isAuthenticated, hasRole, getUser, router]);

  const handleLogout = () => {
    logout();
    router.push('/login/teacher');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="bg-black/20 backdrop-blur-sm border-b border-white/10">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link href="/teacher" className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div>
                <div className="text-white font-bold text-lg">Anonymous Survey</div>
                <div className="text-white/60 text-xs">Teacher Portal</div>
              </div>
            </Link>

            <nav className="flex items-center space-x-6">
              <Link
                href="/teacher"
                className="text-white/80 hover:text-white transition-colors text-sm font-medium"
              >
                My Campaigns
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
              Anonymous Survey System - Teacher Portal
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-white/40 text-xs">
                Manage course evaluations
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
