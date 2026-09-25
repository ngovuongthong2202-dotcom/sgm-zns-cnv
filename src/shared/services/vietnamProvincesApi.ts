/**
 * Vietnam Provinces Online API (2025) Client
 * OpenAPI 3.1.0 specification implementation
 * Base URL: https://provinces.open-api.vn/api/v2
 */

export type VietNamDivisionType =
  | 'tỉnh'
  | 'thành phố trung ương'
  | 'xã'
  | 'phường'
  | 'đặc khu';

export type ProvinceCode =
  | 1 | 4 | 8 | 11 | 12 | 14 | 15 | 19 | 20 | 22 | 24 | 25
  | 31 | 33 | 37 | 38 | 40 | 42 | 44 | 46 | 48 | 51 | 52 | 56
  | 66 | 68 | 75 | 79 | 80 | 82 | 86 | 91 | 92 | 96
  | number;

export interface Ward {
  name: string;
  code: number;
  division_type: VietNamDivisionType;
  codename: string;
  province_code: ProvinceCode;
}

export type WardResponse = Ward;

export interface ProvinceResponse {
  name: string;
  code: ProvinceCode;
  division_type: VietNamDivisionType;
  codename: string;
  phone_code: number;
  wards?: Ward[];
}

export interface WardWithLegacySource {
  source_code: number;
  ward: WardResponse;
}

export interface LegacyWardResponse {
  name: string;
  code: number;
  division_type: string;
  codename: string;
  district_code: number;
  province_code: number;
}

export interface Problem {
  title: string;
  type: string;
  status: number;
  detail?: string | null;
}

export interface ValidationError {
  loc: (string | number)[];
  msg: string;
  type: string;
  input?: unknown;
  ctx?: Record<string, unknown>;
}

export interface HTTPValidationError {
  title: string;
  type: string;
  status: number;
  errors: ValidationError[];
}

export const PROVINCES_API_BASE_URL =
  (typeof process !== 'undefined' && process.env?.VITE_PROVINCES_API_URL) ||
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_PROVINCES_API_URL) ||
  'https://provinces.open-api.vn/api/v2';

/**
 * 34 administrative units of Vietnam under the 2025 reorganization
 */
export const VIETNAM_PROVINCES_2025: string[] = [
  'An Giang',
  'Bắc Ninh',
  'Cà Mau',
  'Cao Bằng',
  'Cần Thơ',
  'Đà Nẵng',
  'Đắk Lắk',
  'Điện Biên',
  'Đồng Nai',
  'Đồng Tháp',
  'Gia Lai',
  'Hà Nội',
  'Hà Tĩnh',
  'Hải Phòng',
  'Huế',
  'Hưng Yên',
  'Khánh Hòa',
  'Lai Châu',
  'Lâm Đồng',
  'Lạng Sơn',
  'Lào Cai',
  'Nghệ An',
  'Ninh Bình',
  'Phú Thọ',
  'Quảng Ngãi',
  'Quảng Ninh',
  'Quảng Trị',
  'Sơn La',
  'Tây Ninh',
  'Thái Nguyên',
  'Thanh Hóa',
  'TP Hồ Chí Minh',
  'Tuyên Quang',
  'Vĩnh Long'
];

/**
 * Historical 63 provinces/cities preserved for backward compatibility
 */
