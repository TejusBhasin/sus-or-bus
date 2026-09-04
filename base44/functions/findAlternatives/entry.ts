// Sus or Bus — safe alternatives, zero AI. Maps the flagged site to a purpose
// category with a deterministic keyword/host classifier, then serves curated,
// well-known alternatives from a static catalog. No integration calls, no credits.

interface Alternative {
  name: string;
  url: string;
  reason: string;
}

const CATEGORIES: Record<string, { hosts: string[]; words: string[]; alts: Alternative[] }> = {
  shopping: {
    hosts: ['shop', 'store', 'outlet', 'market', 'deals', 'bazaar', 'mart', 'boutique'],
    words: ['shop', 'store', 'outlet', 'discount', 'deals', 'sale', 'buy', 'cart', 'checkout', 'bazaar'],
    alts: [
      { name: 'Amazon', url: 'https://www.amazon.com', reason: 'The largest established marketplace with buyer protection and verified reviews.' },
      { name: 'Walmart', url: 'https://www.walmart.com', reason: 'A major retailer with a trusted online store and easy returns.' },
      { name: 'eBay', url: 'https://www.ebay.com', reason: 'Long-running marketplace with money-back guarantee on most purchases.' },
      { name: 'Best Buy', url: 'https://www.bestbuy.com', reason: 'Reputable electronics retailer with price matching and store support.' },
      { name: 'Target', url: 'https://www.target.com', reason: 'Well-known retailer with a secure, well-maintained online store.' }
    ]
  },
  search: {
    hosts: ['search', 'find', 'lookup'],
    words: ['search engine', 'search results', 'search the web'],
    alts: [
      { name: 'Google Search', url: 'https://www.google.com', reason: 'The default standard for web search with strong spam filtering.' },
      { name: 'DuckDuckGo', url: 'https://duckduckgo.com', reason: 'Privacy-first search engine that doesn\'t track you.' },
      { name: 'Bing', url: 'https://www.bing.com', reason: 'Microsoft\'s established search engine with safe-search controls.' },
      { name: 'Brave Search', url: 'https://search.brave.com', reason: 'Independent search index with a built-in emphasis on privacy.' }
    ]
  },
  video: {
    hosts: ['tube', 'video', 'tv', 'stream', 'movie', 'film', 'cinema', 'watch'],
    words: ['video', 'stream', 'watch', 'movie', 'episode', 'film', 'tv show'],
    alts: [
      { name: 'YouTube', url: 'https://www.youtube.com', reason: 'The world\'s largest video platform, free and safe to use.' },
      { name: 'Netflix', url: 'https://www.netflix.com', reason: 'The mainstream, fully licensed streaming service.' },
      { name: 'Vimeo', url: 'https://vimeo.com', reason: 'A clean, reputable video platform without shady ads.' },
      { name: 'Disney+', url: 'https://www.disneyplus.com', reason: 'Official, licensed streaming for movies and series.' }
    ]
  },
  social: {
    hosts: ['social', 'chat', 'friends', 'meet', 'date', 'book', 'gram'],
    words: ['social network', 'friends', 'community', 'followers', 'profile'],
    alts: [
      { name: 'Facebook', url: 'https://www.facebook.com', reason: 'The original social network with mature safety systems.' },
      { name: 'Instagram', url: 'https://www.instagram.com', reason: 'Established platform owned by Meta with reporting tools.' },
      { name: 'Reddit', url: 'https://www.reddit.com', reason: 'Long-standing community platform with moderation.' },
      { name: 'LinkedIn', url: 'https://www.linkedin.com', reason: 'The professional network, safe for career content.' }
    ]
  },
  email: {
    hosts: ['mail', 'inbox', 'webmail'],
    words: ['email', 'inbox', 'webmail', 'mailbox'],
    alts: [
      { name: 'Gmail', url: 'https://mail.google.com', reason: 'Google\'s email service with excellent spam and phishing filters.' },
      { name: 'Outlook', url: 'https://outlook.com', reason: 'Microsoft\'s established email service with strong security.' },
      { name: 'Proton Mail', url: 'https://proton.me/mail', reason: 'Privacy-focused email with end-to-end encryption.' }
    ]
  },
  banking: {
    hosts: ['bank', 'pay', 'wallet', 'cash', 'finance', 'loan', 'credit', 'invest', 'crypto', 'coin', 'token', 'forex'],
    words: ['bank', 'loan', 'credit', 'invest', 'crypto', 'wallet', 'transfer money', 'forex', 'returns', 'profit'],
    alts: [
      { name: 'Your bank\'s official site', url: 'https://www.chase.com', reason: 'Type your bank\'s address directly — Chase, Bank of America and Wells Fargo all have official sites. Never follow a link from a message.' },
      { name: 'PayPal', url: 'https://www.paypal.com', reason: 'The established payment platform with buyer protection.' },
      { name: 'Coinbase', url: 'https://www.coinbase.com', reason: 'A major, regulated US cryptocurrency exchange (still volatile — only risk what you can lose).' },
      { name: 'Investor.gov', url: 'https://www.investor.gov', reason: 'The SEC\'s official resource for checking whether an investment is a scam.' }
    ]
  },
  downloads: {
    hosts: ['download', 'crack', 'warez', 'free-software', 'app', 'mod', 'hack', 'cheat', 'keygen', 'patch'],
    words: ['download', 'crack', 'keygen', 'free software', 'mod apk', 'hack', 'cheat', 'patch'],
    alts: [
      { name: 'Official vendor sites', url: 'https://www.microsoft.com', reason: 'Always download software straight from the maker (microsoft.com, adobe.com, apple.com) — never from third-party mirrors.' },
      { name: 'Ninite', url: 'https://ninite.com', reason: 'Trusted installer that bundles popular free software safely.' },
      { name: 'Steam', url: 'https://store.steampowered.com', reason: 'The official, safe store for PC games — skip cracked copies.' },
      { name: 'VirusTotal', url: 'https://www.virustotal.com', reason: 'Scan any file you\'re unsure about before opening it, free.' }
    ]
  },
  news: {
    hosts: ['news', 'daily', 'times', 'post', 'herald', 'press'],
    words: ['news', 'breaking', 'headline', 'report'],
    alts: [
      { name: 'AP News', url: 'https://apnews.com', reason: 'The Associated Press — nonpartisan, fact-based reporting.' },
      { name: 'Reuters', url: 'https://www.reuters.com', reason: 'One of the world\'s most trusted wire services.' },
      { name: 'BBC News', url: 'https://www.bbc.com/news', reason: 'Established international newsroom with high editorial standards.' }
    ]
  },
  travel: {
    hosts: ['travel', 'trip', 'flight', 'hotel', 'booking', 'vacation', 'tour'],
    words: ['flight', 'hotel', 'booking', 'travel', 'vacation', 'tour'],
    alts: [
      { name: 'Booking.com', url: 'https://www.booking.com', reason: 'One of the largest, longest-standing accommodation platforms.' },
      { name: 'Expedia', url: 'https://www.expedia.com', reason: 'Established travel agency for flights, hotels and packages.' },
      { name: 'Google Flights', url: 'https://www.google.com/travel/flights', reason: 'Reliable flight search that sends you to real airlines.' },
      { name: 'Kayak', url: 'https://www.kayak.com', reason: 'Well-known fare comparison site with no booking scams.' }
    ]
  },
  jobs: {
    hosts: ['job', 'career', 'work', 'hire', 'resume'],
    words: ['job', 'hiring', 'career', 'vacancy', 'resume', 'work from home'],
    alts: [
      { name: 'LinkedIn Jobs', url: 'https://www.linkedin.com/jobs', reason: 'The professional network\'s verified job listings.' },
      { name: 'Indeed', url: 'https://www.indeed.com', reason: 'The largest established job aggregator with employer reviews.' },
      { name: 'Glassdoor', url: 'https://www.glassdoor.com', reason: 'Job listings plus honest company reviews and salary data.' }
    ]
  },
  login: {
    hosts: ['login', 'signin', 'verify', 'account', 'secure', 'auth', 'portal', 'id', 'password'],
    words: ['sign in', 'log in', 'verify your account', 'unlock your account', 'password'],
    alts: [
      { name: 'The real service\'s official site', url: 'https://www.google.com', reason: 'If a login page feels off, don\'t use it. Type the service\'s real address yourself (google.com, paypal.com, apple.com) — real logins never arrive by surprise links.' },
      { name: 'Have I Been Pwned', url: 'https://haveibeenpwned.com', reason: 'Check whether an account of yours was already compromised in a data breach.' },
      { name: '1Password', url: 'https://1password.com', reason: 'A password manager that only fills your credentials on the real, correct site.' }
    ]
  }
};

