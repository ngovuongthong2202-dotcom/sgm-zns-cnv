import { adminDb } from '../src/backend/config/firebase.admin.js';
import { logger } from '../src/backend/lib/logger.js';

async function backfillPayments() {
  logger.info("=== START GENERAL PAYMENTS BACKFILL MIGRATION ===");
  try {
    const paymentsCollection = adminDb.collection('payments');
    const snapshot = await paymentsCollection.get();
    
    if (snapshot.empty) {
      logger.info("No payments records found in the database. Exiting.");
      return;
    }

    logger.info(`Fetched ${snapshot.size} total payment documents. Starting mapping...`);

    let needBackfillCount = 0;
    const updates: { ref: FirebaseFirestore.DocumentReference, data: { giaTriHopDong: number } }[] = [];

    snapshot.docs.forEach(docSnap => {
      const data = docSnap.data();
      
      // If giaTriHopDong already exists and is a valid truthy number (not null/undefined/0), skip it
      if (data.giaTriHopDong !== undefined && data.giaTriHopDong !== null && typeof data.giaTriHopDong === 'number') {
        return;
      }

      // Backfill: try to extract from totalAmount first, fall back to subTotal, then soTien, then 0.
      const rawTotalAmount = Number(data.totalAmount);
      const rawSubTotal = Number(data.subTotal);
      const rawSoTien = Number(data.soTien);
      
      let giaTri = 0;
      if (!isNaN(rawTotalAmount) && rawTotalAmount > 0) {
        giaTri = rawTotalAmount;
      } else if (!isNaN(rawSubTotal) && rawSubTotal > 0) {
        giaTri = rawSubTotal;
      } else if (!isNaN(rawSoTien) && rawSoTien > 0) {
        giaTri = rawSoTien;
      }

      // We queues up updates
      updates.push({
        ref: docSnap.ref,
        data: { giaTriHopDong: giaTri }
      });
      needBackfillCount++;
    });

    if (needBackfillCount === 0) {
      logger.info("All payments already have 'giaTriHopDong' populated. No updates needed!");
      return;
    }

    logger.info(`Detected ${needBackfillCount} payment documents that require backfilling. Deploying batched updates...`);

    // Batched commits (maximum 400 writes per batch to stay safely within Firestore 500 limit)
    let processed = 0;
    const BATCH_SIZE = 400;

    for (let i = 0; i < updates.length; i += BATCH_SIZE) {
      const batch = adminDb.batch();
      const chunk = updates.slice(i, i + BATCH_SIZE);

      chunk.forEach(updateItem => {
        batch.update(updateItem.ref, updateItem.data);
      });

      await batch.commit();
      processed += chunk.length;
      logger.info(`[BATCH COMT] Successfully processed block of ${chunk.length} updates. Total: ${processed}/${needBackfillCount}`);
    }

    logger.info(`=== SUCCESS: Backfilled 'giaTriHopDong' for ${processed} documents. ===`);
  } catch (error: any) {
    logger.error({ err: error }, "FATAL error during one-time payments backfill migration");
    process.exit(1);
  }
}

// Run script
backfillPayments().then(() => {
  logger.info("Migration job finished successfully.");
  process.exit(0);
}).catch(err => {
  logger.error(err, "Exception thrown during script execution.");
  process.exit(1);
});
