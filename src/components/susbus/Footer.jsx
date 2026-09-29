import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/lib/i18n';

export default function Footer() {
  const { t } = useLanguage();
  return (
    <footer className="border-t border-border mt-16 py-8">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
        <span className="font-mono">© {new Date().getFullYear()} Sus or Bus</span>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link to="/terms" className="hover:text-foreground transition-colors">{t('footer_terms')}</Link>
          <a
            href="https://apps.apple.com/nz/app/sus-or-bus/id6808757038"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-foreground transition-colors"
          >
            Download on the App Store
          </a>
          <a href="mailto:TejusBhasin17@gmail.com" className="font-mono hover:text-foreground transition-colors">
            TejusBhasin17@gmail.com
          </a>
          <Link to="/privacy" className="hover:text-foreground transition-colors">{t('footer_privacy')}</Link>
          <Link to="/FAQ" className="hover:text-foreground transition-colors">FAQ</Link>
          <Link to="/extension" className="hover:text-foreground transition-colors">Extension</Link>
        </div>
      </div>
    </footer>
  );
}