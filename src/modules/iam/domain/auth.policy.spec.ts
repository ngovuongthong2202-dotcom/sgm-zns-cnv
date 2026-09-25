import { describe, it, expect } from 'vitest';
import { checkA5Policy } from './auth.policy';

describe('checkA5Policy Unit Tests', () => {
  const userMyLe = {
    uid: 'usr-myle-01',
    username: 'myle',
    displayName: 'Ngô Thị Mỹ Lệ',
    email: 'myle@sgm.vn'
  };

  const userDataMyLe = {
    displayName: 'Ngô Thị Mỹ Lệ',
    username: 'myle',
    role: 'Chuyên viên'
  };

  it('allows user Ngô Thị Mỹ Lệ to edit customer where nguoiPhuTrach is Ngô Thị Mỹ Lệ', () => {
    const customer = {
      id: 'cust-041',
      maKh: 'KH0041',
      tenKhachHang: 'Thương Mại Tôn Long Phát',
      nguoiPhuTrach: 'Ngô Thị Mỹ Lệ'
    };

    const result = checkA5Policy(userMyLe, userDataMyLe, customer);
    expect(result.canEdit).toBe(true);
  });

  it('allows user Ngô Thị Mỹ Lệ to edit customer where createdBy is her uid or displayName', () => {
    const customerWithUid = {
      id: 'cust-041',
      createdBy: 'usr-myle-01',
      nguoiPhuTrach: ''
    };
    expect(checkA5Policy(userMyLe, userDataMyLe, customerWithUid).canEdit).toBe(true);

    const customerWithName = {
      id: 'cust-041',
      createdBy: 'Ngô Thị Mỹ Lệ',
      nguoiPhuTrach: ''
    };
    expect(checkA5Policy(userMyLe, userDataMyLe, customerWithName).canEdit).toBe(true);
  });

  it('allows user with role Administrator or Ban Giám Đốc to edit any customer', () => {
    const adminUser = { uid: 'admin-01', username: 'admin' };
    const adminUserData = { role: 'Administrator' };
    const bgdUserData = { role: 'Ban Giám Đốc' };

    const customer = {
      id: 'cust-041',
      nguoiPhuTrach: 'Người Khác',
      createdBy: 'user-khac'
    };

    expect(checkA5Policy(adminUser, adminUserData, customer).canEdit).toBe(true);
    expect(checkA5Policy(adminUser, bgdUserData, customer).canEdit).toBe(true);
  });

  it('blocks Chuyên viên from editing customer belonging to another user', () => {
    const otherCustomer = {
      id: 'cust-099',
      nguoiPhuTrach: 'Nguyễn Văn B',
      createdBy: 'usr-vanb'
    };

    const result = checkA5Policy(userMyLe, userDataMyLe, otherCustomer);
    expect(result.canEdit).toBe(false);
    expect(result.reason).toContain('Chỉ người tạo (chủ sở hữu)');
  });

  it('allows Chuyên viên to edit unassigned customer', () => {
    const unassignedCustomer = {
      id: 'cust-099'
    };

    const result = checkA5Policy(userMyLe, userDataMyLe, unassignedCustomer);
    expect(result.canEdit).toBe(true);
  });
});
