import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  VietnamProvincesApiClient,
  normalizeProvinceName,
  getNormalizedProvinceNames,
  VIETNAM_PROVINCES_2025,
  VIETNAM_PROVINCES_63,
  ProvinceResponse
} from './vietnamProvincesApi';

describe('vietnamProvincesApi', () => {
  let client: VietnamProvincesApiClient;
  const originalFetch = global.fetch;

  beforeEach(() => {
    client = new VietnamProvincesApiClient('https://test-provinces.api.vn/api/v2');
    client.clearCache();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  describe('normalizeProvinceName', () => {
    it('strips "Thành phố" and "Tỉnh" prefixes', () => {
      expect(normalizeProvinceName('Thành phố Hà Nội')).toBe('Hà Nội');
      expect(normalizeProvinceName('Tỉnh Cao Bằng')).toBe('Cao Bằng');
      expect(normalizeProvinceName('Tỉnh Quảng Ngãi')).toBe('Quảng Ngãi');
    });

    it('normalizes Hồ Chí Minh to TP Hồ Chí Minh', () => {
      expect(normalizeProvinceName('Thành phố Hồ Chí Minh')).toBe('TP Hồ Chí Minh');
      expect(normalizeProvinceName('Hồ Chí Minh')).toBe('TP Hồ Chí Minh');
    });

    it('returns empty string if given falsy value', () => {
      expect(normalizeProvinceName('')).toBe('');
      expect(normalizeProvinceName(null as any)).toBe('');
    });
  });

  describe('getNormalizedProvinceNames', () => {
    it('returns sorted unique normalized names', () => {
      const mockData: ProvinceResponse[] = [
        { code: 1, name: 'Thành phố Hà Nội', division_type: 'thành phố trung ương', codename: 'ha_noi', phone_code: 24 },
        { code: 48, name: 'Thành phố Đà Nẵng', division_type: 'thành phố trung ương', codename: 'da_nang', phone_code: 236 },
        { code: 79, name: 'Thành phố Hồ Chí Minh', division_type: 'thành phố trung ương', codename: 'ho_chi_minh', phone_code: 28 },
      ];

      const names = getNormalizedProvinceNames(mockData);
      expect(names).toEqual(['Đà Nẵng', 'Hà Nội', 'TP Hồ Chí Minh']);
    });

    it('handles empty input gracefully', () => {
      expect(getNormalizedProvinceNames([])).toEqual([]);
      expect(getNormalizedProvinceNames(null as any)).toEqual([]);
    });
  });

  describe('API endpoints', () => {
    it('listProvinces fetches from /p/ and handles search query', async () => {
      const mockResponse = [
        { code: 1, name: 'Thành phố Hà Nội', division_type: 'thành phố trung ương', codename: 'ha_noi', phone_code: 24 }
      ];

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      });

      const res = await client.listProvinces({ search: 'Hà Nội' });
      expect(global.fetch).toHaveBeenCalledWith(
        'https://test-provinces.api.vn/api/v2/p/?search=H%C3%A0%20N%E1%BB%99i',
        expect.anything()
      );
      expect(res).toEqual(mockResponse);
    });

    it('getAllDivisions fetches with depth', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => []
      });

      await client.getAllDivisions({ depth: 2 });
      expect(global.fetch).toHaveBeenCalledWith(
        'https://test-provinces.api.vn/api/v2/?depth=2',
        expect.anything()
      );
    });

    it('getProvince fetches single province by code', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ code: 1, name: 'Thành phố Hà Nội' })
      });

      const p = await client.getProvince(1, { depth: 2 });
      expect(global.fetch).toHaveBeenCalledWith(
        'https://test-provinces.api.vn/api/v2/p/1?depth=2',
        expect.anything()
      );
      expect(p.code).toBe(1);
    });

    it('listWards queries wards by province code and search', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => []
      });

      await client.listWards({ province: 1, search: 'Ba Đình' });
      expect(global.fetch).toHaveBeenCalledWith(
        'https://test-provinces.api.vn/api/v2/w/?province=1&search=Ba+%C4%90%C3%ACnh',
        expect.anything()
      );
    });

    it('lookupFromLegacyWard queries legacy name and code', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => []
      });

      await client.lookupFromLegacyWard({ legacy_name: 'Tân Hải', legacy_code: 22855 });
      expect(global.fetch).toHaveBeenCalledWith(
        'https://test-provinces.api.vn/api/v2/w/from-legacy/?legacy_name=T%C3%A2n+H%E1%BA%A3i&legacy_code=22855',
        expect.anything()
      );
    });

    it('getLegacyWards queries pre-2025 merged wards', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => []
      });

      await client.getLegacyWards(26710);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://test-provinces.api.vn/api/v2/w/26710/to-legacies/',
        expect.anything()
      );
    });
  });

  describe('fetchProvinceNames', () => {
    it('returns normalized province names when API succeeds with 34 provinces', async () => {
      const mock34Provinces = VIETNAM_PROVINCES_2025.map((name, i) => ({
        code: i + 1,
        name: `Tỉnh ${name}`,
        division_type: 'tỉnh' as const,
        codename: `code_${i}`,
        phone_code: 100 + i
      }));

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mock34Provinces
      });

      const names = await client.fetchProvinceNames();
      expect(names.length).toBe(34);
      expect(names).toContain('Hà Nội');
    });

    it('falls back to provided fallback list if API fails or throws', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const names = await client.fetchProvinceNames(VIETNAM_PROVINCES_63);
      expect(names).toEqual(VIETNAM_PROVINCES_63);
    });
  });
});
