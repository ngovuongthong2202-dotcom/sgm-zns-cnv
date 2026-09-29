/**
 * Official Corporate Credentials & Identity for SGM (Saigon Machine)
 * CÔNG TY TNHH CƠ KHÍ CÔNG NGHIỆP SÀI GÒN
 */

export interface CompanyInfo {
  name: string;
  shortName: string;
  brandName: string;
  legalRepresentative: string;
  position: string;
  taxCode: string;
  address: string;
  factoryAddress: string;
  hotline: string;
  phone: string;
  email: string;
  website: string;
  bankAccount: {
    accountNumber: string;
    bankName: string;
    branch: string;
    accountHolder: string;
  };
  logoUrl: string;
  warrantyStandardMonths: number;
}

export const SGM_COMPANY_INFO: CompanyInfo = {
  name: 'CÔNG TY TNHH CƠ KHÍ CÔNG NGHIỆP SÀI GÒN',
  shortName: 'SGM CO., LTD',
  brandName: 'SAIGON MACHINE (SGM)',
  legalRepresentative: 'Ngô Vương Thông',
  position: 'Tổng Giám Đốc',
  taxCode: '0302636521',
  address: 'Lô 12A Đường số 09, KCN Tân Tạo, Phường Tân Tạo, Quận Bình Tân, TP. Hồ Chí Minh',
  factoryAddress: 'Lô 12A Đường số 09, KCN Tân Tạo, Phường Tân Tạo, Quận Bình Tân, TP. Hồ Chí Minh',
  hotline: '1900 6067',
  phone: '028 3754 5678',
  email: 'contact@sgm.vn',
  website: 'www.sgm.vn',
  bankAccount: {
    accountNumber: '0302636521001',
    bankName: 'Ngân hàng TMCP Ngoại Thương Việt Nam (Vietcombank)',
    branch: 'Chi nhánh Tây Sài Gòn - TP.HCM',
    accountHolder: 'CONG TY TNHH CO KHI CONG NGHIEP SAI GON'
  },
  logoUrl: '/sgm-logo.png',
  warrantyStandardMonths: 12
};
