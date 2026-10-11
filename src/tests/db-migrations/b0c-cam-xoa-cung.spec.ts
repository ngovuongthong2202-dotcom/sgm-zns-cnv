import { describe, it, expect } from 'vitest';
import { readMigration, parseGrantStatements, parseSchemaTables, statementLines, GROUP_A, GROUP_B, GROUP_C, PUBLIC_ROLES, PROTECTED_ROLES, FUNCTIONS, JWT_PATTERN } from './sql-grants';

const UP = '0001_b0c_cam_xoa_cung_khoa_cong_khai.sql';
const DOWN = '0001_b0c_cam_xoa_cung_khoa_cong_khai.rollback.sql';
const PRE = '0001_b0c_cam_xoa_cung_khoa_cong_khai.precheck.sql';
const up = () => readMigration(UP);
const down = () => readMigration(DOWN);
const tuples = (text: string) => parseGrantStatements(text);
const sameSet = (a: string[], b: string[]) => [...a].sort().join(',') === [...b].sort().join(',');

describe('db/migrations/0001 – B0c: cấm xóa cứng bằng khóa công khai (kiểm thử tĩnh trên tệp SQL)', () => {
  it('nhóm A: mỗi bảng có REVOKE DELETE, TRUNCATE khỏi anon và authenticated; không thu SELECT/INSERT/UPDATE', () => {
    for (const table of GROUP_A) {
      const t = tuples(up()).filter(x => x.verb === 'REVOKE' && x.objectType === 'TABLE' && x.object === table);
      expect(t.length, table).toBe(1);
      expect(sameSet(t[0].privileges, ['DELETE', 'TRUNCATE']), table).toBe(true);
      expect(sameSet(t[0].roles, PUBLIC_ROLES), table).toBe(true);
    }
  });

  it('nhóm B: mỗi bảng có REVOKE INSERT, UPDATE, DELETE, TRUNCATE khỏi anon và authenticated', () => {
    for (const table of GROUP_B) {
      const t = tuples(up()).filter(x => x.verb === 'REVOKE' && x.objectType === 'TABLE' && x.object === table);
      expect(t.length, table).toBe(1);
      expect(sameSet(t[0].privileges, ['INSERT', 'UPDATE', 'DELETE', 'TRUNCATE']), table).toBe(true);
      expect(sameSet(t[0].roles, PUBLIC_ROLES), table).toBe(true);
    }
  });

  it('nhóm C không bao giờ bị nhắc tới trong REVOKE/GRANT; không thu gì khỏi service_role/postgres; không thu SELECT; không REVOKE ALL', () => {
    for (const text of [up(), down()]) {
      for (const t of tuples(text)) {
        expect(GROUP_C, `${t.verb} ${t.object}`).not.toContain(t.object);
        if (t.verb === 'REVOKE') for (const r of t.roles) expect(PROTECTED_ROLES, `${t.verb} ${t.object} ${r}`).not.toContain(r);
        expect(t.privileges, `${t.verb} ${t.object}`).not.toContain('SELECT');
        expect(t.privileges, `${t.verb} ${t.object}`).not.toContain('ALL');
      }
    }
  });

  it('không câu lệnh nào sửa policy, tắt RLS, xóa hay cắt dữ liệu; mọi câu lệnh đều được bộ đọc hiểu (trừ BEGIN/COMMIT)', () => {
    for (const [name, text] of [[UP, up()], [DOWN, down()]] as const) {
      const lines = statementLines(text).map(x => x.line);
      expect(lines[0], name).toBe('BEGIN;');
      expect(lines[lines.length - 1], name).toBe('COMMIT;');
      for (const line of lines) {
        expect(line, name).not.toMatch(/^(DROP POLICY|CREATE POLICY|ALTER POLICY|ALTER TABLE .* DISABLE ROW LEVEL SECURITY|DELETE FROM|TRUNCATE |UPDATE |INSERT INTO|DROP TABLE|ALTER TABLE)/i);
      }
      const parsedLines = new Set(tuples(text).map(t => t.line));
      const unknown = statementLines(text).filter(x => x.line !== 'BEGIN;' && x.line !== 'COMMIT;' && !parsedLines.has(x.no));
      expect(unknown, name).toEqual([]);
    }
  });

  it('A ∪ B ∪ C = đúng tập CREATE TABLE của supabase_schema.sql (23 bảng) — bảng mới chưa phân nhóm làm hỏng kiểm thử này', () => {
    const schemaTables = parseSchemaTables();
    expect(schemaTables.length).toBe(23);
    expect(sameSet([...GROUP_A, ...GROUP_B, ...GROUP_C], schemaTables)).toBe(true);
  });

  it('hàm: EXECUTE thu khỏi PUBLIC, anon, authenticated và cấp cho service_role trên cả hai hàm', () => {
    for (const fn of FUNCTIONS) {
      const revoke = tuples(up()).find(t => t.verb === 'REVOKE' && t.objectType === 'FUNCTION' && t.object === fn);
      const grant = tuples(up()).find(t => t.verb === 'GRANT' && t.objectType === 'FUNCTION' && t.object === fn);
      expect(revoke && sameSet(revoke.roles, ['PUBLIC', 'anon', 'authenticated']), fn).toBe(true);
      expect(grant && sameSet(grant.roles, ['service_role']), fn).toBe(true);
    }
  });

  it('tệp hoàn tác GRANT đúng bộ ngược của mọi REVOKE bảng (cùng quyền, bảng, vai), hàm trả EXECUTE về PUBLIC; không GRANT gì khác', () => {
    const revokes = tuples(up()).filter(t => t.verb === 'REVOKE' && t.objectType === 'TABLE');
    const grants = tuples(down()).filter(t => t.verb === 'GRANT' && t.objectType === 'TABLE');
    expect(grants.length).toBe(revokes.length);
    for (const r of revokes) {
      const g = grants.find(x => x.object === r.object);
      expect(g && sameSet(g.privileges, r.privileges) && sameSet(g.roles, r.roles), r.object).toBe(true);
    }
    for (const fn of FUNCTIONS) {
      const g = tuples(down()).find(t => t.verb === 'GRANT' && t.objectType === 'FUNCTION' && t.object === fn);
      expect(g && sameSet(g.roles, ['PUBLIC']), fn).toBe(true);
    }
    expect(tuples(down()).filter(t => t.verb === 'REVOKE')).toEqual([]);
  });

  it('tệp chạy không GRANT gì cho anon/authenticated/PUBLIC (chỉ GRANT EXECUTE cho service_role)', () => {
    for (const t of tuples(up()).filter(x => x.verb === 'GRANT')) {
      expect(t.objectType).toBe('FUNCTION');
      expect(t.roles).toEqual(['service_role']);
    }
  });

  it('cả ba tệp dùng LF, không chứa URL supabase.co hay chuỗi JWT; tệp chạy nhúng truy vấn kiểm chứng và danh sách 23 bảng đã soạn theo', () => {
    for (const name of [UP, DOWN, PRE]) {
      const text = readMigration(name);
      expect(text, name).not.toMatch(/\r\n/);
      expect(text, name).not.toMatch(/supabase\.co/);
      expect(text, name).not.toMatch(JWT_PATTERN);
    }
    expect(up()).toMatch(/-- KIỂM CHỨNG:/);
    expect(up()).toMatch(/information_schema\.role_table_grants/);
    expect(up()).toMatch(/soạn theo 23 bảng/i); // tiêu đề tệp viết "Soạn theo…" (chữ S hoa)
    expect(readMigration(PRE)).toMatch(/information_schema\.tables/);
    expect(statementLines(readMigration(PRE)).every(x => /^(select|with)\b/i.test(x.line) || /^(and|or|where|from|group|order|union|\)|\()/i.test(x.line) || /^[a-z0-9_'" ,().=<>;-]+$/i.test(x.line))).toBe(true); // dòng nối tiếp có ";" và chữ số (has_function_privilege … as anon_quota;)
  });
});
