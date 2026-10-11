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
    // precheck chỉ đọc: bỏ chuỗi trong dấu nháy đơn (vd tên quyền 'EXECUTE', tên hàm trong has_function_privilege), rồi không dòng câu lệnh nào được chứa từ khóa ghi/DDL/giao dịch như một từ nguyên vẹn
    const preLines = statementLines(readMigration(PRE)).map(x => x.line).join('\n').replace(/'[^']*'/g, "''").split('\n');
    const writeWord = /\b(insert|update|delete|truncate|drop|alter|create|grant|revoke|begin|commit|rollback|set|reset|do|call|copy|vacuum|lock|into|execute|refresh|abort)\b/i;
    expect(preLines.filter(l => writeWord.test(l))).toEqual([]);
    // end/start chỉ bị bắt khi mở đầu một dòng câu lệnh (CASE … END giữa dòng là truy vấn đọc hợp lệ)
    expect(preLines.filter(l => /^(end|start)\b/i.test(l))).toEqual([]);
    // không gọi hàm có tác dụng phụ (hàm dọn dẹp/hạn mức của máy chủ, đổi bộ đếm, đổi cấu hình phiên); tên hàm nằm trong chuỗi của has_function_privilege đã bị bỏ ở trên
    expect(preLines.filter(l => /\b(cleanup_expired_system_data|decrement_zns_quota|setval|set_config|nextval)\s*\(/i.test(l))).toEqual([]);
  });
});

describe('db/migrations/0002 – dọn zns_config lồng (ZNS05) và README', () => {
  const UP2 = '0002_don_zns_config_long.sql';
  const DOWN2 = '0002_don_zns_config_long.rollback.sql';

  it('tệp chạy: BEGIN/COMMIT, LF, không bí mật; ghi bản sao zns_config__bak_0002 TRƯỚC khi UPDATE; chỉ sửa dòng zns_config', () => {
    const text = readMigration(UP2);
    const lines = statementLines(text).map(x => x.line);
    expect(text).not.toMatch(/\r\n/);
    expect(text).not.toMatch(JWT_PATTERN);
    expect(lines[0]).toBe('BEGIN;');
    expect(lines[lines.length - 1]).toBe('COMMIT;');
    const joined = lines.join('\n');
    const backupAt = joined.indexOf("'zns_config__bak_0002'");
    const updateAt = joined.search(/UPDATE public\.settings/i);
    expect(backupAt).toBeGreaterThan(-1);
    expect(updateAt).toBeGreaterThan(backupAt);
    expect(joined).toMatch(/data - 'data' - 'id' - 'updated_at' - 'success'/);
    expect(joined.match(/WHERE id = 'zns_config'/g)?.length).toBeGreaterThanOrEqual(2);
    expect(joined).not.toMatch(/DELETE FROM|TRUNCATE|DROP /i);
    // chạy lại không ghi đè bản sao lưu đầu tiên (nguồn hoàn tác của tệp hoàn tác): chỉ DO NOTHING, không bao giờ DO UPDATE
    expect(joined).toMatch(/ON CONFLICT \(id\) DO NOTHING;/);
    expect(joined).not.toMatch(/DO UPDATE/i);
    // đúng một câu UPDATE và câu đó kết thúc bằng WHERE id = 'zns_config'; (không thể lan sang dòng khác của settings)
    expect(joined.match(/\bUPDATE\b/gi)?.length).toBe(1);
    expect((joined.match(/UPDATE public\.settings[^;]*;/i)?.[0] ?? '').endsWith("WHERE id = 'zns_config';")).toBe(true);
  });

  it('tệp hoàn tác hợp nhất data sao lưu với zns_config (khóa hiện có thắng, mã Zalo mới không bị ghi đè); BEGIN/COMMIT; chỉ nhắm zns_config; không xóa dòng nào', () => {
    const text = readMigration(DOWN2);
    const lines = statementLines(text).map(x => x.line);
    const joined = lines.join('\n');
    expect(lines[0]).toBe('BEGIN;');
    expect(lines[lines.length - 1]).toBe('COMMIT;');
    expect(joined).toMatch(/UPDATE public\.settings/i);
    expect(joined).toMatch(/'zns_config__bak_0002'/);
    expect(joined).toContain("s.id = 'zns_config'");
    expect(joined).toContain("b.id = 'zns_config__bak_0002'");
    // b.data || s.data: khóa đang có trong zns_config (mã Zalo mới, chỉnh sửa sau 0002) nằm bên phải nên thắng; chỉ các khóa 0002 đã bỏ được đưa lại. KHÔNG được là SET data = b.data
    expect(joined).toMatch(/SET data = b\.data \|\| s\.data/);
    expect(joined).not.toMatch(/DELETE FROM|TRUNCATE|DROP /i);
    expect(text).not.toMatch(/\r\n/);
  });

  it('README: có thứ tự chạy, sao lưu trước, precheck chỉ đọc, kiểm bằng set local role trong giao dịch tự hoàn tác và curl.exe với chỗ giữ, mã 401, hoàn tác; không có khóa thật', () => {
    const readme = readMigration('README.md');
    for (const must of ['Sao lưu', 'precheck', 'set local role anon', '<KHÓA_ANON>', 'rollback', '0001_b0c_cam_xoa_cung_khoa_cong_khai.sql', '0002_don_zns_config_long.sql', 'HT02']) {
      expect(readme, must).toContain(must);
    }
    // các chỗ đã sửa sau rà soát: lệnh thử có ghi nằm trong giao dịch tự hoàn tác (không còn "set role anon" trần), curl.exe (PowerShell có lệnh curl khác), khóa công khai bị từ chối trả mã 401 chứ không phải 403 (curl.exe của Windows in dòng HTTP/1.1, bản khác in HTTP/2), đổi tên (thay vì xóa) dòng sao lưu
    for (const must of ['begin; set local role anon;', 'curl.exe', 'HTTP/1.1 401 Unauthorized', 'HTTP/1.1 200 OK', 'zns_config__bak_0002_cu']) {
      expect(readme, must).toContain(must);
    }
    expect(readme).toMatch(/\b401\b[^\n]*"code":"42501"/);
    expect(readme).not.toContain('set role anon');
    expect(readme).not.toMatch(/HTTP\/(?:2|1\.1) 403/);
    expect(readme).not.toMatch(/\bcurl\s+-/);
    // an toàn khi chạy thật: dòng thử KHÔNG bị từ chối cũng hiện "Success…" (giống kết quả tốt ở chỗ khác) nên phải được nói rõ; và không bao giờ bảo người dùng tự khôi phục cả cơ sở dữ liệu
    expect(readme).toContain('0001 chưa có hiệu lực');
    expect(readme).toContain('không tự khôi phục cả cơ sở dữ liệu');
    expect(readme).not.toMatch(JWT_PATTERN);
    expect(readme).not.toMatch(/https:\/\/[a-z0-9]{20}\.supabase\.co/);
    expect((readme.match(/[^\s"/]*\.supabase\.co/g) ?? []).every(host => host === '<project-ref>.supabase.co')).toBe(true);
  });
});
