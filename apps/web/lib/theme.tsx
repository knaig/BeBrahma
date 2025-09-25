'use client';

import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('system');
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Get initial theme from localStorage or default to system
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme') as Theme;
      if (savedTheme) {
        setTheme(savedTheme);
      }
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;
    
    const updateResolvedTheme = () => {
      if (typeof window === 'undefined') return;
      
      if (theme === 'system') {
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        setResolvedTheme(systemTheme);
        document.documentElement.classList.toggle('dark', systemTheme === 'dark');
      } else {
        setResolvedTheme(theme);
        document.documentElement.classList.toggle('dark', theme === 'dark');
      }
    };

    updateResolvedTheme();

    // Listen for system theme changes
    if (typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      mediaQuery.addEventListener('change', updateResolvedTheme);

      return () => mediaQuery.removeEventListener('change', updateResolvedTheme);
    }
  }, [theme, mounted]);

  const handleSetTheme = (newTheme: Theme) => {
    setTheme(newTheme);
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme', newTheme);
    }
  };

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return (
      <ThemeContext.Provider value={{ theme: 'system', setTheme: handleSetTheme, resolvedTheme: 'light' }}>
        {children}
      </ThemeContext.Provider>
    );
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme: handleSetTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    // Return a safe default instead of throwing an error
    console.warn('useTheme called outside of ThemeProvider, using default values');
    return {
      theme: 'system' as Theme,
      setTheme: () => {
        console.warn('setTheme called outside of ThemeProvider');
      },
      resolvedTheme: 'light' as const
    };
  }
  return context;
}

// Utility function to get CSS variables for current theme
export function getThemeColors(isDark: boolean) {
  return {
    background: isDark ? 'rgb(15 23 42)' : 'rgb(255 255 255)', // slate-900 : white
    surface: isDark ? 'rgb(30 41 59)' : 'rgb(249 250 251)', // slate-800 : gray-50
    surfaceHover: isDark ? 'rgb(51 65 85)' : 'rgb(243 244 246)', // slate-700 : gray-100
    border: isDark ? 'rgb(51 65 85)' : 'rgb(229 231 235)', // slate-700 : gray-200
    text: isDark ? 'rgb(248 250 252)' : 'rgb(17 24 39)', // slate-50 : gray-900
    textSecondary: isDark ? 'rgb(148 163 184)' : 'rgb(107 114 128)', // slate-400 : gray-500
    primary: isDark ? 'rgb(99 102 241)' : 'rgb(99 102 241)', // indigo-500
    primaryHover: isDark ? 'rgb(129 140 248)' : 'rgb(129 140 248)', // indigo-400
  };
}
