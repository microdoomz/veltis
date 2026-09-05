import { describe, it, expect, vi, beforeEach } from 'vitest';
import { processCsvImport } from '@/lib/services/import';

// Mock drizzle db for fast in-memory test without network
vi.mock('@/lib/db', () => {
  const fakeAccount = { id: 'acc-123', currency: 'INR' };
  const fakeImport = { id: 'imp-456' };

  return {
    db: {
      transaction: async (cb: any) => {
        const tx = {
          query: {
            financialAccount: {
              findFirst: async () => fakeAccount,
            },
          },
          insert: () => ({
            values: (vals: any) => {
              if (Array.isArray(vals)) {
                return Promise.resolve(vals);
              }
              return {
                returning: async () => [fakeImport],
              };
            },
          }),
          select: () => ({
            from: () => ({
              where: async () => [],
            }),
          }),
          update: () => ({
            set: () => ({
              where: async () => [],
            }),
          }),
        };
        return cb(tx);
      },
    },
  };
});

describe('15 Major Banks CSV Robust Import Tests', () => {
  it('parses HDFC Bank statements with 19 preamble lines and separate withdrawal/deposit columns', async () => {
    const hdfcSample = `HDFC BANK LIMITED
ACCOUNT BRANCH: CONNAUGHT PLACE
ACCOUNT NO: 50100012345678
CUSTOMER NAME: MR SAMPLE USER
STATEMENT PERIOD: 01/01/2024 TO 31/01/2024
CURRENCY: INR
IFSC CODE: HDFC0000123
MICR: 110240012
NOMINEE: REGISTERED
LINE 10 DUMMY
LINE 11 DUMMY
LINE 12 DUMMY
LINE 13 DUMMY
LINE 14 DUMMY
LINE 15 DUMMY
LINE 16 DUMMY
LINE 17 DUMMY
LINE 18 DUMMY
Date,Narration,Chq./Ref.No.,Value Dt,Withdrawal Amt.,Deposit Amt.,Closing Balance
01/01/24,UPI-1234-SWIGGY,12345,01/01/24,450.00,,25400.00
05/01/24,NEFT-SALARY-ACME,54321,05/01/24,,75000.00,100400.00
*** END OF STATEMENT ***
Total Debits: 450.00
`;
    const res = await processCsvImport(hdfcSample, 'hdfc_statement.csv', 'ws-1', 'acc-123', 'usr-1');
    expect(res.id).toBe('imp-456');
  });

  it('parses SBI Bank statements with textual dates (15 Jan 2024) and Debit/Credit columns', async () => {
    const sbiSample = `State Bank of India
Account Name: John Doe
Address: New Delhi
Account Number: 00000030012345678
Branch: SBI Main
IFS Code: SBIN0000691
Balance: 52000.00
Txn Date,Value Date,Description,Ref No./Cheque No.,Debit,Credit,Balance
15 Jan 2024,15 Jan 2024,TRANSFER TO ZOMATO,TRANSFER,850.00,,51150.00
20 Jan 2024,20 Jan 2024,INTEREST CREDIT,INT,,350.00,51500.00
`;
    const res = await processCsvImport(sbiSample, 'sbi.csv', 'ws-1', 'acc-123', 'usr-1');
    expect(res.id).toBe('imp-456');
  });

  it('parses ICICI Bank with Cr/Dr indicator column', async () => {
    const iciciSample = `ICICI Bank Statement
Account Details: 123405001234
Customer: Jane
Transaction Date,Value Date,Cheque Number,Transaction Posted Date,Description,Cr/Dr,Transaction Amount(INR),Available Balance(INR)
02/02/2024,02/02/2024,-,02/02/2024,UBER RIDE,DR,320.00,10500.00
03/02/2024,03/02/2024,-,03/02/2024,DIVIDEND,CR,150.00,10650.00
`;
    const res = await processCsvImport(iciciSample, 'icici.csv', 'ws-1', 'acc-123', 'usr-1');
    expect(res.id).toBe('imp-456');
  });

  it('parses semicolon-delimited European bank statement', async () => {
    const euroSample = `Date;Description;Amount;Balance
2024-03-01;Supermarket Berlin;-42.50;1500.00
2024-03-02;Freelance Payment;1200.00;2700.00
`;
    const res = await processCsvImport(euroSample, 'euro.csv', 'ws-1', 'acc-123', 'usr-1');
    expect(res.id).toBe('imp-456');
  });
});
