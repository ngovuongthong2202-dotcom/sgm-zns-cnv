/**
 * VietQR Banking Integration Service
 * Tích hợp API Danh sách ngân hàng (v2/banks) và API Tra cứu số tài khoản (v2/lookup)
 * Cung cấp giải pháp lưu trữ cấu hình ngân hàng chính thức của Saigon Machine (SGM)
 */

import { settingsRepo } from '@/src/data/repositories/settings.repo';
import { logger } from '@/src/shared/lib/logger';
import { SGM_COMPANY_INFO } from '@/src/shared/constants/companyInfo';

export interface VietQRBank {
  id: number;
  name: string;
  code: string;
  bin: string;
  shortName: string;
  logo: string;
  transferSupported?: number;
  lookupSupported?: number;
  swift_code?: string;
}

export interface VietQRBankListResponse {
  code: string;
  desc: string;
  data: VietQRBank[];
}

export interface VietQRLookupResponse {
  code: string;
  desc: string;
  data?: {
    accountName?: string;
    ownerName?: string;
  };
}

export interface CompanyBankingConfig {
  bankBin: string;
  bankCode: string;
  bankName: string;
  bankShortName: string;
  bankLogo?: string;
  accountNumber: string;
  accountHolder: string;
  branch: string;
  defaultTransferSyntaxTemplate?: string;
  vietqrClientId?: string;
  vietqrApiKey?: string;
  isDefault?: boolean;
  updatedAt?: string;
}

export const FALLBACK_VIETNAM_BANKS: VietQRBank[] = [
  {
    id: 43,
    name: 'Ngân hàng TMCP Ngoại Thương Việt Nam',
    code: 'VCB',
    bin: '970436',
    shortName: 'Vietcombank',
    logo: 'https://cdn.vietqr.io/img/VCB.png',
    transferSupported: 1,
    lookupSupported: 1,
    swift_code: 'BFTVVNVX',
  },
  {
    id: 17,
    name: 'Ngân hàng TMCP Công thương Việt Nam',
    code: 'ICB',
    bin: '970415',
    shortName: 'VietinBank',
    logo: 'https://cdn.vietqr.io/img/ICB.png',
    transferSupported: 1,
    lookupSupported: 1,
    swift_code: 'ICBVVNVX',
  },
  {
    id: 4,
    name: 'Ngân hàng TMCP Đầu tư và Phát triển Việt Nam',
    code: 'BIDV',
    bin: '970418',
    shortName: 'BIDV',
    logo: 'https://cdn.vietqr.io/img/BIDV.png',
    transferSupported: 1,
    lookupSupported: 1,
    swift_code: 'BIDVVNVX',
  },
  {
    id: 2,
    name: 'Ngân hàng Nông nghiệp và Phát triển Nông thôn Việt Nam',
    code: 'VBA',
    bin: '970405',
    shortName: 'Agribank',
    logo: 'https://cdn.vietqr.io/img/VBA.png',
    transferSupported: 1,
    lookupSupported: 1,
    swift_code: 'VBAAVNVX',
  },
  {
    id: 38,
    name: 'Ngân hàng TMCP Kỹ thương Việt Nam',
    code: 'TCB',
    bin: '970407',
    shortName: 'Techcombank',
    logo: 'https://cdn.vietqr.io/img/TCB.png',
    transferSupported: 1,
    lookupSupported: 1,
    swift_code: 'VTCBVNVX',
  },
  {
    id: 26,
    name: 'Ngân hàng TMCP Quân đội',
    code: 'MB',
    bin: '970422',
    shortName: 'MBBank',
    logo: 'https://cdn.vietqr.io/img/MB.png',
    transferSupported: 1,
    lookupSupported: 1,
    swift_code: 'MSBVVNVX',
  },
  {
    id: 1,
    name: 'Ngân hàng TMCP Á Châu',
    code: 'ACB',
    bin: '970416',
    shortName: 'ACB',
    logo: 'https://cdn.vietqr.io/img/ACB.png',
    transferSupported: 1,
    lookupSupported: 1,
    swift_code: 'ASCBVNVX',
  },
  {
    id: 45,
    name: 'Ngân hàng TMCP Việt Nam Thịnh Vượng',
    code: 'VPB',
    bin: '970432',
    shortName: 'VPBank',
    logo: 'https://cdn.vietqr.io/img/VPB.png',
    transferSupported: 1,
    lookupSupported: 1,
    swift_code: 'VPBNVNVX',
  },
  {
    id: 33,
    name: 'Ngân hàng TMCP Sài Gòn Thương Tín',
    code: 'STB',
    bin: '970403',
    shortName: 'Sacombank',
    logo: 'https://cdn.vietqr.io/img/STB.png',
    transferSupported: 1,
    lookupSupported: 1,
    swift_code: 'SGSTVNVX',
  },
  {
    id: 40,
    name: 'Ngân hàng TMCP Tiên Phong',
    code: 'TPB',
    bin: '970423',
    shortName: 'TPBank',
    logo: 'https://cdn.vietqr.io/img/TPB.png',
    transferSupported: 1,
    lookupSupported: 1,
    swift_code: 'TPBVVNVX',
  },
  {
    id: 15,
    name: 'Ngân hàng TMCP Phát triển Thành phố Hồ Chí Minh',
    code: 'HDB',
    bin: '970437',
    shortName: 'HDBank',
    logo: 'https://cdn.vietqr.io/img/HDB.png',
    transferSupported: 1,
    lookupSupported: 1,
    swift_code: 'HDBCVNVX',
  },
  {
    id: 42,
    name: 'Ngân hàng TMCP Quốc tế Việt Nam',
    code: 'VIB',
    bin: '970441',
    shortName: 'VIB',
    logo: 'https://cdn.vietqr.io/img/VIB.png',
    transferSupported: 1,
    lookupSupported: 1,
    swift_code: 'VIBNVNVX',
  },
  {
    id: 28,
    name: 'Ngân hàng TMCP Hàng Hải Việt Nam',
    code: 'MSB',
    bin: '970426',
    shortName: 'MSB',
    logo: 'https://cdn.vietqr.io/img/MSB.png',
    transferSupported: 1,
    lookupSupported: 1,
    swift_code: 'MSBVVNVX',
  },
  {
    id: 35,
    name: 'Ngân hàng TMCP Sài Gòn - Hà Nội',
    code: 'SHB',
    bin: '970443',
    shortName: 'SHB',
    logo: 'https://cdn.vietqr.io/img/SHB.png',
    transferSupported: 1,
    lookupSupported: 1,
    swift_code: 'SHBVVNVX',
  },
  {
    id: 13,
    name: 'Ngân hàng TMCP Xuất Nhập khẩu Việt Nam',
    code: 'EIB',
    bin: '970431',
    shortName: 'Eximbank',
    logo: 'https://cdn.vietqr.io/img/EIB.png',
    transferSupported: 1,
    lookupSupported: 1,
    swift_code: 'EBVNVNVX',
  },
  {
    id: 31,
    name: 'Ngân hàng TMCP Phương Đông',
    code: 'OCB',
    bin: '970448',
    shortName: 'OCB',
    logo: 'https://cdn.vietqr.io/img/OCB.png',
    transferSupported: 1,
    lookupSupported: 1,
    swift_code: 'OCBVVNVX',
  },
];

