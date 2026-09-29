import React, { useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

// Minimal scroll-down hint that sits in the bottom-right corner of the home
// page. Clicking it nudges the page down one screen; it fades out once the
// user has scrolled away from the top.
export default function ScrollDownButton() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY < 300);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleClick = () => {
    window.scrollBy({ top: window.innerHeight * 0.8, behavior: 'smooth' });
  };

  return (
    <button
      onClick={handleClick}
      aria-label="Scroll down"
      className={cn(
        'fixed right-5 bottom-24 z-40 flex items-center justify-center w-10 h-10 rounded-full',
        'border border-border bg-card/80 backdrop-blur text-muted-foreground shadow-lg',
        'hover:text-foreground hover:border-foreground/30 transition-all duration-300',
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
      )}
    >
      <ChevronDown className="w-4 h-4" />
    </button>
  );
}