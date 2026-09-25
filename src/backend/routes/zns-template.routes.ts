import { Router, Request, Response } from 'express';
import { adminDb, toTableName } from '../config/supabase.admin';
import { CustomerSchema } from '../../domain/schema/customer.schema';
import { QuotationSchema } from '../../domain/schema/quotation.schema';
import { ContractSchema } from '../../domain/schema/contract.schema';
import { PaymentSchema } from '../../domain/schema/payment.schema';
import { DeliverySchema } from '../../domain/schema/delivery.schema';
import { extractFieldsFromZod } from '../../domain/mapping/zod-field-extractor';
import { templateRendererService } from '../../backend/services/zns/template-renderer.service';
import { ZnsTemplate } from '../../domain/schema/zns-template.schema';

const router = Router();

router.get('/fields/:entity', (req: Request, res: Response) => {
    let schema: import('zod').ZodTypeAny; 
    switch((req.params.entity as string).toUpperCase()) {
        case 'CUSTOMER': schema = CustomerSchema; break;
        case 'QUOTATION': schema = QuotationSchema; break;
        case 'CONTRACT': schema = ContractSchema; break;
        case 'PAYMENT': schema = PaymentSchema; break;
        case 'DELIVERY': schema = DeliverySchema; break;
        default: return res.status(400).json({ error: 'Invalid entity type' });
    }
    const fields = extractFieldsFromZod(schema);
    res.json(fields);
});

router.post('/preview', async (req: Request, res: Response) => {
    try {
        const { templateKey, variables, targetEntityId, targetEntityType, paymentSubtype } = req.body;
        
        let entityData: Record<string, unknown> = { id: 'mock-123', tenKhachHang: 'Công ty TNHH Demo' }; // fallback mock
        
        if (targetEntityId && targetEntityType) {
            const collection = toTableName(targetEntityType);
            const doc = await adminDb.collection(collection).doc(targetEntityId).get();
            if (doc.exists) {
                entityData = doc.data() as Record<string, unknown>;
            }
        }
        
        // Use the centralized render logic
        const dummyTemplate = { 
            templateKey, variables, entityType: targetEntityType, paymentSubtype,
            version: 0, label: 'Preview', isActive: true, createdAt: '', updatedAt: '', updatedBy: ''
        } as unknown;
        
        const payload = await templateRendererService.render(templateKey, entityData /*  */, {
            paymentSubtype,
            templateOverride: dummyTemplate as unknown as ZnsTemplate
        });

        res.json({ payload, entity: entityData });
    } catch(e) {
        console.error(e);
        res.status(500).json({ error: (e as Error).message });
    }
});

router.post('/sync-from-cnv', async (req: Request, res: Response) => {
    try {
        // Here normally we would call CNV ZNS API to fetch latest templates 
        // and update Firestore's znsTemplates. For now, simulate delay and success.
        await new Promise(resolve => setTimeout(resolve, 1500));
        res.json({ success: true, message: 'Synced' });
    } catch(e) {
        console.error(e);
        res.status(500).json({ error: (e as Error).message });
    }
});

router.post('/save', async (req: Request, res: Response) => {
    const { templateKey, template } = req.body;
    try {
        const batch = adminDb.batch();
        const mainRef = adminDb.collection('znsTemplates').doc(templateKey);
        
        const oldDoc = await mainRef.get();
        if (oldDoc.exists) {
            const oldData = oldDoc.data();
            const historyRef = mainRef.collection('history').doc(`v${oldData?.version}`);
            batch.set(historyRef, oldData!);
        }

        template.updatedAt = new Date().toISOString();
        batch.set(mainRef, template);
        
        await batch.commit();
        templateRendererService.invalidateCache(templateKey);
        res.json({ success: true, version: template.version });
    } catch(err) {
        res.status(500).json({ error: (err as Error).message });
    }
});

export default router;
