import { Router, RequestHandler } from 'express';
import axios from 'axios';
import { getErpConfig } from '../services/erp/erp.config';

const router = Router();

router.get('/erp-lookup/:so', async (req, res) => {
  try {
    const rawSo = req.params.so || '';
    // Trim/clear khoảng trắng đầu-cuối + ký tự ẩn (zero-width, NBSP...)
    const cleanSo = rawSo.replace(/[\u200B-\u200D\uFEFF\u00A0]/g, '').trim();

    if (!cleanSo) {
      return res.status(400).json({ success: false, error: 'Mã số báo giá không hợp lệ' });
    }

    const erpConfig = await getErpConfig();
    const erpUrl = `${erpConfig.quotationUrl}/${encodeURIComponent(cleanSo)}`;
    const response = await axios.get(erpUrl, {
      timeout: (erpConfig.timeoutSeconds || 10) * 1000,
      validateStatus: () => true // Handle statuses explicitly without throwing uncaught errors
    });

    if (response.status === 200 && response.data) {
      return res.json({ success: true, data: response.data });
    }

    if (response.status === 404) {
      return res.status(404).json({ success: false, error: `Không tìm thấy báo giá "${cleanSo}" trên hệ thống ERP` });
    }

    const upstreamMsg = response.data?.message || response.data?.error || `Hệ thống ERP trả về trạng thái ${response.status}`;
    console.warn(`ERP Lookup non-200 response for "${cleanSo}":`, response.status, upstreamMsg);
    return res.status(200).json({ success: false, error: upstreamMsg });
  } catch (error: any) {
    const errorMsg = error.code === 'ECONNABORTED'
      ? 'Hết thời gian chờ kết nối máy chủ ERP (quá 10s)'
      : (error.message || 'Lỗi kết nối tới hệ thống ERP');
    console.warn('ERP Lookup Connection Error:', errorMsg);
    return res.status(200).json({ success: false, error: errorMsg });
  }
});

// Live search endpoint for ERP Sales Orders (Typeahead auto-suggest)
router.get('/erp-sales-orders-search', async (req, res) => {
  try {
    const query = String(req.query.q || req.query.search || '').trim();
    if (!query) {
      return res.json({ success: true, data: [] });
    }

    const erpConfig = await getErpConfig();
    const salesOrdersBase = erpConfig.salesOrdersUrl || 'https://sgm.vnaisoft.com/api/public/sales-orders';
    const searchUrl = `${salesOrdersBase}?q=${encodeURIComponent(query)}&limit=12`;

    const response = await axios.get(searchUrl, {
      timeout: (erpConfig.timeoutSeconds || 10) * 1000,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'SGM-ZNS-Client/1.0'
      },
      validateStatus: () => true
    });

    if (response.status === 200 && response.data) {
      const items = response.data.data || response.data || [];
      return res.json({ success: true, data: Array.isArray(items) ? items : [] });
    }

    return res.json({ success: true, data: [] });
  } catch (error: any) {
    console.warn('ERP Search Error:', error.message);
    return res.json({ success: true, data: [] });
  }
});

