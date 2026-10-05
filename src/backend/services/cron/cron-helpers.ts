import { adminDb } from "../../config/supabase.admin";
import { logger } from "../../lib/logger";

export async function syncCustomerSnapshots(forceFullSync = false): Promise<{ processed: number }> {
  let processed = 0;
  try {
    if (forceFullSync) {
      // 1. Quét toàn diện tất cả khách hàng
      const customersSnap = await adminDb.collection("customers").get();
      if (customersSnap.empty) return { processed: 0 };

      const collections = ["quotations", "contracts", "payments", "deliveries"];

      for (const custDoc of customersSnap.docs) {
        const custData = custDoc.data();
        const cid = custDoc.id;
        const maKh = custData.maKh;
        const tenKhachHang = custData.tenKhachHang;
        const sdt = custData.sdt;
        const nguoiPhuTrach = custData.nguoiPhuTrach;
        const nguoiDaiDien = custData.nguoiDaiDien;

        const updates: Record<string, any> = {};
        if (tenKhachHang !== undefined) updates.tenKhachHang = tenKhachHang;
        if (sdt !== undefined) updates.sdt = sdt;
        if (nguoiPhuTrach !== undefined) updates.nguoiPhuTrach = nguoiPhuTrach;
        if (nguoiDaiDien !== undefined) updates.nguoiDaiDien = nguoiDaiDien;
        if (maKh !== undefined) updates.maKh = maKh;

        if (Object.keys(updates).length === 0) continue;

        let hasUpdatesForCust = false;
        let batch = adminDb.batch();
        let currentBatchCount = 0;

        for (const coll of collections) {
          // Standard: find by customerId
          const docsById = await adminDb
            .collection(coll)
            .where("customerId", "==", cid)
            .get();

          const updatedDocIds = new Set<string>();

          for (const d of docsById.docs) {
            const dData = d.data();
            let needsUpdate = false;
            if (updates.tenKhachHang !== undefined && dData.tenKhachHang !== updates.tenKhachHang) needsUpdate = true;
            if (updates.sdt !== undefined && dData.sdt !== updates.sdt) needsUpdate = true;
            if (updates.nguoiPhuTrach !== undefined && dData.nguoiPhuTrach !== updates.nguoiPhuTrach) needsUpdate = true;
            if (updates.nguoiDaiDien !== undefined && dData.nguoiDaiDien !== updates.nguoiDaiDien) needsUpdate = true;
            if (updates.maKh !== undefined && dData.maKh !== updates.maKh) needsUpdate = true;

            if (needsUpdate) {
              const docUpdates: Record<string, any> = { ...updates };
              if (coll === 'quotations' && updates.sdt && dData.sdt && dData.sdt !== updates.sdt) {
                if (dData.trangThaiGuiTinBaoGia === 'THANH_CONG' || dData.trangThaiZns === 'THANH_CONG') {
                  docUpdates.trangThaiGuiTinBaoGia = 'CHO_GUI';
                  docUpdates.trangThaiZns = 'CHO_GUI';
                  const nowIso = new Date().toISOString();
                  const oldAudit = dData.thongTinGuiZnsBaoGia || {};
                  docUpdates.thongTinGuiZnsBaoGia = {
                    ...oldAudit,
                    needsResendAfterEdit: true,
                    previousSentPhone: dData.sdt,
                    previousSentAt: oldAudit.thoiGianGui || dData.sentAt,
                    resetReason: `Đổi số điện thoại khách hàng từ ${dData.sdt} sang ${updates.sdt}`
                  };
                  const prevLogs = dData.nhatKySuaDoi || [];
                  docUpdates.nhatKySuaDoi = [
                    ...prevLogs,
                    {
                      thoiGian: nowIso,
                      nguoiThucHien: 'Hệ thống CRON đồng bộ KH 360',
                      noiDungThayDoi: `Chuyển trạng thái ZNS sang Chờ gửi do đổi SĐT khách hàng: ${dData.sdt} ➔ ${updates.sdt}`
                    }
                  ];
                }
              }
              batch.update(d.ref, docUpdates);
              updatedDocIds.add(d.id);
              currentBatchCount++;
              hasUpdatesForCust = true;

              if (currentBatchCount >= 450) {
                await batch.commit();
                batch = adminDb.batch();
                currentBatchCount = 0;
              }
            }
          }

          // Legacy: find by maKh if maKh is defined
          if (maKh) {
            const docsByCode = await adminDb
              .collection(coll)
              .where("maKh", "==", maKh)
              .get();

            for (const d of docsByCode.docs) {
              if (!updatedDocIds.has(d.id)) {
                const dData = d.data();
                let needsUpdate = false;
                if (!dData.customerId) needsUpdate = true;
                if (updates.tenKhachHang !== undefined && dData.tenKhachHang !== updates.tenKhachHang) needsUpdate = true;
                if (updates.sdt !== undefined && dData.sdt !== updates.sdt) needsUpdate = true;
                if (updates.nguoiPhuTrach !== undefined && dData.nguoiPhuTrach !== updates.nguoiPhuTrach) needsUpdate = true;
                if (updates.nguoiDaiDien !== undefined && dData.nguoiDaiDien !== updates.nguoiDaiDien) needsUpdate = true;

                if (needsUpdate) {
                  const docUpdates: Record<string, any> = {
                    ...updates,
                    customerId: cid
                  };
                  if (coll === 'quotations' && updates.sdt && dData.sdt && dData.sdt !== updates.sdt) {
                    if (dData.trangThaiGuiTinBaoGia === 'THANH_CONG' || dData.trangThaiZns === 'THANH_CONG') {
                      docUpdates.trangThaiGuiTinBaoGia = 'CHO_GUI';
                      docUpdates.trangThaiZns = 'CHO_GUI';
                      const nowIso = new Date().toISOString();
                      const oldAudit = dData.thongTinGuiZnsBaoGia || {};
                      docUpdates.thongTinGuiZnsBaoGia = {
                        ...oldAudit,
                        needsResendAfterEdit: true,
                        previousSentPhone: dData.sdt,
                        previousSentAt: oldAudit.thoiGianGui || dData.sentAt,
                        resetReason: `Đổi số điện thoại khách hàng từ ${dData.sdt} sang ${updates.sdt}`
                      };
                      const prevLogs = dData.nhatKySuaDoi || [];
                      docUpdates.nhatKySuaDoi = [
                        ...prevLogs,
                        {
                          thoiGian: nowIso,
                          nguoiThucHien: 'Hệ thống CRON đồng bộ KH 360',
                          noiDungThayDoi: `Chuyển trạng thái ZNS sang Chờ gửi do đổi SĐT khách hàng: ${dData.sdt} ➔ ${updates.sdt}`
                        }
                      ];
                    }
                  }
                  batch.update(d.ref, docUpdates);
                  currentBatchCount++;
                  hasUpdatesForCust = true;

                  if (currentBatchCount >= 450) {
                    await batch.commit();
                    batch = adminDb.batch();
                    currentBatchCount = 0;
                  }
                }
              }
            }
          }
        }

        if (currentBatchCount > 0) {
          await batch.commit();
        }

        if (hasUpdatesForCust) {
          processed++;
        }
      }

      // Mark all pending sync jobs as DONE
      const pendingJobsQuery = await adminDb
        .collection("crossEntitySyncJobs")
        .where("status", "==", "PENDING")
        .get();
      if (!pendingJobsQuery.empty) {
        const jobsBatch = adminDb.batch();
        pendingJobsQuery.docs.forEach(d => {
          jobsBatch.update(d.ref, {
            status: "DONE",
            processedAt: new Date().toISOString()
          });
        });
        await jobsBatch.commit();
      }

    } else {
      // 2. Chạy ngầm từng job PENDING như ban đầu
      const pendingJobs = await adminDb
        .collection("crossEntitySyncJobs")
        .where("status", "==", "PENDING")
        .limit(20)
        .get();

      if (pendingJobs.empty) return { processed: 0 };

      for (const jobDoc of pendingJobs.docs) {
        const batch = adminDb.batch();

        const job = jobDoc.data() as {
          customerId: string;
          tenKhachHang?: string;
          sdt?: string;
          nguoiPhuTrach?: string;
          nguoiDaiDien?: string;
          maKh?: string;
          status: string;
        };

        const customerDoc = await adminDb
          .collection("customers")
          .doc(job.customerId)
          .get();
        const custData = customerDoc.exists ? customerDoc.data() : null;

        const targetMaKh = job.maKh || custData?.maKh;
        const updates: Record<string, any> = {};

        const tenKhachHang = custData?.tenKhachHang || job.tenKhachHang;
        const sdt = custData?.sdt || job.sdt;
        const nguoiPhuTrach = custData?.nguoiPhuTrach || job.nguoiPhuTrach;
        const nguoiDaiDien = custData?.nguoiDaiDien || job.nguoiDaiDien;

        if (tenKhachHang !== undefined) updates.tenKhachHang = tenKhachHang;
        if (sdt !== undefined) updates.sdt = sdt;
        if (nguoiPhuTrach !== undefined) updates.nguoiPhuTrach = nguoiPhuTrach;
        if (nguoiDaiDien !== undefined) updates.nguoiDaiDien = nguoiDaiDien;
        if (targetMaKh !== undefined) updates.maKh = targetMaKh;

        if (Object.keys(updates).length > 0) {
          const collections = [
            "quotations",
            "contracts",
            "payments",
            "deliveries",
          ];
          for (const coll of collections) {
            const docsById = await adminDb
              .collection(coll)
              .where("customerId", "==", job.customerId)
              .limit(100)
              .get();

            const updatedDocIds = new Set<string>();
            for (const d of docsById.docs) {
              const dData = d.data();
              const docUpdates: Record<string, any> = { ...updates };
              if (coll === 'quotations' && updates.sdt && dData.sdt && dData.sdt !== updates.sdt) {
                if (dData.trangThaiGuiTinBaoGia === 'THANH_CONG' || dData.trangThaiZns === 'THANH_CONG') {
                  docUpdates.trangThaiGuiTinBaoGia = 'CHO_GUI';
                  docUpdates.trangThaiZns = 'CHO_GUI';
                  const nowIso = new Date().toISOString();
                  const oldAudit = dData.thongTinGuiZnsBaoGia || {};
                  docUpdates.thongTinGuiZnsBaoGia = {
                    ...oldAudit,
                    needsResendAfterEdit: true,
                    previousSentPhone: dData.sdt,
                    previousSentAt: oldAudit.thoiGianGui || dData.sentAt,
                    resetReason: `Đổi số điện thoại khách hàng từ ${dData.sdt} sang ${updates.sdt}`
                  };
                  const prevLogs = dData.nhatKySuaDoi || [];
                  docUpdates.nhatKySuaDoi = [
                    ...prevLogs,
                    {
                      thoiGian: nowIso,
                      nguoiThucHien: 'Hệ thống CRON đồng bộ KH 360',
                      noiDungThayDoi: `Chuyển trạng thái ZNS sang Chờ gửi do đổi SĐT khách hàng: ${dData.sdt} ➔ ${updates.sdt}`
                    }
                  ];
                }
              }
              batch.update(d.ref, docUpdates);
              updatedDocIds.add(d.id);
            }

            if (targetMaKh) {
              const docsByCode = await adminDb
                .collection(coll)
                .where("maKh", "==", targetMaKh)
                .limit(100)
                .get();
              for (const d of docsByCode.docs) {
                if (!updatedDocIds.has(d.id)) {
                  const dData = d.data();
                  const docUpdates: Record<string, any> = { 
                    ...updates, 
                    customerId: job.customerId 
                  };
                  if (coll === 'quotations' && updates.sdt && dData.sdt && dData.sdt !== updates.sdt) {
                    if (dData.trangThaiGuiTinBaoGia === 'THANH_CONG' || dData.trangThaiZns === 'THANH_CONG') {
                      docUpdates.trangThaiGuiTinBaoGia = 'CHO_GUI';
                      docUpdates.trangThaiZns = 'CHO_GUI';
                      const nowIso = new Date().toISOString();
                      const oldAudit = dData.thongTinGuiZnsBaoGia || {};
                      docUpdates.thongTinGuiZnsBaoGia = {
                        ...oldAudit,
                        needsResendAfterEdit: true,
                        previousSentPhone: dData.sdt,
                        previousSentAt: oldAudit.thoiGianGui || dData.sentAt,
                        resetReason: `Đổi số điện thoại khách hàng từ ${dData.sdt} sang ${updates.sdt}`
                      };
                      const prevLogs = dData.nhatKySuaDoi || [];
                      docUpdates.nhatKySuaDoi = [
                        ...prevLogs,
                        {
                          thoiGian: nowIso,
                          nguoiThucHien: 'Hệ thống CRON đồng bộ KH 360',
                          noiDungThayDoi: `Chuyển trạng thái ZNS sang Chờ gửi do đổi SĐT khách hàng: ${dData.sdt} ➔ ${updates.sdt}`
                        }
                      ];
                    }
                  }
                  batch.update(d.ref, docUpdates);
                  updatedDocIds.add(d.id);
                }
              }
            }
          }
        }

        batch.update(jobDoc.ref, {
          status: "DONE",
          processedAt: new Date().toISOString(),
        });
        await batch.commit();
        processed++;
      }
    }
  } catch (e) {
    console.error("Error syncing snapshots:", e);
  }
  return { processed };
}




export async function cleanupExpiredLocks(): Promise<{ deletedCount: number }> {
  let deletedCount = 0;
  try {
    const expiredLocks = await adminDb
      .collection("systemLocks")
      .where("expiresAt", "<", Date.now())
      .get();

    if (!expiredLocks.empty) {
      const batch = adminDb.batch();
      for (const doc of expiredLocks.docs) {
        batch.delete(doc.ref);
        deletedCount++;
      }
      await batch.commit();
      logger.info({ deletedCount }, "Deleted expired system locks in CRON");
    }
  } catch (e) {
    console.error("Error cleaning up expired system locks:", e);
  }
  return { deletedCount };
}
