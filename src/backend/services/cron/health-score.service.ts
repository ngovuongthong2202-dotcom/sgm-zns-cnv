import { adminDb } from '../../config/supabase.admin';
import { calculateHealthScore } from '@/src/modules/customers';
import { logger } from '../../lib/logger';

export class HealthScoreService {
  async computeHealthScoresBulk(): Promise<number> {
    logger.info('Starting Bulk Health Score Computation');
    
    // 1. Fetch auxiliary data
    // In a massive DB we would chunk this or query per customer.
    // For SMB scale, fetching everything to memory and processing is viable.
    const quotationsSnap = await adminDb.collection('quotations').where('deletedAt', '==', null).get();
    const contractsSnap = await adminDb.collection('contracts').where('deletedAt', '==', null).get();
    const paymentsSnap = await adminDb.collection('payments').where('deletedAt', '==', null).get();

    const quotations = quotationsSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
    const contracts = contractsSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));
    const payments = paymentsSnap.docs.map(d => ({ id: d.id, ...d.data() } as any));

    // 2. Iterate customers and compute
    const customersSnap = await adminDb.collection('customers').where('deletedAt', '==', null).get();
    let updatedCount = 0;
    
    let batch = adminDb.batch();
    for (const doc of customersSnap.docs) {
      const c = { id: doc.id, ...doc.data() } as import('@/src/domain/schema/customer.schema').Customer;
      
      const healthInfo = calculateHealthScore(c, quotations, contracts, payments);
      
      batch.update(doc.ref, { computedHealthScore: healthInfo });
      updatedCount++;

      if (updatedCount % 400 === 0) {
        await batch.commit();
        batch = adminDb.batch();
      }
    }

    if (updatedCount % 400 !== 0) {
      await batch.commit();
    }

    logger.info(`Computed Health Score for ${updatedCount} customers.`);
    return updatedCount;
  }
}

export const healthScoreService = new HealthScoreService();
