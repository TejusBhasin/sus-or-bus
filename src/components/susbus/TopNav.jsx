import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

export default function TopNav() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const isHome = pathname === '/';

  const handleBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate('/');
  };

  return (
    <nav className="sticky top-0 z-40 bg-background/80 backdrop-blur border-b border-border pt-safe">
      <div className="max-w-2xl mx-auto px-5 h-12 flex items-center justify-between">
        {isHome ? (
          <span className="flex items-center min-h-11 font-black tracking-tighter text-lg">
            <span className="text-red-500 dark:text-red-400">Sus</span>
            <span className="text-muted-foreground/60 mx-1 font-normal lowercase">or</span>
            <span className="text-emerald-500 dark:text-emerald-400">Bus</span>
          </span>
        ) : (
          <button
            onClick={handleBack}
            aria-label="Back"
            className="inline-flex items-center justify-center min-h-11 min-w-11 -ml-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}
      </div>
    </nav>
  );
}