import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/lib/i18n';

export default function Footer() {
  const { t } = useLanguage();
  return (
    <footer className="border-t border-slate-800 mt-16 py-8">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
        <span className="font-mono">© {new Date().getFullYear()} Sus or Bus</span>
        <div className="flex items-center gap-4">
          <Link to="/terms" className="hover:text-slate-300 transition-colors">{t('footer_terms')}</Link>
          <Link to="/privacy" className="hover:text-slate-300 transition-colors">{t('footer_privacy')}</Link>
        </div>
      </div>
    </footer>
  );
}