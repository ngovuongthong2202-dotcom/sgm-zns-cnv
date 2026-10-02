export interface SalesOrderBridgeResult {
  matched: boolean;
  soHopDong: string;
  soDonHang?: string;
  customerName?: string;
  phone?: string;
  content?: string;
  totalAfterTax?: number;
  source?: 'LOCAL_CONTRACT' | 'ERP_CACHE' | 'ERP_API' | 'NONE';
  message?: string;
  raw?: any;
}

// In-memory client cache with 60-second TTL
const clientMemoryCache = new Map<string, { result: SalesOrderBridgeResult; expireAt: number }>();

export function clearSalesOrderBridgeCache(): void {
  clientMemoryCache.clear();
}

/**
 * Sanitizes and strips hidden zero-width characters and spaces from contract codes.
 */
export function sanitizeContractCode(code: string = ''): string {
  return String(code || '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\s*\/\s*/g, '/')
    .replace(/\s*-\s*/g, '-')
    .trim();
}

/**
 * 3-Tier Multi-Resolution Engine:
 * Tier 1: Local Contract Repository / State (0ms)
 * Tier 2: Client LRU Memory Cache (<5ms)
 * Tier 3: Resilient Backend ERP Proxy Cache (<150ms)
 */
export async function resolveSalesOrderByContractNumber(
  rawSoHopDong: string,
  localContracts: any[] = []
): Promise<SalesOrderBridgeResult> {
  const cleanCode = sanitizeContractCode(rawSoHopDong);
  if (!cleanCode) {
    return { matched: false, soHopDong: '', source: 'NONE' };
  }

  const normTarget = cleanCode.toLowerCase();
  const stripRegex = /[^a-z0-9]/g;
  const strippedTarget = normTarget.replace(stripRegex, '');

  // TIER 1: Check Local Contracts in Memory / Database
  if (Array.isArray(localContracts) && localContracts.length > 0) {
    const localMatch = localContracts.find((c: any) => {
      const cCode = sanitizeContractCode(c.soHopDong || '').toLowerCase();
      if (cCode === normTarget) return true;
      if (strippedTarget && cCode.replace(stripRegex, '') === strippedTarget) return true;
      return false;
    });

    if (localMatch && localMatch.soDonHang && String(localMatch.soDonHang).trim()) {
      return {
        matched: true,
        soHopDong: localMatch.soHopDong || cleanCode,
        soDonHang: String(localMatch.soDonHang).trim(),
        customerName: localMatch.tenKhachHang || '',
        phone: localMatch.sdt || '',
        totalAfterTax: Number(localMatch.totalAmount) || 0,
        source: 'LOCAL_CONTRACT'
      };
    }
  }

  // TIER 2: Check Client In-Memory Cache
  const now = Date.now();
  const cached = clientMemoryCache.get(strippedTarget || normTarget);
  if (cached && cached.expireAt > now) {
    return { ...cached.result, source: 'ERP_CACHE' };
  }

  // TIER 3: Call Resilient Backend Proxy with Timeout
  try {
    const url = `/api/quotations/erp-sales-orders-lookup?soHopDong=${encodeURIComponent(cleanCode)}`;
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(8000)
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.success && data.matched && data.soDonHang) {
        const result: SalesOrderBridgeResult = {
          matched: true,
          soHopDong: data.soHopDong || cleanCode,
          soDonHang: data.soDonHang,
          customerName: data.customerName || '',
          phone: data.phone || '',
          content: data.content || '',
          totalAfterTax: data.totalAfterTax || 0,
          source: 'ERP_API',
          raw: data.raw
        };

        // Cache for 60 seconds
        clientMemoryCache.set(strippedTarget || normTarget, {
          result,
          expireAt: now + 60000
        });

        return result;
      }
    }
  } catch (err: any) {
    console.warn('[SalesOrderBridge] Remote lookup timeout or network failure:', err?.message);
  }

  return {
    matched: false,
    soHopDong: cleanCode,
    source: 'NONE',
    message: `Không tìm thấy đơn hàng ERP nào khớp với số hợp đồng "${cleanCode}"`
  };
}
