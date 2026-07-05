import { Bell, Moon, Sun } from 'lucide-react';
import React from 'react';

import { Button } from '../../shared/components/ui/button';
import { useTheme } from '../ThemeProvider';

const Navbar = () => {
  const { theme, setTheme } = useTheme();

  return (
    <header
      className="h-16 bg-white/80 backdrop-blur-md border-b px-8 flex items-center justify-between sticky top-0 z-30 shadow-sm"
      dir="rtl"
    >
      <div className="flex items-center gap-4">
        {/* Mobile menu trigger could go here */}
        <div className="text-sm font-bold text-primary hidden md:block">
          أهلاً بك في نظام أكاديمية ركان الإداري
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          {theme === 'dark' ? (
            <Sun className="h-5 w-5" />
          ) : (
            <Moon className="h-5 w-5" />
          )}
        </Button>
        <Button variant="ghost" size="icon">
          <Bell className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
};

export default Navbar;
