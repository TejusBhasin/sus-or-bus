import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { analyzeContent } from '@/functions/analyzeContent';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Globe, Code2, FileText, Mail, ShieldAlert, Sparkles, History } from 'lucide-react';
import RecentReports from '@/components/susbus/RecentReports';

const inputTypes = [
  { id: 'url', label: 'URL', icon: Globe, placeholder: 'https://example.com' },
  { id: 'html', label: 'HTML', icon: Code2, placeholder: '<!DOCTYPE html>...' },
  { id: 'code', label: 'Code', icon: Code2, placeholder: 'Paste any code snippet...' },
  { id: 'email', label: 'Email', icon: Mail, placeholder: 'Paste the full email content...' },
  { id: 'text', label: 'Text', icon: FileText, placeholder: 'Paste any text to vet...' }
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
  const [content, setContent] = useState('');
  const [inputType, setInputType] = useState('url');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [recent, setRecent] = useState([]);

  useEffect(() => {
    base44.entities.Report.list('-created_date', 6)
      .then(setRecent)
      .catch(() => {});
  }, []);

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

  const activeType = inputTypes.find((t) => t.id === inputType);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 relative overflow-hidden">
      {/* ambient glow */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full bg-indigo-600/10 blur-[120px]" />
      <div className="pointer-events-none absolute top-1/3 -right-40 w-[500px] h-[500px] rounded-full bg-emerald-500/5 blur-[120px]" />

      <div className="relative max-w-2xl mx-auto px-5 py-16 sm:py-24">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-[0.25em] text-slate-500 mb-5">
            <ShieldAlert className="w-4 h-4" />
            web safety analyzer
          </div>
          <h1 className="text-5xl sm:text-6xl font-black tracking-tighter leading-[0.95]">
            <span className="text-red-400">Sus</span>
            <span className="text-slate-600 mx-2">or</span>
            <span className="text-emerald-400">Bus</span>
          </h1>
          <p className="mt-5 text-slate-400 text-base sm:text-lg max-w-md mx-auto leading-relaxed">
            Paste a link, HTML, code, an email, or any text. Get an instant safety verdict — is it{' '}
            <span className="text-emerald-400 font-semibold">bussin</span> or{' '}
            <span className="text-red-400 font-semibold">sus</span>?
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur p-5 shadow-2xl">
          <div className="flex flex-wrap gap-1.5 mb-4">
            {inputTypes.map((t) => {
              const Icon = t.icon;
              const active = t.id === inputType;
              return (
                <button
                  key={t.id}
                  onClick={() => setInputType(t.id)}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    active
                      ? 'bg-slate-100 text-slate-900'
                      : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {t.label}
                </button>
              );
            })}
          </div>

          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={activeType?.placeholder}
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
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Run the check
              </>
            )}
          </Button>
          <p className="mt-2 text-center text-[11px] text-slate-600 font-mono">⌘/Ctrl + Enter</p>
        </div>

        {recent.length > 0 && (
          <div className="mt-12">
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.2em] text-slate-500 mb-3">
              <History className="w-3.5 h-3.5" />
              recent checks
            </div>
            <RecentReports reports={recent} />
          </div>
        )}
      </div>
    </div>
  );
}