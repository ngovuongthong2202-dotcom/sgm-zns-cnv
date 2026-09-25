import { Router } from 'express';
import { adminDb } from '../config/supabase.admin';

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
  try {
    const collections = req.params.collection.split(',');
    const { q, limit = 20 } = req.query;
    
    let results: SearchItem[] = [];

    for (const coll of collections) {
      let queryRef: any = adminDb.collection(coll);
      
      if (!q) {
        queryRef = queryRef.orderBy('createdAt', 'desc').limit(Number(limit));
      } else {
        queryRef = queryRef.limit(100); 
      }
      
      const snap = await queryRef.get();
      let collResults: SearchItem[] = snap.docs.map((doc: any) => ({ 
         id: doc.id, 
         _collectionType: coll,
         ...doc.data() 
      }));
      
      if (q) {
        const searchStr = String(q).toLowerCase();
        collResults = collResults.filter((r) => {
           const matchesName = r.tenKhachHang && r.tenKhachHang.toLowerCase().includes(searchStr);
           const matchesSoHD = r.soHopDong && r.soHopDong.toLowerCase().includes(searchStr);
           const matchesBG = r.soPhieuBaoGia && r.soPhieuBaoGia.toLowerCase().includes(searchStr);
           const matchesPhone = r.sdt && String(r.sdt).includes(searchStr);
           const matchesNameD = r.name && r.name.toLowerCase().includes(searchStr);
           return !!(matchesName || matchesSoHD || matchesPhone || matchesNameD || matchesBG);
        });
        collResults = collResults.slice(0, Number(limit));
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
            // chunking in case > 30 (firestore in limit is 30)
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
        
        results = results.map((p) => {
            const contractData = p.contractId ? contractsMap.get(p.contractId) as Record<string, unknown> | undefined : undefined;
            const quotationData = p.quotationId ? quoMap.get(p.quotationId) as Record<string, unknown> | undefined : undefined;
            const soCT = p.contractId ? `HĐ: ${contractData?.soHopDong}` : (p.quotationId ? `BG: ${quotationData?.soPhieuBaoGia}` : 'Không có');
            // Check delivered state
            const source = p.contractId ? contractData : quotationData;
            let _isFullyDelivered = false;
            
            if (source && source.products && Array.isArray(source.products) && source.products.length > 0) {
                let totalContracted = 0;
                let totalDelivered = 0;
                source.products.forEach((cp: Record<string, unknown>, index: number) => {
                   const key = (cp.id as string) || (cp.productId as string) || (cp.productName as string) || String(index);
                   totalContracted += Number(cp.quantity || 0);
                   const deliveredMap = (source.deliveredQuantities || {}) as Record<string, number>;
                   totalDelivered += Number(deliveredMap[key] || 0);
                });
                if (totalDelivered >= totalContracted && totalContracted > 0) {
                   _isFullyDelivered = true;
                }
            }
            
            return { ...p, _soCT: soCT, _isFullyDelivered, _sourceObj: source || null };
        });
    }
    
    if (q) {
      const searchStr = String(q).toLowerCase();
      results = results.filter((r) => {
         const matchesName = r.tenKhachHang && r.tenKhachHang.toLowerCase().includes(searchStr);
         const matchesSoHD = r.soHopDong && r.soHopDong.toLowerCase().includes(searchStr);
         const matchesPhone = r.sdt && String(r.sdt).includes(searchStr);
         const matchesNameD = r.name && r.name.toLowerCase().includes(searchStr);
         return !!(matchesName || matchesSoHD || matchesPhone || matchesNameD);
      });
      results = results.slice(0, Number(limit));
    }
    
    res.json({ data: results });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

export const searchRoutes = router;
