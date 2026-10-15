import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft, ExternalLink, Globe, Code2, FileText, Mail, Eye, ShieldAlert,
  BadgeCheck, Server, Share2, Download, Copy, Check, Clock, CheckCircle2, AlertTriangle, XCircle, User, Brain, Settings, RotateCw, Scale
} from 'lucide-react';
import { useLanguage } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import ScoreGauge from '@/components/susbus/ScoreGauge';
import VerdictDisplay from '@/components/susbus/VerdictDisplay';
import PointCard from '@/components/susbus/PointCard';
import SourceCodeViewer from '@/components/susbus/SourceCodeViewer';
import TermsPrivacyCard from '@/components/susbus/TermsPrivacyCard';
import AlternativesCard from '@/components/susbus/AlternativesCard';
import LanguageSwitcher from '@/components/susbus/LanguageSwitcher';
import NerdModeToggle from '@/components/susbus/NerdModeToggle';
import ThemeToggle from '@/components/susbus/ThemeToggle';
import Footer from '@/components/susbus/Footer';
import AnalyzingLoader from '@/components/susbus/AnalyzingLoader';
import SiteOwnerFixPrompt from '@/components/susbus/SiteOwnerFixPrompt';
import { analyzeContent } from '@/functions/analyzeContent';
import { setPendingReport, getPendingReport, clearPendingReport, setAnalyzeError } from '@/lib/pendingReport';

const typeIcon = { url: Globe, html: Code2, code: Code2, email: Mail, text: FileText, terms: Scale, document: FileText };
const typeLabelKey = { url: 'tab_url', html: 'tab_html', code: 'tab_code', email: 'tab_email', text: 'tab_text', terms: 'tab_terms', document: 'tab_doc' };

