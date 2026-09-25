import { describe, expect, it, vi, beforeEach } from 'vitest';

const { mockAdminDb } = vi.hoisted(() => ({
  mockAdminDb: {
    collection: vi.fn(),
    runTransaction: vi.fn(),
  }
}));

vi.mock('../../config/supabase.admin', () => ({
  adminDb: mockAdminDb
}));
vi.mock('../../lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn()
  }
}));

vi.mock('../workflow/entity-status.service', () => ({
  entityStatusService: {
    applyZnsResult: vi.fn().mockResolvedValue(true)
  }
}));

import { vendorWebhookHandler } from './vendor-webhook.handler';

describe('VendorWebhookHandler Fallback Parsing', () => {
  let req: any; 
  let res: any; 

  beforeEach(() => {
    vi.clearAllMocks();
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    };
    
    mockAdminDb.collection.mockReturnValue({
      doc: vi.fn().mockReturnValue({
        get: vi.fn().mockResolvedValue({
          exists: true,
          data: () => ({ vendorWebhookSecret: 'secret123' })
        })
      }),
      // We mock where for queries
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      get: vi.fn().mockResolvedValue({
        empty: true,
        docs: []
      }),
      add: vi.fn().mockResolvedValue(true)
    });
    
    mockAdminDb.runTransaction.mockImplementation(async (cb) => {
        return cb({
           get: vi.fn().mockResolvedValue({ exists: false }),
           set: vi.fn(),
           update: vi.fn()
        });
    });
  });

  const testCases = [
    { name: 'SUCCESS via isSuccess', payload: { action: 'Other', isSuccess: true, request_id: '123' }, expected: 'SUCCESS' },
    { name: 'SUCCESS via payload status string', payload: { status: 'Thành công', request_id: '123' }, expected: 'SUCCESS' },
    { name: 'LIMIT_EXCEEDED via error string -1472', payload: { error: 'Error -1472 Limit exceeded', request_id: '123' }, expected: 'LIMIT_EXCEEDED' },
    { name: 'FAIL via response nested obj', payload: { response: { isSuccess: false }, request_id: '123' }, expected: 'FAIL' },
    { name: 'Missing trackingId', payload: { noId: true }, expectedCode: 400 }
  ];

  for (const tc of testCases) {
    it(`should handle ${tc.name}`, async () => {
      req = {
        headers: { 'x-api-key': 'secret123' },
        query: {},
        body: tc.payload
      };
      await vendorWebhookHandler.handleResult(req, res);

      if (tc.expectedCode) {
        expect(res.status).toHaveBeenCalledWith(tc.expectedCode);
        if ((tc as any).successMessage) {
           expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: (tc as any).successMessage }));
        }
      } else {
        expect(res.status).toHaveBeenCalledWith(200);
      }
    });
  }

  it('writes to DLQ on internal error', async () => {
     req = {
        headers: { 'x-api-key': 'secret123' },
        query: {},
        body: { action: 'Other', isSuccess: true, request_id: '123' }
     };
     // Make the transaction throw to hit the catch block
     mockAdminDb.runTransaction.mockRejectedValue(new Error('Transaction Failed!'));
     await vendorWebhookHandler.handleResult(req, res);

     expect(mockAdminDb.collection).toHaveBeenCalledWith('znsDeadLetters');
     expect(res.status).toHaveBeenCalledWith(200);
     expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false, error: 'Internal processing error' }));
  });

  it('updates znsMessage properties when exact payload matching trackingId exists', async () => {
     req = {
        headers: { 'x-api-key': 'secret123' },
        query: {},
        body: { status: 'Sent', request_id: '123' } // Maps to SENT -> SUCCESS
     };

     const updateSpy = vi.fn();
     mockAdminDb.runTransaction.mockImplementation(async (cb) => {
         return cb({
            get: vi.fn().mockImplementation(async (docRef) => {
               // fake path or id check
               if (docRef && docRef.id === '123' && docRef.path && docRef.path.includes('znsMessages')) {
                  return {
                     exists: true,
                     ref: docRef,
                     data: () => ({ entityId: 'E1', entityType: 'CUSTOMER', messageType: 'QUOTATION' })
                  };
               }
               return { exists: false };
            }),
            set: vi.fn(),
            update: updateSpy
         });
     });

     mockAdminDb.collection.mockImplementation((collName: string) => {
         return {
            doc: vi.fn((id: string) => ({ 
               id, 
               path: `${collName}/${id}`,
               get: vi.fn().mockResolvedValue({
                  exists: true,
                  data: () => ({ vendorWebhookSecret: 'secret123' })
               })
            })),
            where: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            get: vi.fn().mockImplementation(async () => {
               if (collName === 'znsMessages') {
                  return {
                     empty: false,
                     docs: [{
                        ref: { id: 'msg-1' },
                        data: () => ({ entityId: 'E1', entityType: 'CUSTOMER', messageType: 'QUOTATION' })
                     }]
                  };
               }
               return { empty: true, docs: [] };
            }),
            add: vi.fn((_data: any) => { return Promise.resolve(true); }) 
         };
     });
     await vendorWebhookHandler.handleResult(req, res);
     
     expect(updateSpy).toHaveBeenCalledWith({ id: 'msg-1' }, expect.objectContaining({ status: 'SUCCESS', vendorStatus: 'SUCCESS' }));
     expect(res.status).toHaveBeenCalledWith(200);
  });
});
