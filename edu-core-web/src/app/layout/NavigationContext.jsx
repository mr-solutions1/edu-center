import React, { createContext, useContext, useState, useEffect } from 'react';

const NavigationContext = createContext(null);

export const useNavigation = () => {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
};

export const NavigationProvider = ({ children }) => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isTabletCollapsed, setIsTabletCollapsed] = useState(true);

  // Close mobile navigation on window resize if layout switches to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsMobileOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <NavigationContext.Provider
      value={{
        isMobileOpen,
        setIsMobileOpen,
        isTabletCollapsed,
        setIsTabletCollapsed,
      }}
    >
      {children}
    </NavigationContext.Provider>
  );
};
