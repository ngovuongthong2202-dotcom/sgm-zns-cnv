export const ManualPreservePolicy = {
  fieldOwnership: {
    SYSTEM_MANAGED: 'SYSTEM_MANAGED', // e.g., created_at, workflow status
    USER_MANAGED: 'USER_MANAGED',     // e.g., manual notes
    OVERWRITE_IF_EMPTY: 'OVERWRITE_IF_EMPTY', // e.g., autofill customer name
    NEVER_TOUCH: 'NEVER_TOUCH',       // e.g., manual preserve fields after creation
  },
  
  gates: {
    BAOGIA_TO_HOPDONG: {
      requiredStatus: 'Gửi tin thành công', // updated per vendor webhook mapping
      field: 'trangThaiGuiTinBaoGia'
    },
    HOPDONG_TO_THANHTOAN: {
      requiredStatus: 'Gửi tin thành công',
      field: 'trangThaiGuiTinHopDong'
    },
    THANHTOAN_TO_GIAOHANG: {
      requiredStatus: 'Gửi tin thành công',
      field: 'trangThaiGuiTinThanhToan'
    }
  }
};
