import React from 'react';
import { Github, HeartHandshake } from 'lucide-react';

const REPO_URL = 'https://github.com/TejusBhasin/sus-or-bus';

export default function OurStory() {
  return (
    <section className="mt-8 rounded-2xl border border-border bg-card/60 backdrop-blur p-6">
      <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-[0.25em] text-muted-foreground mb-4">
        <HeartHandshake className="w-4 h-4" />
        Our Story
      </div>
      <p className="text-sm text-foreground/90 leading-relaxed">
        I&apos;m Tejus Bhasin, and I built Sus or Bus after my school was hacked over the summer. A teacher clicked a
        malicious link, which gave a bad actor access to that teacher&apos;s inbox and email. From the teacher&apos;s
        account, the hacker emailed every student in the school, demanding money for a product that didn&apos;s exist. Students lost real money, and I felt deeply troubled by this. Sus or Bus exists to
        stop scams like this before they start, by checking the links you click, the emails you receive, and the sites
        you browse.
      </p>
      <a
        href={REPO_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-foreground hover:text-foreground/80 transition-colors"
      >
        <Github className="w-4 h-4" />
        <span style={{ color: 'blue', textDecoration: 'underline' }}>
  This project is open sourced - read the code on GitHub
</span>

      </a>
    </section>
  );
}