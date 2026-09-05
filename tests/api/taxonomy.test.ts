import { describe, it, expect, beforeAll, vi, Mock } from 'vitest';
import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { user, workspace } from '@/lib/db/schema';
import { randomUUID } from 'crypto';
import { GET as getTaxonomy, POST as createTaxonomy, DELETE as deleteTaxonomy } from '@/app/api/taxonomy/route';

vi.mock('@/lib/auth/guards', () => {
  return {
    requireUser: vi.fn(),
    requireWorkspaceAccess: vi.fn(),
    requireStrictWorkspaceAccess: vi.fn(),
  };
});

import { requireUser, requireWorkspaceAccess } from '@/lib/auth/guards';

describe('Taxonomy APIs', () => {
  let testUserId: string;
  let testWorkspaceId: string;

  beforeAll(async () => {
    const [newUser] = await db.insert(user).values({
      id: randomUUID(),
      name: 'Taxonomy Test User',
      email: `taxonomy-${randomUUID()}@example.com`,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    testUserId = newUser.id;

    const [newWs] = await db.insert(workspace).values({
      name: 'Taxonomy Test Workspace',
      baseCurrency: 'USD',
      createdByUserId: testUserId,
    }).returning();
    testWorkspaceId = newWs.id;

    (requireUser as Mock).mockResolvedValue({ user: { id: testUserId } });
    (requireWorkspaceAccess as Mock).mockResolvedValue({ workspaceId: testWorkspaceId });
  });

  it('POST /api/taxonomy creates a custom category and a tag', async () => {
    // Create category
    const catReq = new NextRequest('http://localhost/api/taxonomy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entity: 'category',
        name: 'Pet Expenses',
        categoryType: 'expense',
      }),
    });
    const catRes = await createTaxonomy(catReq);
    expect(catRes.status).toBe(201);
    const catData = await catRes.json();
    expect(catData.name).toBe('Pet Expenses');

    // Create tag
    const tagReq = new NextRequest('http://localhost/api/taxonomy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entity: 'tag',
        name: 'tax2026',
      }),
    });
    const tagRes = await createTaxonomy(tagReq);
    expect(tagRes.status).toBe(201);
    const tagData = await tagRes.json();
    expect(tagData.name).toBe('tax2026');

    // Create merchant rule
    const ruleReq = new NextRequest('http://localhost/api/taxonomy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        entity: 'rule',
        pattern: 'PETCO',
        matchType: 'contains',
        merchantName: 'Petco Superstores',
        categoryId: catData.id,
        priority: 1,
      }),
    });
    const ruleRes = await createTaxonomy(ruleReq);
    expect(ruleRes.status).toBe(201);
    const ruleData = await ruleRes.json();
    expect(ruleData.pattern).toBe('PETCO');

    // Fetch taxonomy
    const getReq = new NextRequest(`http://localhost/api/taxonomy?workspaceId=${testWorkspaceId}`);
    const getRes = await getTaxonomy(getReq);
    expect(getRes.status).toBe(200);
    const getData = await getRes.json();
    expect(getData.categories.some((c: { name: string }) => c.name === 'Pet Expenses')).toBe(true);
    expect(getData.tags.some((t: { name: string }) => t.name === 'tax2026')).toBe(true);
    expect(getData.rules.some((r: { pattern: string }) => r.pattern === 'PETCO')).toBe(true);

    // Delete tag
    const delReq = new NextRequest(`http://localhost/api/taxonomy?entity=tag&id=${tagData.id}`, {
      method: 'DELETE',
    });
    const delRes = await deleteTaxonomy(delReq);
    expect(delRes.status).toBe(200);
  });
});
