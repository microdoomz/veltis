import { NextResponse } from 'next/server';
import yahooFinance from 'yahoo-finance2';

interface SchemeSearchItem {
  schemeCode: number;
  schemeName: string;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('query') || searchParams.get('name') || '';

    if (!query.trim()) {
      return NextResponse.json({ error: 'Query parameter is required' }, { status: 400 });
    }

    const trimmedQuery = query.trim();

    // 1. Try Indian Mutual Funds API (api.mfapi.in)
    try {
      const searchRes = await fetch(`https://api.mfapi.in/mf/search?q=${encodeURIComponent(trimmedQuery)}`, {
        next: { revalidate: 3600 },
      });
      if (searchRes.ok) {
        const schemes: SchemeSearchItem[] = await searchRes.json();
        if (Array.isArray(schemes) && schemes.length > 0) {
          // Take the closest match or first scheme
          const topScheme = schemes[0];
          const detailsRes = await fetch(`https://api.mfapi.in/mf/${topScheme.schemeCode}/latest`, {
            next: { revalidate: 3600 },
          });

          if (detailsRes.ok) {
            const detailsData = await detailsRes.json();
            const latestEntry = detailsData?.data?.[0];
            const navFloat = parseFloat(latestEntry?.nav);

            if (!isNaN(navFloat) && navFloat > 0) {
              return NextResponse.json({
                found: true,
                provider: 'mfapi',
                name: detailsData.meta?.scheme_name || topScheme.schemeName,
                symbol: String(topScheme.schemeCode),
                currentPrice: navFloat,
                currency: 'INR',
                date: latestEntry?.date || new Date().toISOString().split('T')[0],
                allMatches: schemes.slice(0, 5).map(s => ({
                  name: s.schemeName,
                  symbol: String(s.schemeCode),
                })),
              });
            }
          }
        }
      }
    } catch (mfErr) {
      console.warn('MF API lookup error:', mfErr);
    }

    // 2. Try Yahoo Finance for global mutual funds, ETFs, stocks
    try {
      // @ts-expect-error yahoo finance library types are loose
      yahooFinance.suppressNotices(['yahooSurvey']);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const quote: any = await yahooFinance.quote(trimmedQuery);
      if (quote && quote.regularMarketPrice) {
        return NextResponse.json({
          found: true,
          provider: 'yahoo',
          name: quote.longName || quote.shortName || trimmedQuery,
          symbol: quote.symbol || trimmedQuery,
          currentPrice: quote.regularMarketPrice,
          currency: quote.currency ? quote.currency.toUpperCase() : 'USD',
          date: new Date().toISOString().split('T')[0],
        });
      }
    } catch (yfErr) {
      console.warn('Yahoo Finance quote error:', yfErr);
    }

    // 3. Not found in automated registries
    return NextResponse.json({
      found: false,
      message: 'Live market NAV not found automatically. You can proceed and track with your invested value.',
    });
  } catch (error: unknown) {
    console.error('Failed to query investment quote:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
