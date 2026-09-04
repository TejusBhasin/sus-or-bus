import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';
import { funFacts } from '@/data/funFacts';

export default function AnalyzingLoader() {
  const { t } = useLanguage();
  const [factIndex, setFactIndex] = useState(() => Math.floor(Math.random() * funFacts.length));

  useEffect(() => {
    const id = setInterval(() => {
      setFactIndex((i) => (i + 1) % funFacts.length);
    }, 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center px-6 text-center">
      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      <p className="mt-6 text-sm font-medium">{t('analyzing')}</p>
      <p className="mt-3 max-w-sm text-sm text-muted-foreground leading-relaxed">
        {funFacts[factIndex]}
      </p>
    </div>
  );
}