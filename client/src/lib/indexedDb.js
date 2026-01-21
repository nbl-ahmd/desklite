import { openDB } from 'idb';

const isBrowser = typeof window !== 'undefined' && typeof indexedDB !== 'undefined';
const DB_NAME = 'desklite-offline';
const DB_VERSION = 1;
const STORE_TRANSACTIONS = 'transactions';

const dbPromise = isBrowser
  ? openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_TRANSACTIONS)) {
          const store = db.createObjectStore(STORE_TRANSACTIONS, {
            keyPath: 'clientRequestId',
          });
          store.createIndex('synced', 'synced');
          store.createIndex('createdAt', 'createdAt');
        }
      },
    })
  : null;

const ensureDate = (value) => value || new Date().toISOString();

// Save a transaction locally with a synced=false flag so the background worker can pick it up later.
export async function saveLocalTransaction(tx) {
  if (!isBrowser) return { ...tx, synced: false };
  const db = await dbPromise;
  const clientRequestId = tx.clientRequestId || crypto.randomUUID();
  const record = {
    ...tx,
    clientRequestId,
    synced: false,
    createdAt: ensureDate(tx.createdAt),
    attempts: tx.attempts || 0,
  };
  await db.put(STORE_TRANSACTIONS, record);
  return record;
}

// Return pending transactions ordered by createdAt so the server processes them in sequence.
export async function listPendingTransactions() {
  if (!isBrowser) return [];
  try {
    const db = await dbPromise;
    // Use getAll and filter instead of getAllFromIndex with boolean key (IDB doesn't support boolean keys well)
    const all = await db.getAll(STORE_TRANSACTIONS);
    const pending = all.filter(tx => tx.synced === false);
    return pending.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  } catch (err) {
    console.error('listPendingTransactions error:', err);
    return [];
  }
}

// Mark specific transactions as synced and optionally prune them.
export async function markTransactionsSynced(clientRequestIds = []) {
  if (!isBrowser || !clientRequestIds.length) return;
  if (!clientRequestIds.length) return;
  const db = await dbPromise;
  const tx = db.transaction(STORE_TRANSACTIONS, 'readwrite');
  const store = tx.objectStore(STORE_TRANSACTIONS);
  for (const id of clientRequestIds) {
    const existing = await store.get(id);
    if (existing) {
      await store.put({ ...existing, synced: true, syncedAt: new Date().toISOString() });
    }
  }
  await tx.done;
}

// Remove already-synced records to keep the DB small.
export async function purgeSynced(maxToDelete = 100) {
  if (!isBrowser) return 0;
  try {
    const db = await dbPromise;
    // Use getAll and filter instead of getAllFromIndex with boolean key
    const all = await db.getAll(STORE_TRANSACTIONS);
    const synced = all.filter(tx => tx.synced === true);
    if (!synced.length) return 0;
    const tx = db.transaction(STORE_TRANSACTIONS, 'readwrite');
    const store = tx.objectStore(STORE_TRANSACTIONS);
    for (const record of synced.slice(0, maxToDelete)) {
      await store.delete(record.clientRequestId);
    }
    await tx.done;
    return Math.min(maxToDelete, synced.length);
  } catch (err) {
    console.error('purgeSynced error:', err);
    return 0;
  }
}

// Bump attempt counter after a failed sync attempt for simple backoff control.
export async function incrementAttempts(clientRequestIds = []) {
  if (!isBrowser || !clientRequestIds.length) return;
  if (!clientRequestIds.length) return;
  const db = await dbPromise;
  const tx = db.transaction(STORE_TRANSACTIONS, 'readwrite');
  const store = tx.objectStore(STORE_TRANSACTIONS);
  for (const id of clientRequestIds) {
    const existing = await store.get(id);
    if (existing) {
      await store.put({ ...existing, attempts: (existing.attempts || 0) + 1 });
    }
  }
  await tx.done;
}

export async function pendingCount() {
  if (!isBrowser) return 0;
  const pending = await listPendingTransactions();
  return pending.length;
}
