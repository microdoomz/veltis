import yahooFinance from 'yahoo-finance2';

export interface SchemeSearchItem {
  schemeCode: number;
  schemeName: string;
}

export interface QuoteSourceResult {
  source: string;
  nav: number;
  date?: string;
  schemeName?: string;
}

export interface InvestmentQuoteResult {
  found: boolean;
  provider?: string;
  name?: string;
  symbol?: string;
  currentPrice?: number;
  currency?: string;
  date?: string;
  confidence?: string;
  allMatches?: Array<{ name: string; symbol: string }>;
  message?: string;
}

/**
 * Score relevance between scheme name and query.
 * Gives strong weight to Direct vs Regular and Growth vs IDCW.
 */
function scoreMatch(schemeName: string, query: string): number {
  const cleanName = schemeName.toLowerCase();
  const cleanQuery = query.toLowerCase();
  const queryTokens = cleanQuery.split(/[\s\-()]+/).filter((t) => t.length > 1);

  let score = 0;
  for (const token of queryTokens) {
    if (cleanName.includes(token)) score += 10;
  }

  // Direct vs Regular
  const isQueryDirect = /direct/i.test(cleanQuery);
  const isSchemeDirect = /direct/i.test(cleanName);
  if (isQueryDirect === isSchemeDirect) score += 25;

  // Growth vs IDCW / Dividend
  const isQueryGrowth = /growth/i.test(cleanQuery);
  const isSchemeGrowth = /growth/i.test(cleanName);
  if (isQueryGrowth === isSchemeGrowth) score += 20;

  return score;
}

/**
 * Fetch NAV from AMFI India official daily NAV text feed.
 */
async function fetchAmfiNav(schemeCode: number): Promise<QuoteSourceResult | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const res = await fetch('https://www.amfiindia.com/spages/NAVAll.txt', {
      signal: controller.signal,
      next: { revalidate: 3600 },
    });
    clearTimeout(timeout);

    if (!res.ok) return null;

    const text = await res.text();
    const lines = text.split('\n');
    const prefix = `${schemeCode};`;

    for (const line of lines) {
      if (line.startsWith(prefix)) {
        const parts = line.split(';');
        if (parts.length >= 6) {
          const navFloat = parseFloat(parts[4].trim());
          if (!isNaN(navFloat) && navFloat > 0) {
            return {
              source: 'AMFI Official Registry',
              nav: navFloat,
              date: parts[5]?.trim(),
              schemeName: parts[3]?.trim(),
            };
          }
        }
      }
    }
  } catch (err) {
    console.warn('AMFI NAV fetch error:', err);
  }
  return null;
}

/**
 * Robust, multi-source live quote fetcher.
 * 1. Checks Indian Mutual Fund schemes via MFAPI and AMFI India.
 * 2. Reaches consensus cluster among MFAPI Latest, AMFI Official, MFAPI Historical, and Yahoo Finance.
 * 3. Falls back to Yahoo Finance for global stocks/ETFs.
 */
