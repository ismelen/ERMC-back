import * as SQLite from 'expo-sqlite';
import { Transaction } from '../models/transaction';

const DB_NAME = 'inkomi.db';
let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync(DB_NAME);
  }
  return dbPromise;
}

export class DatabaseService {
  static async initDb(): Promise<void> {
    const db = await getDb();
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        timestamp INTEGER,
        status TEXT,
        data TEXT
      );
    `);
  }

  static async getTransactions(
    limit: number,
    cursor?: { timestamp: number; id: string }
  ): Promise<Transaction[]> {
    const db = await getDb();
    let query = 'SELECT data FROM transactions ORDER BY timestamp DESC, id DESC LIMIT ?';
    let params: any[] = [limit];

    if (cursor) {
      query =
        'SELECT data FROM transactions WHERE timestamp < ? OR (timestamp = ? AND id < ?) ORDER BY timestamp DESC, id DESC LIMIT ?';
      params = [cursor.timestamp, cursor.timestamp, cursor.id, limit];
    }

    const result = await db.getAllAsync<{ data: string }>(query, params);

    return result.map((row) => JSON.parse(row.data) as Transaction);
  }

  static async saveTransaction(tran: Transaction): Promise<void> {
    const db = await getDb();
    await db.runAsync(
      'INSERT OR REPLACE INTO transactions (id, timestamp, status, data) VALUES (?, ?, ?, ?)',
      [tran.id, tran.timestamp, tran.status, JSON.stringify(tran)]
    );
  }

  static async saveTransactions(trans: Transaction[]): Promise<void> {
    const db = await getDb();

    await db.withExclusiveTransactionAsync(async (txn) => {
      const statement = await txn.prepareAsync(
        'INSERT OR REPLACE INTO transactions (id, timestamp, status, data) VALUES (?, ?, ?, ?)'
      );

      try {
        for (const tran of trans) {
          await statement.executeAsync([
            tran.id,
            tran.timestamp,
            tran.status,
            JSON.stringify(tran),
          ]);
        }
      } finally {
        await statement.finalizeAsync();
      }
    });
  }

  static async deleteTransaction(id: string): Promise<void> {
    const db = await getDb();
    await db.runAsync('DELETE FROM transactions WHERE id = ?', [id]);
  }
}
