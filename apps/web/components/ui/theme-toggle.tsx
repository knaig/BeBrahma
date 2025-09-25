'use client';

import { Moon, Sun, Monitor } from 'lucide-react';
import { useTheme } from '@/lib/theme';
import { Button } from './button';

export function ThemeToggle() {
  try {
    const { theme, setTheme, resolvedTheme } = useTheme();

    const themes = [
      { value: 'light', icon: Sun, label: 'Light' },
      { value: 'dark', icon: Moon, label: 'Dark' },
      { value: 'system', icon: Monitor, label: 'System' },
    ] as const;

    return (
      <div className="flex items-center space-x-1 bg-gray-100 dark:bg-slate-800 rounded-lg p-1 shadow-lg border border-gray-200 dark:border-slate-700 transition-all duration-200 hover:shadow-xl">
        {themes.map(({ value, icon: Icon, label }) => (
          <Button
            key={value}
            variant={theme === value ? 'default' : 'ghost'}
            size="sm"
            onClick={() => {
              try {
                setTheme(value);
              } catch (error) {
                console.error('Error setting theme:', error);
              }
            }}
            className={`h-8 px-3 transition-all duration-200 ${
              theme === value
                ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm scale-105'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-slate-700'
            }`}
            title={`Switch to ${label} mode`}
          >
            <Icon className="w-4 h-4" />
            <span className="sr-only">{label}</span>
          </Button>
        ))}
      </div>
    );
  } catch (error) {
    console.error('Error rendering ThemeToggle:', error);
    // Fallback to a simple button that doesn't break the page
    return (
      <Button
        variant="outline"
        size="sm"
        className="h-8 px-3"
        onClick={() => console.log('Theme toggle fallback clicked')}
      >
        🌙
      </Button>
    );
  }
}

// Floating theme toggle for mobile or when you want a more accessible option
export function FloatingThemeToggle() {
  try {
    const { theme, setTheme } = useTheme();
    
    const nextTheme = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light';
    const Icon = theme === 'light' ? Sun : theme === 'dark' ? Moon : Monitor;
    
    return (
      <Button
        onClick={() => {
          try {
            setTheme(nextTheme);
          } catch (error) {
            console.error('Error setting theme:', error);
          }
        }}
        className="fixed bottom-6 right-6 h-12 w-12 rounded-full shadow-lg bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:shadow-xl transition-all duration-200 z-50"
        title={`Switch to ${nextTheme} mode`}
      >
        <Icon className="w-5 h-5 text-gray-700 dark:text-gray-300" />
      </Button>
    );
  } catch (error) {
    console.error('Error rendering FloatingThemeToggle:', error);
    // Fallback to a simple button that doesn't break the page
    return (
      <Button
        className="fixed bottom-6 right-6 h-12 w-12 rounded-full shadow-lg bg-gray-500 text-white z-50"
        onClick={() => console.log('Floating theme toggle fallback clicked')}
      >
        🌙
      </Button>
    );
  }
}
