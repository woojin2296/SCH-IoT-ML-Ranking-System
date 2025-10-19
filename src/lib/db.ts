import DatabaseConstructor from "better-sqlite3";
import type { Database } from "better-sqlite3";
import path from "path";

const dbPath = path.join(process.cwd(), "db", "app.db");

// Create a singleton database connection for reuse across requests.
let db: Database | null = null;

export function getDb(): Database {
  if (!db) {
    db = new DatabaseConstructor(dbPath, {
      fileMustExist: true,
    });
  }

  return db;
}
