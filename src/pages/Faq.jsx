import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import TopNav from '@/components/susbus/TopNav';
import Footer from '@/components/susbus/Footer';
import FaqList from '@/components/susbus/FaqList';
import { totalFaqs } from '@/data/faqs';

export default function Faq() {
  const [query, setQuery] = useState('');

  return (
    <div className="min-h-screen bg-background text-foreground relative flex flex-col pt-safe">
      <TopNav />
      <div className="relative max-w-2xl mx-auto px-5 py-8 flex-1 w-full">
        <div className="mb-8">
          <h1 className="text-4xl font-black tracking-tighter">FAQ</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {totalFaqs} answers about using Sus or Bus safely.
          </p>
        </div>

        <div className="relative mb-8">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search the FAQ..."
            className="pl-9 min-h-11 bg-card/60 border-border focus-visible:ring-ring"
          />
        </div>

        <FaqList query={query} />
      </div>

      <div className="relative max-w-2xl mx-auto px-5 w-full pb-safe">
        <Footer />
      </div>
    </div>
  );
}