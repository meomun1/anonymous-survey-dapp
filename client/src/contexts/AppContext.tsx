'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSurveys } from '@/hooks/useSurveys';
import { useTokens } from '@/hooks/useTokens';
import { useCampaigns } from '@/hooks/useCampaigns';
import { useUniversity } from '@/hooks/useUniversity';

interface AppContextType {
  auth: ReturnType<typeof useAuth>;
  surveys: ReturnType<typeof useSurveys>;
  tokens: ReturnType<typeof useTokens>;
  campaigns: ReturnType<typeof useCampaigns>;
  university: ReturnType<typeof useUniversity>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const auth = useAuth();
  const surveys = useSurveys();
  const tokens = useTokens();
  const campaigns = useCampaigns();
  const university = useUniversity();

  return (
    <AppContext.Provider value={{ auth, surveys, tokens, campaigns, university }}>
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