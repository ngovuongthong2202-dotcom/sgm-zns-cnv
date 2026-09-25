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
