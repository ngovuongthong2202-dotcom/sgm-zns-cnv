import { describe, it, expect } from 'vitest';
import {
  getItemKey,
  computeDeliveredQuantitiesMap,
  isSourceDocumentFullyDelivered,
  validateShipmentQuantities,
  ReconcilerProductItem,
  ReconcilerSourceDocument
} from './delivery-reconciler';

describe('SGM Enterprise Isomorphic Delivery Reconciliation Engine', () => {
  describe('getItemKey', () => {
    it('prioritizes productId over name or id', () => {
      const item: ReconcilerProductItem = {
        id: 'row-uuid-1234-5678',
        productId: 'PROD-001',
        productName: 'Máy Phun Rửa Áp Lực Cao SGM-9000'
      };
      expect(getItemKey(item, 0)).toBe('PROD-001');
    });

    it('falls back to productName if productId is absent', () => {
      const item: ReconcilerProductItem = {
        id: 'row-uuid-1234-5678',
        productName: 'Đầu Phun Áp Lực'
      };
      expect(getItemKey(item, 0)).toBe('Đầu Phun Áp Lực');
    });

    it('falls back to clean id if name is absent and id is short', () => {
      const item: ReconcilerProductItem = {
        id: 'ITEM-1'
      };
      expect(getItemKey(item, 0)).toBe('ITEM-1');
    });

    it('falls back to index if id is uuid and name is absent', () => {
      const item: ReconcilerProductItem = {
        id: '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d'
      };
      expect(getItemKey(item, 3)).toBe('3');
    });
  });

  describe('computeDeliveredQuantitiesMap', () => {
    it('aggregates quantities across multiple shipments and ignores cancelled/deleted ones', () => {
      const deliveries: ReconcilerSourceDocument[] = [
        {
          id: 'DEL-1',
          tinhTrangGiaoHang: 'Đang giao',
          products: [
            { productId: 'P1', productName: 'Máy A', quantity: 2 },
            { productId: 'P2', productName: 'Máy B', quantity: 1 }
          ]
        },
        {
          id: 'DEL-2',
          tinhTrangGiaoHang: 'Hoàn tất',
          products: [
            { productId: 'P1', productName: 'Máy A', quantity: 3 }
          ]
        },
        {
          id: 'DEL-3',
          tinhTrangGiaoHang: 'HỦY',
          products: [
            { productId: 'P1', productName: 'Máy A', quantity: 10 }
          ]
        },
        {
          id: 'DEL-4',
          deletedAt: '2026-09-01T00:00:00Z',
          products: [
            { productId: 'P2', productName: 'Máy B', quantity: 5 }
          ]
        }
      ];

      const map = computeDeliveredQuantitiesMap(deliveries);
      expect(map['P1']).toBe(5); // 2 + 3, cancelled ignored
      expect(map['P2']).toBe(1); // 1, deleted ignored
    });
  });

  describe('isSourceDocumentFullyDelivered', () => {
    it('returns false when items are partially delivered', () => {
      const source: ReconcilerSourceDocument = {
        id: 'PAY-001',
        paymentId: 'PT-001',
        products: [
          { productId: 'P1', productName: 'Máy A', quantity: 5 },
          { productId: 'P2', productName: 'Máy B', quantity: 2 }
        ]
      };

      const deliveries: ReconcilerSourceDocument[] = [
        {
          id: 'DEL-1',
          paymentId: 'PT-001',
          products: [
            { productId: 'P1', productName: 'Máy A', quantity: 5 },
            { productId: 'P2', productName: 'Máy B', quantity: 1 } // thiếu 1 máy B
          ]
        }
      ];

      expect(isSourceDocumentFullyDelivered(source, deliveries)).toBe(false);
    });

    it('returns true when all items reach or exceed contracted quantities across multiple shipments', () => {
      const source: ReconcilerSourceDocument = {
        id: 'PAY-001',
        paymentId: 'PT-001',
        products: [
          { productId: 'P1', productName: 'Máy A', quantity: 5 },
          { productId: 'P2', productName: 'Máy B', quantity: 2 }
        ]
      };

      const deliveries: ReconcilerSourceDocument[] = [
        {
          id: 'DEL-1',
          paymentId: 'PT-001',
          products: [
            { productId: 'P1', productName: 'Máy A', quantity: 3 }
          ]
        },
        {
          id: 'DEL-2',
          paymentId: 'PT-001',
          products: [
            { productId: 'P1', productName: 'Máy A', quantity: 2 },
            { productId: 'P2', productName: 'Máy B', quantity: 2 }
          ]
        }
      ];

      expect(isSourceDocumentFullyDelivered(source, deliveries)).toBe(true);
    });

    it('supports slMay fallback when products array is not present', () => {
      const source: ReconcilerSourceDocument = {
        id: 'PAY-002',
        paymentId: 'PT-002',
        slMay: 3
      };

      const deliveries: ReconcilerSourceDocument[] = [
        { id: 'DEL-1', paymentId: 'PT-002', slMay: 1 },
        { id: 'DEL-2', paymentId: 'PT-002', slMay: 2 }
      ];

      expect(isSourceDocumentFullyDelivered(source, deliveries)).toBe(true);
    });
  });

  describe('validateShipmentQuantities', () => {
    it('allows valid quantities within remaining balance', () => {
      const contractedProducts: ReconcilerProductItem[] = [
        { productId: 'P1', productName: 'Máy A', quantity: 5 }
      ];
      const existingDeliveries: ReconcilerSourceDocument[] = [
        {
          id: 'DEL-1',
          products: [{ productId: 'P1', quantity: 3 }]
        }
      ];
      const newShipment: ReconcilerProductItem[] = [
        { productId: 'P1', quantity: 2 }
      ];

      const result = validateShipmentQuantities(newShipment, contractedProducts, existingDeliveries);
      expect(result.valid).toBe(true);
    });

    it('rejects shipment exceeding remaining quantity', () => {
      const contractedProducts: ReconcilerProductItem[] = [
        { productId: 'P1', productName: 'Máy A', quantity: 5 }
      ];
      const existingDeliveries: ReconcilerSourceDocument[] = [
        {
          id: 'DEL-1',
          products: [{ productId: 'P1', quantity: 3 }]
        }
      ];
      const newShipment: ReconcilerProductItem[] = [
        { productId: 'P1', quantity: 3 } // Only 2 remaining!
      ];

      const result = validateShipmentQuantities(newShipment, contractedProducts, existingDeliveries);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('vượt quá số lượng còn lại');
      expect(result.overItemName).toBe('Máy A');
    });
  });
});
