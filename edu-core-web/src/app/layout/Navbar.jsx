import { Bell, Moon, Sun, Menu } from 'lucide-react';
import React from 'react';

import { Button } from '../../shared/components/ui/button';
import { useTheme } from '../ThemeProvider';
import { useNavigation } from './NavigationContext';

const Navbar = () => {
  const { theme, setTheme } = useTheme();
  const { setIsMobileOpen } = useNavigation();

  return (
    <header
      className="h-16 bg-white/80 backdrop-blur-md border-b px-4 md:px-8 flex items-center justify-between sticky top-0 z-20 shadow-sm select-none"
      dir="rtl"
    >
      <div className="flex items-center gap-3">
        {/* Mobile Hamburger menu trigger */}
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden h-10 w-10 text-slate-700 hover:bg-slate-100 rounded-xl"
          onClick={() => setIsMobileOpen((prev) => !prev)}
          aria-label="Open navigation menu"
        >
          <Menu className="h-6 w-6" />
        </Button>

        <div className="text-xs md:text-sm font-bold text-primary truncate max-w-[200px] sm:max-w-none">
          أهلاً بك في نظام معهد ألفا العالمي الإداري
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-xl"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          {theme === 'dark' ? (
            <Sun className="h-5 w-5" />
          ) : (
            <Moon className="h-5 w-5" />
          )}
        </Button>
        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl">
          <Bell className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
};

export default Navbar;
