import { adminDb as db } from '../src/backend/config/firebase.admin';

function getFallbackCreatedAt(collName: string, data: any): string {
  if (collName === 'quotations' && data.ngayBaoGia) return data.ngayBaoGia;
  if (collName === 'contracts' && data.ngayKy) return data.ngayKy;
  if (collName === 'payments' && data.ngayThanhToan) return data.ngayThanhToan;
  if (collName === 'deliveries' && (data.ngayGiaoMay || data.ngayGiao)) return data.ngayGiaoMay || data.ngayGiao;

  if (data.createdAt) return data.createdAt;
  if (data.created_at) return data.created_at;
  if (data.ngayTao) return data.ngayTao;
  if (data.updatedAt) return data.updatedAt;
  if (data.ngayCapNhat) return data.ngayCapNhat;

  return new Date().toISOString();
}

async function backfillDeletedAt() {
  const isDryRun = process.argv.includes('--dry-run');
  console.log(`Starting deletedAt and createdAt backfill... ${isDryRun ? '(DRY RUN)' : '(LIVE RUN)'}`);

  const collections = ['customers', 'quotations', 'contracts', 'payments', 'deliveries'];
  
  for (const collName of collections) {
    console.log(`\nProcessing collection: ${collName}`);
    let batch = db.batch();
    let batchCount = 0;
    
    let stats = {
      totalFound: 0,
      totalUpdated: 0,
      missingDeletedAt: 0,
      missingCreatedAt: 0,
    };
    
    const snapshot = await db.collection(collName).select('deletedAt', 'createdAt', 'created_at', 'ngayBaoGia', 'ngayKy', 'ngayThanhToan', 'ngayGiaoMay', 'ngayGiao', 'ngayTao', 'updatedAt', 'ngayCapNhat').get();
    stats.totalFound = snapshot.size;

    for (const doc of snapshot.docs) {
      const data = doc.data();
      let needsUpdate = false;
      const updateData: any = {};

      if (data.deletedAt === undefined) {
        updateData.deletedAt = null;
        stats.missingDeletedAt++;
        needsUpdate = true;
      }

      if (data.createdAt === undefined) {
        updateData.createdAt = getFallbackCreatedAt(collName, data);
        stats.missingCreatedAt++;
        needsUpdate = true;
      }

      if (needsUpdate) {
        if (!isDryRun) {
          batch.update(doc.ref, updateData);
        }
        batchCount++;
        stats.totalUpdated++;
      }
      
      if (batchCount >= 400 && !isDryRun) {
        await batch.commit();
        console.log(`Committed 400 updates to ${collName}`);
        batch = db.batch();
        batchCount = 0;
      }
    }
    
    if (batchCount > 0 && !isDryRun) {
      await batch.commit();
      console.log(`Committed final ${batchCount} updates to ${collName}`);
    }
    
    console.log(`Finished ${collName}: updated ${stats.totalUpdated} documents out of ${stats.totalFound}`);
    console.log(`  - Missing deletedAt: ${stats.missingDeletedAt}`);
    console.log(`  - Missing createdAt: ${stats.missingCreatedAt}`);
  }
}

backfillDeletedAt().catch((error) => {
  console.error('Failed to backfill:', error);
});
