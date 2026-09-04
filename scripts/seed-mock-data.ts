import { db } from '../src/lib/db';
import { user, workspace, workspaceMember, financialAccount, transaction, transactionLeg, category } from '../src/lib/db/schema';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

async function seedData() {
  console.log('Fetching user mock@example.com...');
  const mockUser = await db.query.user.findFirst({
    where: eq(user.email, 'mock@example.com'),
  });

  if (!mockUser) {
    console.error('User mock@example.com not found. Please run seed-mock-user.ts first or create it via UI.');
    return;
  }

  console.log(`Found user: ${mockUser.id}`);

  // Create Workspace
  const workspaceId = uuidv4();
  await db.insert(workspace).values({
    id: workspaceId,
    name: 'Personal Finances',
    baseCurrency: 'USD',
    createdByUserId: mockUser.id,
  });
  console.log(`Created workspace: ${workspaceId}`);

  // Link User to Workspace
  await db.insert(workspaceMember).values({
    id: uuidv4(),
    workspaceId,
    userId: mockUser.id,
    role: 'owner',
    status: 'active',
  });

  // Create Accounts
  const checkingId = uuidv4();
  const savingsId = uuidv4();
  const creditCardId = uuidv4();
  
  await db.insert(financialAccount).values([
    {
      id: checkingId,
      workspaceId,
      name: 'Main Checking',
      accountType: 'bank',
      currency: 'USD',
      openingBalanceMinor: 500000n, // $5,000.00
      openingBalanceDate: new Date('2024-01-01').toISOString(),
      status: 'active',
    },
    {
      id: savingsId,
      workspaceId,
      name: 'High Yield Savings',
      accountType: 'bank',
      currency: 'USD',
      openingBalanceMinor: 2000000n, // $20,000.00
      openingBalanceDate: new Date('2024-01-01').toISOString(),
      status: 'active',
    },
    {
      id: creditCardId,
      workspaceId,
      name: 'Rewards Credit Card',
      accountType: 'credit_card',
      currency: 'USD',
      openingBalanceMinor: 0n,
      openingBalanceDate: new Date('2024-01-01').toISOString(),
      status: 'active',
    },
  ]);
  console.log('Created accounts.');

  // Find some categories
  const foodCat = await db.query.category.findFirst({ where: eq(category.name, 'Food & Dining') });
  const salaryCat = await db.query.category.findFirst({ where: eq(category.name, 'Income') });
  const housingCat = await db.query.category.findFirst({ where: eq(category.name, 'Housing') });
  const transportCat = await db.query.category.findFirst({ where: eq(category.name, 'Transportation') });

  // Create Transactions
  const txns = [
    { type: 'income', amount: 450000n, cat: salaryCat?.id, desc: 'Monthly Salary', acc: checkingId, date: new Date().toISOString() },
    { type: 'expense', amount: 150000n, cat: housingCat?.id, desc: 'Rent Payment', acc: checkingId, date: new Date().toISOString() },
    { type: 'expense', amount: 5000n, cat: foodCat?.id, desc: 'Coffee Shop', acc: creditCardId, date: new Date().toISOString() },
    { type: 'expense', amount: 12000n, cat: foodCat?.id, desc: 'Groceries', acc: creditCardId, date: new Date().toISOString() },
    { type: 'expense', amount: 4000n, cat: transportCat?.id, desc: 'Gas Station', acc: creditCardId, date: new Date().toISOString() },
    { type: 'expense', amount: 6000n, cat: foodCat?.id, desc: 'Restaurant', acc: creditCardId, date: new Date().toISOString() },
  ];

  for (const t of txns) {
    const txnId = uuidv4();
    await db.insert(transaction).values({
      id: txnId,
      workspaceId,
      transactionType: t.type as any,
      status: 'active',
      amountMinor: t.amount,
      currency: 'USD',
      transactionDate: t.date,
      description: t.desc,
      categoryId: t.cat || null,
      source: 'manual',
      createdByUserId: mockUser.id,
    });

    await db.insert(transactionLeg).values({
      id: uuidv4(),
      transactionId: txnId,
      accountId: t.acc,
      direction: t.type === 'income' ? 'credit' : 'debit',
      amountMinor: t.amount,
      currency: 'USD',
      legRole: 'main',
    });
  }
  
  console.log('Created transactions.');
  console.log('Data seeded successfully!');
}

seedData().catch(console.error).finally(() => process.exit(0));
