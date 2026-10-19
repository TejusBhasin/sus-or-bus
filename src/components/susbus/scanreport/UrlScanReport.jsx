import React from 'react';
import ScanHeader from './ScanHeader';
import RiskVectors from './RiskVectors';
import CountBoxes from './CountBoxes';
import KeyObservations from './KeyObservations';
import FindingCard from './FindingCard';

function Section({ title, children }) {
  return (
    <section className="mt-8">
      <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-muted-foreground border-b border-border pb-2 mb-3">{title}</h2>
      {children}
    </section>
  );
}

export default function UrlScanReport({ report, onCopy }) {
  const scan = report.scan;
  const isBus = report.verdict === 'bus';
  const host = scan.site || report.url;
  const trackers = scan.trackers || [];
  const policyPoints = report.terms_privacy?.points || [];

  return (
    <div className="dark rounded-2xl border border-border bg-background text-foreground p-5 sm:p-8 select-text">
      <div className="text-center">
        <h1 className="text-4xl sm:text-5xl font-black">
          <span className="text-red-400">SUS</span> or <span className="text-emerald-400">BUS</span>
        </h1>
        <p className="mt-2 text-muted-foreground">Is that link safe to click? Find out before you find out.</p>
      </div>

      <div className="mt-6 flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3 text-sm">
        <span className="truncate">{host}</span>
        <span className="font-bold shrink-0">{Math.round(report.score)} · {isBus ? 'BUS' : 'SUS'}</span>
      </div>

      <h2 className="mt-8 mb-3 text-lg font-bold uppercase tracking-wider">Sus or Bus — Site Safety Report</h2>
      <ScanHeader report={report} scan={scan} onCopy={onCopy} />

      <p className="mt-5 text-sm text-muted-foreground leading-relaxed">{report.summary}</p>

      <div className="mt-5"><RiskVectors vectors={scan.vectors} confidence={scan.confidence} /></div>
      <div className="mt-5"><CountBoxes counts={scan.counts} score={report.score} /></div>
      <div className="mt-5"><KeyObservations observations={scan.observations} actions={scan.actions} /></div>

      <Section title="Trackers & third parties">
        {trackers.length === 0 ? (
          <p className="text-sm text-sky-400">No known third-party trackers or ad scripts were identified.</p>
        ) : (
          <ul className="space-y-1 text-sm text-foreground">
            {trackers.map((t) => <li key={t}>• {t}</li>)}
          </ul>
        )}
      </Section>

      <Section title="Terms & privacy check">
        <div className="space-y-3">
          {policyPoints.map((p) => (
            <FindingCard key={p.title} level={p.severity} category="policy" title={p.title} summary={p.description} impact={0} />
          ))}
        </div>
        <p className="mt-2 text-sm text-sky-400">{scan.policyNote}</p>
      </Section>

      {report.source_code && (
        <Section title="Source code">
          <details className="rounded-lg border border-border bg-card">
            <summary className="cursor-pointer px-4 py-3 text-lg font-semibold">Show fetched HTML</summary>
            <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-all border-t border-border p-4 text-xs font-mono text-muted-foreground">
              {report.source_code}
            </pre>
          </details>
        </Section>
      )}

      <Section title="The breakdown">
        <div className="space-y-3">
          {(scan.findings || []).map((f, i) => (
            <FindingCard key={i} level={f.level} category={f.category} title={f.title} summary={f.summary} impact={f.impact} />
          ))}
        </div>
      </Section>

      <p className="mt-8 border-t border-border pt-4 text-xs text-muted-foreground">
        This report summarizes automated heuristic checks on the fetched page. "No threats detected" is NOT a guarantee of safety.
      </p>
    </div>
  );
}