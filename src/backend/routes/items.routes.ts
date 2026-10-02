import { Router } from 'express';
import axios from 'axios';
import { getErpConfig } from '../services/erp/erp.config';

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
      const erpConfig = await getErpConfig();
      const erpUrl = erpConfig.itemsUrl || 'https://sgm.vnaisoft.com/api/public/items';
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

    // Smart multi-word search with Technical Specifier Parser, Bounded Numeric Tokenizer and Contradiction Elimination
    const tokens = cleanQ.split(/\s+/).filter(Boolean);
    const tokensNoTone = cleanQNoTone.split(/\s+/).filter(Boolean);

    // 1. Phân giải cặp lượng từ quy cách kỹ thuật (Technical Specifier Parser)
    // Nhận diện truy vấn số tầng máy cán tôn (1 tầng, 2 tầng, 3 tầng...)
    let queryTier: number | null = null;
    const hasTangWord = tokensNoTone.includes('tang') || tokensNoTone.includes('t') || cleanQ.includes('tầng');
    if (hasTangWord) {
      if (tokensNoTone.includes('2') || /(?:^|\s)(?:2\s*t(?:[^\w]|$)|2\s*tang|2\s*tầng|hai\s*tang|hai\s*tầng)/i.test(cleanQNoTone)) {
        queryTier = 2;
      } else if (tokensNoTone.includes('1') || /(?:^|\s)(?:1\s*t(?:[^\w]|$)|1\s*tang|1\s*tầng|mot\s*tang|mot\s*tầng)/i.test(cleanQNoTone)) {
        queryTier = 1;
      } else if (tokensNoTone.includes('3') || /(?:^|\s)(?:3\s*t(?:[^\w]|$)|3\s*tang|3\s*tầng|ba\s*tang|ba\s*tầng)/i.test(cleanQNoTone)) {
        queryTier = 3;
      }
    }

    interface ScoredErpItem extends ErpItem {
      relevanceScore: number;
    }

    const matches: ScoredErpItem[] = [];

    for (let i = 0; i < allItems.length; i++) {
      const item = allItems[i];
      const code = item.codeLower || '';
      const name = item.name.toLowerCase();
      const noTone = item.nameNoTone || '';

      // 2. Bộ Lọc Triệt Tiêu Mâu Thuẫn (Contradiction Elimination Engine)
      // Khi người dùng tìm "2 tầng", TUYỆT ĐỐI LOẠI BỎ các sản phẩm có "1 tầng"
      if (queryTier === 2) {
        const has1Tier = /(?:^|[^\d])1\s*(?:tầng|tang|t)(?:[^\d\w]|$)/i.test(name) || /(?:^|[^\d])1\s*tang(?:[^\d\w]|$)/i.test(noTone);
        if (has1Tier) continue;
      } else if (queryTier === 1) {
        const has2Tier = /(?:^|[^\d])2\s*(?:tầng|tang|t)(?:[^\d\w]|$)/i.test(name) || /(?:^|[^\d])2\s*tang(?:[^\d\w]|$)/i.test(noTone);
        if (has2Tier) continue;
      }

      // 3. Tách từ có nhận thức chữ số (Bounded Numeric Tokenizer)
      let matched = true;
      let tokenMatchBonus = 0;

      for (let t = 0; t < tokens.length; t++) {
        const tok = tokens[t];
        const tokNoTone = tokensNoTone[t] || tok;

        // Nếu token là một chuỗi số thuần túy (e.g. "2", "1", "3"):
        // Bắt buộc phải khớp với ranh giới từ số độc lập, TUYỆT ĐỐI không khớp vào 1200mm hay 420
        if (/^\d+$/.test(tok)) {
          const numRegex = new RegExp(`(?:^|[^0-9])${tok}(?:[^0-9]|$)`, 'i');
          const isNumMatched = numRegex.test(name) || numRegex.test(noTone) || numRegex.test(code);
          if (!isNumMatched) {
            matched = false;
            break;
          }
          tokenMatchBonus += 500;
        } else {
          // Token chữ: đối soát có dấu và không dấu
          const isTextMatched = code.includes(tok) || name.includes(tok) || noTone.includes(tokNoTone);
          if (!isTextMatched) {
            matched = false;
            break;
          }
          tokenMatchBonus += 100;
        }
      }

      if (!matched) continue;

      // 4. Hệ Thống Chấm Điểm Trọng Số Độ Liên Quan (BM25-Style Contextual Scorer)
      let score = tokenMatchBonus;

      // Khớp nguyên cụm từ khóa (Exact phrase match)
      if (name.includes(cleanQ) || noTone.includes(cleanQNoTone)) {
        score += 10000;
      }

      // Khớp chính xác quy cách số tầng
      if (queryTier === 2 && (/(?:^|[^\d])2\s*(?:tầng|tang|t)(?:[^\d\w]|$)/i.test(name) || /(?:^|[^\d])2\s*tang(?:[^\d\w]|$)/i.test(noTone))) {
        score += 5000;
      } else if (queryTier === 1 && (/(?:^|[^\d])1\s*(?:tầng|tang|t)(?:[^\d\w]|$)/i.test(name) || /(?:^|[^\d])1\s*tang(?:[^\d\w]|$)/i.test(noTone))) {
        score += 5000;
      }

      // Khớp mã vật tư
      if (code === cleanQ || code.startsWith(cleanQ)) {
        score += 4000;
      }

      // Ưu tiên vị trí xuất hiện sớm hơn trong tên
      const firstIdx = noTone.indexOf(tokensNoTone[0]);
      if (firstIdx >= 0) {
        score += Math.max(0, 300 - firstIdx);
      }

      matches.push({ ...item, relevanceScore: score });
    }

    // Sắp xếp theo điểm liên quan giảm dần (sản phẩm chính xác nhất luôn ở top 1)
    matches.sort((a, b) => b.relevanceScore - a.relevanceScore);

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

    const erpConfig = await getErpConfig();
    const listUrl = `${erpConfig.exportSaleUrl}?from_date=${fromDate}&to_date=${toDate}`;

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

    const detailUrl = `${erpConfig.exportSaleUrl}/${foundItem._id}`;

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
