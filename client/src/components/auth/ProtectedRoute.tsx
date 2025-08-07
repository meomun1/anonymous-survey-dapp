import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useApp } from '@/contexts/AppContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireAdmin = false,
}) => {
  const router = useRouter();
  const { auth } = useApp();

  useEffect(() => {
    const checkAuth = async () => {
      if (!auth.isAuthenticated()) {
        router.push('/login');
        return;
      }

      if (requireAdmin) {
        // TODO: Add admin check when implemented
        // For now, we'll just redirect to home
        router.push('/');
      }
    };

    checkAuth();
  }, [auth, router, requireAdmin]);

  if (!auth.isAuthenticated()) {
    return null;
  }

  return <>{children}</>;
}; 