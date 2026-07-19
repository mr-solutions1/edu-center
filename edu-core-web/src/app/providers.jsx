import { QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

import { ThemeProvider } from './ThemeProvider';
import { AuthProvider } from '../features/auth/AuthContext';
import { LanguageProvider } from '../shared/context/LanguageContext';
import { CriticalErrorDialog } from '../shared/components/CriticalErrorDialog';
import { queryClient } from '../shared/lib/queryClient';

export const Providers = ({ children }) => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="edu-core-theme">
        <LanguageProvider>
          <AuthProvider>
            <div
              className="min-h-screen bg-background font-sans antialiased"
            >
              {children}
              <CriticalErrorDialog />
            </div>
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};
