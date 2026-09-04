# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: dashboard.e2e.ts >> Dashboard & Navigation >> navigates between major application pages
- Location: tests\dashboard.e2e.ts:10:7

# Error details

```
Test timeout of 30000ms exceeded while setting up "authenticatedPage".
```

```
Error: page.waitForURL: Test timeout of 30000ms exceeded.
=========================== logs ===========================
waiting for navigation to "**/home" until "load"
============================================================
```

# Page snapshot

```yaml
- generic [ref=f1e3]:
  - generic [ref=f1e4]:
    - heading "Welcome to Veltis" [level=1] [ref=f1e5]
    - paragraph [ref=f1e6]: Sign in to your account to continue
  - generic [ref=f1e7]:
    - textbox "Email address" [ref=f1e9]
    - textbox "Password" [ref=f1e11]
    - button "Sign in with Email" [ref=f1e12]
  - generic [ref=f1e13]: Or continue with
  - generic [ref=f1e18]:
    - button "Continue with Google" [ref=f1e19]
    - generic [ref=f1e20]:
      - button "Continue with Apple" [disabled]
      - paragraph [ref=f1e21]: Apple Sign-In is temporarily unavailable / coming soon.
```

# Test source

```ts
  10  | };
  11  | 
  12  | export const test = base.extend<TestFixtures>({
  13  |   testUser: async ({ playwright }, use) => {
  14  |     const userId = randomUUID();
  15  |     const email = `e2e-${userId}@example.com`;
  16  |     const password = 'Password123!';
  17  |     const name = 'E2E Test User';
  18  | 
  19  |     const apiContext = await playwright.request.newContext();
  20  |     // 1. Create the user using the real API so passwords and sessions are handled correctly
  21  |     const response = await apiContext.post('http://127.0.0.1:3000/api/auth/sign-up/email', {
  22  |       data: { email, password, name }
  23  |     });
  24  |     
  25  |     if (!response.ok()) {
  26  |       console.error('Failed to create test user:', await response.text());
  27  |       await apiContext.dispose();
  28  |       throw new Error('Failed to create test user');
  29  |     }
  30  | 
  31  |     const userData = await response.json();
  32  |     await apiContext.dispose();
  33  |     const dbUserId = userData.user.id;
  34  | 
  35  |     // 2. Setup DB Seed Data
  36  |     const userWorkspace = await db.query.workspace.findFirst({
  37  |       where: (w, { eq }) => eq(w.createdByUserId, dbUserId)
  38  |     });
  39  |     
  40  |     let wsId: string | undefined;
  41  |     if (userWorkspace) {
  42  |       wsId = userWorkspace.id;
  43  |       const { financialAccount, category } = await import('@/lib/db/schema');
  44  |       await db.insert(financialAccount).values([
  45  |         {
  46  |           id: randomUUID(),
  47  |           workspaceId: wsId,
  48  |           name: 'Test Checking',
  49  |           accountType: 'bank',
  50  |           openingBalanceMinor: BigInt(500000), // $5,000.00
  51  |           openingBalanceDate: new Date().toISOString().split('T')[0],
  52  |           status: 'active',
  53  |           currency: 'USD',
  54  |         },
  55  |         {
  56  |           id: randomUUID(),
  57  |           workspaceId: wsId,
  58  |           name: 'Test Savings',
  59  |           accountType: 'bank',
  60  |           openingBalanceMinor: BigInt(1000000), // $10,000.00
  61  |           openingBalanceDate: new Date().toISOString().split('T')[0],
  62  |           status: 'active',
  63  |           currency: 'USD',
  64  |         }
  65  |       ]);
  66  |       await db.insert(category).values({
  67  |         id: randomUUID(),
  68  |         workspaceId: wsId,
  69  |         name: 'Food & Dining',
  70  |         categoryType: 'expense',
  71  |       });
  72  |     }
  73  | 
  74  |     await use({ email, password, name });
  75  | 
  76  |     // 3. Strict Teardown using DB
  77  |     if (wsId) {
  78  |       // Delete child records first to respect foreign keys
  79  |       await db.delete(recurringItem).where(eq(recurringItem.workspaceId, wsId));
  80  |       await db.delete(transaction).where(eq(transaction.workspaceId, wsId));
  81  |       await db.delete(budget).where(eq(budget.workspaceId, wsId));
  82  |       await db.delete(investmentPosition).where(eq(investmentPosition.workspaceId, wsId));
  83  |       await db.delete(liability).where(eq(liability.workspaceId, wsId));
  84  |       await db.delete(receivable).where(eq(receivable.workspaceId, wsId));
  85  |       
  86  |       // Delete parent entities
  87  |       await db.delete(category).where(eq(category.workspaceId, wsId));
  88  |       await db.delete(financialAccount).where(eq(financialAccount.workspaceId, wsId));
  89  |       // First delete occurrences then items to respect FK if any
  90  |       // but they are probably both scoped to workspace
  91  |       await db.delete(workspaceMember).where(eq(workspaceMember.workspaceId, wsId));
  92  |       await db.delete(workspace).where(eq(workspace.id, wsId));
  93  |     }
  94  |     
  95  |     // Delete user and sessions
  96  |     await db.delete(account).where(eq(account.userId, dbUserId));
  97  |     await db.delete(sessionTable).where(eq(sessionTable.userId, dbUserId));
  98  |     await db.delete(user).where(eq(user.id, dbUserId));
  99  |   },
  100 | 
  101 |   authenticatedPage: async ({ page, testUser }, use) => {
  102 |     // Navigate to login
  103 |     await page.goto('/');
  104 |     // Login with the created test user
  105 |     await page.fill('input[type="email"]', testUser.email);
  106 |     await page.fill('input[type="password"]', testUser.password);
  107 |     await page.click('button[type="submit"]');
  108 |     
  109 |     // Wait for redirect to /home
> 110 |     await page.waitForURL('**/home');
      |                ^ Error: page.waitForURL: Test timeout of 30000ms exceeded.
  111 |     
  112 |     await use(page);
  113 |   }
  114 | });
  115 | 
  116 | export { expect };
  117 | 
```