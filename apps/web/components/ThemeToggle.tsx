'use client';

import { useTheme } from '../lib/theme';
import { Moon, Sun, Monitor } from 'lucide-react';

export function ThemeToggle() {
    const { theme, setTheme, resolvedTheme } = useTheme();

    const cycleTheme = () => {
        if (theme === 'light') {
            setTheme('dark');
        } else if (theme === 'dark') {
            setTheme('system');
        } else {
            setTheme('light');
        }
    };

    const getIcon = () => {
        if (theme === 'system') {
            return <Monitor className="h-5 w-5" />;
        }
        return resolvedTheme === 'dark' ? (
            <Moon className="h-5 w-5" />
        ) : (
            <Sun className="h-5 w-5" />
        );
    };

    const getLabel = () => {
        if (theme === 'system') return 'System';
        return theme === 'dark' ? 'Dark' : 'Light';
    };

    return (
        <button
            onClick={cycleTheme}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 dark:bg-black/10 dark:hover:bg-black/20 transition-all duration-200 border border-white/20 dark:border-white/10"
            title={`Current theme: ${getLabel()}. Click to cycle themes.`}
            aria-label={`Switch theme (current: ${getLabel()})`}
        >
            <span className="transition-transform duration-200 hover:rotate-12">
                {getIcon()}
            </span>
            <span className="text-sm font-medium hidden sm:inline">
                {getLabel()}
            </span>
        </button>
    );
}
