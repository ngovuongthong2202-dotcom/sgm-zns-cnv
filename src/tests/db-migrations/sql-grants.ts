import fs from 'node:fs';
import path from 'node:path';

export const ROOT = path.resolve(__dirname, '..', '..', '..');
export const MIGRATIONS_DIR = path.join(ROOT, 'db', 'migrations');

export type GrantVerb = 'REVOKE' | 'GRANT';
export interface GrantTuple {
  verb: GrantVerb;
  privileges: string[];
  objectType: 'TABLE' | 'FUNCTION';
  object: string;
  roles: string[];
  line: number;
}

// Quy ước viết SQL của db/migrations: một câu lệnh một dòng, dạng chuẩn dưới đây, để kiểm thử tĩnh đọc được.
const TABLE_STMT = /^(REVOKE|GRANT)\s+([A-Z]+(?:,\s*[A-Z]+)*)\s+ON\s+TABLE\s+public\.([a-z_]+)\s+(?:FROM|TO)\s+([A-Za-z_]+(?:,\s*[A-Za-z_]+)*);$/;
const FUNCTION_STMT = /^(REVOKE|GRANT)\s+EXECUTE\s+ON\s+FUNCTION\s+public\.([a-z_]+\([a-z, ]*\))\s+(?:FROM|TO)\s+([A-Za-z_]+(?:,\s*[A-Za-z_]+)*);$/;

export function readMigration(file: string): string {
  return fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
}

export function statementLines(text: string): Array<{ line: string; no: number }> {
  return text.split('\n').map((raw, i) => ({ line: raw.replace(/\r$/, '').trim(), no: i + 1 })).filter(({ line }) => line && !line.startsWith('--'));
}

export function parseGrantStatements(text: string): GrantTuple[] {
  const out: GrantTuple[] = [];
  for (const { line, no } of statementLines(text)) {
    const t = TABLE_STMT.exec(line);
    if (t) {
      out.push({ verb: t[1] as GrantVerb, privileges: t[2].split(',').map(s => s.trim()), objectType: 'TABLE', object: t[3], roles: t[4].split(',').map(s => s.trim()), line: no });
      continue;
    }
    const f = FUNCTION_STMT.exec(line);
    if (f) {
      out.push({ verb: f[1] as GrantVerb, privileges: ['EXECUTE'], objectType: 'FUNCTION', object: f[2], roles: f[3].split(',').map(s => s.trim()), line: no });
    }
  }
  return out;
}

export function parseSchemaTables(): string[] {
  const schema = fs.readFileSync(path.join(ROOT, 'supabase_schema.sql'), 'utf8');
  return [...schema.matchAll(/CREATE TABLE IF NOT EXISTS\s+([a-z_]+)/g)].map(m => m[1]);
}

export const GROUP_A = ['customers', 'quotations', 'contracts', 'payments', 'deliveries', 'audit_logs'];
export const GROUP_B = ['zns_messages', 'counters', 'zns_callbacks', 'zns_dead_letters', 'workflow_events', 'telegram_sent_log', 'job_heartbeats', 'system_locks', 'idempotency_keys', 'metrics_rollup', 'cross_entity_sync_jobs'];
export const GROUP_C = ['users', 'settings', 'zns_templates', 'notifications', 'drafts', 'presence'];
export const PUBLIC_ROLES = ['anon', 'authenticated'];
export const PROTECTED_ROLES = ['service_role', 'postgres', 'supabase_admin', 'supabase_auth_admin', 'dashboard_user'];
export const FUNCTIONS = ['cleanup_expired_system_data()', 'decrement_zns_quota(integer)'];
export const JWT_PATTERN = /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}/;
