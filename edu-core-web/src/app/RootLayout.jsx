import React from 'react';
import { NavigationProvider } from './layout/NavigationContext';
import { Outlet } from 'react-router-dom';

import AppShell from './layout/AppShell';

const RootLayout = () => {
  return (
    <NavigationProvider>
      <AppShell>
        <Outlet />
      </AppShell>
    </NavigationProvider>
  );
};

export default RootLayout;
