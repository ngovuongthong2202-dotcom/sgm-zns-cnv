import { Router } from 'express';
import axios from 'axios';

const router = Router();

interface ErpItem {
  item_code: string;
  name: string;
  display_unit: string;
}

// In-memory cache for ERP items to avoid hammering external ERP and ensure blazing-fast searches
let cachedItems: ErpItem[] | null = null;
let lastCacheTime = 0;
let fetchPromise: Promise<ErpItem[]> | null = null;
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

async function getOrFetchItems(): Promise<ErpItem[]> {
  const now = Date.now();
  if (cachedItems && now - lastCacheTime < CACHE_TTL_MS) {
    return cachedItems;
  }

  // Prevent multiple concurrent fetch requests
  if (fetchPromise) {
    return fetchPromise;
  }

  fetchPromise = (async () => {
    try {
      const erpUrl = 'https://sgm.vnaisoft.com/api/public/items';
      const response = await axios.get(erpUrl, {
        timeout: 25000,
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

      const rawList = Array.isArray(response.data)
        ? response.data
        : (Array.isArray(response.data?.items) ? response.data.items : []);

      const mapped: ErpItem[] = rawList.map((it: any) => {
        const itemCode = String(it.item_code || it._id || '').trim();
        const name = String(it.name || '').trim();
        const unit = String(it.display_unit || it.unit_of_measure?.display_unit || it.unit || '').trim();

        return {
          item_code: itemCode,
          name: name,
          display_unit: unit || 'Cái'
        };
      }).filter((it: ErpItem) => it.item_code || it.name);

      cachedItems = mapped;
      lastCacheTime = Date.now();
      console.log(`[Items ERP] Cached ${mapped.length} items successfully`);
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

// GET /api/items?q=...&limit=50
router.get('/', async (req, res) => {
  try {
    const rawQ = typeof req.query.q === 'string' ? req.query.q : '';
    const cleanQ = rawQ.replace(/[\u200B-\u200D\uFEFF\u00A0]/g, '').trim().toLowerCase();
    const limit = Math.min(Math.max(parseInt(req.query.limit as string, 10) || 50, 1), 200);

    const allItems = await getOrFetchItems();

    if (!cleanQ) {
      return res.json({
        success: true,
        total: allItems.length,
        data: allItems.slice(0, limit)
      });
    }

    // Search by item_code or name
    const qTokens = cleanQ.split(/\s+/).filter(Boolean);
    const matches = allItems.filter(item => {
      const code = item.item_code.toLowerCase();
      const name = item.name.toLowerCase();
      return qTokens.every(token => code.includes(token) || name.includes(token));
    });

    return res.json({
      success: true,
      total: matches.length,
      data: matches.slice(0, limit)
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
