import { useState } from 'react';
import { logger } from '@/src/shared/lib/logger';
import { UseFormSetValue, UseFormGetValues, UseFormTrigger } from 'react-hook-form';
import { Quotation } from '@/src/domain/schema/quotation.schema';
import { notify } from '@/src/shared/utils/notify';
import { ProductItem } from '@/src/domain/schema/product.schema';
import { computeLineItem } from '@/src/domain/pricing/quotation-pricing';

export function useErpLookup(
  setValue: UseFormSetValue<Quotation>,
  getValues: UseFormGetValues<Quotation>,
  confirm?: any,
  customers?: any[],
  trigger?: UseFormTrigger<Quotation>
) {
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [isErpLocked, setIsErpLocked] = useState(false);

  // Helper to parse dates (yyyy-mm-dd or dd/mm/yyyy or ISO format)
  const parseFlexibleDate = (dateStr: string): string | undefined => {
    if (!dateStr) return undefined;
    const cleanStr = dateStr.trim();
    
    // Pattern dd/mm/yyyy or dd-mm-yyyy
    const dmyRegex = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/;
    const dmyMatch = cleanStr.match(dmyRegex);
    if (dmyMatch) {
      const d = dmyMatch[1].padStart(2, '0');
      const m = dmyMatch[2].padStart(2, '0');
      const y = dmyMatch[3];
      return `${y}-${m}-${d}`;
    }
    
    // Pattern yyyy-mm-dd or yyyy/mm/dd
    const ymdRegex = /^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/;
    const ymdMatch = cleanStr.match(ymdRegex);
    if (ymdMatch) {
      const y = ymdMatch[1];
      const m = ymdMatch[2].padStart(2, '0');
      const d = ymdMatch[3].padStart(2, '0');
      return `${y}-${m}-${d}`;
    }

    return cleanStr.substring(0, 10);
  };

  const lookupErp = async (rawSoPhieu: string) => {
    if (!rawSoPhieu) return;
    
    // Sanitize SỐ PHIẾU BÁO GIÁ: Trim/clear khoảng trắng đầu-cuối + ký tự ẩn (zero-width, \u200B, \uFEFF, NBSP...)
    const soPhieu = rawSoPhieu
      .replace(/[\u200B-\u200D\uFEFF]/g, '') // Remove zero-width spaces/characters
      .replace(/\u00A0/g, ' ')               // Replace non-breaking space with normal space
      .trim();

    if (!soPhieu) return;
    
    setIsLookingUp(true);
    try {
      // Proxy call
      const res = await fetch(`/api/quotations/erp-lookup/${encodeURIComponent(soPhieu)}`);
      
      if (!res.ok) {
        let errorMsg = `Lỗi hệ thống (${res.status})`;
        try {
          const text = await res.text();
          if (text) errorMsg = text.length > 50 ? text.substring(0, 50) + '...' : text;
        } catch (err) {
          logger.error('Failed to parse error response text:', err);
        }
        notify.warning(`Tra cứu ERP thất bại: ${errorMsg}`);
        return;
      }
      
      let payload;
      try {
        payload = await res.json();
      } catch (jsonErr) {
        logger.error('Invalid JSON response:', jsonErr);
        notify.error('Lỗi định dạng phản hồi từ ERP.');
        return;
      }
      
      if (!payload.success) {
         notify.warning(payload.error || `Số phiếu báo giá "${soPhieu}" không tồn tại trên ERP`);
         return;
      }
      
      let data = payload.data;
      if (!data) {
         notify.warning('Không có dữ liệu trả về từ ERP');
         return;
      }

      // Handle nested data if ERP API returned { data: { ... } }
      if (data && data.data) {
        data = data.data;
      }

      const currentProducts = getValues('products') || [];
      const hasMeaningfulProducts = currentProducts.some((p: any) => p.productName || p.price > 0);
      if (hasMeaningfulProducts && confirm) {
        const proceed = await confirm({
          title: 'Xác nhận ghi đè',
          message: 'Dữ liệu ERP sẽ thay thế các sản phẩm và nội dung đang nhập. Bạn có chắc chắn muốn nạp từ ERP không?',
          variant: 'warning',
          confirmText: 'Đồng ý nạp ERP',
          cancelText: 'Huỷ bỏ'
        });
        if (!proceed) {
           return;
        }
      }

      // Auto-match customer from ERP data if found in existing CRM customers
      const erpPhone = (data.so_dien_thoai || '').trim();
      const erpCustomerCode = (data.ma_khach_hang || '').trim();
      const erpCustomerName = (data.ten_khach_hang || '').trim();

      if (Array.isArray(customers) && customers.length > 0) {
        const matched = customers.find((c: any) => 
          (erpPhone && (c.sdt === erpPhone || c.contacts?.[0]?.sdt === erpPhone)) ||
          (erpCustomerCode && c.maKh === erpCustomerCode) ||
          (erpCustomerName && c.tenKhachHang?.toLowerCase() === erpCustomerName.toLowerCase())
        );

        if (matched) {
          setValue('customerId', matched.id, { shouldDirty: true, shouldValidate: true });
          setValue('maKh', matched.maKh || erpCustomerCode, { shouldDirty: true });
          setValue('tenKhachHang', matched.tenKhachHang || erpCustomerName, { shouldDirty: true });
          setValue('sdt', matched.sdt || matched.contacts?.[0]?.sdt || erpPhone, { shouldDirty: true });
          setValue('nguoiDaiDien', matched.nguoiDaiDien || matched.contacts?.[0]?.nguoiDaiDien || '', { shouldDirty: true });
        } else {
          // If customer not yet in CRM, keep customer info visible from ERP without breaking validation
          if (erpCustomerName) setValue('tenKhachHang', erpCustomerName, { shouldDirty: true });
          if (erpPhone) setValue('sdt', erpPhone, { shouldDirty: true });
          if (erpCustomerCode) setValue('maKh', erpCustomerCode, { shouldDirty: true });
        }
      } else {
        if (erpCustomerName) setValue('tenKhachHang', erpCustomerName, { shouldDirty: true });
        if (erpPhone) setValue('sdt', erpPhone, { shouldDirty: true });
        if (erpCustomerCode) setValue('maKh', erpCustomerCode, { shouldDirty: true });
      }

      if (data.noi_dung) {
        setValue('noiDungGhiChu', data.noi_dung, { shouldDirty: true, shouldValidate: true });
      }
      if (data.ngay_lap) {
        const parsedDate = parseFlexibleDate(data.ngay_lap);
        if (parsedDate) {
          setValue('ngayBaoGia', parsedDate, { shouldDirty: true, shouldValidate: true });
        }
      }
      if (data.hieu_luc_bao_gia !== undefined) {
        setValue('hieuLuc', Number(data.hieu_luc_bao_gia), { shouldDirty: true, shouldValidate: true });
      }

      // Map all 14 fields from ERP lines:
      // item_code, item_name, unit, qty, unit_price, subtotal_before_tax, vat_pct,
      // tax_amount, subtotal_after_tax, note, discount_pct, discount_amount,
      // subtotal_after_discount, unit_price_after_discount
      const erpItems = data.lines || data.items || [];
      if (Array.isArray(erpItems) && erpItems.length > 0) {
        const mappedProducts: ProductItem[] = erpItems.map((item: any) => {
          const qty = Number(item.qty ?? item.quantity ?? 1);
          const unitPrice = Number(item.unit_price ?? item.price ?? 0);
          const discountPct = (item.discount_pct !== undefined && item.discount_pct !== null) ? Number(item.discount_pct) : undefined;
          const discountAmount = (item.discount_amount !== undefined && item.discount_amount !== null) ? Number(item.discount_amount) : undefined;
          const subtotalAfterDiscount = (item.subtotal_after_discount !== undefined && item.subtotal_after_discount !== null) 
            ? Number(item.subtotal_after_discount) 
            : undefined;
          const unitPriceAfterDiscount = (item.unit_price_after_discount !== undefined && item.unit_price_after_discount !== null) 
            ? Number(item.unit_price_after_discount) 
            : undefined;
          const subtotalBeforeTax = (item.subtotal_before_tax !== undefined && item.subtotal_before_tax !== null) 
            ? Number(item.subtotal_before_tax) 
            : undefined;
          const vatPct = (item.vat_pct !== undefined && item.vat_pct !== null) ? Number(item.vat_pct) : undefined;
          const taxAmount = (item.tax_amount !== undefined && item.tax_amount !== null) ? Number(item.tax_amount) : undefined;
          const subtotalAfterTax = (item.subtotal_after_tax !== undefined && item.subtotal_after_tax !== null) 
            ? Number(item.subtotal_after_tax) 
            : undefined;
          const noteText = item.note || item.ghiChu || '';

          const baseItem: ProductItem = {
            id: crypto.randomUUID(),
            productId: item.item_code || '',
            item_code: item.item_code || '',
            productName: item.item_name || 'Sản phẩm từ ERP',
            quantity: qty,
            price: unitPrice,
            unit: item.unit || 'Cái',
            ghiChu: noteText,
            note: noteText,
            discountPct,
            discountAmount,
            subtotalAfterDiscount,
            unitPriceAfterDiscount,
            subtotalBeforeTax,
            vatPct,
            taxAmount,
            subtotalAfterTax,
          };
          return computeLineItem(baseItem);
        });

        setValue('products', mappedProducts, { shouldDirty: true, shouldValidate: true });
        setIsErpLocked(true);
      } else {
         setIsErpLocked(true);
      }

      notify.success(`Đã nạp ${erpItems.length} sản phẩm báo giá ${soPhieu} từ ERP`);

      // Synchronize and trigger React Hook Form validation & subscribers updates
      if (trigger) {
        await trigger(['noiDungGhiChu', 'ngayBaoGia', 'hieuLuc', 'products', 'customerId']);
      }

    } catch (err: any) {
      logger.error('ERP Lookup failed:', err);
      notify.error('Lỗi kết nối khi tra cứu ERP');
    } finally {
      setIsLookingUp(false);
    }
  };

  return { lookupErp, isLookingUp, isErpLocked, setIsErpLocked };
}
