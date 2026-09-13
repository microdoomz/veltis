import { NextResponse } from 'next/server';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function GET() {
  return NextResponse.json({
    versionCode: 3,
    versionName: '1.1.0',
    apkUrl: 'https://veltismoney.vercel.app/downloads/veltis.apk',
    changelog: 'Veltis v1.1.0: Standalone pages for Budgets, Receivables, Liabilities, Recurring, Imports, and Exports. Multi-tab Analytics (Overview, Investments, Budgets). Account balance and transaction fixes. Red logout confirmation popup across Web & PWA.',
  }, { headers: corsHeaders });
}
