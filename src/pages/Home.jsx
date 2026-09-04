import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { analyzeContent } from '@/functions/analyzeContent';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Globe, Code2, FileText, Mail, ShieldAlert, Sparkles } from 'lucide-react';
import LanguageSwitcher from '@/components/susbus/LanguageSwitcher';
import Footer from '@/components/susbus/Footer';
import { useLanguage } from '@/lib/i18n';

const inputTypes = [
  { id: 'url', labelKey: 'tab_url', icon: Globe, placeholderKey: 'ph_url' },
  { id: 'html', labelKey: 'tab_html', icon: Code2, placeholderKey: 'ph_html' },
  { id: 'code', labelKey: 'tab_code', icon: Code2, placeholderKey: 'ph_code' },
  { id: 'email', labelKey: 'tab_email', icon: Mail, placeholderKey: 'ph_email' },
  { id: 'text', labelKey: 'tab_text', icon: FileText, placeholderKey: 'ph_text' }
];

function autoDetect(content) {
  const c = content.trim();
  if (/^https?:\/\//i.test(c) || /^[\w-]+(\.[\w-]+)+(\/.*)?$/.test(c)) return 'url';
  if (/<\/?(html|head|body|div|script)\b/i.test(c)) return 'html';
  if (/(function|const|let|import|class|def|public|private|<\?php)/i.test(c)) return 'code';
  if (/(subject:|from:|reply-to|dear|regards|sincerely)/i.test(c)) return 'email';
  return 'text';
}

export default function Home() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [content, setContent] = useState('');
  const [inputType, setInputType] = useState('url');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (content.trim().length > 6) {
      const detected = autoDetect(content);
      if (detected !== inputType) setInputType(detected);
    }
  }, [content]); // eslint-disable-line

  const handleAnalyze = async () => {
    if (!content.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await analyzeContent({ inputType, content });
      if (res.data?.error) throw new Error(res.data.error);
      navigate(`/report/${res.data.reportId}`);
    } catch (e) {
      setError(e.message || 'Something went wrong');
      setLoading(false);
    }
  };

  const activeType = inputTypes.find((type) => type.id === inputType);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 relative overflow-hidden flex flex-col">
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full bg-indigo-600/10 blur-[120px]" />
      <div className="pointer-events-none absolute top-1/3 -right-40 w-[500px] h-[500px] rounded-full bg-emerald-500/5 blur-[120px]" />

      <div className="relative max-w-2xl mx-auto px-5 py-8 flex-1 w-full">
        <div className="flex justify-start mb-8">
          <LanguageSwitcher />
        </div>

        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-[0.25em] text-slate-500 mb-5">
            <ShieldAlert className="w-4 h-4" />
            {t('badge')}
          </div>
          <h1 className="text-5xl sm:text-6xl font-black tracking-tighter leading-[0.95]">
            <span className="text-red-400">Sus</span>
            <span className="text-slate-600 mx-2">or</span>
            <span className="text-emerald-400">Bus</span>
          </h1>
          <p className="mt-5 text-slate-400 text-base sm:text-lg max-w-md mx-auto leading-relaxed">
            {t('tagline')}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur p-5 shadow-2xl">
          <div className="flex flex-wrap gap-1.5 mb-4">
            {inputTypes.map((type) => {
              const Icon = type.icon;
              const active = type.id === inputType;
              return (
                <button
                  key={type.id}
                  onClick={() => setInputType(type.id)}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    active
                      ? 'bg-slate-100 text-slate-900'
                      : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {t(type.labelKey)}
                </button>
              );
            })}
          </div>

          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={t(activeType?.placeholderKey)}
            className="min-h-[140px] resize-y bg-slate-950/60 border-slate-800 text-slate-100 placeholder:text-slate-600 font-mono text-sm focus-visible:ring-slate-600"
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') handleAnalyze();
            }}
          />

          {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

          <Button
            onClick={handleAnalyze}
            disabled={loading || !content.trim()}
            className="mt-4 w-full h-12 text-base font-semibold bg-slate-100 text-slate-900 hover:bg-white"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t('analyzing')}
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                {t('run_check')}
              </>
            )}
          </Button>
          <p className="mt-2 text-center text-[11px] text-slate-600 font-mono">{t('shortcut')}</p>
        </div>
      </div>

      <div className="relative max-w-2xl mx-auto px-5 w-full">
        <Footer />
      </div>
    </div>
  );
}