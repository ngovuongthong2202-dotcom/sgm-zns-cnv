export const vi = {
  common: {
    save: 'Lưu',
    cancel: 'Hủy',
    delete: 'Xóa',
    edit: 'Sửa',
    create: 'Tạo mới',
    search: 'Tìm kiếm...',
    loading: 'Đang tải...',
    noData: 'Không có dữ liệu',
    actions: 'Thao tác',
    assignee: 'Người phụ trách',
    unassigned: 'Chưa chia',
    status: 'Trạng thái',
  },
  dataview: {
    grouping: 'Nhóm theo',
    sorting: 'Sắp xếp',
    filtering: 'Bộ lọc',
    viewAs: 'Xem dưới dạng',
    columns: 'Cột hiển thị',
    density: 'Mật độ',
    export: 'Xuất dữ liệu',
    savedViews: 'Chế độ xem',
    saveCurrentView: 'Lưu chế độ xem này',
    aggregates: {
      count: 'Số lượng',
      sum: 'Tổng',
      avg: 'Trung bình',
      min: 'Nhỏ nhất',
      max: 'Lớn nhất',
    }
  },
  empty: {
    noCustomer: 'Chưa có khách hàng',
    noCustomerDesc: 'Thêm khách hàng đầu tiên để bắt đầu theo dõi dữ liệu.',
    noCustomerInfo: 'Chưa có thông tin khách hàng',
    noNotes: 'Chưa có ghi chú nào',
    noQuoteDoc: 'Chưa có tài liệu báo giá được tải lên cho khách hàng này.',
    noProvinceData: 'Chưa có dữ liệu tỉnh/thành',
    noActivity: 'Chưa có hoạt động nào liên quan.',
    noSpecialNotes: 'Chưa có ghi chú vận hành đặc biệt của chuyên viên chăm sóc.',
    noTemplates: 'Chưa có mẫu tin nhắn nào',
    noChatId: 'Chưa có Chat ID nào được cấu hình.',
    noProducts: 'Chưa có sản phẩm nào',
    noUsers: 'Chưa có người dùng nào được tạo.',
    noData: 'Chưa có dữ liệu.',
    noMachineNum: 'Chưa có mã máy',
    noQuoteNum: 'Chưa có số phiếu báo giá',
    noContractNum: 'Chưa có số hợp đồng',
    noPaymentNum: 'Chưa có số mã TT',
    noDeliveryNum: 'Chưa có số phiếu giao',
  },
  missing: {
    contract: 'Chưa có hợp đồng',
    payment: 'Chưa có thanh toán',
    delivery: 'Chưa có giao hàng',
    quote: 'Chưa có báo giá',
    date: 'Chưa có',
    info: 'Chưa có thông tin',
  },
  customer: {
    fields: {
      name: 'Khách hàng',
      representative: 'Người liên hệ',
      address: 'Địa chỉ',
      phone: 'Điện thoại',
      stage: 'Trạng thái KH',
      type: 'Phân loại',
      channel: 'Kênh',
    },
    empty: {
      title: 'Chưa có khách hàng',
      description: 'Thêm khách hàng đầu tiên để bắt đầu theo dõi dữ liệu.',
    }
  },
  contract: {
    title: 'Hợp Đồng',
    meta: 'Quản lý tổng cộng {count} hợp đồng',
    searchPlaceholder: 'Tìm theo số HĐ, tên khách hàng...',
    fields: {
      contractNumber: 'Hợp đồng',
      orderNumber: 'Đơn hàng',
      dateSigned: 'Ngày ký',
      expectedDate: 'DK Hoàn thành',
      machineType: 'Loại máy',
      machineCount: 'Số lượng máy',
      paymentStatus: 'Thanh toán',
      deliveryStatus: 'Giao hàng',
      znsStatus: 'ZNS Hợp đồng',
    },
    groups: {
      customerId: 'Khách hàng',
      nguoiPhuTrach: 'Phụ trách',
      trangThaiGuiTinHopDong: 'Trạng thái ZNS HĐ',
      ngayKyThang: 'Tháng ký HĐ',
    },
    status: {
      unassigned: 'Bảo lưu / Unassigned',
      contractsCount: 'hợp đồng',
      unpaidCount: 'chưa thu đủ',
      undeliveredCount: 'chưa giao đủ',
      filterGroup: 'Lọc nhóm này',
    }
  },
  delivery: {
    fields: {
      deliveryNumber: 'Số phiếu',
      machineInfo: 'Thông tin máy',
      date: 'Ngày giao',
      shipper: 'Người giao',
      znsStatus: 'ZNS Giao hàng',
    }
  },
  payment: {
    fields: {
      paymentNumber: 'Mã TT',
      totalAmount: 'Thanh toán',
      amount: 'Đã trả',
      dueDate: 'Hạn chót / Ngày trả',
      znsStatus: 'ZNS Thanh toán',
    }
  },
  quotation: {
    fields: {
      quoteNumber: 'Báo giá',
      total: 'Tổng tiền',
      validUntil: 'Hiệu lực đến',
      znsStatus: 'ZNS Báo giá'
    }
  },
  settings: {
    title: 'Cấu hình hệ thống',
    subtitle: 'Quản lý các thông số vận hành và tích hợp dịch vụ bên thứ ba',
    searchPlaceholder: 'Tìm nhanh cấu hình hoặc tính năng...',
    saveSuccess: 'Đã lưu cấu hình thành công',
    saveError: 'Lỗi lưu cấu hình',
    saveLocalBtn: 'Lưu cấu hình',
    savingLocalBtn: 'Đang lưu...',
    groups: {
      zns_automation: 'ZNS & Tự động hoá',
      data_integration: 'Dữ liệu & Tích hợp',
      system_admin: 'Cấu hình hệ thống'
    }
  },
  znshub: {
    title: 'ZNS Hub & Logs',
    health_status: {
      good: 'TỐT',
      warning: 'BÌNH THƯỜNG',
      danger: 'NGUY HIỂM'
    },
    rate_limit: 'Tỷ lệ thành công (100 log gần nhất)',
    total_log: 'Tổng số log (100 log gần nhất)',
    dlq_count: 'DLQ / Thất bại',
    tabs: {
      outbox: 'Outbox (Active)',
      dlq: 'Hàng Đợi Lỗi (DLQ)',
      debug: 'Webhook Debug',
      unmapped: 'Unmapped Payload'
    },
    tb: {
      time: 'Thời gian',
      id: 'ID Hệ Thống',
      status: 'Trạng thái',
      target: 'Đối tượng',
      actions: 'Hành động',
      provId: 'ID Nhà cung cấp',
      respCode: 'Mã phản hồi',
      summary: 'Tóm tắt log',
      reason: 'Lý do'
    },
    detail: {
      payloadTitle: 'Chi tiết Payload',
      compiledJson: 'Dữ liệu JSON (Biên dịch)',
      sysErr: 'System Error / Response',
      normal_status: 'Hoạt động ổn định (Không có log ghi chú).',
      btn_retry_single: 'Thử gửi lại (Retry Workflow)',
      copied: 'Đã copy',
      copy: 'Copy'
    }
  },
  audit: {
    title: 'Nhật ký Hoạt động',
    subtitle: 'Theo dõi và kiểm tra toàn bộ lịch sử thay đổi dữ liệu hệ thống',
    last_24h: 'Sự kiện (24h)',
    active_users: 'Người dùng tích cực',
    filter_all: 'Tất cả',
    fields: {
      user: 'Người thực hiện',
      entity_type: 'Phân hệ',
      action: 'Hành động',
      ref_id: 'Đối tượng tham chiếu'
    },
    timeline: {
      searchPlaceholder: 'Tra cứu ID, User, Action, Entity Type...',
      selectLog: 'Chọn một sự kiện để xem chi tiết',
      selectLogDesc: 'Dữ liệu ghi nhận sẽ hiển thị tại đây',
      before: 'TRƯỚC (Before)',
      after: 'SAU (After)',
      compiled_title: 'Dữ liệu ghi nhận (Payload / Diff)'
    }
  }
};

type TranslationsType = typeof vi;

// A safe depth-limited Key extractor
type ValidTypes = string | number | boolean;
type ObjectPaths<T, D extends number = 3> = [D] extends [never] ? never : T extends ValidTypes ? "" : T extends object ?
{[K in keyof T]-?: K extends string | number ?
    `${K}` | (ObjectPaths<T[K], [never, 0, 1, 2][D]> extends infer R ? R extends string ? R extends "" ? never : `${K}.${R}` : never : never)
: never}[keyof T] : never;

export type TranslationKey = ObjectPaths<TranslationsType>;

export function t(namespaceAndKey: TranslationKey | (string & {})): string {
  const parts = namespaceAndKey.split('.');
  let current: unknown = vi; 
  
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return namespaceAndKey;
    }
  }
  
  return typeof current === 'string' ? current : namespaceAndKey;
}
