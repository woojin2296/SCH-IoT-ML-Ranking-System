import DatabaseConstructor from "better-sqlite3";
import type { Database } from "better-sqlite3";
import path from "path";

const dbPath = path.join(process.cwd(), "db", "app.db");

let db: Database | null = null;
let ensured = false;

export function getDb(): Database {
  if (!db) {
    db = new DatabaseConstructor(dbPath, {
      fileMustExist: true,
    });
  }
  if (!ensured) {
    try {
      const columns = db.prepare("PRAGMA table_info(users)").all() as Array<{ name: string }>;
      const hasEmail = columns.some((c) => c.name === "email");
      if (!hasEmail) {
        db.prepare("ALTER TABLE users ADD COLUMN email TEXT UNIQUE").run();
      }
    } catch (error) {
      console.error("DB ensure failed (users.email)", error);
    } finally {
      ensured = true;
    }
  }
  return db;
}
