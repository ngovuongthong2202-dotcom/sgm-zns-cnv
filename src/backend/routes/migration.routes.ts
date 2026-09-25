import { Router } from 'express';
import { adminDb as db } from '../config/supabase.admin';
import { cleanProperVietnameseText, normalizePhoneNumber } from '../../shared/utils/textFormatter';
import { SafeMigrationRunner } from '../lib/migration-runner';

const router = Router();

router.post('/run-phase6', async (req, res) => {
  try {
    const { dryRun = true } = req.body;
    let totalUpdated = 0;
    const collections = ['customers', 'quotations', 'payments'];
    const summary: Record<string, number> = {};

    for (const col of collections) {
      if (dryRun) {
         // Perform manual dry run counting
         const snapshot = await db.collection(col).get();
         let updated = 0;
         snapshot.docs.forEach(docSnap => {
            const data = docSnap.data();
            let needsUpdate = false;
            
            if (col === 'customers') {
               if (data.computedHealthScore && typeof data.computedHealthScore === 'object' && 'score' in data.computedHealthScore) {
                 needsUpdate = true;
               }
            } else if (col === 'quotations') {
               if (data.tinhTrangBaoGia && !data.lifecycleStatus) {
                 needsUpdate = true;
               }
               if ((data.vatRate !== undefined || data.discountRate !== undefined) && Array.isArray(data.products)) {
                 const hasOldRate = data.products.some((p: any) => p.vatPct === undefined || p.discountPct === undefined);
                 if (hasOldRate) needsUpdate = true;
               }
            } else if (col === 'payments') {
               if (data.soTien !== undefined && data.totalAmount === undefined) {
                 needsUpdate = true;
               }
            }

            if (needsUpdate) updated++;
         });
         summary[col] = updated;
         totalUpdated += updated;
      } else {
         // Actually run SafeMigrationRunner
         if (col === 'customers') {
           await SafeMigrationRunner.run({
             migrationName: 'phase6-customers',
             collectionName: 'customers',
             up: async (id, data: any) => {
               if (data.computedHealthScore && typeof data.computedHealthScore === 'object' && 'score' in data.computedHealthScore) {
                 return { computedHealthScore: typeof data.computedHealthScore.score === 'number' ? data.computedHealthScore.score : 0 };
               }
               return null;
             },
             down: async () => null // no down migration needed for now
           });
         } else if (col === 'quotations') {
            await SafeMigrationRunner.run({
             migrationName: 'phase6-quotations',
             collectionName: 'quotations',
             up: async (id, data: any) => {
               const patch: any = {};
               let changed = false;

               if (data.tinhTrangBaoGia && (!data.lifecycleStatus || data.lifecycleStatus === 'DRAFT')) {
                  const t = (data.tinhTrangBaoGia || '').toLowerCase();
                  if (t.includes('thành công') || t.includes('hợp đồng') || data.trangThaiGuiTinBaoGia === 'Thành công') patch.lifecycleStatus = 'SUBMITTED'; // Let's use SENT as it's the schema enum
                  if (t.includes('cơ hội') || t.includes('tiềm năng')) patch.lifecycleStatus = 'VIEWING';
                  if (t.includes('thất bại') || t.includes('huỷ')) patch.lifecycleStatus = 'LOST';
                  if (t.includes('hết hạn')) patch.lifecycleStatus = 'EXPIRED';
                  if (!patch.lifecycleStatus) patch.lifecycleStatus = 'SENT';
                  changed = true;
               }

               if (Array.isArray(data.products) && (data.vatRate !== undefined || data.discountRate !== undefined)) {
                 let updatedProducts = false;
                 const newProducts = data.products.map((p: any) => {
                    const newP = { ...p };
                    if (newP.vatPct === undefined && data.vatRate !== undefined) {
                      newP.vatPct = data.vatRate;
                      updatedProducts = true;
                    }
                    if (newP.discountPct === undefined && data.discountRate !== undefined) {
                      newP.discountPct = data.discountRate;
                      updatedProducts = true;
                    }
                    return newP;
                 });
                 if (updatedProducts) {
                   patch.products = newProducts;
                   changed = true;
                 }
               }
               return changed ? patch : null;
             },
             down: async () => null
           });
         } else if (col === 'payments') {
            await SafeMigrationRunner.run({
             migrationName: 'phase6-payments',
             collectionName: 'payments',
             up: async (id, data: any) => {
               if (data.soTien !== undefined && data.totalAmount === undefined) {
                 return { totalAmount: typeof data.soTien === 'number' ? data.soTien : 0 };
               }
               return null;
             },
             down: async () => null
           });
         }
      }
    }

    res.json({
      success: true,
      summary,
      totalCount: totalUpdated,
      isDryRun: dryRun
    });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ success: false, error: err.message || 'Lỗi chạy migration phase 6' });
  }
});