export const VIETNAM_PROVINCES_63: string[] = [
  'An Giang', 'Bà Rịa - Vũng Tàu', 'Bắc Giang', 'Bắc Kạn', 'Bạc Liêu',
  'Bắc Ninh', 'Bến Tre', 'Bình Định', 'Bình Dương', 'Bình Phước',
  'Bình Thuận', 'Cà Mau', 'Cần Thơ', 'Cao Bằng', 'Đà Nẵng',
  'Đắk Lắk', 'Đắk Nông', 'Điện Biên', 'Đồng Nai', 'Đồng Tháp',
  'Gia Lai', 'Hà Giang', 'Hà Nam', 'Hà Nội', 'Hà Tĩnh',
  'Hải Dương', 'Hải Phòng', 'Hậu Giang', 'Hòa Bình', 'Hưng Yên',
  'Khánh Hòa', 'Kiên Giang', 'Kon Tum', 'Lai Châu', 'Lâm Đồng',
  'Lạng Sơn', 'Lào Cai', 'Long An', 'Nam Định', 'Nghệ An',
  'Ninh Bình', 'Ninh Thuận', 'Phú Thọ', 'Phú Yên', 'Quảng Bình',
  'Quảng Nam', 'Quảng Ngãi', 'Quảng Ninh', 'Quảng Trị', 'Sóc Trăng',
  'Sơn La', 'Tây Ninh', 'Thái Bình', 'Thái Nguyên', 'Thanh Hóa',
  'Thừa Thiên Huế', 'Tiền Giang', 'TP Hồ Chí Minh', 'Trà Vinh', 'Tuyên Quang',
  'Vĩnh Long', 'Vĩnh Phúc', 'Yên Bái'
];

/**
 * Normalizes a raw province name from the API into a clean display name.
 * e.g. "Thành phố Hà Nội" -> "Hà Nội", "Thành phố Hồ Chí Minh" -> "TP Hồ Chí Minh"
 */
export function normalizeProvinceName(rawName: string): string {
  let name = String(rawName || '').trim();
  name = name.replace(/^(Thành phố|Tỉnh)\s+/i, '').trim();
  if (name === 'Hồ Chí Minh') return 'TP Hồ Chí Minh';
  return name;
}

/**
 * Extracts and sorts clean province display names from a list of ProvinceResponse objects.
 */
export function getNormalizedProvinceNames(provinces: ProvinceResponse[]): string[] {
  if (!Array.isArray(provinces)) return [];
  const names = provinces
    .map(p => normalizeProvinceName(p.name))
    .filter(Boolean);
  
  if (!names.includes('TP Hồ Chí Minh') && provinces.some(p => p.name?.includes('Hồ Chí Minh'))) {
    names.push('TP Hồ Chí Minh');
  }

  return Array.from(new Set(names)).sort((a, b) => a.localeCompare(b, 'vi'));
}

// In-memory cache
let cachedProvinces: ProvinceResponse[] | null = null;
let cachedProvinceNames: string[] | null = null;
const cachedWardsByProvince = new Map<number, WardResponse[]>();