export const DEFAULT_COMPANY_BANKING: CompanyBankingConfig = {
  bankBin: '970436',
  bankCode: 'VCB',
  bankName: SGM_COMPANY_INFO.bankAccount.bankName,
  bankShortName: 'Vietcombank',
  bankLogo: 'https://cdn.vietqr.io/img/VCB.png',
  accountNumber: SGM_COMPANY_INFO.bankAccount.accountNumber,
  accountHolder: SGM_COMPANY_INFO.bankAccount.accountHolder,
  branch: SGM_COMPANY_INFO.bankAccount.branch,
  defaultTransferSyntaxTemplate: 'TT HD {SO_HOP_DONG} {SO_DIEN_THOAI}',
  isDefault: true,
  updatedAt: new Date().toISOString(),
};

const BANK_CACHE_KEY = 'sgm_vietqr_banks_cache';
const BANK_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

let inMemoryBankList: VietQRBank[] | null = null;

export function _resetBankMemoryCacheForTesting(): void {
  inMemoryBankList = null;
}

// Safe storage helpers for SSR / Node environment
function getSafeStorage(key: string): string | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
  } catch (e) {}
  return null;
}

function setSafeStorage(key: string, value: string): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
  } catch (e) {}
}

/**
 * Lấy danh sách ngân hàng từ API VietQR (v2/banks) có caching thông minh 24h
 */
