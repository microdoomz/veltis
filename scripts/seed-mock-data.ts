import { db } from '../src/lib/db';
import { user, workspace, workspaceMember, financialAccount, transaction, transactionLeg, category } from '../src/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

async function seedData() {
  const mockEmail = 'test@example.com';
  console.log(`Ensuring user ${mockEmail} exists...`);

  let mockUser = await db.query.user.findFirst({
    where: eq(user.email, mockEmail),
  });

  if (!mockUser) {
    const mockUserId = uuidv4();
    await db.insert(user).values({
      id: mockUserId,
      email: mockEmail,
      name: 'Mock User',
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    mockUser = await db.query.user.findFirst({
      where: eq(user.email, mockEmail),
    });
    console.log('Mock user created successfully');
  } else {
    console.log('Mock user already exists.');
  }

  if (!mockUser) {
    throw new Error('Failed to create or find mock user');
  }

  console.log(`Found/Created user: ${mockUser.id}`);

  // Create Workspace
  let mockWorkspace = await db.query.workspace.findFirst({
    where: eq(workspace.createdByUserId, mockUser.id)
  });

  let workspaceId = mockWorkspace?.id;

  if (!mockWorkspace) {
    workspaceId = uuidv4();
    await db.insert(workspace).values({
      id: workspaceId,
      name: 'Personal Finances',
      baseCurrency: 'USD',
      createdByUserId: mockUser.id,
    });
    console.log(`Created workspace: ${workspaceId}`);
  } else {
    console.log(`Using existing workspace: ${workspaceId}`);
  }

  if (!workspaceId) {
    throw new Error('Workspace ID is undefined');
  }

  // Link User to Workspace
  const existingMember = await db.query.workspaceMember.findFirst({
    where: and(eq(workspaceMember.workspaceId, workspaceId), eq(workspaceMember.userId, mockUser.id))
  });

  if (!existingMember) {
    await db.insert(workspaceMember).values({
      id: uuidv4(),
      workspaceId,
      userId: mockUser.id,
      role: 'owner',
      status: 'active',
    });
    console.log('Linked user to workspace.');
  }

  // Categories
  const categoryNames = [
    { name: 'Food & Dining', type: 'expense' as const },
    { name: 'Income', type: 'income' as const },
    { name: 'Housing', type: 'expense' as const },
    { name: 'Transportation', type: 'expense' as const }
  ];

  for (const cat of categoryNames) {
    const existingCat = await db.query.category.findFirst({
      where: and(eq(category.workspaceId, workspaceId), eq(category.name, cat.name))
    });
    if (!existingCat) {
      await db.insert(category).values({
        id: uuidv4(),
        workspaceId,
        name: cat.name,
        categoryType: cat.type,
      });
    }
  }
  console.log('Created categories.');

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

  // Find categories
  const foodCat = await db.query.category.findFirst({ where: and(eq(category.name, 'Food & Dining'), eq(category.workspaceId, workspaceId)) });
  const salaryCat = await db.query.category.findFirst({ where: and(eq(category.name, 'Income'), eq(category.workspaceId, workspaceId)) });
  const housingCat = await db.query.category.findFirst({ where: and(eq(category.name, 'Housing'), eq(category.workspaceId, workspaceId)) });
  const transportCat = await db.query.category.findFirst({ where: and(eq(category.name, 'Transportation'), eq(category.workspaceId, workspaceId)) });

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
