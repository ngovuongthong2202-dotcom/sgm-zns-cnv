import { Router } from 'express';
import { adminDb } from '../config/supabase.admin';
import { getItemKey, computeDeliveredQuantitiesMap, isSourceDocumentFullyDelivered } from '../../domain/services/delivery-reconciler';

const router = Router();

interface SearchItem {
  id: string;
  _collectionType: string;
  tenKhachHang?: string;
  soHopDong?: string;
  soPhieuBaoGia?: string;
  sdt?: string;
  name?: string;
  contractId?: string;
  quotationId?: string;
  products?: { id?: string; productId?: string; productName?: string; quantity?: number }[];
  deliveredQuantities?: Record<string, number>;
  _soCT?: string;
  _isFullyDelivered?: boolean;
  _sourceObj?: unknown;
  [key: string]: unknown;
}

router.get('/:collection', async (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  try {
    const collections = req.params.collection.split(',');
    const { q, limit = 20 } = req.query;
    
    let results: SearchItem[] = [];

    for (const coll of collections) {
      let queryRef: any = adminDb.collection(coll);
      
      if (!q) {
        queryRef = queryRef.orderBy('createdAt', 'desc').limit(Number(limit) * 2);
      } else {
        queryRef = queryRef.limit(100); 
      }
      
      const snap = await queryRef.get();
      // Loại trừ các bản ghi đã bị xóa (deletedAt / deleted_at / isDeleted / status === 'DELETED')
      let collResults: SearchItem[] = snap.docs
        .map((doc: any) => ({ 
          id: doc.id, 
          ...doc.data(),
          _collectionType: coll
        }))
        .filter((r: any) => {
          if (r.deletedAt || r.deleted_at || r.data?.deletedAt || r.data?.deleted_at || r.isDeleted || r.status === 'DELETED') {
            return false;
          }
          return true;
        });
      
      if (q) {
        const searchStr = String(q).toLowerCase().trim();
        collResults = collResults.filter((r: any) => {
           const matchesName = r.tenKhachHang && String(r.tenKhachHang).toLowerCase().includes(searchStr);
           const matchesSoHD = r.soHopDong && String(r.soHopDong).toLowerCase().includes(searchStr);
           const matchesBG = r.soPhieuBaoGia && String(r.soPhieuBaoGia).toLowerCase().includes(searchStr);
           const matchesPhone = r.sdt && String(r.sdt).includes(searchStr);
           const matchesNameD = r.name && String(r.name).toLowerCase().includes(searchStr);
           const matchesPaymentId = (r.paymentId && String(r.paymentId).toLowerCase().includes(searchStr)) || (r.id && String(r.id).toLowerCase().includes(searchStr));
           const matchesMaKh = r.maKh && String(r.maKh).toLowerCase().includes(searchStr);
           const matchesDH = r.soDonHang && String(r.soDonHang).toLowerCase().includes(searchStr);
           return !!(matchesName || matchesSoHD || matchesBG || matchesPhone || matchesNameD || matchesPaymentId || matchesMaKh || matchesDH);
        });
      }
      
      results = results.concat(collResults);
    }
    
    // Auto-join relations for autocomplete contexts!
    if (collections.length === 1 && collections[0] === 'payments') {
        const contractIds = [...new Set(results.map((r) => r.contractId).filter(Boolean))] as string[];
        const quoIds = [...new Set(results.map((r) => r.quotationId).filter(Boolean))] as string[];
        
        const contractsMap = new Map<string, unknown>();
        const quoMap = new Map<string, unknown>();
        
        if (contractIds.length > 0) {
            for (let i = 0; i < contractIds.length; i += 30) {
                 const chunk = contractIds.slice(i, i + 30);
                 const snap = await adminDb.collection('contracts').where('id', 'in', chunk).get();
                 snap.docs.forEach((doc) => contractsMap.set(doc.id, doc.data()));
            }
        }
        
        if (quoIds.length > 0) {
            for (let i = 0; i < quoIds.length; i += 30) {
                 const chunk = quoIds.slice(i, i + 30);
                 const snap = await adminDb.collection('quotations').where('id', 'in', chunk).get();
                 snap.docs.forEach((doc) => quoMap.set(doc.id, doc.data()));
            }
        }

        // Lấy danh sách giao hàng thực tế của các payments để tính chính xác đã giao đủ hay chưa
        const paymentIds = results.map(r => r.id).filter(Boolean);
        const deliveriesByPayment = new Map<string, any[]>();
        if (paymentIds.length > 0) {
          for (let i = 0; i < paymentIds.length; i += 30) {
            const chunk = paymentIds.slice(i, i + 30);
            const dSnap = await adminDb.collection('deliveries').where('paymentId', 'in', chunk).get();
            dSnap.docs.forEach((dDoc: any) => {
              const dData = dDoc.data();
              if (!dData.deletedAt && dData.tinhTrangGiaoHang !== 'HỦY' && dData.tinhTrangGiaoHang !== 'Hủy') {
                const list = deliveriesByPayment.get(dData.paymentId) || [];
                list.push(dData);
                deliveriesByPayment.set(dData.paymentId, list);
              }
            });
          }
        }
        
        results = results.map((p) => {
            const contractData = p.contractId ? contractsMap.get(p.contractId) as Record<string, unknown> | undefined : undefined;
            const quotationData = p.quotationId ? quoMap.get(p.quotationId) as Record<string, unknown> | undefined : undefined;
            const soCT = p.contractId ? `HĐ: ${contractData?.soHopDong || p.soHopDong}` : (p.quotationId ? `BG: ${quotationData?.soPhieuBaoGia || p.soPhieuBaoGia}` : 'Không có');
            
            // Check delivered state with unified reconciler engine
            const source = (p.contractId ? contractData : quotationData) || p;
            const linkedDeliveries = deliveriesByPayment.get(p.id) || [];
            const _isFullyDelivered = isSourceDocumentFullyDelivered(
              source,
              linkedDeliveries,
              contractData ? [contractData] : [],
              quotationData ? [quotationData] : []
            );

            const productList = Array.isArray(source.products) && source.products.length > 0 
              ? source.products 
              : (Array.isArray(p.products) ? p.products : []);

            let totalContracted = 0;
            let totalDelivered = 0;

            if (productList.length > 0) {
                const actualDeliveredMap = computeDeliveredQuantitiesMap(linkedDeliveries);

                productList.forEach((cp: Record<string, unknown>, index: number) => {
                   const key = getItemKey(cp, index);
                   const q = Number(cp.quantity || (cp as any).soLuong || 0);
                   totalContracted += q;
                   const normName = String(cp.productName || (cp as any).tenSanPham || '').trim().toLowerCase();
                   const fromDeliveries = Number(
                     actualDeliveredMap[key] ??
                     (cp.productId ? actualDeliveredMap[String(cp.productId).trim()] : undefined) ??
                     (normName ? actualDeliveredMap[normName] : undefined) ??
                     0
                   );
                   const fromSource = Number(((source.deliveredQuantities || {}) as Record<string, number>)[key] || 0);
                   totalDelivered += Math.max(fromSource, fromDeliveries);
                });
            }

            const pStatus = (p.tinhTrangThanhToan as string || '').toLowerCase().trim();
            const _isChuaTT = pStatus === 'chưa tt' || pStatus === 'chua tt' || pStatus === 'chưa thanh toán';
            
            return { 
              ...p, 
              _soCT: soCT, 
              _isFullyDelivered, 
              _isChuaTT,
              _sourceObj: source || null,
              _totalContracted: totalContracted,
              _totalDelivered: totalDelivered
            };
        });
    }

    results = results.slice(0, Number(limit));
    
    res.json({ data: results });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

export const searchRoutes = router;
