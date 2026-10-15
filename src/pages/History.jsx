import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import TopNav from '@/components/susbus/TopNav';
import Footer from '@/components/susbus/Footer';
import RecentReports from '@/components/susbus/RecentReports';

function csvCell(value) {
  const s = String(value ?? '');
  return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

export default function History() {
  const [items, setItems] = useState(null);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    loadPage();
  }, []); // eslint-disable-line

  async function loadPage(cur = null) {
    setLoading(true);
    try {
      const page = await base44.entities.Report.filter({}, { sort: '-created_date', limit: 50, cursor: cur });
      setItems((prev) => (cur && prev ? [...prev, ...page.items] : page.items));
      setCursor(page.next_cursor);
      setHasMore(page.has_more);
    } finally {
      setLoading(false);
    }
  }

  // Export: pull every saved report (in pages) and build one CSV file
  async function exportCsv() {
    if (exporting) return;
    setExporting(true);
    try {
      const rows = [];
      let cur = null;
      for (;;) {
        const page = await base44.entities.Report.filter(
          {},
          {
            sort: '-created_date',
            limit: 500,
            cursor: cur,
            fields: ['input_type', 'url', 'input_content', 'verdict', 'score', 'simple_summary', 'summary', 'created_date']
          }
        );
        rows.push(...page.items);
        if (!page.has_more) break;
        cur = page.next_cursor;
      }
      const lines = [['Date', 'Type', 'Target', 'Verdict', 'Score', 'Summary'].join(',')];
      for (const r of rows) {
        lines.push(
          [
            r.created_date,
            r.input_type,
            r.url || (r.input_content || '').slice(0, 150),
            r.verdict,
            Math.round(r.score || 0),
            r.simple_summary || r.summary || ''
          ]
            .map(csvCell)
            .join(',')
        );
      }
      const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'susorbus-verdicts.csv';
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <TopNav />
      <div className="max-w-2xl mx-auto px-5 py-8 pb-safe">
        <h1 className="text-3xl font-black tracking-tighter">Report history</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every verdict Sus or Bus has saved, newest first — download them all as a CSV to review outside the app.
        </p>

        <Button
          onClick={exportCsv}
          disabled={exporting || !items || items.length === 0}
          className="mt-4"
        >
          {exporting ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Download className="w-4 h-4 mr-2" />
          )}
          {exporting ? 'Preparing CSV…' : 'Download all as CSV'}
        </Button>

        {items && items.length === 0 && !loading && (
          <p className="mt-8 text-sm text-muted-foreground">
            No reports yet — run a check from the home page first.
          </p>
        )}

        {items && items.length > 0 && (
          <div className="mt-6">
            <RecentReports reports={items} />
          </div>
        )}

        {loading && (
          <div className="mt-6 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {hasMore && !loading && (
          <Button
            variant="outline"
            onClick={() => loadPage(cursor)}
            className="mt-4 bg-card/60 border-border text-foreground hover:bg-secondary"
          >
            Load more
          </Button>
        )}

        <Footer />
      </div>
    </div>
  );
}