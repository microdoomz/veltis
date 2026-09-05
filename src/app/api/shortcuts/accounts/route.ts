import { NextRequest, NextResponse } from 'next/server';
import { verifyShortcutToken } from '@/lib/services/shortcut';
import { db } from '@/lib/db';
import { financialAccount } from '@/lib/db/schema';
import { eq, and, ne } from 'drizzle-orm';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
  'Connection': 'keep-alive',
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization') || '';
    let token = '';

    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.slice(7).trim();
    } else {
      token = authHeader.trim();
    }

    if (!token) {
      return NextResponse.json(
        { error: 'Missing Authorization header. Please pass your token in the Authorization header.' },
        { status: 401, headers: corsHeaders }
      );
    }

    const shortcut = await verifyShortcutToken(token);
    if (!shortcut) {
      return NextResponse.json(
        { error: 'Invalid or revoked token' },
        { status: 401, headers: corsHeaders }
      );
    }

    // Return non-investment active accounts
    const accounts = await db.query.financialAccount.findMany({
      where: and(
        eq(financialAccount.workspaceId, shortcut.workspaceId),
        eq(financialAccount.status, 'active'),
        ne(financialAccount.accountType, 'investment')
      ),
      columns: {
        id: true,
        name: true,
        accountType: true,
        currency: true,
        institutionName: true,
        color: true,
      },
    });

    return NextResponse.json({
      accounts: accounts.map(a => ({
        id: a.id,
        name: a.name,
        type: a.accountType,
        currency: a.currency,
        institution: a.institutionName,
      }))
    }, {
      headers: corsHeaders,
    });
  } catch (error) {
    console.error('Failed to list accounts for shortcut:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500, headers: corsHeaders });
  }
}