export async function fetchVietQRBankList(): Promise<VietQRBank[]> {
  if (inMemoryBankList && inMemoryBankList.length > 0) {
    return inMemoryBankList;
  }

  // Check storage cache
  try {
    const rawCache = getSafeStorage(BANK_CACHE_KEY);
    if (rawCache) {
      const parsed = JSON.parse(rawCache);
      if (parsed && Array.isArray(parsed.data) && Date.now() - parsed.timestamp < BANK_CACHE_TTL) {
        inMemoryBankList = parsed.data;
        return parsed.data;
      }
    }
  } catch (err) {
    logger.debug('VietQR bank cache parse warning:', err);
  }

  try {
    const res = await fetch('https://api.vietqr.io/v2/banks');
    if (!res.ok) throw new Error(`HTTP error ${res.status}`);
    const json: VietQRBankListResponse = await res.json();
    if (json.code === '00' && Array.isArray(json.data) && json.data.length > 0) {
      inMemoryBankList = json.data;
      setSafeStorage(
        BANK_CACHE_KEY,
        JSON.stringify({ timestamp: Date.now(), data: json.data })
      );
      return json.data;
    }
  } catch (err) {
    logger.warn('Failed to fetch VietQR bank list, using local fallback:', err);
  }

  inMemoryBankList = FALLBACK_VIETNAM_BANKS;
  return FALLBACK_VIETNAM_BANKS;
}

/**
 * Tra cứu số tài khoản qua API VietQR (v2/lookup)
 */
export async function lookupAccountNumber(
  bin: string,
  accountNumber: string,
  credentials?: { clientId?: string; apiKey?: string }
): Promise<{ success: boolean; accountName?: string; message?: string }> {
  const cleanAccount = accountNumber.replace(/\s+/g, '').trim();
  if (!bin || !cleanAccount) {
    return { success: false, message: 'Vui lòng cung cấp mã định danh ngân hàng (BIN) và số tài khoản.' };
  }

  const clientId = credentials?.clientId || getSafeStorage('sgm_vietqr_client_id') || '';
  const apiKey = credentials?.apiKey || getSafeStorage('sgm_vietqr_api_key') || '';

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (clientId) headers['x-client-id'] = clientId;
    if (apiKey) headers['x-api-key'] = apiKey;

    const res = await fetch('https://api.vietqr.io/v2/lookup', {
      method: 'POST',
      headers,
      body: JSON.stringify({ bin, accountNumber: cleanAccount }),
    });

    const json: VietQRLookupResponse = await res.json();
    if (json.code === '00' && json.data?.accountName) {
      return {
        success: true,
        accountName: json.data.accountName,
        message: 'Tra cứu số tài khoản thành công qua cổng Napas 24/7.',
      };
    }

    if (json.code === '401') {
      return {
        success: false,
        message:
          'API Tra Cứu yêu cầu VietQR Client ID & API Key từ Casso/VietQR. Bạn có thể nhập mã này trong cấu hình hoặc tự nhập tên chủ tài khoản.',
      };
    }

    return {
      success: false,
      message: json.desc || 'Không tìm thấy thông tin tài khoản hoặc ngân hàng này chưa hỗ trợ tra cứu trực tuyến.',
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Lỗi kết nối tới máy chủ tra cứu VietQR.',
    };
  }
}

/**
 * Đọc cấu hình ngân hàng chính thức của công ty từ settingsRepo
 */
export async function getCompanyBankingConfig(): Promise<CompanyBankingConfig> {
  try {
    const saved = await settingsRepo.getSettings<CompanyBankingConfig>('company_banking');
    if (saved && saved.accountNumber && saved.bankName) {
      return { ...DEFAULT_COMPANY_BANKING, ...saved };
    }
  } catch (err) {
    logger.debug('Failed to load company_banking config, using default', err);
  }
  return DEFAULT_COMPANY_BANKING;
}

/**
 * Đăng ký lắng nghe thay đổi cấu hình ngân hàng Realtime
 */
export function subscribeCompanyBankingConfig(
  callback: (config: CompanyBankingConfig) => void
): () => void {
  return settingsRepo.subscribeSettings<CompanyBankingConfig>('company_banking', (saved) => {
    if (saved && saved.accountNumber && saved.bankName) {
      callback({ ...DEFAULT_COMPANY_BANKING, ...saved });
    } else {
      callback(DEFAULT_COMPANY_BANKING);
    }
  });
}

/**
 * Lưu cấu hình tài khoản ngân hàng của công ty vào settingsRepo
 */
export async function saveCompanyBankingConfig(config: Partial<CompanyBankingConfig>): Promise<void> {
  const current = await getCompanyBankingConfig();
  const merged: CompanyBankingConfig = {
    ...current,
    ...config,
    updatedAt: new Date().toISOString(),
  };

  // Sync credentials to safe storage if provided
  if (config.vietqrClientId !== undefined) {
    setSafeStorage('sgm_vietqr_client_id', config.vietqrClientId || '');
  }
  if (config.vietqrApiKey !== undefined) {
    setSafeStorage('sgm_vietqr_api_key', config.vietqrApiKey || '');
  }

  await settingsRepo.setSettings('company_banking', merged, true);
}
