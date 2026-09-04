import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, FileText } from 'lucide-react';
import LanguageSwitcher from '@/components/susbus/LanguageSwitcher';
import Footer from '@/components/susbus/Footer';
import { useLanguage } from '@/lib/i18n';

const sections = [
  {
    h: '1. Acceptance of Terms',
    p: 'By accessing or using Sus or Bus ("the Service"), you agree to be bound by these Terms of Service. If you do not agree, do not use the Service.'
  },
  {
    h: '2. Description of Service',
    p: 'Sus or Bus is a web safety tool that analyzes links, HTML, code, emails, and text you submit and returns an automated safety assessment. The Service is provided for informational purposes only and does not constitute legal, professional, or security advice.'
  },
  {
    h: '3. No Warranties',
    p: 'The Service is provided "as is" and "as available" without warranties of any kind, express or implied. We do not guarantee that assessments are accurate, complete, or current. You rely on the Service entirely at your own risk.'
  },
  {
    h: '4. Limitation of Liability',
    p: 'To the maximum extent permitted by law, Sus or Bus and its operators shall not be liable for any direct, indirect, incidental, consequential, or special damages arising from your use of, or reliance on, the Service.'
  },
  {
    h: '5. Acceptable Use',
    p: 'You agree not to use the Service to harm others, to submit content you do not have the right to share, or to attempt to disrupt or compromise the Service. You are responsible for the content you submit.'
  },
  {
    h: '6. User Content',
    p: 'Content you submit is processed to generate a safety assessment and stored as part of your report history. We do not claim ownership of your submitted content.'
  },
  {
    h: '7. Changes to These Terms',
    p: 'We may update these Terms from time to time. Continued use of the Service after changes constitutes acceptance of the revised Terms.'
  },
  {
    h: '8. Contact',
    p: 'If you have questions about these Terms, please contact us through the app.'
  }
];

export default function Terms() {
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
          <FileText className="w-4 h-4" />
          legal
        </div>
        <h1 className="text-4xl font-black tracking-tighter">{t('terms_title')}</h1>
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