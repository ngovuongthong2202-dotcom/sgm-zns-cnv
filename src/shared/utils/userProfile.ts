/**
 * Format user officer string combining Họ & Tên, Bộ phận / Phòng ban, Vị trí / Chức vụ
 * Example: "Ngô Vương Thông (IT - Administrator)"
 */
export function formatUserOfficer(userData?: any, user?: any): string {
  if (!userData && !user) return '';
  const name = userData?.displayName?.trim() || user?.displayName?.trim() || user?.username?.trim() || 'Admin';
  const dept = userData?.department?.trim() || '';
  const pos = userData?.position?.trim() || '';
  const parts = [dept, pos].filter(Boolean);
  if (parts.length > 0) {
    return `${name} (${parts.join(' - ')})`;
  }
  return name;
}

/**
 * Trích xuất Họ & Tên sạch (loại bỏ phần thông tin phòng ban, chức vụ trong ngoặc đơn)
 * Ví dụ: "Ngô Thị Mỹ Lệ (Kinh Doanh - Nhân Viên)" -> "Ngô Thị Mỹ Lệ"
 *        "Ngô Vương Thông (IT - Administrator)" -> "Ngô Vương Thông"
 *        "admin" -> "admin"
 */
export function extractCleanFullName(officerStr?: string): string {
  if (!officerStr || typeof officerStr !== 'string') return '';
  return officerStr.replace(/\s*\([^)]*\).*$/, '').trim();
}

/**
 * Trích xuất Tên trong Họ & Tên theo chuẩn tiếng Việt
 * Ví dụ: "Ngô Thị Mỹ Lệ" -> "Lệ", "Ngô Vương Thông" -> "Thông"
 */
export function extractGivenName(officerStr?: string): string {
  const clean = extractCleanFullName(officerStr);
  if (!clean) return '';
  const parts = clean.split(/\s+/).filter(Boolean);
  return parts.length > 0 ? parts[parts.length - 1] : '';
}

/**
 * Tạo huy hiệu avatar 2 ký tự viết hoa chuẩn hóa
 * Ví dụ: "Lệ" -> "LỆ", "Thông" -> "TH", "Trang" -> "TR", "admin" -> "AD"
 */
export function extractAvatarBadge(officerStr?: string): string {
  const givenName = extractGivenName(officerStr);
  if (!givenName) return '?';
  if (givenName.length <= 2) return givenName.toUpperCase();
  return givenName.substring(0, 2).toUpperCase();
}

/**
 * Nhận diện quyền Quản trị viên (Administrator, Ban Giám Đốc, Admin)
 */
export function isAdministratorRole(userData?: any, user?: any): boolean {
  const role = String(userData?.role || user?.role || '').trim().toUpperCase();
  return (
    role === 'ADMINISTRATOR' || 
    role === 'BAN GIÁM ĐỐC' || 
    role === 'BAN GIAM DOC' || 
    role === 'ADMIN' || 
    role === 'DEV_OPS' ||
    role === 'SUPER_ADMIN'
  );
}