function DetailList({ icon: Icon, title, items }) {
  if (!items || items.length === 0) return null;
  return (
    <div>
      <div className="flex items-center gap-2 mb-2 text-sm font-semibold text-foreground">
        <Icon className="w-4 h-4 text-muted-foreground" />
        {title}
      </div>
      <ul className="space-y-1.5">
        {items.map((it, i) => (
          <li key={i} className="text-sm text-muted-foreground flex gap-2">
            <span className="text-muted-foreground/50">•</span>
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Report() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const isPending = id === 'pending';
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [tab, setTab] = useState('quick');
  const [toast, setToast] = useState('');
  const [rerunning, setRerunning] = useState(false);
  const [nerdMode, setNerdMode] = useState(() => localStorage.getItem('susbus_nerd_mode') || 'simple');

  useEffect(() => {
    if (nerdMode) localStorage.setItem('susbus_nerd_mode', nerdMode);
  }, [nerdMode]);

  useEffect(() => {
    if (isPending) return;
    base44.entities.Report.get(id)
      .then((r) => setReport(r))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id, isPending]);

  // Optimistic flow: the analysis promise is already running — show the skeleton until it lands
  useEffect(() => {
    if (!isPending) return;
    const pending = getPendingReport();
    if (!pending) {
      navigate('/', { replace: true });
      return;
    }
    let cancelled = false;
    pending
      .then((res) => {
        if (cancelled) return;
        clearPendingReport();
        const reportId = res.data?.reportId;
        if (!reportId) {
          setAnalyzeError('Something went wrong');
          navigate('/', { replace: true });
          return;
        }
        navigate(`/report/${reportId}`, { replace: true });
      })
      .catch((err) => {
        if (cancelled) return;
        clearPendingReport();
        setAnalyzeError(err.message || 'Something went wrong');
        navigate('/', { replace: true });
      });
    return () => {
      cancelled = true;
    };
  }, [isPending, navigate]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2000);
  };

  const handleShare = () => {
    const link = `${window.location.origin}/report/${id}`;
    navigator.clipboard.writeText(link);
    showToast(t('share_copied'));
  };

  const handleCopyVerdict = () => {
    const text = `${report.verdict === 'bus' ? 'BUS' : 'SUS'} — ${report.score}/100. ${report.summary}`;
    navigator.clipboard.writeText(text);
    showToast(t('verdict_copied'));
  };

  const handleRerun = () => {
    if (rerunning) return;
    const source = report.input_type === 'url' ? report.url : report.input_content;
    if (!source) return;
    const payload = { inputType: report.input_type, content: source };
    if (report.input_type === 'document' && report.url) payload.fileUrl = report.url;
    setRerunning(true);
    const promise = analyzeContent(payload).then((res) => {
      if (res.data?.error) throw new Error(res.data.error);
      return res;
    });
    promise.catch(() => {}); // rejection is surfaced on the report route
    setPendingReport(promise);
    navigate('/report/pending');
  };

  const handleExportPdf = async () => {
    const { jsPDF } = await import('jspdf');
    const isBus = report.verdict === 'bus';
    const doc = new jsPDF();
    let y = 20;
    doc.setFontSize(32);
    doc.setTextColor(isBus ? 16 : 200, isBus ? 145 : 50, isBus ? 70 : 50);
    doc.text(isBus ? 'BUS' : 'SUS', 20, y);
    doc.setTextColor(60);
    doc.setFontSize(12);
    y += 12;
    doc.text(`Safety score: ${Math.round(report.score)}/100`, 20, y);
    y += 10;
    const sumLines = doc.splitTextToSize(report.summary || '', 170);
    doc.text(sumLines, 20, y);
    y += sumLines.length * 6 + 8;
    doc.setFontSize(14);
    doc.text('Findings:', 20, y);
    doc.setFontSize(11);
    y += 8;
    (report.points || []).forEach((p) => {
      const lines = doc.splitTextToSize(`[${p.severity}] ${p.title}: ${p.description}`, 170);
      if (y + lines.length * 6 > 280) { doc.addPage(); y = 20; }
      doc.text(lines, 20, y);
      y += lines.length * 6 + 3;
    });
    doc.save('susorbus-report.pdf');
  };

  if (loading || isPending) {
    return <AnalyzingLoader />;
  }

  if (notFound || !report) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center text-center px-6">
        <p className="text-muted-foreground">{t('not_found')}</p>
        <Link to="/">
          <Button className="mt-4">{t('back_home')}</Button>
        </Link>
      </div>
    );
  }

  const isBus = report.verdict === 'bus';
  const Icon = typeIcon[report.input_type] || FileText;
  const d = report.details || {};
  const points = report.points || [];
  const counts = {
    good: points.filter((p) => p.severity === 'good').length,
    warning: points.filter((p) => p.severity === 'warning').length,
    bad: points.filter((p) => p.severity === 'bad').length
  };
  const scoreLabel = report.score >= 75 ? t('safe') : report.score >= 50 ? t('caution') : t('dangerous');
  const created = report.created_date ? format(new Date(report.created_date), 'MMM d, yyyy • HH:mm') : '';

  return (
    <div className="min-h-screen bg-background text-foreground relative flex flex-col pt-safe">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[600px] rounded-full blur-[130px]"
          style={{ background: isBus ? 'rgba(52,211,153,0.08)' : 'rgba(248,113,113,0.09)' }}
        />
      </div>

      <div className="relative max-w-2xl mx-auto px-5 py-8 flex-1 w-full">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            {t('new_check')}
          </Link>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <NerdModeToggle mode={nerdMode} onChange={setNerdMode} />
            <LanguageSwitcher />
            <Link
              to="/settings"
              aria-label="Settings"
              className="inline-flex items-center justify-center min-h-11 min-w-11 rounded-lg border border-border bg-card/60 backdrop-blur text-muted-foreground hover:text-foreground hover:bg-secondary/70 transition-colors"
            >
              <Settings className="w-4 h-4" />
            </Link>
            <ThemeToggle />
          </div>
        </div>

        {/* Verdict hero */}
        <div className="rounded-2xl border border-border bg-card/60 backdrop-blur p-6 sm:p-8 mb-6">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <ScoreGauge score={report.score} verdict={report.verdict} label={scoreLabel} />
            <div className="flex-1 text-center sm:text-left">
              <VerdictDisplay verdict={report.verdict} />
              {(nerdMode === 'simple' || nerdMode === 'both') && report.simple_summary && (
                <div className="mt-4 leading-relaxed">
                  {nerdMode === 'both' && (
                    <span className="inline-flex items-center gap-1 mr-2 text-xs uppercase tracking-wider font-mono text-emerald-600 dark:text-emerald-400/70">
                      <User className="w-3 h-3 inline" />simple
                    </span>
                  )}
                  <p className={nerdMode === 'both' ? 'inline text-foreground' : 'text-foreground'}>{report.simple_summary}</p>
                </div>
              )}
              {(nerdMode === 'nerd' || nerdMode === 'both') && (
                <div className={nerdMode === 'both' ? 'mt-2 leading-relaxed' : 'mt-4 leading-relaxed'}>
                  {nerdMode === 'both' && (
                    <span className="inline-flex items-center gap-1 mr-2 text-xs uppercase tracking-wider font-mono text-indigo-600 dark:text-indigo-400/70">
                      <Brain className="w-3 h-3 inline" />nerd
                    </span>
                  )}
                  <p className={nerdMode === 'both' ? 'inline text-muted-foreground' : 'text-foreground'}>{report.summary}</p>
                </div>
              )}
              <div className="mt-4 flex flex-wrap items-center gap-2 justify-center sm:justify-start">
                <span className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider font-mono text-muted-foreground border border-border rounded px-2 py-1">
                  <Icon className="w-3 h-3" />
                  {t(typeLabelKey[report.input_type] || 'tab_text')}
                </span>
                {created && (
                  <span className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider font-mono text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {created}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action bar */}
          <div className="mt-6 flex flex-wrap gap-2 justify-center sm:justify-start">
            <Button variant="outline" size="sm" onClick={handleRerun} disabled={rerunning} className="bg-card/60 border-border text-foreground hover:bg-secondary">
              <RotateCw className="w-3.5 h-3.5 mr-1.5" />
              {t('rerun_scan')}
            </Button>
            <Button variant="outline" size="sm" onClick={handleShare} className="bg-card/60 border-border text-foreground hover:bg-secondary">
              <Share2 className="w-3.5 h-3.5 mr-1.5" />
              {t('share')}
            </Button>
            <Button variant="outline" size="sm" onClick={handleCopyVerdict} className="bg-card/60 border-border text-foreground hover:bg-secondary">
              <Copy className="w-3.5 h-3.5 mr-1.5" />
              {t('copy_verdict')}
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportPdf} className="bg-card/60 border-border text-foreground hover:bg-secondary">
              <Download className="w-3.5 h-3.5 mr-1.5" />
              {t('export_pdf')}
            </Button>
          </div>
        </div>

        {/* Finding stats */}
        <div className="grid grid-cols-3 gap-2 mb-6">
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-center">
            <div className="flex items-center justify-center gap-1 text-emerald-500 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-2xl font-bold">{counts.good}</span>
            </div>
            <span className="text-xs uppercase tracking-wider text-muted-foreground font-mono">good</span>
          </div>
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-center">
            <div className="flex items-center justify-center gap-1 text-amber-500 dark:text-amber-400">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-2xl font-bold">{counts.warning}</span>
            </div>
            <span className="text-xs uppercase tracking-wider text-muted-foreground font-mono">warning</span>
          </div>
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-center">
            <div className="flex items-center justify-center gap-1 text-red-500 dark:text-red-400">
              <XCircle className="w-4 h-4" />
              <span className="text-2xl font-bold">{counts.bad}</span>
            </div>
            <span className="text-xs uppercase tracking-wider text-muted-foreground font-mono">bad</span>
          </div>
        </div>

        {/* Safer alternatives for SUS websites */}
        {report.input_type === 'url' && report.url && !isBus && (
          <div className="mb-6">
            <AlternativesCard url={report.url} />
          </div>
        )}

        {/* Terms & privacy policy check */}
        {report.terms_privacy && (
          <div className="mb-6">
            <TermsPrivacyCard tp={report.terms_privacy} mode={nerdMode} />
          </div>
        )}

        {/* Source code (URL) */}
        {report.input_type === 'url' && report.url && report.source_code && (
          <div className="mb-6">
            <SourceCodeViewer code={report.source_code} />
          </div>
        )}

        {/* Source code (HTML/code input) */}
        {(report.input_type === 'html' || report.input_type === 'code') && report.source_code && (
          <div className="mb-6">
            <SourceCodeViewer code={report.source_code} />
          </div>
        )}

        {/* Preview meta (URL) */}
        {report.input_type === 'url' && (report.preview_title || report.preview_description) && (
          <div className="rounded-2xl border border-border bg-card/60 p-5 mb-6">
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.2em] text-muted-foreground mb-3">
              <Globe className="w-3.5 h-3.5" />
              {t('preview')}
            </div>
            <h3 className="font-semibold text-foreground truncate">{report.preview_title || report.url}</h3>
            {report.preview_description && (
              <p className="mt-1 text-sm text-muted-foreground line-clamp-3">{report.preview_description}</p>
            )}
            {report.url && (
              <a
                href={report.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 text-xs text-indigo-500 dark:text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300 font-mono break-all"
              >
                <ExternalLink className="w-3 h-3 shrink-0" />
                {report.url}
              </a>
            )}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-5 p-1 bg-card/60 rounded-lg border border-border w-fit" role="tablist">
          {[
            { id: 'quick', label: t('score_tab') },
            { id: 'detailed', label: t('detailed_tab') }
          ].map((tb) => (
            <button
              key={tb.id}
              role="tab"
              aria-selected={tab === tb.id}
              tabindex={tab === tb.id ? 0 : -1}
              onClick={() => setTab(tb.id)}
              className={`inline-flex min-h-11 items-center px-4 rounded-md text-sm font-medium transition-colors ${
                tab === tb.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tb.label}
            </button>
          ))}
        </div>

        {tab === 'quick' ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.2em] text-muted-foreground mb-1">
              <Eye className="w-3.5 h-3.5" />
              {t('breakdown')}
            </div>
            {points.map((p, i) => (
              <PointCard key={i} point={p} mode={nerdMode} />
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="rounded-2xl border border-border bg-card/60 p-6 space-y-5">
              <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.2em] text-muted-foreground">
                <Server className="w-3.5 h-3.5" />
                {t('full_report')}
              </div>
              <DetailList icon={BadgeCheck} title={t('green_flags')} items={d.greenFlags} />
              <DetailList icon={ShieldAlert} title={t('red_flags')} items={d.redFlags} />
              <DetailList icon={Eye} title={t('data_collected')} items={d.dataCollected} />
              <DetailList icon={Eye} title={t('trackers')} items={d.trackers} />
              <DetailList icon={Server} title={t('technologies')} items={d.technologies} />
              {d.codeNotes && (
                <div>
                  <div className="flex items-center gap-2 mb-2 text-sm font-semibold text-foreground">
                    <Code2 className="w-4 h-4 text-muted-foreground" />
                    {t('code_notes')}
                  </div>
                  {(nerdMode === 'simple' || nerdMode === 'both') && d.simple_code_notes && (
                    <p className={cn('text-sm text-muted-foreground leading-relaxed', nerdMode === 'both' && 'mb-2')}>
                      {nerdMode === 'both' && <span className="text-xs uppercase font-mono text-emerald-600 dark:text-emerald-400/70 mr-2">simple</span>}
                      {d.simple_code_notes}
                    </p>
                  )}
                  {(nerdMode === 'nerd' || nerdMode === 'both') && (
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {nerdMode === 'both' && <span className="text-xs uppercase font-mono text-indigo-600 dark:text-indigo-400/70 mr-2">nerd</span>}
                      {d.codeNotes}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.2em] text-muted-foreground">
                <Eye className="w-3.5 h-3.5" />
                {t('all_findings')}
              </div>
              {points.map((p, i) => (
                <PointCard key={i} point={p} mode={nerdMode} />
              ))}
            </div>

            {report.input_content && (
              <div className="rounded-2xl border border-border bg-background/60 p-5">
                <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.2em] text-muted-foreground mb-3">
                  <FileText className="w-3.5 h-3.5" />
                  {t('original_input')}
                </div>
                <pre className="text-xs text-muted-foreground font-mono whitespace-pre-wrap break-all max-h-60 overflow-auto">
                  {report.input_content}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* Site owner: fix-it prompt */}
        <div className="mt-6">
          <SiteOwnerFixPrompt report={report} />
        </div>
      </div>

      <div className="relative max-w-2xl mx-auto px-5 w-full pb-safe">
        <Footer />
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 rounded-lg border border-border bg-popover text-popover-foreground px-4 py-2 text-sm shadow-xl flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-500" />
          {toast}
        </div>
      )}
    </div>
  );
}