// Simple SQLite DB reset from schema.sql
// Usage: node scripts/resetDb.js
// - Removes db/app.db if present, recreates it from db/schema.sql

const fs = require("fs");
const path = require("path");
const DatabaseConstructor = require("better-sqlite3");

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function resetDb() {
  const dbDir = path.join(process.cwd(), "db");
  const dbPath = path.join(dbDir, "app.db");
  const schemaPath = path.join(dbDir, "schema.sql");

  ensureDir(dbDir);

  if (fs.existsSync(dbPath)) {
    fs.rmSync(dbPath);
  }
  // Clean up possible leftover WAL/SHM files
  const walPath = `${dbPath}-wal`;
  const shmPath = `${dbPath}-shm`;
  if (fs.existsSync(walPath)) fs.rmSync(walPath);
  if (fs.existsSync(shmPath)) fs.rmSync(shmPath);

  const schema = fs.readFileSync(schemaPath, "utf8");
  const db = new DatabaseConstructor(dbPath);
  db.pragma("journal_mode = WAL");
  db.exec(schema);
  db.close();

  console.log("Database recreated at:", dbPath);
}

resetDb();
