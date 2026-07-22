import { Bell, Moon, Sun, Menu, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import React, { useState, useEffect } from 'react';

import { Button } from '../../shared/components/ui/button';
import { useTheme } from '../ThemeProvider';
import { useNavigation } from './NavigationContext';

const Navbar = () => {
  const { theme, setTheme } = useTheme();
  const { setIsMobileOpen } = useNavigation();

  // State for platform-wide zoom
  const [zoom, setZoom] = useState(() => {
    const saved = localStorage.getItem('edu-platform-zoom');
    return saved ? parseInt(saved, 10) : 100;
  });

  // Apply zoom to documentElement on load and changes
  useEffect(() => {
    document.documentElement.style.zoom = zoom / 100;
    localStorage.setItem('edu-platform-zoom', zoom.toString());
  }, [zoom]);

  const zoomIn = () => {
    setZoom((prev) => Math.min(150, prev + 10));
  };

  const zoomOut = () => {
    setZoom((prev) => Math.max(80, prev - 10));
  };

  const resetZoom = () => {
    setZoom(100);
  };

  return (
    <header
      className="h-16 bg-card/80 backdrop-blur-md border-b border-border px-4 md:px-8 flex items-center justify-between sticky top-0 z-20 shadow-premium-sm select-none"
      dir="rtl"
    >
      <div className="flex items-center gap-3">
        {/* Mobile Hamburger menu trigger */}
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden h-10 w-10 text-foreground/80 hover:bg-surface rounded-xl"
          onClick={() => setIsMobileOpen((prev) => !prev)}
          aria-label="Open navigation menu"
        >
          <Menu className="h-6 w-6" />
        </Button>

        <div className="text-xs md:text-sm font-bold text-primary dark:text-primary-400 truncate max-w-[200px] sm:max-w-none">
          أهلاً بك في نظام معهد ألفا العالمي الإداري
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Professional Platform Zoom Controls */}
        <div className="flex items-center gap-1 bg-surface p-1 rounded-xl border border-border">
          <Button
            variant="ghost"
            size="icon"
            onClick={zoomOut}
            disabled={zoom <= 80}
            className="h-8 w-8 rounded-lg text-foreground/85 hover:bg-surface-elevated transition-colors"
            title="تصغير الواجهة (-)"
            aria-label="Zoom out"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-xs font-black px-1.5 min-w-[40px] text-center text-foreground select-none">
            {zoom}%
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={zoomIn}
            disabled={zoom >= 150}
            className="h-8 w-8 rounded-lg text-foreground/85 hover:bg-surface-elevated transition-colors"
            title="تكبير الواجهة (+)"
            aria-label="Zoom in"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={resetZoom}
            disabled={zoom === 100}
            className="h-8 w-8 rounded-lg text-foreground/50 hover:bg-surface-elevated transition-colors disabled:opacity-30"
            title="إعادة تعيين (100%)"
            aria-label="Reset zoom"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-xl"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          aria-label="Toggle theme"
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
