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
      if (currentProducts.length > 0 && confirm) {
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

      notify.success(`Đã đồng bộ thông tin báo giá ${soPhieu} từ ERP`);

      // Do not import or create associate customer from ERP. Keep these fields blank.
      setValue('customerId', '', { shouldDirty: true, shouldValidate: true });
      setValue('maKh', '', { shouldDirty: true, shouldValidate: true });
      setValue('tenKhachHang', '', { shouldDirty: true, shouldValidate: true });
      setValue('sdt', '', { shouldDirty: true, shouldValidate: true });
      setValue('nguoiDaiDien', '', { shouldDirty: true, shouldValidate: true });

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
      
      const erpItems = data.lines || data.items || [];
      if (Array.isArray(erpItems) && erpItems.length > 0) {
        const mappedProducts: ProductItem[] = erpItems.map((item: any) => {
          const baseItem: ProductItem = {
            id: crypto.randomUUID(),
            productId: item.item_code || '',
            productName: item.item_name || 'Sản phẩm từ ERP',
            quantity: Number(item.qty || 1),
            price: Number(item.unit_price || 0),
            unit: item.unit || 'Cái',
            ghiChu: item.ghiChu || item.note || '',
            discountPct: item.discount_pct !== undefined ? Number(item.discount_pct) : undefined,
            discountAmount: item.discount_amount !== undefined ? Number(item.discount_amount) : undefined,
            vatPct: item.vat_pct !== undefined ? Number(item.vat_pct) : undefined,
            taxAmount: item.tax_amount !== undefined ? Number(item.tax_amount) : undefined,
            subtotalBeforeTax: item.subtotal_before_tax !== undefined ? Number(item.subtotal_before_tax) : undefined,
            subtotalAfterTax: item.subtotal_after_tax !== undefined ? Number(item.subtotal_after_tax) : undefined,
          };
          return computeLineItem(baseItem);
        });
        setValue('products', mappedProducts, { shouldDirty: true, shouldValidate: true });
        setIsErpLocked(true);
      } else {
         setIsErpLocked(true);
      }

      // Synchronize and trigger React Hook Form validation & subscribers updates
      if (trigger) {
        await trigger(['noiDungGhiChu', 'ngayBaoGia', 'hieuLuc', 'products']);
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
