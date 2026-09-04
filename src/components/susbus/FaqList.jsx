import React, { useMemo } from 'react';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { faqCategories } from '@/data/faqs';

export default function FaqList({ query = '' }) {
  const q = query.trim().toLowerCase();

  const categories = useMemo(() => {
    if (!q) return faqCategories;
    return faqCategories
      .map((cat) => ({
        ...cat,
        items: cat.items.filter(
          (item) => item.q.toLowerCase().includes(q) || item.a.toLowerCase().includes(q)
        )
      }))
      .filter((cat) => cat.items.length > 0);
  }, [q]);

  if (categories.length === 0) {
    return (
      <p className="rounded-2xl border border-border bg-card/60 p-6 text-sm text-muted-foreground text-center">
        No answers match your search — try different keywords, or email support@susorbus.com.
      </p>
    );
  }

  return (
    <div className="space-y-10">
      {categories.map((cat) => (
        <section key={cat.id}>
          <h2 className="text-xs font-mono uppercase tracking-[0.25em] text-muted-foreground mb-3">
            {cat.title}
          </h2>
          <div className="rounded-2xl border border-border bg-card/60 backdrop-blur px-5">
            <Accordion type="single" collapsible className="w-full">
              {cat.items.map((item, i) => (
                <AccordionItem key={i} value={`${cat.id}-${i}`}>
                  <AccordionTrigger className="text-left text-sm font-medium text-foreground hover:no-underline py-5">
                    {item.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                    {item.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>
      ))}
    </div>
  );
}