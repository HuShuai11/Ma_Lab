import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

type D1Binding = {
  prepare(statement: string): { run(): Promise<unknown> };
};

function discoverD1Binding() {
  for (const value of Object.values(env as unknown as Record<string, unknown>)) {
    if (
      value &&
      typeof value === "object" &&
      "prepare" in value &&
      typeof (value as D1Binding).prepare === "function"
    ) {
      return value as D1Binding;
    }
  }
  return null;
}

function getRawDb() {
  const database = env.DB ?? discoverD1Binding();
  if (!database) {
    throw new Error(
      "Cloudflare D1 binding `DB` is unavailable. Set the `d1` field in .openai/hosting.json to `DB` or let your control plane inject the real binding values before using the database."
    );
  }

  return database;
}

export function getDb() {
  return drizzle(getRawDb(), { schema });
}

// The hosted database can be created after a version is published. This
// idempotent bootstrap makes the first visit usable even before migrations run.
const createStatements = [
  `CREATE TABLE IF NOT EXISTS admin_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    github_id TEXT,
    github_login TEXT NOT NULL,
    username TEXT,
    password_hash TEXT,
    password_salt TEXT,
    display_name TEXT,
    avatar_url TEXT,
    role TEXT DEFAULT 'editor' NOT NULL,
    status TEXT DEFAULT 'active' NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
    last_login_at TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS admin_login_attempts (
    key_hash TEXT PRIMARY KEY NOT NULL,
    attempt_count INTEGER DEFAULT 0 NOT NULL,
    window_started_at TEXT NOT NULL,
    blocked_until TEXT,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS admin_sessions (
    token_hash TEXT PRIMARY KEY NOT NULL,
    admin_user_id INTEGER NOT NULL,
    csrf_token TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
    last_seen_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
    FOREIGN KEY (admin_user_id) REFERENCES admin_users(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS content_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    type TEXT NOT NULL,
    slug TEXT NOT NULL,
    title TEXT NOT NULL,
    payload TEXT DEFAULT '{}' NOT NULL,
    sort_order INTEGER DEFAULT 0 NOT NULL,
    revision INTEGER DEFAULT 1 NOT NULL,
    visibility TEXT DEFAULT 'visible' NOT NULL,
    created_by INTEGER,
    updated_by INTEGER,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at TEXT,
    FOREIGN KEY (created_by) REFERENCES admin_users(id),
    FOREIGN KEY (updated_by) REFERENCES admin_users(id)
  )`,
  `CREATE TABLE IF NOT EXISTS media_assets (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    object_key TEXT NOT NULL,
    filename TEXT NOT NULL,
    content_type TEXT NOT NULL,
    byte_size INTEGER NOT NULL,
    alt_text TEXT DEFAULT '' NOT NULL,
    uploaded_by INTEGER NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
    FOREIGN KEY (uploaded_by) REFERENCES admin_users(id)
  )`,
  `CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    admin_user_id INTEGER NOT NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    before_json TEXT,
    after_json TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
    FOREIGN KEY (admin_user_id) REFERENCES admin_users(id)
  )`,
] as const;

const compatibilityStatements = [
  "ALTER TABLE admin_users ADD COLUMN username TEXT",
  "ALTER TABLE admin_users ADD COLUMN password_hash TEXT",
  "ALTER TABLE admin_users ADD COLUMN password_salt TEXT",
  "ALTER TABLE content_items ADD COLUMN revision INTEGER DEFAULT 1 NOT NULL",
] as const;

const indexStatements = [
  "CREATE UNIQUE INDEX IF NOT EXISTS admin_users_github_login_idx ON admin_users(github_login)",
  "CREATE UNIQUE INDEX IF NOT EXISTS admin_users_github_id_idx ON admin_users(github_id)",
  "CREATE UNIQUE INDEX IF NOT EXISTS admin_users_username_idx ON admin_users(username)",
  "CREATE INDEX IF NOT EXISTS admin_login_attempts_blocked_idx ON admin_login_attempts(blocked_until)",
  "CREATE INDEX IF NOT EXISTS admin_sessions_user_idx ON admin_sessions(admin_user_id)",
  "CREATE INDEX IF NOT EXISTS admin_sessions_expires_idx ON admin_sessions(expires_at)",
  "CREATE UNIQUE INDEX IF NOT EXISTS content_items_type_slug_idx ON content_items(type, slug)",
  "CREATE INDEX IF NOT EXISTS content_items_listing_idx ON content_items(type, visibility, sort_order)",
  "CREATE UNIQUE INDEX IF NOT EXISTS media_assets_object_key_idx ON media_assets(object_key)",
  "CREATE INDEX IF NOT EXISTS audit_logs_entity_idx ON audit_logs(entity_type, entity_id)",
  "CREATE INDEX IF NOT EXISTS audit_logs_created_idx ON audit_logs(created_at)",
] as const;

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message?: unknown }).message ?? "");
  }
  return String(error);
}

function isDuplicateColumnError(error: unknown) {
  const message = errorMessage(error).toLowerCase();
  return message.includes("duplicate column name") || message.includes("already exists");
}

async function initializeDatabaseSchema() {
  const d1 = getRawDb();
  for (const statement of createStatements) {
    await d1.prepare(statement).run();
  }
  for (const statement of compatibilityStatements) {
    try {
      await d1.prepare(statement).run();
    } catch (error) {
      if (!isDuplicateColumnError(error)) throw error;
    }
  }
  for (const statement of indexStatements) {
    await d1.prepare(statement).run();
  }
}

let schemaBootstrap: Promise<void> | null = null;

export function ensureDatabaseSchema() {
  if (!schemaBootstrap) {
    schemaBootstrap = initializeDatabaseSchema().catch((error) => {
      schemaBootstrap = null;
      throw error;
    });
  }
  return schemaBootstrap;
}