export default async function(req: Request): Promise<Response> {
  try {
    const body = await req.json().catch(() => ({}));
    const url = typeof body?.url === 'string' ? body.url.trim() : '';
    if (!url || url.length > 500) {
      return Response.json({ error: 'A website URL is required' }, { status: 400 });
    }

    let host = '';
    let path = '';
    try {
      const u = new URL(/^https?:\/\//i.test(url) ? url : 'https://' + url);
      host = (u.host || '').toLowerCase();
      path = (u.pathname || '').toLowerCase();
    } catch {
      host = url.toLowerCase();
    }
    const hay = host + ' ' + path + ' ' + decodeURIComponent(url.toLowerCase().replace(/https?:\/\//g, ' '));

    // Score each category by keyword hits; pick the best match.
    let best: { score: number; alts: Alternative[] } | null = null;
    for (const cat of Object.values(CATEGORIES)) {
      let score = 0;
      for (const h of cat.hosts) if (host.includes(h)) score += 3;
      for (const w of cat.words) if (hay.includes(w)) score += 1;
      if (score > (best?.score ?? 0)) best = { score, alts: cat.alts };
    }

    const alternatives = (best && best.score > 0 ? best.alts : CATEGORIES.search.alts)
      .slice(0, 5)
      .filter((a) => !host || !a.url.includes(host.split('.')[0] || '###'));

    return Response.json({ alternatives });
  } catch (error) {
    return Response.json({ error: error?.message || 'Failed to find alternatives' }, { status: 500 });
  }
}