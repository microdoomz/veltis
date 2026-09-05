import { db } from '../src/lib/db';
import { user, workspace, financialAccount, category, transaction, transactionLeg } from '../src/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { randomUUID } from 'crypto';

async function seedMockUser() {
  const mockEmail = 'mock@example.com';
  console.log(`Ensuring user ${mockEmail} exists in database...`);

  let mockUserId: string;

  // Check if user exists
  const existingUsers = await db.select().from(user).where(eq(user.email, mockEmail));
  
  if (existingUsers.length > 0) {
    console.log('Mock user already exists. Proceeding with seeding.');
    mockUserId = existingUsers[0].id;
  } else {
    mockUserId = randomUUID();
    await db.insert(user).values({
      id: mockUserId,
      email: mockEmail,
      name: 'Mock User',
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    console.log('Mock user created successfully');
  }

  // Get or Create workspace
  const existingWorkspaces = await db.select().from(workspace).where(eq(workspace.createdByUserId, mockUserId));
  
  let mockWorkspaceId: string;
  if (existingWorkspaces.length > 0) {
    mockWorkspaceId = existingWorkspaces[0].id;
  } else {
    mockWorkspaceId = randomUUID();
    await db.insert(workspace).values({
      id: mockWorkspaceId,
      createdByUserId: mockUserId,
      name: "Mock User's Workspace",
      baseCurrency: 'INR'
    });
    console.log('Workspace created successfully');
  }

  const workspaceId = mockWorkspaceId;

  console.log(`Seeding data for workspace: ${workspaceId}`);

  // Create Accounts
  const accountIds = {
    cash: randomUUID(),
    hdfc: randomUUID(),
    cc: randomUUID()
  };

  const defaultDateStr = '2024-01-01';

  const accountsToInsert: (typeof financialAccount.$inferInsert)[] = [
    {
      id: accountIds.cash,
      workspaceId,
      name: 'Cash Wallet',
      accountType: 'cash_wallet',
      currency: 'INR',
      status: 'active',
      openingBalanceMinor: 0n,
      openingBalanceDate: defaultDateStr
    },
    {
      id: accountIds.hdfc,
      workspaceId,
      name: 'HDFC Checking',
      accountType: 'bank',
      currency: 'INR',
      status: 'active',
      openingBalanceMinor: 10000000n, // 1,00,000 INR
      openingBalanceDate: defaultDateStr
    },
    {
      id: accountIds.cc,
      workspaceId,
      name: 'Amex Credit Card',
      accountType: 'credit_card',
      currency: 'INR',
      status: 'active',
      openingBalanceMinor: 0n,
      openingBalanceDate: defaultDateStr
    }
  ];
  await db.insert(financialAccount).values(accountsToInsert).onConflictDoNothing();

  console.log('Accounts created');

  // Create Categories
  const catIds = {
    food: randomUUID(),
    transport: randomUUID(),
    salary: randomUUID()
  };

  const categoriesToInsert: (typeof category.$inferInsert)[] = [
    {
      id: catIds.food,
      workspaceId,
      name: 'Food & Dining',
      categoryType: 'expense'
    },
    {
      id: catIds.transport,
      workspaceId,
      name: 'Transportation',
      categoryType: 'expense'
    },
    {
      id: catIds.salary,
      workspaceId,
      name: 'Salary',
      categoryType: 'income'
    }
  ];
  await db.insert(category).values(categoriesToInsert).onConflictDoNothing();

  console.log('Categories created');

  // Create some transactions
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const yesterday = new Date(now.getTime() - 86400000);
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  
  const transactionsToInsert: (typeof transaction.$inferInsert)[] = [];
  const legsToInsert: (typeof transactionLeg.$inferInsert)[] = [];

  // Transaction 1: Salary Income
  const tx1Id = randomUUID();
  transactionsToInsert.push({
    id: tx1Id,
    workspaceId,
    transactionDate: dateStr,
    description: 'Monthly Salary',
    createdByUserId: mockUserId,
    amountMinor: 5000000n, // 50,000 INR
    currency: 'INR',
    transactionType: 'income',
    source: 'system',
    status: 'active',
    categoryId: catIds.salary
  });
  legsToInsert.push(
    { id: randomUUID(), transactionId: tx1Id, accountId: accountIds.hdfc, amountMinor: 5000000n, currency: 'INR', direction: 'credit', legRole: 'primary' } // Mock logic
  );

  // Transaction 2: Food Expense
  const tx2Id = randomUUID();
  transactionsToInsert.push({
    id: tx2Id,
    workspaceId,
    transactionDate: yesterdayStr, // 1 day ago
    description: 'Lunch at Cafe',
    createdByUserId: mockUserId,
    amountMinor: 45000n, // 450 INR
    currency: 'INR',
    transactionType: 'expense',
    source: 'system',
    status: 'active',
    categoryId: catIds.food
  });
  legsToInsert.push(
    { id: randomUUID(), transactionId: tx2Id, accountId: accountIds.hdfc, amountMinor: -45000n, currency: 'INR', direction: 'debit', legRole: 'primary' }
  );

  await db.insert(transaction).values(transactionsToInsert).onConflictDoNothing();
  await db.insert(transactionLeg).values(legsToInsert).onConflictDoNothing();

  console.log('Transactions created');
  console.log('Seed completed successfully!');
  process.exit(0);
}

seedMockUser().catch(console.error);
