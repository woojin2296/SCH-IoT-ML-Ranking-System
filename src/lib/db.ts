import DatabaseConstructor from "better-sqlite3";
import type { Database } from "better-sqlite3";
import path from "path";

const dbPath = path.join(process.cwd(), "db", "app.db");

let db: Database | null = null;

export function getDb(): Database {
  if (!db) {
    db = new DatabaseConstructor(dbPath, {
      fileMustExist: true,
    });
  }
  return db;
}
