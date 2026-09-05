import { NextResponse } from 'next/server';
import { requireWorkspaceAccess } from '@/lib/auth/guards';
import { db } from '@/lib/db';
import { category, tag, merchantRule } from '@/lib/db/schema';
import { eq, and, or, isNull } from 'drizzle-orm';
import { z } from 'zod';

const postCategorySchema = z.object({
  entity: z.literal('category'),
  name: z.string().min(1, 'Category name is required'),
  categoryType: z.enum(['expense', 'income', 'both']).default('expense'),
  iconKey: z.string().optional().nullable(),
  parentId: z.string().uuid().optional().nullable(),
});

const postTagSchema = z.object({
  entity: z.literal('tag'),
  name: z.string().min(1, 'Tag name is required'),
});

const postRuleSchema = z.object({
  entity: z.literal('rule'),
  pattern: z.string().min(1, 'Pattern is required'),
  matchType: z.enum(['exact', 'contains', 'prefix', 'regex']).default('contains'),
  merchantName: z.string().optional().nullable(),
  categoryId: z.string().uuid('Category ID is required'),
  priority: z.coerce.number().default(0),
});

const taxonomyPostSchema = z.discriminatedUnion('entity', [
  postCategorySchema,
  postTagSchema,
  postRuleSchema,
]);

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const requestedWs = url.searchParams.get('workspaceId') || undefined;
    const authContext = await requireWorkspaceAccess(requestedWs);
    const workspaceId = authContext.workspaceId;

    const [categories, tags, rules] = await Promise.all([
      db.query.category.findMany({
        where: or(
          eq(category.workspaceId, workspaceId),
          isNull(category.workspaceId)
        ),
        orderBy: (c, { asc }) => [asc(c.name)],
      }),
      db.query.tag.findMany({
        where: eq(tag.workspaceId, workspaceId),
        orderBy: (t, { asc }) => [asc(t.name)],
      }),
      db.query.merchantRule.findMany({
        where: eq(merchantRule.workspaceId, workspaceId),
        orderBy: (r, { asc }) => [asc(r.priority)],
      }),
    ]);

    return NextResponse.json({
      categories,
      tags,
      rules,
    });
  } catch (error) {
    if (error instanceof Error && (error.message.includes('Unauthorized') || error.message.includes('Forbidden'))) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error('Failed to get taxonomy:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = taxonomyPostSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.format() }, { status: 400 });
    }

    const authContext = await requireWorkspaceAccess();
    const workspaceId = authContext.workspaceId;

    if (parsed.data.entity === 'category') {
      const [newCat] = await db.insert(category).values({
        workspaceId,
        name: parsed.data.name.trim(),
        categoryType: parsed.data.categoryType,
        iconKey: parsed.data.iconKey || null,
        parentId: parsed.data.parentId || null,
        isSystem: false,
      }).returning();

      return NextResponse.json(newCat, { status: 201 });
    }

    if (parsed.data.entity === 'tag') {
      const [newTag] = await db.insert(tag).values({
        workspaceId,
        name: parsed.data.name.trim().toLowerCase(),
      }).returning();

      return NextResponse.json(newTag, { status: 201 });
    }

    if (parsed.data.entity === 'rule') {
      const [newRule] = await db.insert(merchantRule).values({
        workspaceId,
        pattern: parsed.data.pattern.trim(),
        matchType: parsed.data.matchType,
        merchantName: parsed.data.merchantName || null,
        categoryId: parsed.data.categoryId,
        priority: parsed.data.priority,
        active: true,
      }).returning();

      return NextResponse.json(newRule, { status: 201 });
    }

    return NextResponse.json({ error: 'Invalid entity' }, { status: 400 });
  } catch (error) {
    if (error instanceof Error && (error.message.includes('Unauthorized') || error.message.includes('Forbidden'))) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error('Failed to create taxonomy entity:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    const entity = url.searchParams.get('entity');
    const id = url.searchParams.get('id');

    if (!entity || !id) {
      return NextResponse.json({ error: 'entity and id are required' }, { status: 400 });
    }

    const authContext = await requireWorkspaceAccess();
    const workspaceId = authContext.workspaceId;

    if (entity === 'category') {
      await db.delete(category).where(
        and(eq(category.id, id), eq(category.workspaceId, workspaceId))
      );
    } else if (entity === 'tag') {
      await db.delete(tag).where(
        and(eq(tag.id, id), eq(tag.workspaceId, workspaceId))
      );
    } else if (entity === 'rule') {
      await db.delete(merchantRule).where(
        and(eq(merchantRule.id, id), eq(merchantRule.workspaceId, workspaceId))
      );
    } else {
      return NextResponse.json({ error: 'Invalid entity' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && (error.message.includes('Unauthorized') || error.message.includes('Forbidden'))) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error('Failed to delete taxonomy entity:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
