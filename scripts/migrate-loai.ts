import { adminDb } from '../src/backend/config/firebase.admin';

async function migrateLoai(dryRun: boolean = true) {
  console.log(`Starting migration (Dry Run: ${dryRun})`);
  const collections = ['quotations', 'contracts', 'payments', 'deliveries'];

  let totalUpdated = 0;

  for (const coll of collections) {
    const snap = await adminDb.collection(coll).get();
    let collUpdated = 0;
    
    for (const doc of snap.docs) {
      const data = doc.data();
      const updates: any = {};
      
      if (coll === 'quotations') {
        if (data.loai && !data.loaiBaoGia) updates.loaiBaoGia = data.loai;
      }
      
      if (coll === 'contracts') {
        if (data.loai && !data.loaiSanPham) updates.loaiSanPham = data.loai;
      }
      
      if ((coll === 'contracts' || coll === 'payments' || coll === 'deliveries')) {
        if (!data.loaiBaoGia && data.quotationId) {
          const qDoc = await adminDb.collection('quotations').doc(data.quotationId).get();
          if (qDoc.exists) {
            const qData = qDoc.data();
            if (qData?.loai) updates.loaiBaoGia = qData.loai;
            else if (qData?.loaiBaoGia) updates.loaiBaoGia = qData.loaiBaoGia;
          }
        }
      }

      if (Object.keys(updates).length > 0) {
        if (!dryRun) {
          await doc.ref.update(updates);
        }
        console.log(`[${coll}] ${doc.id} -> applying`, updates);
        collUpdated++;
        totalUpdated++;
      }
    }
    console.log(`[${coll}] updated ${collUpdated} docs.`);
  }
  
  console.log(`Migration finished. Total affected: ${totalUpdated} (Dry run: ${dryRun})`);
}

migrateLoai(process.argv.includes('--run') ? false : true)
  .then(() => process.exit(0))
  .catch(e => { console.error(e); process.exit(1); });
