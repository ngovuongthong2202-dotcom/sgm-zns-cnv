import { Router } from 'express';
import { adminDb as db } from '../config/supabase.admin';
import { logger } from '../lib/logger';

const router = Router();

router.get('/customer-summary', async (req, res) => {
  try {
    const customerId = req.query.customerId as string;
    if (!customerId) return res.status(400).json({ success: false, error: 'Missing customerId' });

    const [quotes, contracts, payments, deliveries, paymentRecords] = await Promise.all([
      db.collection('quotations').where('customerId', '==', customerId).where('deletedAt', '==', null).count().get(),
      db.collection('contracts').where('customerId', '==', customerId).where('deletedAt', '==', null).count().get(),
      db.collection('payments').where('customerId', '==', customerId).where('deletedAt', '==', null).count().get(),
      db.collection('deliveries').where('customerId', '==', customerId).where('deletedAt', '==', null).count().get(),
      db.collection('payments').where('customerId', '==', customerId).where('deletedAt', '==', null).get()
    ]);

    const tongTien = paymentRecords.docs.reduce((sum: number, doc: any) => {
      const d = doc.data();
      return sum + Number(d.soTien || d.totalAmount || 0);
    }, 0);

    res.json({
      success: true,
      data: {
        countQuotations: quotes.data().count,
        countContracts: contracts.data().count,
        countPayments: payments.data().count,
        countDeliveries: deliveries.data().count,
        tongTien
      }
    });
  } catch (error) {
    logger.error({ err: error }, 'Error fetching customer summary');
    res.status(500).json({ success: false, error: 'Failed to aggregate customer summary' });
  }
});

router.get('/counters', async (req, res) => {
  try {
    // Using parallel count queries for performance, filtered by deletedAt == null
    const [customers, contracts, quotations, deliveries, payments] = await Promise.all([
      db.collection('customers').where('deletedAt', '==', null).count().get(),
      db.collection('contracts').where('deletedAt', '==', null).count().get(),
      db.collection('quotations').where('deletedAt', '==', null).count().get(),
      db.collection('deliveries').where('deletedAt', '==', null).count().get(),
      db.collection('payments').where('deletedAt', '==', null).count().get(),
    ]);

    res.json({
      success: true,
      data: {
        customers: customers.data().count,
        contracts: contracts.data().count,
        quotations: quotations.data().count,
        deliveries: deliveries.data().count,
        payments: payments.data().count,
      }
    });
  } catch (error) {
    logger.error({ err: error }, 'Error fetching metrics counters');
    res.status(500).json({ success: false, error: 'Failed to aggregate metrics' });
  }
});

router.get('/monitor', async (req, res) => {
  try {
    const [heartbeatsSnap, alertsSnap, clientErrorsSnap] = await Promise.all([
      db.collection('jobHeartbeats').orderBy('lastRun', 'desc').limit(10).get().catch(() => ({ docs: [] })),
      db.collection('systemAlerts').orderBy('timestamp', 'desc').limit(10).get().catch(() => ({ docs: [] })),
      db.collection('clientErrors').orderBy('createdAt', 'desc').limit(10).get().catch(() => ({ docs: [] }))
    ]);
    
    const heartbeats = ('docs' in heartbeatsSnap ? heartbeatsSnap.docs : []).map(d => ({ id: d.id, ...d.data() })) || [];
    const errors = ('docs' in alertsSnap ? alertsSnap.docs : []).map(d => ({ id: d.id, ...d.data() })) || [];
    const clientErrors = ('docs' in clientErrorsSnap ? clientErrorsSnap.docs : []).map(d => ({ id: d.id, ...d.data() })) || [];

    res.json({ success: true, heartbeats, errors, clientErrors });
  } catch (error) {
    logger.error({ err: error }, 'Error fetching logs');
    res.status(500).json({ success: false, error: 'Failed to fetch logs' });
  }
});

export const metricsRoutes = router;
