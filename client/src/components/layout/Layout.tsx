import { FC, ReactNode } from 'react';
import { useRouter } from 'next/router';
import { useApp } from '@/contexts/AppContext';
import { Header } from '@/components/layout/Header';

interface LayoutProps {
  children: ReactNode;
}

export const Layout: FC<LayoutProps> = ({ children }) => {
  const { auth } = useApp();
  const router = useRouter();

  const handleLogout = async () => {
    await auth.logout();
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header onLogout={handleLogout} />
      <main>{children}</main>
    </div>
  );
}; 