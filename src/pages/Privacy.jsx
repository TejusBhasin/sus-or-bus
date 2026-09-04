import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import LanguageSwitcher from '@/components/susbus/LanguageSwitcher';
import ThemeToggle from '@/components/susbus/ThemeToggle';
import TopNav from '@/components/susbus/TopNav';
import Footer from '@/components/susbus/Footer';
import { useLanguage } from '@/lib/i18n';

const sections = [
  {
    h: '1. Information We Collect',
    p: 'When you use Sus or Bus, we collect the content you submit for analysis (links, HTML, code, email text, or plain text) and basic technical data such as browser type. Reports are stored so you can revisit and share them.'
  },
  {
    h: '2. How We Use Your Information',
    p: 'We use submitted content to generate automated safety assessments, to maintain your report history, and to operate and improve the Service. We do not sell your personal information.'
  },
  {
    h: '3. Data Processing',
    p: 'Submitted content is sent to a language model for analysis. The model may retain data according to its own policies. Avoid submitting sensitive personal information such as passwords, full credit card numbers, or government IDs.'
  },
  {
    h: '4. Data Retention',
    p: 'Reports are retained anonymously, without any account. We retain data only as long as necessary to provide the Service or as required by law.'
  },
  {
    h: '5. Cookies and Local Storage',
    p: 'We use local storage to remember your language and theme preferences. We do not use advertising cookies.'
  },
  {
    h: '6. Third-Party Services',
    p: 'The Service integrates with third-party providers for AI analysis and website fetching. These providers have their own privacy policies that govern how they handle data.'
  },
  {
    h: '7. Your Rights',
    p: 'Sus or Bus requires no account or sign-up. For data requests about your submitted reports, contact us at support@susorbus.com.'
  },
  {
    h: '8. Security',
    p: 'We take reasonable measures to protect your data, but no system is perfectly secure. You use the Service at your own risk.'
  },
  {
    h: '9. Changes to This Policy',
    p: 'We may update this Privacy Policy from time to time. We will indicate the last updated date above.'
  }
];

export default function Privacy() {
  const { t } = useLanguage();
  return (
    <div className="min-h-screen bg-background text-foreground">
      <TopNav />
      <div className="max-w-2xl mx-auto px-5 py-12 pb-safe">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-10">
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            {t('back_to_app')}
          </Link>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.25em] text-muted-foreground mb-3">
          <ShieldCheck className="w-4 h-4" />
          legal
        </div>
        <h1 className="text-4xl font-black tracking-tighter">{t('privacy_title')}</h1>
        <p className="mt-2 text-sm text-muted-foreground font-mono">{t('last_updated')}: September 4, 2026</p>

        <div className="mt-10 space-y-8">
          {sections.map((s, i) => (
            <section key={i}>
              <h2 className="text-lg font-semibold text-foreground mb-2">{s.h}</h2>
              <p className="text-muted-foreground leading-relaxed text-[15px]">{s.p}</p>
            </section>
          ))}
        </div>

        <Footer />
      </div>
    </div>
  );
}