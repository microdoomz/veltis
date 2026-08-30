import { db } from './index';
import { category } from './schema';

const SYSTEM_CATEGORIES = [
  { name: 'Housing', type: 'expense', icon: 'home' },
  { name: 'Transportation', type: 'expense', icon: 'car' },
  { name: 'Food & Dining', type: 'expense', icon: 'utensils' },
  { name: 'Utilities', type: 'expense', icon: 'bolt' },
  { name: 'Healthcare', type: 'expense', icon: 'heartbeat' },
  { name: 'Insurance', type: 'expense', icon: 'shield-alt' },
  { name: 'Personal Care', type: 'expense', icon: 'spa' },
  { name: 'Entertainment', type: 'expense', icon: 'film' },
  { name: 'Education', type: 'expense', icon: 'graduation-cap' },
  { name: 'Shopping', type: 'expense', icon: 'shopping-bag' },
  { name: 'Travel', type: 'expense', icon: 'plane' },
  { name: 'Income', type: 'income', icon: 'money-bill-wave' },
  { name: 'Investments', type: 'both', icon: 'chart-line' },
  { name: 'Transfers', type: 'both', icon: 'exchange-alt' },
  { name: 'Uncategorized', type: 'both', icon: 'question' },
] as const;

export async function seedSystemCategories() {
  console.log('Seeding system categories...');
  let count = 0;
  for (const cat of SYSTEM_CATEGORIES) {
    const existing = await db.query.category.findFirst({
      where: (c, { and, eq, isNull }) => and(
        eq(c.name, cat.name),
        eq(c.isSystem, true),
        isNull(c.workspaceId)
      )
    });

    if (!existing) {
      await db.insert(category).values({
        name: cat.name,
        categoryType: cat.type,
        isSystem: true,
        iconKey: cat.icon,
        workspaceId: null, // System category
      });
      count++;
    }
  }
  console.log(`Seeded ${count} system categories.`);
}

if (process.argv[1] === new URL(import.meta.url).pathname || process.argv[1] === __filename) {
  seedSystemCategories().catch(console.error).finally(() => process.exit(0));
}
