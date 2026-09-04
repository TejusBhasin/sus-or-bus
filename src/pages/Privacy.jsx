import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import LanguageSwitcher from '@/components/susbus/LanguageSwitcher';
import Footer from '@/components/susbus/Footer';
import { useLanguage } from '@/lib/i18n';

const sections = [
  {
    h: '1. Information We Collect',
    p: 'When you use Sus or Bus, we collect the content you submit for analysis (links, HTML, code, email text, or plain text), your account information if you are logged in, and basic technical data such as browser type. Reports are stored so you can revisit and share them.'
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
    p: 'Reports are retained as part of your account history. You may delete your reports at any time. We retain data only as long as necessary to provide the Service or as required by law.'
  },
  {
    h: '5. Cookies and Local Storage',
    p: 'We use local storage to remember your language preference. We do not use advertising cookies.'
  },
  {
    h: '6. Third-Party Services',
    p: 'The Service integrates with third-party providers for AI analysis and website fetching. These providers have their own privacy policies that govern how they handle data.'
  },
  {
    h: '7. Your Rights',
    p: 'You may access, correct, or delete your report history. For other data requests, contact us through the app.'
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
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="max-w-2xl mx-auto px-5 py-12">
        <div className="flex items-center justify-between mb-10">
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            {t('back_to_app')}
          </Link>
          <LanguageSwitcher />
        </div>

        <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.25em] text-slate-500 mb-3">
          <ShieldCheck className="w-4 h-4" />
          legal
        </div>
        <h1 className="text-4xl font-black tracking-tighter">{t('privacy_title')}</h1>
        <p className="mt-2 text-sm text-slate-500 font-mono">{t('last_updated')}: September 4, 2026</p>

        <div className="mt-10 space-y-8">
          {sections.map((s, i) => (
            <section key={i}>
              <h2 className="text-lg font-semibold text-slate-100 mb-2">{s.h}</h2>
              <p className="text-slate-400 leading-relaxed text-[15px]">{s.p}</p>
            </section>
          ))}
        </div>

        <Footer />
      </div>
    </div>
  );
}