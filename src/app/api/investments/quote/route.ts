import { NextResponse } from 'next/server';
import { fetchInvestmentQuote } from '@/lib/investments/quote';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('query') || searchParams.get('name') || '';
    const schemeCodeParam = searchParams.get('schemeCode') || searchParams.get('code') || '';

    if (!query.trim() && !schemeCodeParam) {
      return NextResponse.json({ error: 'Query or schemeCode parameter is required' }, { status: 400 });
    }

    const result = await fetchInvestmentQuote(query, schemeCodeParam);
    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('Failed to query investment quote:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
