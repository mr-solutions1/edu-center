import React from 'react';

import Navbar from './Navbar';
import Sidebar from './Sidebar';
import CommandPalette from '../../shared/components/CommandPalette/CommandPalette';

const AppShell = ({ children }) => {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground" dir="rtl">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 bg-gradient-to-br from-transparent to-primary/5">
          {children}
        </main>
      </div>
      <CommandPalette />
    </div>
  );
};

export default AppShell;
