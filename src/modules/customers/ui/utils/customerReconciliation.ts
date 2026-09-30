import { Customer } from '@/src/domain/schema/customer.schema';
import { classifyErpCustomer } from '@/src/modules/sales/ui/utils/erpCustomerClassifier';

export interface CustomerReconciliationSuggestion {
  needsReconciliation: boolean;
  reason: string;
  originalCustomer: Partial<Customer>;
  suggestedCustomer: Partial<Customer>;
}

/**
 * Phát hiện và đề xuất chuẩn hóa khách hàng bị phân loại sai (như khách hàng cá nhân bị gán nhãn Doanh nghiệp)
 */
export function detectMisclassifiedCustomer(customer: Partial<Customer>): CustomerReconciliationSuggestion {
  const currentLoaiKh = customer.loaiKh || 'Doanh nghiệp';
  const currentLoaiHinh = customer.loaiHinhDoanhNghiep || '';
  const name = customer.tenKhachHang || '';
  const tax = customer.maSoThue || '';
  const rep = customer.nguoiDaiDien || '';
  const phone = customer.sdt || '';

  // Chạy qua động cơ phân định đa nhân tố
  const classification = classifyErpCustomer(name, tax, rep, phone);

  // Nếu hiện tại là Doanh nghiệp nhưng thực chất là Cá nhân (như "Anh Phạm Trung Đức" KH0345)
  if (currentLoaiKh === 'Doanh nghiệp' && classification.detectedType === 'Cá nhân') {
    return {
      needsReconciliation: true,
      reason: `Khách hàng có tên cá nhân "${name}" đang bị gắn nhầm nhãn Doanh nghiệp`,
      originalCustomer: customer,
      suggestedCustomer: {
        loaiKh: 'Cá nhân',
        loaiHinhDoanhNghiep: 'CÁ NHÂN',
        tenKhachHang: classification.cleanCustomerName,
        nguoiDaiDien: customer.nguoiDaiDien || classification.cleanCustomerName,
        tenZns: classification.cleanCustomerName.slice(0, 29),
        tenThuongMai: classification.cleanCustomerName
      }
    };
  }

  // Nếu hiện tại là Cá nhân nhưng có MST doanh nghiệp hoặc từ khóa công ty
  if (currentLoaiKh === 'Cá nhân' && classification.detectedType === 'Doanh nghiệp') {
    return {
      needsReconciliation: true,
      reason: `Khách hàng có thông tin pháp nhân "${name}" đang bị gán nhãn Cá nhân`,
      originalCustomer: customer,
      suggestedCustomer: {
        loaiKh: 'Doanh nghiệp',
        loaiHinhDoanhNghiep: classification.loaiHinhDoanhNghiep || 'CÔNG TY TNHH',
        tenKhachHang: classification.cleanCustomerName,
        tenPhapLy: classification.cleanCustomerName,
        tenZns: classification.tenZns,
        tenThuongMai: classification.tenThuongMai
      }
    };
  }

  return {
    needsReconciliation: false,
    reason: 'Hồ sơ đã phân loại chuẩn xác',
    originalCustomer: customer,
    suggestedCustomer: {}
  };
}
