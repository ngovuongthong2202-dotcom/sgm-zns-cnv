import { adminDb } from '../config/supabase.admin';
import { logger } from './logger';

export interface MigrationConfig<T = unknown> {
  migrationName: string;
  collectionName: string;
  // Function to process each document. Returns the NEW data to merge, or null if no update needed.
  up: (docId: string, currentData: T) => Promise<Partial<T> | null>;
  // Function to revert the update. Returns data to merge, or null if no change needed.
  down: (docId: string, currentData: T, previousDataSnapshot: Partial<T>) => Promise<Partial<T> | null>;
  batchSize?: number;
}

export class SafeMigrationRunner {
  static async run<T = unknown>(config: MigrationConfig<T>, isRevert: boolean = false) {
    const { migrationName, collectionName, up, down, batchSize = 500 } = config;
    const logRef = adminDb.collection('_migrationLogs').doc(migrationName);
    
    logger.info(`Starting migration ${isRevert ? 'REVERT' : 'UP'}: ${migrationName}`);
    
    // Check previous run status
    const logDoc = await logRef.get();
    let history: Record<string, Partial<T>> = {};
    if (logDoc.exists) {
        if (!isRevert && logDoc.data()?.status === 'COMPLETED') {
            logger.info(`Migration ${migrationName} already completed. Idempotent skip.`);
            return;
        }
        history = logDoc.data()?.snapshots || {};
    } else if (isRevert) {
        logger.error(`Cannot revert ${migrationName}: No migration log found.`);
        return;
    }

    const snapshot = await adminDb.collection(collectionName).get();
    const docs = snapshot.docs;
    
    let processedCount = 0;
    let batch = adminDb.batch();
    let currentBatchSize = 0;
    const newHistory: Record<string, Partial<T>> = { ...history };

    for (const doc of docs) {
      if (isRevert) {
          // Revert logic
          if (!history[doc.id]) continue; // Skipping docs that weren't modified
          
          const patch = await down(doc.id, doc.data() as T, history[doc.id]);
          if (patch !== null) {
              batch.update(doc.ref, patch);
              delete newHistory[doc.id];
              currentBatchSize++;
          }
      } else {
          // Up logic
          if (history[doc.id]) continue; // Already processed in previous interrupted run
          
          const patch = await up(doc.id, doc.data() as T);
          if (patch !== null) {
              newHistory[doc.id] = doc.data() as Partial<T>; // store snapshot before change
              batch.update(doc.ref, patch);
              currentBatchSize++;
          }
      }

      // Commit batches
      if (currentBatchSize >= batchSize) {
         // Also save migration log progress
         batch.set(logRef, { snapshots: newHistory, status: 'IN_PROGRESS', lastUpdated: new Date().toISOString() }, { merge: true });
         await batch.commit();
         processedCount += currentBatchSize;
         logger.info(`Committed batch of ${currentBatchSize}. Total processed so far: ${processedCount}.`);
         batch = adminDb.batch();
         currentBatchSize = 0;
      }
    }

    // Final commit
    if (currentBatchSize > 0 || isRevert) {
         const finalStatus = isRevert ? 'REVERTED' : 'COMPLETED';
         batch.set(logRef, { snapshots: newHistory, status: finalStatus, lastUpdated: new Date().toISOString() }, { merge: true });
         await batch.commit();
         processedCount += currentBatchSize;
    }

    logger.info(`Finish migration ${isRevert ? 'REVERT' : 'UP'}: ${migrationName}. Total changed docs: ${processedCount}`);
  }
}
