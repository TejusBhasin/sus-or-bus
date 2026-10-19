import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home as HomeIcon, Settings as SettingsIcon, Puzzle } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';
import { cn } from '@/lib/utils';

const tabs = [
  { path: '/extension', label: 'Extension/App', icon: Puzzle, isActive: (p) => p.startsWith('/extension') },
  { path: '/', labelKey: 'nav_home', icon: HomeIcon, isActive: (p) => p === '/' || p.startsWith('/report') },
  { path: '/settings', labelKey: 'nav_settings', icon: SettingsIcon, isActive: (p) => p.startsWith('/settings') }
];

export default function TabBar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { t } = useLanguage();

  // Full-page legal documents read without the tab bar
  if (pathname.startsWith('/terms') || pathname.startsWith('/privacy')) return null;

  return (
    <nav
      aria-label="App navigation"
      className="fixed bottom-0 inset-x-0 z-50 border-t border-border bg-background/80 backdrop-blur pb-safe-nav print:hidden"
    >
      <div className="max-w-2xl mx-auto grid grid-cols-3">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = tab.isActive(pathname);
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 h-16 px-4 text-xs font-medium transition-colors',
                active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className={cn('w-5 h-5', active ? 'text-emerald-500 dark:text-emerald-400' : '')} />
              <span>{tab.label || t(tab.labelKey)}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}