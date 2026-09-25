import { Router } from 'express';
import { adminDb as db } from '../config/supabase.admin';
import { metricsRollupService } from '../../modules/reporting/infrastructure/metrics/metrics-rollup.service';
import { GetDashboardKpis } from '../../modules/reporting/application/queries/GetDashboardKpis';

const router = Router();

// GET /api/analytics/today
router.get('/today', async (req, res) => {
   try {
     let data = await GetDashboardKpis.execute();
     
     if (!data) {
        // Fallback: build on demand
        await metricsRollupService.runRollup();
        data = await GetDashboardKpis.execute();
     } else {
        if (data && data.generatedAt) {
           const ageMs = Date.now() - new Date(data.generatedAt).getTime();
           if (ageMs > 30 * 60 * 1000) {
              // older than 30 mins, trigger background recalculate
              // Optimistically update generatedAt to prevent concurrent triggers
              const todayString = new Date().toISOString().slice(0, 10);
              await db.collection('metricsRollup').doc(`daily_${todayString}`).set({ generatedAt: new Date().toISOString() }, { merge: true });
              metricsRollupService.runRollup().catch(console.error);
           }
        }
     }

     const updateTime = data?.updateTime || Date.now().toString();
     const etag = `W/"${updateTime}"`;
     
     if (req.headers['if-none-match'] === etag) {
        return res.status(304).end();
     }

     res.setHeader('ETag', etag);
     res.setHeader('Cache-Control', 'public, no-cache, must-revalidate'); // rely on SWR deduplication and ETag revalidation instead of naive browser max-age
     
     return res.json({ success: true, data });
   } catch (err: unknown) { 
     const errorMessage = err instanceof Error ? err.message : String(err);
     console.error('Fetch today metrics error:', err);
     res.status(500).json({ success: false, error: errorMessage });
   }
});

router.post('/webhook', async (req, res) => {
  try {
    const { collectionName: _collectionName, operation: _operation, delta } = req.body;
    // delta is something like { amount: 5000, count: 1, znsSuccess: 1, ... }
    
    // Simple naive aggregation for MVP
    const metricRef = db.collection('metrics').doc('master_rollup');
    const doc = await metricRef.get();
    
    if (!doc.exists) {
      await metricRef.set({
         totalPipelineValue: 0,
         totalWonValue: 0,
         totalCustomers: 0,
         totalContracts: 0,
         totalQuotations: 0,
         totalZnsSent: 0,
         lastUpdated: new Date().toISOString()
      });
    }

    // In a real environment, we would use FieldValue.increment
    const current = (doc.exists && doc.data()) || {
      totalPipelineValue: 0,
      totalWonValue: 0,
      totalCustomers: 0,
      totalContracts: 0,
      totalQuotations: 0,
      totalZnsSent: 0,
    };
    
    const increments: Record<string, unknown> = {
      totalPipelineValue: (Number(current.totalPipelineValue) || 0) + (Number(delta.pipelineValue) || 0),
      totalWonValue: (Number(current.totalWonValue) || 0) + (Number(delta.wonValue) || 0),
      totalCustomers: (Number(current.totalCustomers) || 0) + (Number(delta.customersCount) || 0),
      totalContracts: (Number(current.totalContracts) || 0) + (Number(delta.contractsCount) || 0),
      totalQuotations: (Number(current.totalQuotations) || 0) + (Number(delta.quotationsCount) || 0),
      totalZnsSent: (Number(current.totalZnsSent) || 0) + (Number(delta.znsSent) || 0),
      lastUpdated: new Date().toISOString()
    };

    await metricRef.set(increments, { merge: true });

    res.json({ success: true });
  } catch (err: unknown) { 
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error('Analytics webhook error:', err);
    res.status(500).json({ success: false, error: errorMessage });
  }
});

// Also provide an endpoint to force recalculate all from DB
router.post('/recalculate', async (req, res) => {
   try {
      await metricsRollupService.runRollup();
      res.json({ success: true });
   } catch (err: unknown) { 
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error(err);
      res.status(500).json({ success: false, error: errorMessage });
   }
});

// Endpoint to trigger a custom background rollup
router.post('/custom-task', async (req, res) => {
   try {
      const { fromDate, toDate } = req.body;
      if (!fromDate || !toDate) {
         return res.status(400).json({ success: false, error: 'Missing fromDate or toDate' });
      }
      const taskId = `${Date.now()}_${Math.random().toString(36).substring(7)}`;
      
      // Start async without awaiting
      metricsRollupService.runCustomRollup(fromDate, toDate, taskId).catch(console.error);

      res.json({ success: true, taskId });
   } catch (err: unknown) { 
      const errorMessage = err instanceof Error ? err.message : String(err);
      res.status(500).json({ success: false, error: errorMessage });
   }
});

export default router;
