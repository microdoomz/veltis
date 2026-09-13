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
    versionCode: 2,
    versionName: '0.2.0',
    apkUrl: 'https://veltismoney.vercel.app/downloads/veltis.apk',
    changelog: 'Enhanced Google login flow, real database sync, no default account auto-creation, and in-app update capability.',
  }, { headers: corsHeaders });
}
