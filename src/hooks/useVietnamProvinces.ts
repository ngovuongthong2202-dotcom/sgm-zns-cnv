import { useState, useEffect, useCallback } from 'react';
import useSWR from 'swr';
import {
  vietnamProvincesApi,
  ProvinceResponse,
  WardResponse,
  WardWithLegacySource,
  LegacyWardResponse,
  VIETNAM_PROVINCES_2025,
  normalizeProvinceName
} from '@/src/shared/services/vietnamProvincesApi';

export const SWR_PROVINCES_KEY = 'vietnam_provinces_list';

export function useVietnamProvinces(options?: { autoLoadWardsForProvince?: number }) {
  const { data: rawProvinces, error: provincesError, isLoading } = useSWR<ProvinceResponse[]>(
    SWR_PROVINCES_KEY,
    () => vietnamProvincesApi.listProvinces(),
    {
      revalidateOnFocus: false,
      revalidateIfStale: false,
      dedupingInterval: 300000 // 5 minutes cache
    }
  );

  const [wards, setWards] = useState<WardResponse[]>([]);
  const [loadingWards, setLoadingWards] = useState<boolean>(false);
  const [wardsError, setWardsError] = useState<Error | null>(null);

  const provinceNames: string[] = rawProvinces && rawProvinces.length > 0
    ? Array.from(new Set(rawProvinces.map(p => normalizeProvinceName(p.name)))).sort((a, b) => a.localeCompare(b, 'vi'))
    : VIETNAM_PROVINCES_2025;

  const loadWards = useCallback(async (provinceCode: number) => {
    if (!provinceCode) {
      setWards([]);
      return [];
    }
    setLoadingWards(true);
    setWardsError(null);
    try {
      const data = await vietnamProvincesApi.listWards({ province: provinceCode });
      setWards(data);
      return data;
    } catch (err: any) {
      setWardsError(err instanceof Error ? err : new Error(String(err)));
      setWards([]);
      return [];
    } finally {
      setLoadingWards(false);
    }
  }, []);

  const lookupLegacyWard = useCallback(async (legacyName: string, legacyCode?: number): Promise<WardWithLegacySource[]> => {
    return vietnamProvincesApi.lookupFromLegacyWard({
      legacy_name: legacyName,
      legacy_code: legacyCode
    });
  }, []);

  const getLegacyWards = useCallback(async (newWardCode: number): Promise<LegacyWardResponse[]> => {
    return vietnamProvincesApi.getLegacyWards(newWardCode);
  }, []);

  useEffect(() => {
    if (options?.autoLoadWardsForProvince) {
      loadWards(options.autoLoadWardsForProvince);
    }
  }, [options?.autoLoadWardsForProvince, loadWards]);

  return {
    provinces: rawProvinces || [],
    provinceNames,
    wards,
    isLoadingProvinces: isLoading,
    isLoadingWards: loadingWards,
    error: provincesError || wardsError,
    loadWards,
    lookupLegacyWard,
    getLegacyWards
  };
}
