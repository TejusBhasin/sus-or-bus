import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '@/components/ui/dialog';
import { Wrench, Copy, Check, Wand2, ListChecks } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function SiteOwnerFixPrompt({ report }) {
  const issues = useMemo(() => (report.points || []).filter((p) => p.severity !== 'good'), [report]);
  const [selected, setSelected] = useState(() => issues.map(() => true));
  const [mode, setMode] = useState('ai');
  const [copied, setCopied] = useState(false);

  const target = report.input_type === 'url' ? report.url : 'my ' + (report.input_type || 'page') + ' content';
  const chosen = issues.filter((_, i) => selected[i]);

  const fixText = useMemo(() => {
    if (chosen.length === 0) return '';
    const list = chosen
      .map((p) => '- ' + p.title + ': ' + (p.description || p.simple_description || ''))
      .join('\n');
    if (mode === 'ai') {
      return (
        'You are a web security and privacy consultant. ' +
        'My website ' + target + ' was checked by Sus or Bus and the following issues were flagged:\n\n' +
        list +
        '\n\nWrite concrete, step-by-step fixes for each issue, ordered by priority (easiest wins first). ' +
        'Explain in plain language a non-expert can follow, and flag anything that needs a developer.'
      );
    }
    return 'Sus or Bus flagged these issues on ' + target + ':\n\n' + list;
  }, [mode, chosen, target]);

  const copy = () => {
    navigator.clipboard.writeText(fixText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggle = (i) => setSelected((prev) => prev.map((v, j) => (j === i ? !v : v)));

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="w-full rounded-xl border border-dashed border-border bg-card/40 p-4 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors text-left">
          <Wrench className="w-4 h-4 inline mr-1.5 -mt-0.5" />
          Site owner? Click here
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Fix-it kit for site owners</DialogTitle>
          <DialogDescription>
            Pick the issues you want to work on, choose an AI fix prompt or a plain checklist, then copy it.
          </DialogDescription>
        </DialogHeader>

        {issues.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Great news — this scan found no warnings or issues to fix. Nothing to do here.
          </p>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              {issues.map((p, i) => (
                <button
                  key={i}
                  onClick={() => toggle(i)}
                  className="flex w-full items-start gap-2.5 rounded-lg border border-border bg-card/60 p-3 text-left hover:bg-secondary/60 transition-colors"
                >
                  <span
                    className={cn(
                      'mt-0.5 w-4 h-4 shrink-0 rounded border flex items-center justify-center',
                      selected[i] ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground/40'
                    )}
                  >
                    {selected[i] && <Check className="w-3 h-3" />}
                  </span>
                  <span className="text-sm">
                    <span className="font-medium text-foreground">{p.title}</span>
                    <span className="block text-muted-foreground mt-0.5">{p.simple_description || p.description}</span>
                  </span>
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <Button size="sm" variant={mode === 'ai' ? 'default' : 'outline'} onClick={() => setMode('ai')}>
                <Wand2 className="w-3.5 h-3.5 mr-1.5" /> AI fix prompt
              </Button>
              <Button size="sm" variant={mode === 'checklist' ? 'default' : 'outline'} onClick={() => setMode('checklist')}>
                <ListChecks className="w-3.5 h-3.5 mr-1.5" /> Fix checklist
              </Button>
            </div>

            {fixText ? (
              <div>
                <pre className="text-xs text-muted-foreground font-mono whitespace-pre-wrap break-words max-h-56 overflow-y-auto rounded-lg border border-border bg-background/60 p-3">
                  {fixText}
                </pre>
                <Button size="sm" onClick={copy} className="mt-2">
                  {copied ? <Check className="w-3.5 h-3.5 mr-1.5" /> : <Copy className="w-3.5 h-3.5 mr-1.5" />}
                  {copied ? 'Copied' : 'Copy'}
                </Button>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Select at least one issue to generate your fix list.</p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}