router.post('/standardize-entities', async (req, res) => {
  try {
    const { entityType = 'customers', dryRun = true } = req.body;
    
    const allowedCollections = ['customers', 'quotations', 'contracts', 'payments', 'deliveries'];
    if (!allowedCollections.includes(entityType)) {
      return res.status(400).json({ success: false, error: 'Entity type không hợp lệ' });
    }

    const snapshot = await db.collection(entityType).get();
    
    if (snapshot.empty) {
      return res.json({ success: true, message: 'Không tìm thấy dữ liệu nào để chuẩn hóa', updatedCount: 0, affectedDocs: [] });
    }

    const affectedDocs: Array<{ id: string; code: string; oldVal: Record<string, string>; newVal: Record<string, string> }> = [];
    const updates: Array<{ ref: any, data: any }> = [];

    // Lọc và chuẩn hoá các trường strings phổ biến
    snapshot.docs.forEach((docSnap) => {
      const data = docSnap.data();
      const rawTen = data.tenKhachHang || data.customerName || '';
      const rawLoai = data.loaiHinhDoanhNghiep || '';
      const rawDiaChi = data.diaChi || data.diachi || '';
      const rawNguoiDaiDien = data.nguoiDaiDien || '';
      const rawSdt = data.sdt || data.phone || '';

      const stdTen = rawTen ? cleanProperVietnameseText(rawTen) : '';
      const stdLoai = rawLoai ? cleanProperVietnameseText(rawLoai) : '';
      const stdDiaChi = rawDiaChi ? cleanProperVietnameseText(rawDiaChi) : '';
      const stdNguoiDaiDien = rawNguoiDaiDien ? cleanProperVietnameseText(rawNguoiDaiDien) : '';
      const stdSdt = rawSdt ? normalizePhoneNumber(rawSdt) : '';

      const needsChange = 
        rawTen !== stdTen || 
        rawLoai !== stdLoai || 
        rawDiaChi !== stdDiaChi || 
        rawNguoiDaiDien !== stdNguoiDaiDien ||
        rawSdt !== stdSdt;

      if (needsChange) {
        const changes: Record<string, any> = {};
        if (data.tenKhachHang !== undefined && rawTen !== stdTen) changes.tenKhachHang = stdTen;
        if (data.customerName !== undefined && rawTen !== stdTen) changes.customerName = stdTen;
        if (data.loaiHinhDoanhNghiep !== undefined && rawLoai !== stdLoai) changes.loaiHinhDoanhNghiep = stdLoai;
        if (data.diaChi !== undefined && rawDiaChi !== stdDiaChi) changes.diaChi = stdDiaChi;
        if (data.diachi !== undefined && rawDiaChi !== stdDiaChi) changes.diachi = stdDiaChi;
        if (data.nguoiDaiDien !== undefined && rawNguoiDaiDien !== stdNguoiDaiDien) changes.nguoiDaiDien = stdNguoiDaiDien;
        if (data.sdt !== undefined && rawSdt !== stdSdt) changes.sdt = stdSdt;
        if (data.phone !== undefined && rawSdt !== stdSdt) changes.phone = stdSdt;

        affectedDocs.push({
          id: docSnap.id,
          code: data.maKh || data.soPhieuBaoGia || data.soHopDong || 'N/A',
          oldVal: { 
            tenKhachHang: rawTen, 
            loaiHinhDoanhNghiep: rawLoai, 
            diaChi: rawDiaChi, 
            nguoiDaiDien: rawNguoiDaiDien,
            sdt: rawSdt
          },
          newVal: { 
            tenKhachHang: stdTen, 
            loaiHinhDoanhNghiep: stdLoai, 
            diaChi: stdDiaChi, 
            nguoiDaiDien: stdNguoiDaiDien,
            sdt: stdSdt
          }
        });

        updates.push({
          ref: docSnap.ref,
          data: changes
        });
      }
    });

    if (!dryRun && updates.length > 0) {
      let i = 0;
      while (i < updates.length) {
        const batch = db.batch();
        const chunk = updates.slice(i, i + 400);
        chunk.forEach(op => batch.update(op.ref, op.data));
        await batch.commit();
        i += 400;
      }
    }

    res.json({
      success: true,
      scannedCount: snapshot.size,
      updatedCount: updates.length,
      affectedDocs,
      isDryRun: dryRun
    });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ success: false, error: err.message || 'Lỗi chuẩn hóa dữ liệu' });
  }
});

