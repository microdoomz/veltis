// @vitest-environment jsdom
import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import { 
  enqueueTransaction, 
  getPendingTransactions, 
  updateTransactionStatus, 
  removeTransaction, 
  initializeQueue, 
  clearQueue,
  getTransactionsByStatus
} from "@/lib/sync/db";

describe("Offline Sync IndexedDB Client", () => {
  beforeEach(async () => {
    // Clear the queue before each test
    await clearQueue();
  });

  it("should create a queue and enqueue transactions", async () => {
    const id = await enqueueTransaction("expense", {
      amountMajor: 100,
      transactionDate: "2023-01-01",
      accountId: "acc-1",
      categoryId: "cat-1",
    });

    expect(id).toBeDefined();

    const pending = await getPendingTransactions();
    expect(pending).toHaveLength(1);
    expect(pending[0].id).toBe(id);
    expect(pending[0].type).toBe("expense");
    expect(pending[0].status).toBe("pending");
  });

  it("should update status correctly", async () => {
    const id = await enqueueTransaction("expense", {
      amountMajor: 100,
      transactionDate: "2023-01-01",
    });

    await updateTransactionStatus(id, "syncing");
    
    const pending = await getPendingTransactions();
    expect(pending).toHaveLength(0); // It's no longer pending

    const syncing = await getTransactionsByStatus("syncing");
    expect(syncing).toHaveLength(1);
    expect(syncing[0].id).toBe(id);

    await updateTransactionStatus(id, "error", "Some error");
    const errors = await getTransactionsByStatus("error");
    expect(errors).toHaveLength(1);
    expect(errors[0].errorMsg).toBe("Some error");
  });

  it("should remove transaction upon success", async () => {
    const id = await enqueueTransaction("income", {
      amountMajor: 500,
      transactionDate: "2023-01-01",
    });

    await removeTransaction(id);
    const pending = await getPendingTransactions();
    expect(pending).toHaveLength(0);
  });

  it("should recover crashed syncing items back to pending on initialization", async () => {
    const id1 = await enqueueTransaction("expense", { amountMajor: 100, transactionDate: "2023-01-01" });
    await enqueueTransaction("income", { amountMajor: 200, transactionDate: "2023-01-02" });

    // Simulate crash in syncing state
    await updateTransactionStatus(id1, "syncing");
    
    const syncingBefore = await getTransactionsByStatus("syncing");
    expect(syncingBefore).toHaveLength(1);

    // Call init
    await initializeQueue();

    const syncingAfter = await getTransactionsByStatus("syncing");
    expect(syncingAfter).toHaveLength(0);

    const pendingAfter = await getPendingTransactions();
    expect(pendingAfter).toHaveLength(2); // Both are now pending
  });
  
  it("should maintain multiple queued transactions in order", async () => {
    await enqueueTransaction("expense", { amountMajor: 10, transactionDate: "2023-01-01" });
    await new Promise(r => setTimeout(r, 10)); // Ensure distinct createdAt timestamp
    await enqueueTransaction("expense", { amountMajor: 20, transactionDate: "2023-01-02" });
    await new Promise(r => setTimeout(r, 10));
    await enqueueTransaction("expense", { amountMajor: 30, transactionDate: "2023-01-03" });

    const pending = await getPendingTransactions();
    expect(pending).toHaveLength(3);
    // Ordered by time created in indexedDB
    expect(pending[0].payload.amountMajor).toBe(10);
    expect(pending[2].payload.amountMajor).toBe(30);
  });
});
