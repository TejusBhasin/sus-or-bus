import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/lib/i18n';

export default function Footer() {
  const { t } = useLanguage();
  return (
    <footer className="border-t border-border mt-16 py-8">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
        <span className="font-mono">© {new Date().getFullYear()} Sus or Bus</span>
        <a href="mailto:support@susorbus.com" className="font-mono hover:text-foreground transition-colors">
          support@susorbus.com
        </a>
        <div className="flex items-center gap-4">
          <Link to="/terms" className="hover:text-foreground transition-colors">{t('footer_terms')}</Link>
          <Link to="/privacy" className="hover:text-foreground transition-colors">{t('footer_privacy')}</Link>
        </div>
      </div>
    </footer>
  );
}