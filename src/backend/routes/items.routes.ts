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

// Force refresh cache endpoint
router.post('/refresh', async (req, res) => {
  cachedItems = null;
  lastCacheTime = 0;
  const items = await getOrFetchItems();
  return res.json({ success: true, count: items.length });
});

export default router;
