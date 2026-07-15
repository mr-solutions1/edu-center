import React from 'react';

import Navbar from './Navbar';
import Sidebar from './Sidebar';
import AiAssistantWidget from '../../shared/components/AiAssistantWidget/AiAssistantWidget';
import CommandPalette from '../../shared/components/CommandPalette/CommandPalette';

const AppShell = ({ children }) => {
  return (
    <div className="flex h-screen bg-[#F8FAFC]" dir="rtl">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-gradient-to-br from-transparent to-primary/5">
          {children}
        </main>
      </div>
      <AiAssistantWidget />
      <CommandPalette />
    </div>
  );
};

export default AppShell;
