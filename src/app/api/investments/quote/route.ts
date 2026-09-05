import { NextResponse } from 'next/server';
import yahooFinance from 'yahoo-finance2';

interface SchemeSearchItem {
  schemeCode: number;
  schemeName: string;
}

interface QuoteSourceResult {
  source: string;
  nav: number;
  date?: string;
  schemeName?: string;
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
    const timeout = setTimeout(() => controller.abort(), 3500);

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
        // Format: Scheme Code;ISIN Div Payout/ISIN Growth;ISIN Div Reinvestment;Scheme Name;Net Asset Value;Date
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
    console.warn('AMFI NAV fetch error (timeout/network):', err);
  }
  return null;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('query') || searchParams.get('name') || '';
    const schemeCodeParam = searchParams.get('schemeCode') || searchParams.get('code') || '';

    if (!query.trim() && !schemeCodeParam) {
      return NextResponse.json({ error: 'Query or schemeCode parameter is required' }, { status: 400 });
    }

    const trimmedQuery = query.trim();
    const quoteResults: QuoteSourceResult[] = [];

    // 1. Search schemes via MFAPI or use explicit schemeCode if provided
    let topScheme: SchemeSearchItem | null = null;
    let allMatches: SchemeSearchItem[] = [];

    if (schemeCodeParam && !isNaN(parseInt(schemeCodeParam, 10))) {
      topScheme = {
        schemeCode: parseInt(schemeCodeParam, 10),
        schemeName: trimmedQuery || `Scheme ${schemeCodeParam}`,
      };
    } else {
      try {
        const searchRes = await fetch(`https://api.mfapi.in/mf/search?q=${encodeURIComponent(trimmedQuery)}`, {
          next: { revalidate: 3600 },
        });
        if (searchRes.ok) {
          const schemes: SchemeSearchItem[] = await searchRes.json();
          if (Array.isArray(schemes) && schemes.length > 0) {
            // Rank schemes by exactness score
            schemes.sort((a, b) => scoreMatch(b.schemeName, trimmedQuery) - scoreMatch(a.schemeName, trimmedQuery));
            topScheme = schemes[0];
            allMatches = schemes;
          }
        }
      } catch (err) {
        console.warn('MFAPI search error:', err);
      }
    }

    // If top Indian Mutual Fund scheme is found, query 4 consensus sources
    if (topScheme) {
      const schemeCode = topScheme.schemeCode;

      // Source 1: MFAPI Latest
      const p1 = (async () => {
        try {
          const res = await fetch(`https://api.mfapi.in/mf/${schemeCode}/latest`, {
            next: { revalidate: 3600 },
          });
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
        } catch {
          // ignore
        }
        return null;
      })();

      // Source 2: AMFI Official Daily NAV Registry
      const p2 = fetchAmfiNav(schemeCode);

      // Source 3: MFAPI Full Scheme History
      const p3 = (async () => {
        try {
          const res = await fetch(`https://api.mfapi.in/mf/${schemeCode}`, {
            next: { revalidate: 3600 },
          });
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
        } catch {
          // ignore
        }
        return null;
      })();

      // Source 4: Yahoo Finance (search and quote)
      const p4 = (async () => {
        try {
          // @ts-expect-error library types
          yahooFinance.suppressNotices(['yahooSurvey']);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const searchData: any = await yahooFinance.search(trimmedQuery);
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
        } catch {
          // ignore
        }
        return null;
      })();

      const [r1, r2, r3, r4] = await Promise.all([p1, p2, p3, p4]);
      if (r1) quoteResults.push(r1);
      if (r2) quoteResults.push(r2);
      if (r3) quoteResults.push(r3);
      if (r4) quoteResults.push(r4);

      if (quoteResults.length > 0) {
        // Form consensus clusters within 0.5% tolerance
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

        // Sort clusters by size (majority rule)
        clusters.sort((a, b) => b.length - a.length);
        const majorityCluster = clusters[0];

        // If AMFI official is in majority cluster, pick its NAV as exact statutory truth
        const amfiMatch = majorityCluster.find((m) => m.source === 'AMFI Official Registry');
        const consensusPrice = amfiMatch ? amfiMatch.nav : majorityCluster[0].nav;
        const matchedName = amfiMatch?.schemeName || majorityCluster[0].schemeName || topScheme.schemeName;

        return NextResponse.json({
          found: true,
          provider: '4-Service Consensus',
          name: matchedName,
          symbol: String(topScheme.schemeCode),
          currentPrice: consensusPrice,
          currency: 'INR',
          date: majorityCluster[0].date || new Date().toISOString().split('T')[0],
          consensusCount: majorityCluster.length,
          totalSourcesQueried: 4,
          sourcesUsed: quoteResults.map((q) => q.source),
          confidence: majorityCluster.length >= 3 ? 'high' : majorityCluster.length >= 2 ? 'strong' : 'moderate',
          allMatches: allMatches.slice(0, 6).map((s) => ({
            name: s.schemeName,
            symbol: String(s.schemeCode),
          })),
        });
      }
    }

    // Fallback: Global assets via Yahoo Finance direct quote
    try {
      // @ts-expect-error loose types
      yahooFinance.suppressNotices(['yahooSurvey']);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const quote: any = await yahooFinance.quote(trimmedQuery);
      if (quote && quote.regularMarketPrice) {
        return NextResponse.json({
          found: true,
          provider: 'Yahoo Finance Global',
          name: quote.longName || quote.shortName || trimmedQuery,
          symbol: quote.symbol || trimmedQuery,
          currentPrice: quote.regularMarketPrice,
          currency: quote.currency ? quote.currency.toUpperCase() : 'USD',
          date: new Date().toISOString().split('T')[0],
          confidence: 'single_source',
        });
      }
    } catch {
      // ignore
    }

    return NextResponse.json({
      found: false,
      message: 'Live market NAV not found automatically. You can proceed and track with your invested value.',
    });
  } catch (error: unknown) {
    console.error('Failed to query investment quote:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