export async function fetchInvestmentQuote(
  queryParam?: string,
  schemeCodeParam?: string
): Promise<InvestmentQuoteResult> {
  const query = (queryParam || '').trim();
  const schemeCode = (schemeCodeParam || '').trim();

  if (!query && !schemeCode) {
    return { found: false, message: 'Query or schemeCode parameter is required' };
  }

  const quoteResults: QuoteSourceResult[] = [];
  let topScheme: SchemeSearchItem | null = null;
  let allMatches: SchemeSearchItem[] = [];

  if (schemeCode && !isNaN(parseInt(schemeCode, 10))) {
    topScheme = {
      schemeCode: parseInt(schemeCode, 10),
      schemeName: query || `Scheme ${schemeCode}`,
    };
  } else if (query) {
    try {
      const searchRes = await fetch(`https://api.mfapi.in/mf/search?q=${encodeURIComponent(query)}`, {
        next: { revalidate: 3600 },
      });
      if (searchRes.ok) {
        const schemes: SchemeSearchItem[] = await searchRes.json();
        if (Array.isArray(schemes) && schemes.length > 0) {
          schemes.sort((a, b) => scoreMatch(b.schemeName, query) - scoreMatch(a.schemeName, query));
          topScheme = schemes[0];
          allMatches = schemes;
        }
      }
    } catch (err) {
      console.warn('MFAPI search error:', err);
    }
  }

  if (topScheme) {
    const code = topScheme.schemeCode;

    const p1 = (async () => {
      try {
        const res = await fetch(`https://api.mfapi.in/mf/${code}/latest`, { next: { revalidate: 3600 } });
        if (res.ok) {
          const data = await res.json();
          const latest = data?.data?.[0];
          const nav = parseFloat(latest?.nav);
          if (!isNaN(nav) && nav > 0) {
            return {
              source: 'MFAPI Latest',
              nav,
              date: latest?.date,
              schemeName: data.meta?.scheme_name || topScheme?.schemeName,
            };
          }
        }
      } catch {}
      return null;
    })();

    const p2 = fetchAmfiNav(code);

    const p3 = (async () => {
      try {
        const res = await fetch(`https://api.mfapi.in/mf/${code}`, { next: { revalidate: 3600 } });
        if (res.ok) {
          const data = await res.json();
          const latest = data?.data?.[0];
          const nav = parseFloat(latest?.nav);
          if (!isNaN(nav) && nav > 0) {
            return {
              source: 'MFAPI Historical Data',
              nav,
              date: latest?.date,
              schemeName: data.meta?.scheme_name,
            };
          }
        }
      } catch {}
      return null;
    })();

    const p4 = (async () => {
      try {
        // @ts-expect-error loose library types
        yahooFinance.suppressNotices(['yahooSurvey']);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const searchData: any = await yahooFinance.search(query || topScheme?.schemeName || '');
        const firstQuote = searchData?.quotes?.[0];
        if (firstQuote?.symbol) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const yQuote: any = await yahooFinance.quote(firstQuote.symbol);
          if (yQuote && yQuote.regularMarketPrice) {
            return {
              source: 'Yahoo Finance',
              nav: yQuote.regularMarketPrice,
              date: new Date().toISOString().split('T')[0],
              schemeName: yQuote.longName || yQuote.shortName,
            };
          }
        }
      } catch {}
      return null;
    })();

    const [r1, r2, r3, r4] = await Promise.all([p1, p2, p3, p4]);
    if (r1) quoteResults.push(r1);
    if (r2) quoteResults.push(r2);
    if (r3) quoteResults.push(r3);
    if (r4) quoteResults.push(r4);

    if (quoteResults.length > 0) {
      const clusters: QuoteSourceResult[][] = [];

      for (const item of quoteResults) {
        let placed = false;
        for (const cluster of clusters) {
          const ref = cluster[0].nav;
          if (Math.abs(item.nav - ref) / ref <= 0.005) {
            cluster.push(item);
            placed = true;
            break;
          }
        }
        if (!placed) {
          clusters.push([item]);
        }
      }

      clusters.sort((a, b) => b.length - a.length);
      const majorityCluster = clusters[0];
      const amfiMatch = majorityCluster.find((m) => m.source === 'AMFI Official Registry');
      const consensusPrice = amfiMatch ? amfiMatch.nav : majorityCluster[0].nav;
      const matchedName = amfiMatch?.schemeName || majorityCluster[0].schemeName || topScheme.schemeName;

      return {
        found: true,
        provider: '4-Service Consensus',
        name: matchedName,
        symbol: String(topScheme.schemeCode),
        currentPrice: consensusPrice,
        currency: 'INR',
        date: majorityCluster[0].date || new Date().toISOString().split('T')[0],
        confidence: majorityCluster.length >= 3 ? 'high' : majorityCluster.length >= 2 ? 'strong' : 'moderate',
        allMatches: allMatches.slice(0, 6).map((s) => ({
          name: s.schemeName,
          symbol: String(s.schemeCode),
        })),
      };
    }
  }

  // Fallback: Global assets via Yahoo Finance direct quote
  if (query) {
    try {
      // @ts-expect-error loose library types
      yahooFinance.suppressNotices(['yahooSurvey']);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const quote: any = await yahooFinance.quote(query);
      if (quote && quote.regularMarketPrice) {
        return {
          found: true,
          provider: 'Yahoo Finance Global',
          name: quote.longName || quote.shortName || query,
          symbol: quote.symbol || query,
          currentPrice: quote.regularMarketPrice,
          currency: quote.currency ? quote.currency.toUpperCase() : 'USD',
          date: new Date().toISOString().split('T')[0],
          confidence: 'single_source',
        };
      }
    } catch {}
  }

  return {
    found: false,
    message: 'Live market price not found automatically. You can enter or track with invested value.',
  };
}
