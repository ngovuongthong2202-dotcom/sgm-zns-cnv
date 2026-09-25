import { Router } from 'express';
import axios from 'axios';

const router = Router();

export interface ErpItem {
  item_code: string;
  name: string;
  display_unit: string;
  nameNoTone?: string;
  codeLower?: string;
}

function removeVietnameseTones(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

// In-memory cache for ERP items to avoid hammering external ERP and ensure blazing-fast searches
let cachedItems: ErpItem[] | null = null;
let lastCacheTime = 0;
let fetchPromise: Promise<ErpItem[]> | null = null;
const CACHE_TTL_MS = 60 * 60 * 1000; // 60 minutes cache

async function getOrFetchItems(): Promise<ErpItem[]> {
  const now = Date.now();
  if (cachedItems && cachedItems.length > 0 && now - lastCacheTime < CACHE_TTL_MS) {
    return cachedItems;
  }

  // Prevent multiple concurrent fetch requests
  if (fetchPromise) {
    return fetchPromise;
  }

  fetchPromise = (async () => {
    try {
      const erpUrl = 'https://sgm.vnaisoft.com/api/public/items';
      console.log(`[Items ERP] Starting fetch from ${erpUrl}...`);
      
      const response = await axios.get(erpUrl, {
        timeout: 45000,
        maxContentLength: 150 * 1024 * 1024,
        maxBodyLength: 150 * 1024 * 1024,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'SGM-ZNS-Client/1.0'
        },
        validateStatus: () => true
      });

      if (response.status !== 200 || !response.data) {
        console.warn(`[Items ERP] Upstream returned status ${response.status}`);
        return cachedItems || [];
      }

      // API sgm.vnaisoft.com returns { data: [...], total: 86167 }
      const rawList = Array.isArray(response.data?.data)
        ? response.data.data
        : (Array.isArray(response.data)
            ? response.data
            : (Array.isArray(response.data?.items) ? response.data.items : []));

      console.log(`[Items ERP] Received ${rawList.length} raw records from ERP`);

      const mapped: ErpItem[] = rawList.map((it: any) => {
        const itemCode = String(it.item_code || it._id || '').trim();
        const name = String(it.name || '').trim();
        const unit = String(it.display_unit || it.unit_of_measure?.display_unit || it.unit || '').trim();

        return {
          item_code: itemCode,
          name: name,
          display_unit: unit || 'Cái',
          codeLower: itemCode.toLowerCase(),
          nameNoTone: removeVietnameseTones(name)
        };
      }).filter((it: ErpItem) => it.item_code || it.name);

      cachedItems = mapped;
      lastCacheTime = Date.now();
      console.log(`[Items ERP] Successfully parsed and cached ${mapped.length} items`);
      return mapped;
    } catch (err: any) {
      console.error('[Items ERP] Fetch items error:', err.message);
      return cachedItems || [];
    } finally {
      fetchPromise = null;
    }
  })();

  return fetchPromise;
}

// Prefetch on startup asynchronously
getOrFetchItems().catch(() => {});

// GET /api/items?q=...&limit=50&page=1
router.get('/', async (req, res) => {
  try {
    const rawQ = typeof req.query.q === 'string' ? req.query.q : '';
    const cleanQ = rawQ.replace(/[\u200B-\u200D\uFEFF\u00A0]/g, '').trim().toLowerCase();
    const cleanQNoTone = removeVietnameseTones(cleanQ);

    const limit = Math.min(Math.max(parseInt(req.query.limit as string, 10) || 50, 1), 200);
    const page = Math.max(parseInt(req.query.page as string, 10) || 1, 1);
    const offset = (page - 1) * limit;

    const allItems = await getOrFetchItems();

    if (!cleanQ) {
      const paged = allItems.slice(offset, offset + limit).map(({ item_code, name, display_unit }) => ({
        item_code,
        name,
        display_unit
      }));

      return res.json({
        success: true,
        total: allItems.length,
        page,
        limit,
        totalPages: Math.ceil(allItems.length / limit),
        data: paged
      });
    }

    // Smart multi-word search matching item_code or name (both with and without Vietnamese tones)
    const tokens = cleanQ.split(/\s+/).filter(Boolean);
    const tokensNoTone = cleanQNoTone.split(/\s+/).filter(Boolean);

    const matches: ErpItem[] = [];
    for (let i = 0; i < allItems.length; i++) {
      const item = allItems[i];
      const code = item.codeLower || '';
      const name = item.name.toLowerCase();
      const noTone = item.nameNoTone || '';

      // Check if all search tokens match either code or name or name without tones
      let matched = true;
      for (let t = 0; t < tokens.length; t++) {
        const tok = tokens[t];
        const tokNoTone = tokensNoTone[t] || tok;
        if (!code.includes(tok) && !name.includes(tok) && !noTone.includes(tokNoTone)) {
          matched = false;
          break;
        }
      }

      if (matched) {
        matches.push(item);
      }
    }

    const paged = matches.slice(offset, offset + limit).map(({ item_code, name, display_unit }) => ({
      item_code,
      name,
      display_unit
    }));

    return res.json({
      success: true,
      total: matches.length,
      page,
      limit,
      totalPages: Math.ceil(matches.length / limit),
      data: paged
    });
  } catch (error: any) {
    console.error('[Items ERP Route Error]:', error);
    return res.status(500).json({ success: false, error: 'Lỗi tải danh mục vật tư từ máy chủ ERP' });
  }
});