// Dual-Tier Gateway: Direct Path + Query Fallback & Auto-Synthesis
const handleErpSalesOrderLookup = async (req: any, res: any) => {
  try {
    const rawCode = (req.params as any).code || req.query.code || '';
    let cleanCode = String(rawCode)
      .replace(/[\u200B-\u200D\uFEFF\u00A0]/g, '')
      .trim();

    // Chỉ tách đuôi nếu người dùng dán nguyên URL HTTP/HTTPS
    if (cleanCode.startsWith('http://') || cleanCode.startsWith('https://')) {
      try {
        const parsedUrl = new URL(cleanCode);
        const parts = parsedUrl.pathname.split('/').filter(Boolean);
        cleanCode = decodeURIComponent(parts[parts.length - 1] || '');
      } catch {
        // Giữ nguyên
      }
    }

    if (!cleanCode) {
      return res.status(400).json({ success: false, error: 'Mã số đơn hàng không hợp lệ' });
    }

    const erpConfig = await getErpConfig();
    const salesOrdersBase = erpConfig.salesOrdersUrl || 'https://sgm.vnaisoft.com/api/public/sales-orders';

    // TẦNG 1: Thử gọi trực tiếp endpoint chi tiết
    const erpUrl = `${salesOrdersBase}/${encodeURIComponent(cleanCode)}`;
    const response = await axios.get(erpUrl, {
      timeout: (erpConfig.timeoutSeconds || 20) * 1000,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'SGM-ZNS-Client/1.0'
      },
      validateStatus: () => true
    });

    if (response.status === 200 && response.data) {
      const payload = response.data.data || response.data;
      if (payload && (payload.code || payload.items || payload.lines)) {
        return res.json({ success: true, data: payload });
      }
    }

    // TẦNG 2: Fallback tìm kiếm qua Query Parameter ?q=... (Hỗ trợ mã có ký tự slash '/' bị IIS từ chối)
    const fallbackSearchUrl = `${salesOrdersBase}?q=${encodeURIComponent(cleanCode)}`;
    const searchResponse = await axios.get(fallbackSearchUrl, {
      timeout: (erpConfig.timeoutSeconds || 15) * 1000,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'SGM-ZNS-Client/1.0'
      },
      validateStatus: () => true
    });

    if (searchResponse.status === 200 && searchResponse.data) {
      const items = searchResponse.data.data || searchResponse.data || [];
      if (Array.isArray(items) && items.length > 0) {
        // Tìm item khớp chính xác nhất
        const matchedItem = items.find((it: any) => 
          it.code === cleanCode || 
          it.original_code === cleanCode || 
          it.id === cleanCode || 
          it._id === cleanCode
        ) || items[0];

        if (matchedItem) {
          // Thử lấy chi tiết bằng original_code hoặc code nếu khác cleanCode
          const alternativeCodes = [matchedItem.original_code, matchedItem.code].filter(c => c && c !== cleanCode);
          for (const alt of alternativeCodes) {
            try {
              const altRes = await axios.get(`${salesOrdersBase}/${encodeURIComponent(alt)}`, {
                timeout: 5000,
                headers: { 'Accept': 'application/json', 'User-Agent': 'SGM-ZNS-Client/1.0' },
                validateStatus: () => true
              });
              if (altRes.status === 200 && altRes.data) {
                const altData = altRes.data.data || altRes.data;
                if (altData && (altData.code || altData.lines || altData.items)) {
                  return res.json({ success: true, data: altData });
                }
              }
            } catch {
              // Ignore fallback fetch error
            }
          }

          // Tự động tổng hợp đối tượng chuẩn từ matchedItem trong danh sách ERP
          const synthesizedData = {
            _id: matchedItem._id || matchedItem.id,
            code: matchedItem.code || cleanCode,
            original_code: matchedItem.original_code || cleanCode,
            company_id: matchedItem.company_id,
            order_date: matchedItem.order_date || matchedItem.signed_date || matchedItem.created_at,
            signed_date: matchedItem.signed_date,
            expected_delivery_date: matchedItem.expected_delivery_date,
            content: matchedItem.content || `Đơn hàng ${matchedItem.code || cleanCode}`,
            currency_code: matchedItem.currency_code || 'VND',
            total_after_tax: matchedItem.total_after_tax || 0,
            created_by_name: matchedItem.created_by_name || '',
            delivery_address: matchedItem.delivery_address || '',
            customer_name_display: matchedItem.customer_name_display || '',
            customer_snapshot: {
              customer_name: matchedItem.customer_name_display || 'Khách hàng ERP',
              address: matchedItem.delivery_address || '',
              phone: matchedItem.customer_phone || null,
              tax_code: matchedItem.customer_tax_code || '',
              representative: matchedItem.customer_representative || null,
            },
            lines: (Array.isArray(matchedItem.lines) && matchedItem.lines.length > 0) ? matchedItem.lines : [
              {
                item_code: matchedItem.code || 'ERP-ITEM',
                item_name: matchedItem.content || `Vật tư theo đơn ${matchedItem.code || cleanCode}`,
                display_unit: 'Lô',
                quantity: 1,
                unit_price: matchedItem.total_after_tax || 0,
                discount_rate_pct: 0,
                discount_amount: 0,
                vat_rate_pct: 0,
                vat_amount: 0,
                total_amount: matchedItem.total_after_tax || 0
              }
            ],
            items: [],
            attachments: []
          };

          return res.json({ success: true, data: synthesizedData });
        }
      }
    }

    if (response.status === 404) {
      return res.status(404).json({ success: false, error: `Không tìm thấy đơn hàng "${cleanCode}" trên hệ thống ERP` });
    }

    const upstreamMsg = response.data?.message || response.data?.error || `Hệ thống ERP trả về trạng thái ${response.status}`;
    console.warn(`ERP Sales Order non-200 response for "${cleanCode}":`, response.status, upstreamMsg);
    return res.status(200).json({ success: false, error: upstreamMsg });
  } catch (error: any) {
    const errorMsg = error.code === 'ECONNABORTED'
      ? 'Hết thời gian chờ kết nối máy chủ ERP (quá 20s)'
      : (error.message || 'Lỗi kết nối tới hệ thống ERP');
    console.warn('ERP Sales Order Connection Error:', errorMsg);
    return res.status(200).json({ success: false, error: errorMsg });
  }
};

