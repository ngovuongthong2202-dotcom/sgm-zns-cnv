import { adminDb as db } from '../src/backend/config/firebase.admin';
import * as path from 'path';
import * as fs from 'fs';

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');

  console.log(`Starting backfill... ${isDryRun ? '(DRY RUN)' : '(LIVE RUN)'}`);

  
  // Cache customers
  console.log("Fetching customers cache...");
  const customersCache = new Map();
  const customersSnapshot = await db.collection('customers').get();
  customersSnapshot.forEach(doc => {
    customersCache.set(doc.id, doc.data());
  });
  console.log(`Loaded ${customersCache.size} customers.`);

  const collectionsToBackfill = ['quotations', 'contracts', 'payments', 'deliveries'];

  for (const collectionName of collectionsToBackfill) {
    console.log(`\n--- Backfilling ${collectionName} ---`);
    const snapshot = await db.collection(collectionName).get();
    
    let updatedCount = 0;
    const batch = db.batch();
    let batchCount = 0;

    for (const doc of snapshot.docs) {
      const data = doc.data();
      let updates: any = {};
      
      const customerId = data.customerId;
      if (customerId && customersCache.has(customerId)) {
        const customerData = customersCache.get(customerId);
        
        // Only fill if empty
        if (!data.maKh && customerData.maKh) {
          updates.maKh = customerData.maKh;
        }
        if (!data.tenKhachHang && customerData.tenKhachHang) {
          updates.tenKhachHang = customerData.tenKhachHang;
        }
        if (!data.sdt && customerData.sdt) {
          updates.sdt = customerData.sdt;
        }
        
        // Also if we are at it, for quotation/contract/payment/delivery specific fields, let's just do maKh, tenKhachHang, sdt as requested
      }

      if (Object.keys(updates).length > 0) {
        if (!isDryRun) {
          batch.update(doc.ref, updates);
        }
        updatedCount++;
        batchCount++;
        console.log(`[${collectionName}] ${doc.id}: ${JSON.stringify(updates)}`);

        if (batchCount >= 500 && !isDryRun) {
          await batch.commit();
          batchCount = 0;
          console.log(`Committed batch for ${collectionName}`);
        }
      }
    }

    if (batchCount > 0 && !isDryRun) {
      await batch.commit();
    }

    console.log(`Completed ${collectionName}: ${updatedCount} documents to update.`);
  }
}

main().catch(console.error);
