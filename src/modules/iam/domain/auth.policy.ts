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

/**
 * Vẫn giữ lại checkA5Policy cho các logic đang phụ thuộc vào createdBy nếu cần,
 * nhưng tương lai nên migrate qua can(..., resource)
 */
export function checkA5Policy(
  user: { uid?: string } | null | undefined, 
  userData: { role?: string } | null | undefined, 
  entity: { id?: string, createdBy?: string } | null | undefined
): { canEdit: boolean, reason?: string } {
  if (!entity || !entity.id) return { canEdit: true };
  if (!user || !user.uid) return { canEdit: false, reason: "Chưa đăng nhập" };
  
  if (userData?.role === 'Administrator' || userData?.role === 'Ban Giám Đốc') {
    return { canEdit: true };
  }
  
  if (entity.createdBy === user.uid) {
    return { canEdit: true };
  }
  
  return { canEdit: false, reason: "Chỉ người tạo (chủ sở hữu), Admin hoặc BGĐ mới được chỉnh sửa phiếu này." };
}
