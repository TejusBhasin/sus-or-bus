import React, { useState, useRef, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const THRESHOLD = 55;

export default function PullToRefresh({ onRefresh, children }) {
  const [distance, setDistance] = useState(0);
  const touch = useRef({ startY: 0, active: false });

  useEffect(() => {
    const onStart = (e) => {
      if (window.scrollY <= 0) {
        touch.current.startY = e.touches[0].clientY;
        touch.current.active = true;
      }
    };
    const onMove = (e) => {
      if (!touch.current.active) return;
      const dy = e.touches[0].clientY - touch.current.startY;
      if (dy > 0 && window.scrollY <= 0) {
        setDistance(Math.min(dy * 0.4, 70));
      } else if (dy <= 0) {
        setDistance(0);
      }
    };
    const onEnd = () => {
      if (touch.current.active && distance > THRESHOLD) onRefresh();
      touch.current.active = false;
      setDistance(0);
    };
    window.addEventListener('touchstart', onStart, { passive: true });
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('touchend', onEnd);
    return () => {
      window.removeEventListener('touchstart', onStart);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
    };
  }, [distance, onRefresh]);

  return (
    <div>
      <div
        className="flex justify-center overflow-hidden"
        style={{ height: distance * 0.5, transition: distance ? 'none' : 'height 0.25s ease-out' }}
      >
        <Loader2 className={cn('w-5 h-5 text-muted-foreground', distance > THRESHOLD && 'animate-spin')} />
      </div>
      {children}
    </div>
  );
}