// Tra cứu chi tiết phiếu xuất bán hàng từ máy chủ ERP theo batch_code
router.get('/export-sale/lookup', async (req, res) => {
  try {
    const rawBatchCode = String(req.query.batch_code || req.query.q || '').trim();
    if (!rawBatchCode) {
      return res.status(400).json({ success: false, error: 'Thiếu mã phiếu xuất batch_code' });
    }

    const currentYear = new Date().getFullYear();
    const fromDate = (req.query.from_date as string) || `01-01-${currentYear}`;
    const toDate = (req.query.to_date as string) || `31-12-${currentYear}`;

    const listUrl = `https://sgm.vnaisoft.com/api/public/export-sale?from_date=${fromDate}&to_date=${toDate}`;

    const listResp = await axios.get(listUrl, {
      timeout: 20000,
      headers: { 'Accept': 'application/json', 'User-Agent': 'SGM-ZNS-Client/1.0' },
      validateStatus: () => true
    });

    if (listResp.status !== 200 || !listResp.data) {
      return res.status(listResp.status || 500).json({ success: false, error: 'Không thể kết nối đến máy chủ ERP xuất kho' });
    }

    const rawList = Array.isArray(listResp.data) ? listResp.data : (listResp.data.data || []);
    const normalizedTarget = rawBatchCode.toLowerCase().replace(/[\s\-_]/g, '');

    const foundItem = rawList.find((item: any) => {
      const bCode = String(item.batch_code || item.voucher_code || item.code || '').toLowerCase().replace(/[\s\-_]/g, '');
      return bCode === normalizedTarget || (item.batch_code && String(item.batch_code).toLowerCase().includes(rawBatchCode.toLowerCase()));
    });

    if (!foundItem || !foundItem._id) {
      return res.status(404).json({ success: false, error: `Không tìm thấy phiếu xuất có mã ${rawBatchCode}` });
    }

    const detailUrl = `https://sgm.vnaisoft.com/api/public/export-sale/${foundItem._id}`;

    const detailResp = await axios.get(detailUrl, {
      timeout: 20000,
      headers: { 'Accept': 'application/json', 'User-Agent': 'SGM-ZNS-Client/1.0' },
      validateStatus: () => true
    });

    if (detailResp.status !== 200 || !detailResp.data) {
      return res.status(detailResp.status || 500).json({ success: false, error: 'Không thể tải chi tiết phiếu xuất từ ERP' });
    }

    const detailData = detailResp.data.data || detailResp.data;

    // Trích xuất các trường theo yêu cầu
    const note = detailData.note || '';
    const created_at = detailData.created_at || detailData.event_date || '';
    const by_name = detailData.by_name || detailData.created_by_name || detailData.approved_by_name || detailData.created_by || '';
    const warehouse_name = detailData.warehouse_name || '';

    return res.json({
      success: true,
      data: {
        _id: detailData._id,
        batch_code: detailData.batch_code || foundItem.batch_code || rawBatchCode,
        note,
        created_at,
        by_name,
        warehouse_name,
        customer_name: detailData.customer_name || detailData.partner_name || '',
        customer_code: detailData.customer_code || '',
        vehicle_no: detailData.vehicle_no || '',
        driver_name: detailData.driver_name || '',
        vehicle_phone: detailData.vehicle_phone || '',
        transport_company: detailData.transport_company || '',
        delivery_address: detailData.delivery_address || '',
        lines: detailData.lines || []
      }
    });
  } catch (error: any) {
    console.error('[Export Sale Lookup Error]:', error);
    return res.status(500).json({ success: false, error: error.message || 'Lỗi tra cứu phiếu xuất kho' });
  }
});

// Force refresh cache endpoint
router.post('/refresh', async (req, res) => {
  cachedItems = null;
  lastCacheTime = 0;
  const items = await getOrFetchItems();
  return res.json({ success: true, count: items.length });
});

export default router;
