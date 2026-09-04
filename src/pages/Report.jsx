import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, ExternalLink, Globe, Code2, FileText, Mail, Eye, ShieldAlert, BadgeCheck, Server } from 'lucide-react';
import ScoreGauge from '@/components/susbus/ScoreGauge';
import VerdictDisplay from '@/components/susbus/VerdictDisplay';
import PointCard from '@/components/susbus/PointCard';

const typeIcon = { url: Globe, html: Code2, code: Code2, email: Mail, text: FileText };
const typeLabel = { url: 'Website URL', html: 'HTML', code: 'Code', email: 'Email', text: 'Text' };

function DetailList({ icon: Icon, title, items, color = 'slate' }) {
  if (!items || items.length === 0) return null;
  return (
    <div>
      <div className="flex items-center gap-2 mb-2 text-sm font-semibold text-slate-200">
        <Icon className="w-4 h-4 text-slate-400" />
        {title}
      </div>
      <ul className="space-y-1.5">
        {items.map((it, i) => (
          <li key={i} className="text-sm text-slate-400 flex gap-2">
            <span className="text-slate-600">•</span>
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Report() {
  const { id } = useParams();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [tab, setTab] = useState('quick');
  const [previewTab, setPreviewTab] = useState('live');

  useEffect(() => {
    base44.entities.Report.get(id)
      .then((r) => setReport(r))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-7 h-7 animate-spin text-slate-600" />
      </div>
    );
  }

  if (notFound || !report) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-center px-6">
        <p className="text-slate-400">Report not found.</p>
        <Link to="/">
          <Button className="mt-4">Back home</Button>
        </Link>
      </div>
    );
  }

  const isBus = report.verdict === 'bus';
  const Icon = typeIcon[report.input_type] || FileText;
  const d = report.details || {};

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 relative overflow-hidden">
      <div
        className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[600px] rounded-full blur-[130px]"
        style={{ background: isBus ? 'rgba(52,211,153,0.08)' : 'rgba(248,113,113,0.09)' }}
      />

      <div className="relative max-w-2xl mx-auto px-5 py-10">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" />
          New check
        </Link>

        {/* Verdict hero */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur p-6 sm:p-8 mb-6">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <ScoreGauge score={report.score} verdict={report.verdict} />
            <div className="flex-1 text-center sm:text-left">
              <VerdictDisplay verdict={report.verdict} />
              <p className="mt-4 text-slate-300 leading-relaxed">{report.summary}</p>
              <div className="mt-4 inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wider font-mono text-slate-400 border border-slate-700 rounded px-2 py-1">
                <Icon className="w-3 h-3" />
                {typeLabel[report.input_type] || report.input_type}
              </div>
            </div>
          </div>
        </div>

        {/* Preview (URL) */}
        {report.input_type === 'url' && (report.preview_title || report.preview_description || report.url) && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 mb-6">
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.2em] text-slate-500 mb-3">
              <Globe className="w-3.5 h-3.5" />
              preview
            </div>
            <h3 className="font-semibold text-slate-100 truncate">{report.preview_title || report.url}</h3>
            {report.preview_description && (
              <p className="mt-1 text-sm text-slate-400 line-clamp-3">{report.preview_description}</p>
            )}
            {report.url && (
              <a
                href={report.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-mono break-all"
              >
                <ExternalLink className="w-3 h-3 shrink-0" />
                {report.url}
              </a>
            )}

            {/* Preview / source code toggle */}
            <div className="mt-4 flex gap-1 p-1 bg-slate-950/60 rounded-lg border border-slate-800 w-fit">
              {[
                { id: 'live', label: 'Live preview', icon: Globe },
                { id: 'code', label: 'Source code', icon: Code2 }
              ].map((t) => {
                const TIcon = t.icon;
                return (
                  <button
                    key={t.id}
                    onClick={() => setPreviewTab(t.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      previewTab === t.id ? 'bg-slate-100 text-slate-900' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <TIcon className="w-3.5 h-3.5" />
                    {t.label}
                  </button>
                );
              })}
            </div>

            <div className="mt-3">
              {previewTab === 'live' ? (
                report.url ? (
                  <div>
                    <iframe
                      src={report.url}
                      title="Live website preview"
                      sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                      className="w-full h-[440px] rounded-lg border border-slate-800 bg-white"
                    />
                    <p className="mt-2 text-[11px] text-slate-600 font-mono">
                      Some sites block embedded previews — if it's blank, switch to Source code or open the link directly.
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">No URL to preview.</p>
                )
              ) : report.raw_html ? (
                <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap break-all max-h-[440px] overflow-auto rounded-lg border border-slate-800 bg-slate-950/60 p-4">
                  {report.raw_html}
                </pre>
              ) : (
                <p className="text-sm text-slate-500">No source code available for this input.</p>
              )}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-5 p-1 bg-slate-900/60 rounded-lg border border-slate-800 w-fit">
          {[
            { id: 'quick', label: 'Score' },
            { id: 'detailed', label: 'Detailed report' }
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                tab === t.id ? 'bg-slate-100 text-slate-900' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'quick' ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.2em] text-slate-500 mb-1">
              <Eye className="w-3.5 h-3.5" />
              the breakdown
            </div>
            {(report.points || []).map((p, i) => (
              <PointCard key={i} point={p} />
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-5">
              <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.2em] text-slate-500">
                <Server className="w-3.5 h-3.5" />
                full report
              </div>
              <DetailList icon={BadgeCheck} title="Green flags" items={d.greenFlags} />
              <DetailList icon={ShieldAlert} title="Red flags" items={d.redFlags} />
              <DetailList icon={Eye} title="Data collected" items={d.dataCollected} />
              <DetailList icon={Eye} title="Trackers detected" items={d.trackers} />
              <DetailList icon={Server} title="Technologies" items={d.technologies} />
              {d.codeNotes && (
                <div>
                  <div className="flex items-center gap-2 mb-2 text-sm font-semibold text-slate-200">
                    <Code2 className="w-4 h-4 text-slate-400" />
                    Code notes
                  </div>
                  <p className="text-sm text-slate-400 leading-relaxed">{d.codeNotes}</p>
                </div>
              )}
            </div>

            {/* All points */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.2em] text-slate-500">
                <Eye className="w-3.5 h-3.5" />
                all findings
              </div>
              {(report.points || []).map((p, i) => (
                <PointCard key={i} point={p} />
              ))}
            </div>

            {/* Original input */}
            {report.input_content && (
              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
                <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.2em] text-slate-500 mb-3">
                  <FileText className="w-3.5 h-3.5" />
                  original input
                </div>
                <pre className="text-xs text-slate-400 font-mono whitespace-pre-wrap break-all max-h-60 overflow-auto">
                  {report.input_content}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}