router.post('/denormalize-customers', async (req, res) => {
  try {
    const batch = db.batch();
    let updatedCount = 0;

    // Fetch all customers into a map
    const customersSnapshot = await db.collection('customers').get();
    if (customersSnapshot.empty) {
       return res.json({ success: true, message: 'No customers found, nothing to migrate', updatedCount: 0 });
    }

    const customersMap = new Map<string, { tenKhachHang: string, sdt: string, maKh: string }>();
    customersSnapshot.docs.forEach(doc => {
      const data = doc.data();
      customersMap.set(doc.id, {
        tenKhachHang: data.tenKhachHang || '',
        sdt: data.sdt || '',
        maKh: data.maKh || ''
      });
    });

    const collections = ['contracts', 'quotations', 'payments', 'deliveries'];

    // Collect all promises to fetch records
    for (const col of collections) {
      const snapshot = await db.collection(col).get();
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.customerId && customersMap.has(data.customerId)) {
          const customerData = customersMap.get(data.customerId)!;
          
          let needsUpdate = false;
          if (data.tenKhachHang !== customerData.tenKhachHang) needsUpdate = true;
          if (data.sdt !== customerData.sdt) needsUpdate = true;
          if (!data.maKh || data.maKh !== customerData.maKh) needsUpdate = true;

          if (needsUpdate) {
             batch.update(doc.ref, {
               tenKhachHang: customerData.tenKhachHang,
               sdt: customerData.sdt,
               maKh: customerData.maKh
             });
             updatedCount++;
          }
        }
      });
    }

    // Since batch can only support 500 writes, we should handle this if there are more.
    // For safety, let's chunk the batch commits.
    // However, the above code only queued them up in one batch.
    // Let's refactor to chunk batches.

    if (updatedCount > 0) {
      // Re-fetch and do chunks
      const ALL_UPDATES: {ref: any, data: Record<string, unknown>}[] = [];
      for (const col of collections) {
        const snapshot = await db.collection(col).get();
        snapshot.docs.forEach((doc: any) => {
          const data = doc.data();
          if (data.customerId && customersMap.has(data.customerId)) {
            const customerData = customersMap.get(data.customerId)!;
            let needsUpdate = false;
            if (data.tenKhachHang !== customerData.tenKhachHang) needsUpdate = true;
            if (data.sdt !== customerData.sdt) needsUpdate = true;
            if (data.maKh !== customerData.maKh) needsUpdate = true;
  
            if (needsUpdate) {
               ALL_UPDATES.push({ ref: doc.ref, data: { tenKhachHang: customerData.tenKhachHang, sdt: customerData.sdt, maKh: customerData.maKh } })
            }
          }
        });
      }

      // Chunk into batches of 400
      let i = 0;
      while (i < ALL_UPDATES.length) {
         const chunkBatch = db.batch();
         const chunk = ALL_UPDATES.slice(i, i + 400);
         chunk.forEach(op => chunkBatch.update(op.ref, op.data as any));
         await chunkBatch.commit();
         i += 400;
      }
    }

    res.json({ success: true, updatedCount });
  } catch (error) {
    console.error('Migration error:', error);
    res.status(500).json({ success: false, error: 'Failed to migrate' });
  }
});

export const migrationRoutes = router;
