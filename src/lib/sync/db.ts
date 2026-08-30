export type OfflineTransactionType = 'expense' | 'income' | 'transfer';
export type OfflineSyncStatus = 'pending' | 'syncing' | 'error' | 'synced';

export interface OfflineTransactionPayload {
  amountMajor: number;
  transactionDate: string;
  description?: string;
  // For expense/income:
  accountId?: string;
  categoryId?: string;
  // For transfer:
  sourceAccountId?: string;
  destAccountId?: string;
}

export interface OfflineTransaction {
  id: string; // clientTransactionId (UUID)
  type: OfflineTransactionType;
  payload: OfflineTransactionPayload;
  status: OfflineSyncStatus;
  errorMsg?: string;
  createdAt: number;
}

const DB_NAME = 'veltis_sync_db';
const DB_VERSION = 1;
const STORE_NAME = 'transactions';

function getDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    // Check if indexedDB is available (useful for SSR context)
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB not supported in this environment'));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);

    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('status', 'status', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };
  });
}

export async function enqueueTransaction(
  type: OfflineTransactionType,
  payload: OfflineTransactionPayload
): Promise<string> {
  const id = crypto.randomUUID();
  const db = await getDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    const transaction: OfflineTransaction = {
      id,
      type,
      payload,
      status: 'pending',
      createdAt: Date.now(),
    };

    const request = store.add(transaction);

    request.onsuccess = () => resolve(id);
    request.onerror = () => reject(request.error);
    
    // Always close db connection after tx completes
    tx.oncomplete = () => db.close();
  });
}

export async function getPendingTransactions(): Promise<OfflineTransaction[]> {
  const db = await getDB();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const store = tx.objectStore(STORE_NAME);
  const index = store.index('createdAt');
  
  return new Promise((resolve, reject) => {
    const request = index.getAll();
    request.onsuccess = () => {
      const result = (request.result as OfflineTransaction[]).filter(item => item.status === 'pending');
      resolve(result);
    };
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
  });
}

export async function updateTransactionStatus(
  id: string,
  status: OfflineSyncStatus,
  errorMsg?: string
): Promise<void> {
  const db = await getDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(id);

    request.onsuccess = () => {
      const record = request.result as OfflineTransaction | undefined;
      if (!record) {
        reject(new Error(`Transaction ${id} not found`));
        return;
      }

      record.status = status;
      if (errorMsg !== undefined) {
        record.errorMsg = errorMsg;
      }

      const updateRequest = store.put(record);
      updateRequest.onsuccess = () => resolve();
      updateRequest.onerror = () => reject(updateRequest.error);
    };

    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
  });
}

export async function removeTransaction(id: string): Promise<void> {
  const db = await getDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    
    tx.oncomplete = () => db.close();
  });
}

export async function getTransactionsByStatus(status: OfflineSyncStatus): Promise<OfflineTransaction[]> {
    const db = await getDB();
  
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const index = store.index('status');
      const request = index.getAll(status);
  
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      
      tx.oncomplete = () => db.close();
    });
}

// Called on app startup to revert any 'syncing' transactions back to 'pending'
export async function initializeQueue(): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const index = store.index('status');
      const request = index.getAll('syncing');

      request.onsuccess = () => {
        const syncingRecords = request.result as OfflineTransaction[];
        if (syncingRecords.length === 0) {
            db.close();
            return resolve();
        }

        let completed = 0;
        let hasError = false;

        for (const record of syncingRecords) {
          record.status = 'pending';
          const updateRequest = store.put(record);
          updateRequest.onerror = () => {
            if (!hasError) {
              hasError = true;
              reject(updateRequest.error);
            }
          };
          updateRequest.onsuccess = () => {
            completed++;
            if (completed === syncingRecords.length && !hasError) {
               resolve();
            }
          };
        }
      };

      request.onerror = () => reject(request.error);
      tx.oncomplete = () => db.close();
    });
  } catch (e) {
    // If SSR or indexedDB not available, silently return
    return;
  }
}

export async function clearQueue(): Promise<void> {
  const db = await getDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    
    tx.oncomplete = () => db.close();
  });
}
