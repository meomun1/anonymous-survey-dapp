import React, { createContext, useContext, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSurveys } from '@/hooks/useSurveys';
import { useTokens } from '@/hooks/useTokens';

interface AppContextType {
  auth: ReturnType<typeof useAuth>;
  surveys: ReturnType<typeof useSurveys>;
  tokens: ReturnType<typeof useTokens>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const auth = useAuth();
  const surveys = useSurveys();
  const tokens = useTokens();

  return (
    <AppContext.Provider value={{ auth, surveys, tokens }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}; 