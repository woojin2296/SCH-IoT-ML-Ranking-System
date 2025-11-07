PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_number TEXT NOT NULL UNIQUE,
  email TEXT UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT,
  public_id TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'user',
  semester INTEGER NOT NULL DEFAULT 2025,
  last_login_at DATETIME,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER IF NOT EXISTS users_updated_at_trigger
AFTER UPDATE ON users
BEGIN
  UPDATE users
  SET updated_at = CURRENT_TIMESTAMP
  WHERE id = NEW.id;
END;

CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  session_token TEXT NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);

CREATE TABLE IF NOT EXISTS evaluation_scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  project_number INTEGER NOT NULL CHECK(project_number BETWEEN 1 AND 4),
  score REAL NOT NULL,
  file_path TEXT,
  file_name TEXT,
  file_type TEXT,
  file_size INTEGER,
  evaluated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_evaluation_scores_user_id ON evaluation_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_evaluation_scores_project_score ON evaluation_scores(project_number, score DESC);
CREATE INDEX IF NOT EXISTS idx_evaluation_scores_evaluated_at ON evaluation_scores(evaluated_at);

CREATE TRIGGER IF NOT EXISTS evaluation_scores_updated_at_trigger
AFTER UPDATE ON evaluation_scores
BEGIN
  UPDATE evaluation_scores
  SET updated_at = CURRENT_TIMESTAMP
  WHERE id = NEW.id;
END;

CREATE TABLE IF NOT EXISTS request_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT NOT NULL,
  path TEXT NOT NULL,
  method TEXT NOT NULL,
  status INTEGER,
  ip_address TEXT,
  metadata TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_request_logs_created_at ON request_logs(created_at);

CREATE TABLE IF NOT EXISTS evaluation_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_user_id INTEGER,
  action TEXT NOT NULL CHECK(action IN ('create', 'delete')),
  score_id INTEGER,
  target_user_id INTEGER,
  project_number INTEGER,
  score REAL,
  payload TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (target_user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_evaluation_logs_actor ON evaluation_logs(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_evaluation_logs_target ON evaluation_logs(target_user_id);

CREATE TABLE IF NOT EXISTS notices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  message TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER IF NOT EXISTS notices_updated_at_trigger
AFTER UPDATE ON notices
BEGIN
  UPDATE notices
  SET updated_at = CURRENT_TIMESTAMP
  WHERE id = NEW.id;
END;

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER IF NOT EXISTS app_settings_updated_at_trigger
AFTER UPDATE ON app_settings
BEGIN
  UPDATE app_settings
  SET updated_at = CURRENT_TIMESTAMP
  WHERE key = NEW.key;
END;
