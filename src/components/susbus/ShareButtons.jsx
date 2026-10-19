import React, { useState } from 'react';
import { Twitter, Facebook, MessageCircle, Send, Share2, Link2, Check } from 'lucide-react';

export default function ShareButtons({ report }) {
  const [copied, setCopied] = useState(false);
  if (!report) return null;
  const isBus = report.verdict === 'bus';
  const link = `${window.location.origin}/report/${report.id}`;
  const subject = report.input_type === 'url' && report.url ? report.url : `a ${report.input_type || 'message'}`;
  const text = `Sus or Bus checked ${subject}: ${isBus ? 'BUS (safe)' : 'SUS (suspicious)'} — ${Math.round(report.score)}/100. Run your own check:`;
  const eText = encodeURIComponent(text);
  const eLink = encodeURIComponent(link);
  const channels = [
    { name: 'X', icon: Twitter, href: `https://twitter.com/intent/tweet?text=${eText}&url=${eLink}` },
    { name: 'Facebook', icon: Facebook, href: `https://www.facebook.com/sharer/sharer.php?u=${eLink}"e=${eText}` },
    { name: 'WhatsApp', icon: MessageCircle, href: `https://wa.me/?text=${eText}%20${eLink}` },
    { name: 'Telegram', icon: Send, href: `https://t.me/share/url?url=${eLink}&text=${eText}` },
    { name: 'Reddit', icon: Share2, href: `https://www.reddit.com/submit?url=${eLink}&title=${eText}` }
  ];
  const copyLink = () => {
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  const btn =
    'inline-flex items-center justify-center min-h-11 min-w-11 rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:text-foreground hover:bg-secondary';
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">Share this verdict</span>
      {channels.map(({ name, icon: Icon, href }) => (
        <a
          key={name}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Share on ${name}`}
          title={`Share on ${name}`}
          className={btn}
        >
          <Icon className="w-4 h-4" />
        </a>
      ))}
      <button onClick={copyLink} aria-label="Copy report link" title="Copy report link" className={btn}>
        {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Link2 className="w-4 h-4" />}
      </button>
    </div>
  );
}