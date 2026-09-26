import { useState, useEffect, useCallback } from 'react';
import { ProductItem } from '@/src/domain/schema/product.schema';
import { computeLineItem } from '@/src/domain/pricing/quotation-pricing';
import { getProductItemKey } from '@/src/shared/utils/product-key';
import { distributeDiscountAmount, syncBaoHanhDates } from './product-list-input.helpers';
import { FinancialEngine } from '@/src/shared/utils/financialEngine';

interface UseProductListInputProps {
  products: ProductItem[];
  onChange: (products: ProductItem[]) => void;
  maxQuantities?: Record<string, number>;
  showBaoHanh?: boolean;
  baseDateForBaoHanh?: string;
  defaultUnit?: string;
  showFinance?: boolean;
}

export function useProductListInput({
  products,
  onChange,
  maxQuantities,
  showBaoHanh,
  baseDateForBaoHanh,
  defaultUnit = 'Máy',
  showFinance
}: UseProductListInputProps) {
  const [bulkVat, setBulkVat] = useState<string>('');
  const [bulkDiscPct, setBulkDiscPct] = useState<string>('');
  const [bulkDiscAmount, setBulkDiscAmount] = useState<string>('');

  // Ensure we have IDs and STT for all products (even legacy ones)
  useEffect(() => {
    const missingIdsOrStt = products.some((p, i) => !p.id || p.stt !== i + 1);
    if (missingIdsOrStt && products.length > 0) {
      const updated = products.map((p, i) => ({
        ...p,
        id: p.id || crypto.randomUUID(),
        stt: i + 1
      }));
      onChange(updated);
    }
  }, [products, onChange]);

  // Sync Bao Hanh dates
  useEffect(() => {
    const { needsUpdate, updatedProducts } = syncBaoHanhDates(products, showBaoHanh, baseDateForBaoHanh);
    if (needsUpdate) {
      onChange(updatedProducts);
    }
  }, [products, showBaoHanh, baseDateForBaoHanh, onChange]);

  const applyBulkVat = useCallback(() => {
    if (bulkVat === '') return;
    const v = parseFloat(bulkVat);
    if (isNaN(v)) return;
    const newProducts = products.map(p => computeLineItem({ ...p, vatPct: v }));
    onChange(newProducts);
    setBulkVat('');
  }, [bulkVat, products, onChange]);

  const applyBulkDiscPct = useCallback(() => {
    if (bulkDiscPct === '') return;
    const v = parseFloat(bulkDiscPct);
    if (isNaN(v)) return;
    const newProducts = products.map(p => computeLineItem({ ...p, discountType: 'PERCENT', discountPct: v, discountAmount: undefined }));
    onChange(newProducts);
    setBulkDiscPct('');
  }, [bulkDiscPct, products, onChange]);

  const applyBulkDiscAmount = useCallback(() => {
    if (bulkDiscAmount === '') return;
    const amt = FinancialEngine.toInteger(bulkDiscAmount);
    if (amt <= 0) return;
    
    onChange(distributeDiscountAmount(products, amt));
    setBulkDiscAmount('');
  }, [bulkDiscAmount, products, onChange]);

  const addProduct = useCallback(() => {
    const defaultVat = products.length > 0 && products[0].vatPct !== undefined ? products[0].vatPct : 8;
    const newItem = computeLineItem({
      id: crypto.randomUUID(),
      stt: products.length + 1,
      productId: '',
      productName: '',
      quantity: 1,
      unit: defaultUnit,
      vatPct: defaultVat,
      price: 0
    });
    onChange([...products, newItem]);
  }, [products, onChange, defaultUnit]);

  const addFromCatalog = useCallback((p: ProductItem) => {
    const defaultVat = p.vatPct !== undefined ? p.vatPct : (products.length > 0 && products[0].vatPct !== undefined ? products[0].vatPct : 8);
    const newItem = computeLineItem({
      ...p,
      stt: products.length + 1,
      vatPct: defaultVat,
      id: p.id || crypto.randomUUID()
    });
    onChange([...products, newItem]);
  }, [products, onChange]);

  const removeProduct = useCallback((index: number) => {
    const remaining = products.filter((_, i) => i !== index);
    const reindexed = remaining.map((p, i) => ({ ...p, stt: i + 1 }));
    onChange(reindexed);
  }, [products, onChange]);

  const updateProduct = useCallback(<K extends keyof ProductItem>(index: number, field: K, value: ProductItem[K]) => {
    const newProducts = [...products];
    const p = newProducts[index];

    let val = value;
    if (field === 'quantity' && typeof value === 'number') {
      if (value < 0) val = 0 as any;
      if (maxQuantities) {
        const itemKey = getProductItemKey(p, index);
        const maxQ = maxQuantities[itemKey];
        if (maxQ !== undefined && (value as number) > maxQ) {
          val = maxQ as any;
        }
      }
    }

    newProducts[index] = { ...newProducts[index], [field]: val };

    // Realtime reactive warranty expiration calculation
    if (field === 'soNgayBaoHanh') {
      const days = Number(val);
      if (days > 0) {
        const base = baseDateForBaoHanh ? new Date(baseDateForBaoHanh) : new Date();
        const exp = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
        newProducts[index].ngayHetHanBaoHanh = exp.toISOString().split('T')[0];
      } else {
        newProducts[index].ngayHetHanBaoHanh = undefined;
      }
    }
    
    if (showFinance) {
      const price = Number(newProducts[index].price) || 0;
      const qty = Number(newProducts[index].quantity) || 0;
      const gross = price * qty;

      if (field === 'discountAmount') {
         newProducts[index].discountType = 'AMOUNT';
         newProducts[index].discountAmount = typeof val === 'number' ? val : undefined;
         if (gross > 0 && typeof val === 'number' && val > 0) {
             newProducts[index].discountPct = parseFloat(((val / gross) * 100).toFixed(2));
         } else if (!val) {
             newProducts[index].discountPct = undefined;
             newProducts[index].discountType = undefined;
         }
      } else if (field === 'discountPct') {
         newProducts[index].discountType = 'PERCENT';
         newProducts[index].discountPct = typeof val === 'number' ? val : undefined;
         if (!val) {
             newProducts[index].discountAmount = undefined;
             newProducts[index].discountType = undefined;
         }
      }
      newProducts[index] = computeLineItem(newProducts[index]);
    } else {
      if (field === 'price' || field === 'quantity') {
         newProducts[index].total = (Number(newProducts[index].price) || 0) * (Number(newProducts[index].quantity) || 0);
      }
    }
    
    onChange(newProducts);
  }, [products, maxQuantities, showFinance, baseDateForBaoHanh, onChange]);

  return {
    bulkVat,
    setBulkVat,
    bulkDiscPct,
    setBulkDiscPct,
    bulkDiscAmount,
    setBulkDiscAmount,
    applyBulkVat,
    applyBulkDiscPct,
    applyBulkDiscAmount,
    addProduct,
    addFromCatalog,
    removeProduct,
    updateProduct
  };
}
