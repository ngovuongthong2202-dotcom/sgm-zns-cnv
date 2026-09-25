export type AuthRole = 'Chuyên viên' | 'Ban Giám Đốc' | 'Administrator';

export type ResourceAction = 'view' | 'create' | 'update' | 'delete' | 'send_zns' | 'approve' | 'manage_zns' | 'force_unlock';

export type ResourceType = 
  | 'customer' 
  | 'quotation' 
  | 'contract' 
  | 'payment' 
  | 'delivery' 
  | 'settings' 
  | 'audit' 
  | 'zns_template' 
  | 'dashboard';

/**
 * Ma trận phân quyền theo Role, Action và ResourceType.
 */
export function can(action: ResourceAction, resourceType: ResourceType, role?: string): boolean {
  if (!role) return false;

  const normalizedRole = role as AuthRole;

  // Admin có full quyền
  if (normalizedRole === 'Administrator') return true;

  // Ban Giám Đốc có hầu hết mọi quyền nghiệp vụ
  if (normalizedRole === 'Ban Giám Đốc') {
    if (action === 'manage_zns' || action === 'force_unlock') return false;
    // Với các cấu hình hệ thống: mặc định được xem, trừ trường hợp đặc biệt không cho phép xóa, nhưng ta cứ cho full quyền trừ những cái nguy hiểm nhất nếu muốn mổ xẻ sau. Tuy nhiên tạm thời ở phase này:
    if (['settings', 'audit', 'zns_template'].includes(resourceType)) {
      if (action === 'delete') return false; 
    }
    return true; 
  }

  // Chuyên viên: Giới hạn hơn
  if (normalizedRole === 'Chuyên viên') {
    // Không thao tác màn hình quản trị hệ thống (Chỉ xem Dashboard, v.v., settings/audit/zns cấm hoàn toàn)
    if (['settings', 'audit', 'zns_template'].includes(resourceType)) {
      return false; 
    }
    
    // Nghiệp vụ: view, create, update, send_zns (Được phép)
    // Cấm xóa, Cấm duyệt, Cấm mở khoá, Cấm quản lý ZNS
    if (action === 'delete' || action === 'approve' || action === 'force_unlock' || action === 'manage_zns') {
      return false;
    }
    
    return true; 
  }

  return false;
}

function normalizeAuthString(str?: string | null): string {
  if (!str || typeof str !== 'string') return '';
  return str
    .toLowerCase()
    .replace(/\([^)]*\)/g, '') // Bỏ các hậu tố như (Admin), (Chuyên viên), (Sales), (Phụ trách)...
    .replace(/\[[^\]]*\]/g, '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/\s+/g, ' ');
}

export interface PolicyUser {
  uid?: string;
  id?: string;
  username?: string;
  displayName?: string;
  email?: string;
  role?: string;
}

export interface PolicyUserData {
  id?: string;
  uid?: string;
  role?: string;
  displayName?: string;
  username?: string;
  userName?: string;
  fullName?: string;
  ten?: string;
  email?: string;
}

export interface PolicyEntity {
  id?: string;
  createdBy?: string;
  created_by?: string;
  nguoiTao?: string;
  nguoiPhuTrach?: string;
  userId?: string;
  user_id?: string;
  owner?: string;
}

/**
 * Kiểm tra quyền chỉnh sửa chứng từ / bản ghi:
 * - Admin hoặc Ban Giám Đốc: Full quyền chỉnh sửa.
 * - Người tạo (createdBy, nguoiTao) hoặc Chủ sở hữu / Người phụ trách (nguoiPhuTrach, assignedTo):
 *   Có toàn quyền chỉnh sửa phiếu/hồ sơ của mình.
 * - Khớp theo uid, username, displayName hoặc email (không phân biệt dấu tiếng Việt hay hoa thường).
 * - Bản ghi chưa gán người phụ trách/người tạo: Chuyên viên được phép chỉnh sửa/tiếp nhận.
 */
export function checkA5Policy(
  user: PolicyUser | null | undefined, 
  userData: PolicyUserData | null | undefined, 
  entity: PolicyEntity | null | undefined
): { canEdit: boolean, reason?: string } {
  if (!entity || !entity.id) return { canEdit: true };
  if (!user && !userData) return { canEdit: false, reason: "Chưa đăng nhập" };

  const role = String(userData?.role || user?.role || '').trim();
  const roleNormalized = normalizeAuthString(role);

  if (
    roleNormalized === 'administrator' || 
    roleNormalized === 'admin' || 
    roleNormalized === 'ban giam doc' || 
    roleNormalized === 'bgd' ||
    roleNormalized.includes('admin') ||
    roleNormalized.includes('giam doc')
  ) {
    return { canEdit: true };
  }

  // Thu thập các giá trị định danh của người dùng hiện tại
  const rawUserIdentifiers = [
    user?.uid,
    user?.id,
    user?.username,
    user?.displayName,
    user?.email,
    user?.email?.split('@')[0],
    userData?.id,
    userData?.uid,
    userData?.username,
    userData?.userName,
    userData?.displayName,
    userData?.fullName,
    userData?.ten,
    userData?.email,
    userData?.email?.split('@')[0],
  ].filter((v): v is string => typeof v === 'string' && v.trim().length > 0);

  // Thu thập các trường đại diện cho người tạo / người phụ trách / chủ sở hữu của bản ghi
  const rawEntityOwners = [
    entity.createdBy,
    entity.created_by,
    entity.nguoiTao,
    entity.nguoiPhuTrach,
    entity.userId,
    entity.user_id,
    entity.owner,
  ].filter((v): v is string => typeof v === 'string' && v.trim().length > 0);

  // Nếu bản ghi chưa có người phụ trách hay người tạo (chưa gán chủ sở hữu) -> Cho phép chuyên viên tiếp nhận/chỉnh sửa
  if (rawEntityOwners.length === 0) {
    return { canEdit: true };
  }

  // Chuẩn hóa chuỗi để so sánh
  const normalizedUserIds = rawUserIdentifiers.map(normalizeAuthString).filter(Boolean);
  const normalizedOwners = rawEntityOwners.map(normalizeAuthString).filter(Boolean);

  // 1. Kiểm tra so khớp chính xác sau khi chuẩn hóa họ tên / username / email
  const isExactMatch = normalizedUserIds.some(uId => 
    normalizedOwners.some(eOwner => uId === eOwner)
  );
  if (isExactMatch) {
    return { canEdit: true };
  }

  // 2. Kiểm tra so khớp trực tiếp chuỗi thô (như UID hoặc username chính xác)
  const isRawMatch = rawUserIdentifiers.some(uId => 
    rawEntityOwners.some(eOwner => uId.trim() === eOwner.trim())
  );
  if (isRawMatch) {
    return { canEdit: true };
  }

  // 3. Kiểm tra chứa tên đầy đủ nếu chuỗi đủ độ dài đặc trưng (ví dụ họ tên >= 5 ký tự)
  const isFuzzyMatch = normalizedUserIds.some(uId => 
    normalizedOwners.some(eOwner => {
      if (uId.length >= 5 && eOwner.length >= 5) {
        return uId.includes(eOwner) || eOwner.includes(uId);
      }
      return false;
    })
  );
  if (isFuzzyMatch) {
    return { canEdit: true };
  }

  return { canEdit: false, reason: "Chỉ người tạo (chủ sở hữu), Admin hoặc BGĐ mới được chỉnh sửa phiếu này." };
}
