// Reputable alternatives for a SUS-flagged site.
//
// Suggestions come from this built-in catalog of well-known, reputable sites,
// matched by what the flagged address looks like. No AI calls, no external
// services, zero integration credits.

const CATALOG = [
  {
    match: /shop|store|outlet|deal|discount|sale|cheap|fashion|shoe|sneaker/i,
    items: [
      { name: 'Amazon', url: 'https://www.amazon.com', reason: 'The largest established online retailer with strong buyer protection.' },
      { name: 'eBay', url: 'https://www.ebay.com', reason: 'A long-running marketplace with buyer guarantees and dispute resolution.' },
      { name: 'Best Buy', url: 'https://www.bestbuy.com', reason: 'A major established retailer for electronics and appliances.' },
      { name: 'Walmart', url: 'https://www.walmart.com', reason: 'A well-known national retailer with a standard returns process.' }
    ]
  },
  {
    match: /pay|bank|wallet|financ|invoice|refund/i,
    items: [
      { name: 'PayPal', url: 'https://www.paypal.com', reason: 'The official PayPal site for secure payments and dispute resolution.' },
      { name: 'Wise', url: 'https://wise.com', reason: 'A well-reg regulated service for international money transfers.' },
      { name: 'US consumer finance guidance', url: 'https://www.consumer.ftc.gov', reason: 'Official FTC guidance on avoiding payment and banking scams.' }
    ]
  },
  {
    match: /login|signin|sign-in|account|verify|password|unlock/i,
    items: [
      { name: 'Google Account', url: 'https://myaccount.google.com', reason: 'The official Google account page where you can check security settings.' },
      { name: 'Apple ID', url: 'https://appleid.apple.com', reason: 'The official Apple account management page.' },
      { name: 'Microsoft account', url: 'https://account.microsoft.com', reason: 'The official Microsoft account page.' }
    ]
  },
  {
    match: /stream|movie|watch|tv|film|cinema/i,
    items: [
      { name: 'YouTube', url: 'https://www.youtube.com', reason: 'The largest free video platform, owned by Google.' },
      { name: 'Netflix', url: 'https://www.netflix.com', reason: 'The official streaming service, with a cancel-anytime plan.' },
      { name: 'Tubi', url: 'https://tubitv.com', reason: 'A free, legitimate, ad-supported streaming service.' }
    ]
  },
  {
    match: /download|software|app|crack|mod|apk|driver|install/i,
    items: [
      { name: 'Microsoft downloads', url: 'https://www.microsoft.com/downloads', reason: 'Official Microsoft software downloads.' },
      { name: 'Adobe', url: 'https://www.adobe.com', reason: 'The only official source for Adobe products.' },
      { name: 'Ninite', url: 'https://ninite.com', reason: 'A trusted installer that bundles popular free software safely.' },
      { name: 'VideoLAN', url: 'https://www.videolan.org', reason: 'The official site of the open-source VLC media player.' }
    ]
  },
  {
    match: /crypto|coin|invest|trading|profit|forex|nft/i,
    items: [
      { name: 'Investor.gov', url: 'https://www.investor.gov', reason: 'The US Securities and Exchange Commission resource for checking investments and avoiding fraud.' },
      { name: 'Coinbase', url: 'https://www.coinbase.com', reason: 'A long-established, publicly listed US crypto exchange.' },
      { name: 'FINRA broker check', url: 'https://brokercheck.finra.org', reason: 'The official tool to verify a broker or investment firm.' }
    ]
  },
  {
    match: /news|breaking|headline|daily|times|post/i,
    items: [
      { name: 'AP News', url: 'https://apnews.com', reason: 'A non-profit wire service with a long factual track record.' },
      { name: 'Reuters', url: 'https://www.reuters.com', reason: 'An established global news agency.' },
      { name: 'BBC News', url: 'https://www.bbc.com/news', reason: 'A major public-service broadcaster.' }
    ]
  },
  {
    match: /game|gaming|play|cheat/i,
    items: [
      { name: 'Steam', url: 'https://store.steampowered.com', reason: 'The largest established PC game store.' },
      { name: 'Epic Games Store', url: 'https://store.epicgames.com', reason: 'A major official game store with free weekly titles.' },
      { name: 'itch.io', url: 'https://itch.io', reason: 'A reputable marketplace for indie games.' }
    ]
  },
  {
    match: /travel|flight|hotel|ticket|booking|airfare|vacation/i,
    items: [
      { name: 'Google Travel', url: 'https://www.google.com/travel', reason: 'A neutral comparison of flights and hotels across providers.' },
      { name: 'Booking.com', url: 'https://www.booking.com', reason: 'A long-running accommodation platform with clear cancellation policies.' },
      { name: 'Expedia', url: 'https://www.expedia.com', reason: 'An established full-service travel booking site.' }
    ]
  },
  {
    match: /job|career|income|work|salary|hiring|resume/i,
    items: [
      { name: 'LinkedIn', url: 'https://www.linkedin.com/jobs', reason: 'The largest professional network for verified job listings.' },
      { name: 'Indeed', url: 'https://www.indeed.com', reason: 'A major job aggregator with employer reviews.' },
      { name: 'USAJOBS', url: 'https://www.usajobs.gov', reason: 'The official site for US federal government jobs.' }
    ]
  },
  {
    match: /dating|romance|single|match|heart/i,
    items: [
      { name: 'Hinge', url: 'https://hinge.co', reason: 'A mainstream dating app operated by a major company (Match Group).' },
      { name: 'FTC romance scam advice', url: 'https://consumer.ftc.gov/articles/how-avoid-romance-scam', reason: 'Official guidance on spotting romance scams, which cost victims billions.' }
    ]
  },
  {
    match: /gift|prize|winner|lottery|sweepstake|claim|reward/i,
    items: [
      { name: 'FTC scam advice', url: 'https://consumer.ftc.gov', reason: 'Official guidance on prize and lottery scams, which are almost always fraud.' }
    ]
  }
];

const DEFAULT_ITEMS = [
  { name: 'Google', url: 'https://www.google.com', reason: 'A safe starting point to find the official site you were looking for.' },
  { name: 'Wikipedia', url: 'https://www.wikipedia.org', reason: 'A reputable non-profit reference for checking who runs a company or service.' },
  { name: 'FTC consumer advice', url: 'https://consumer.ftc.gov', reason: 'Official guidance on spotting and avoiding online scams.' }
];

export default async function(req: Request): Promise<Response> {
  try {
    const body = await req.json().catch(() => ({}));
    const url = typeof body?.url === 'string' ? body.url.trim() : '';
    if (!url || url.length > 500) {
      return Response.json({ error: 'A website URL is required' }, { status: 400 });
    }

    // Match the flagged address against the catalog to pick relevant
    // alternatives; fall back to the general-purpose list.
    let items = DEFAULT_ITEMS;
    for (const entry of CATALOG) {
      if (entry.match.test(url)) {
        items = entry.items;
        break;
      }
    }

    // Never suggest anything on the flagged domain itself.
    let flaggedHost = '';
    try {
      flaggedHost = new URL(/^https?:\/\//i.test(url) ? url : 'https://' + url).hostname.toLowerCase();
    } catch {}

    const alternatives = items
      .filter((a) => {
        try {
          return !flaggedHost || new URL(a.url).hostname.toLowerCase() !== flaggedHost;
        } catch {
          return false;
        }
      })
      .slice(0, 5)
      .map((a) => ({ name: a.name, url: a.url, reason: a.reason }));

    return Response.json({ alternatives });
  } catch (error) {
    return Response.json({ error: error?.message || 'Failed to find alternatives' }, { status: 500 });
  }
}