// In-memory cache for ERP Sales Orders list (60 seconds TTL)
let cachedSalesOrdersList: { items: any[]; expireAt: number } | null = null;

const handleErpSalesOrdersListLookup: RequestHandler = async (req, res) => {
  const rawSoHopDong = String(req.query.soHopDong || req.query.q || '').trim();
  const cleanTarget = rawSoHopDong
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .trim()
    .toLowerCase();

  try {
    const now = Date.now();
    let items = (cachedSalesOrdersList && cachedSalesOrdersList.expireAt > now)
      ? cachedSalesOrdersList.items
      : null;

    if (!items) {
      const erpConfig = await getErpConfig();
      const currentYear = new Date().getFullYear();
      const fromDate = `01-01-${currentYear}`;
      const toDate = `31-12-${currentYear}`;
      const url = `${erpConfig.salesOrdersUrl || 'https://sgm.vnaisoft.com/api/public/sales-orders'}?from_date=${fromDate}&to_date=${toDate}`;

      const response = await axios.get(url, {
        timeout: (erpConfig.timeoutSeconds || 20) * 1000,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'SGM-ZNS-Client/1.0'
        },
        validateStatus: () => true
      });

      if (response.status === 200 && response.data) {
        items = Array.isArray(response.data) ? response.data : (response.data.data || []);
        cachedSalesOrdersList = {
          items: items || [],
          expireAt: now + 60000 // 60 seconds TTL
        };
      } else {
        items = cachedSalesOrdersList?.items || [];
      }
    }

    if (!cleanTarget) {
      return res.json({ success: true, count: items?.length || 0, items: items || [] });
    }

    const matched = (items || []).find((it: any) => {
      const c = String(it.code || '').trim().toLowerCase();
      const oc = String(it.original_code || '').trim().toLowerCase();
      if (c === cleanTarget || oc === cleanTarget) return true;
      // Normalization ignoring slashes and dashes for robust fuzzy matching
      const stripRegex = /[^a-z0-9]/g;
      const strippedTarget = cleanTarget.replace(stripRegex, '');
      if (strippedTarget && (c.replace(stripRegex, '') === strippedTarget || oc.replace(stripRegex, '') === strippedTarget)) {
        return true;
      }
      return false;
    });

    if (matched) {
      const c = String(matched.code || '').trim();
      const oc = String(matched.original_code || '').trim();
      let resolvedOrder = oc;
      let resolvedContract = c;

      if (c.toLowerCase() === cleanTarget || c.replace(/[^a-z0-9]/gi, '') === cleanTarget.replace(/[^a-z0-9]/gi, '')) {
        resolvedOrder = oc || c;
        resolvedContract = c;
      } else if (oc.toLowerCase() === cleanTarget || oc.replace(/[^a-z0-9]/gi, '') === cleanTarget.replace(/[^a-z0-9]/gi, '')) {
        resolvedOrder = c || oc;
        resolvedContract = oc;
      }

      // If one of the codes clearly starts with 11-KDDH, that is definitely the sales order
      if (/11-KDDH/i.test(c) && !/11-KDDH/i.test(oc)) {
        resolvedOrder = c;
        resolvedContract = oc || rawSoHopDong;
      } else if (/11-KDDH/i.test(oc) && !/11-KDDH/i.test(c)) {
        resolvedOrder = oc;
        resolvedContract = c || rawSoHopDong;
      }

      return res.json({
        success: true,
        matched: true,
        soHopDong: resolvedContract || rawSoHopDong,
        soDonHang: resolvedOrder || '',
        customerName: matched.customer_name_display || '',
        phone: matched.customer_id || '',
        content: matched.content || '',
        totalAfterTax: Number(matched.total_after_tax) || 0,
        raw: matched
      });
    }

    return res.json({
      success: true,
      matched: false,
      soHopDong: rawSoHopDong,
      message: `Không tìm thấy đơn hàng ERP nào khớp với số hợp đồng "${rawSoHopDong}"`
    });
  } catch (error: any) {
    console.warn('ERP Sales Orders List Lookup Error:', error.message);
    return res.status(200).json({ success: false, matched: false, error: error.message });
  }
};

router.get('/erp-sales-orders-lookup', handleErpSalesOrdersListLookup);
router.get('/erp-sales-order', handleErpSalesOrderLookup);
router.get('/erp-sales-order/:code', handleErpSalesOrderLookup);

export default router;

