import * as SQLite from 'expo-sqlite';
import { Transaction } from '../models/transaction';

const DB_NAME = 'inkomi.db';

export class DatabaseService {
  static async initDb(): Promise<void> {
    const db = await SQLite.openDatabaseAsync(DB_NAME);
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
    const db = await SQLite.openDatabaseAsync(DB_NAME);
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
    const db = await SQLite.openDatabaseAsync(DB_NAME);
    await db.runAsync(
      'INSERT OR REPLACE INTO transactions (id, timestamp, status, data) VALUES (?, ?, ?, ?)',
      [tran.id, tran.timestamp, tran.status, JSON.stringify(tran)]
    );
  }

  static async saveTransactions(trans: Transaction[]): Promise<void> {
    const db = await SQLite.openDatabaseAsync(DB_NAME);

    // Begin transaction for bulk insert
    await db.execAsync('BEGIN TRANSACTION;');
    try {
      const statement = await db.prepareAsync(
        'INSERT OR REPLACE INTO transactions (id, timestamp, status, data) VALUES (?, ?, ?, ?)'
      );

      for (const tran of trans) {
        await statement.executeAsync([tran.id, tran.timestamp, tran.status, JSON.stringify(tran)]);
      }

      await statement.finalizeAsync();
      await db.execAsync('COMMIT;');
    } catch (e) {
      await db.execAsync('ROLLBACK;');
      throw e;
    }
  }

  static async deleteTransaction(id: string): Promise<void> {
    const db = await SQLite.openDatabaseAsync(DB_NAME);
    await db.runAsync('DELETE FROM transactions WHERE id = ?', [id]);
  }
}