export class VietnamProvincesApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = PROVINCES_API_BASE_URL) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  /**
   * GET / - Show All Divisions
   * @param options depth: 1 (provinces only) or 2 (provinces with wards)
   */
  async getAllDivisions(options?: { depth?: 1 | 2; signal?: AbortSignal }): Promise<ProvinceResponse[]> {
    const depth = options?.depth ?? 1;
    const url = `${this.baseUrl}/?depth=${depth}`;
    const res = await fetch(url, { signal: options?.signal });
    if (!res.ok) {
      throw new Error(`Failed to fetch divisions: ${res.status} ${res.statusText}`);
    }
    const data = await res.json();
    if (Array.isArray(data)) {
      cachedProvinces = data;
    }
    return data;
  }

  /**
   * GET /p/ - List Provinces
   * @param options search query
   */
  async listProvinces(options?: { search?: string; signal?: AbortSignal }): Promise<ProvinceResponse[]> {
    const search = options?.search?.trim();
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    const url = `${this.baseUrl}/p/${query}`;
    const res = await fetch(url, { signal: options?.signal });
    if (!res.ok) {
      throw new Error(`Failed to fetch provinces: ${res.status} ${res.statusText}`);
    }
    const data = await res.json();
    if (!search && Array.isArray(data)) {
      cachedProvinces = data;
    }
    return data;
  }

  /**
   * GET /p/{code} - Get Province Details
   * @param code Province code (e.g. 1 for Hà Nội)
   * @param options depth: 1 or 2 (show wards)
   */
  async getProvince(code: number, options?: { depth?: 1 | 2; signal?: AbortSignal }): Promise<ProvinceResponse> {
    const depth = options?.depth ?? 1;
    const url = `${this.baseUrl}/p/${code}?depth=${depth}`;
    const res = await fetch(url, { signal: options?.signal });
    if (!res.ok) {
      throw new Error(`Failed to get province ${code}: ${res.status} ${res.statusText}`);
    }
    return res.json();
  }

  /**
   * GET /w/ - List Wards
   * @param options province code, search string
   */
  async listWards(options?: { province?: number; search?: string; signal?: AbortSignal }): Promise<WardResponse[]> {
    const params = new URLSearchParams();
    if (options?.province) params.set('province', String(options.province));
    if (options?.search) params.set('search', options.search.trim());

    const qs = params.toString() ? `?${params.toString()}` : '';
    const url = `${this.baseUrl}/w/${qs}`;
    const res = await fetch(url, { signal: options?.signal });
    if (!res.ok) {
      throw new Error(`Failed to list wards: ${res.status} ${res.statusText}`);
    }
    const data = await res.json();
    if (options?.province && !options.search && Array.isArray(data)) {
      cachedWardsByProvince.set(options.province, data);
    }
    return data;
  }

  /**
   * GET /w/{code} - Get Ward Details
   * @param code Ward code
   */
  async getWard(code: number, options?: { signal?: AbortSignal }): Promise<WardResponse> {
    const url = `${this.baseUrl}/w/${code}`;
    const res = await fetch(url, { signal: options?.signal });
    if (!res.ok) {
      throw new Error(`Failed to get ward ${code}: ${res.status} ${res.statusText}`);
    }
    return res.json();
  }

  /**
   * GET /w/from-legacy/ - Lookup From Legacy Ward
   * Lookup for new wards from pre-2025 name or pre-2025 code.
   */
  async lookupFromLegacyWard(options?: {
    legacy_name?: string;
    legacy_code?: number;
    signal?: AbortSignal;
  }): Promise<WardWithLegacySource[]> {
    const params = new URLSearchParams();
    if (options?.legacy_name) params.set('legacy_name', options.legacy_name.trim());
    if (options?.legacy_code) params.set('legacy_code', String(options.legacy_code));

    const qs = params.toString() ? `?${params.toString()}` : '';
    const url = `${this.baseUrl}/w/from-legacy/${qs}`;
    const res = await fetch(url, { signal: options?.signal });
    if (!res.ok) {
      throw new Error(`Failed to lookup legacy ward: ${res.status} ${res.statusText}`);
    }
    return res.json();
  }

  /**
   * GET /w/{code}/to-legacies/ - Get legacy wards
   * Get pre-2025 wards that were merged to form this new ward.
   */
  async getLegacyWards(code: number, options?: { signal?: AbortSignal }): Promise<LegacyWardResponse[]> {
    const url = `${this.baseUrl}/w/${code}/to-legacies/`;
    const res = await fetch(url, { signal: options?.signal });
    if (!res.ok) {
      throw new Error(`Failed to get legacy wards for ${code}: ${res.status} ${res.statusText}`);
    }
    return res.json();
  }

  /**
   * Convenience helper to fetch province names with timeout and graceful fallback
   */
  async fetchProvinceNames(fallbackList: string[] = VIETNAM_PROVINCES_2025): Promise<string[]> {
    if (cachedProvinceNames && cachedProvinceNames.length > 0) {
      return cachedProvinceNames;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      const provinces = await this.listProvinces({ signal: controller.signal });
      clearTimeout(timeoutId);

      if (Array.isArray(provinces) && provinces.length > 0) {
        const names = getNormalizedProvinceNames(provinces);
        if (names.length >= 30) {
          cachedProvinceNames = names;
          return names;
        }
      }
    } catch {
      // Graceful fallback to static list on network error / timeout
    }

    return fallbackList;
  }

  /**
   * Clears internal cache
   */
  clearCache(): void {
    cachedProvinces = null;
    cachedProvinceNames = null;
    cachedWardsByProvince.clear();
  }
}

export const vietnamProvincesApi = new VietnamProvincesApiClient();
