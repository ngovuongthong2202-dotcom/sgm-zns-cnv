import { useState } from 'react';
import { logger } from '@/src/shared/lib/logger';
import { UseFormSetValue, UseFormGetValues, UseFormTrigger } from 'react-hook-form';
import { Quotation } from '@/src/domain/schema/quotation.schema';
import { notify } from '@/src/shared/utils/notify';
import { ProductItem } from '@/src/domain/schema/product.schema';
import { computeLineItem } from '@/src/domain/pricing/quotation-pricing';
import { detectItemType } from '@/src/widgets/product-list-input/useProductItemSemantic';
import { normalizeLoai, QUOTATION_LOAI } from '@/src/domain/enums/quotation-loai';

export function useErpLookup(
  setValue: UseFormSetValue<Quotation>,
  getValues: UseFormGetValues<Quotation>,
  confirm?: any,
  customers?: any[],
  trigger?: UseFormTrigger<Quotation>
) {
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [isErpLocked, setIsErpLocked] = useState(false);
  const [unmatchedErpCustomer, setUnmatchedErpCustomer] = useState<any | null>(null);

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
      let isSalesOrder = /kddh|sales-orders|so:/i.test(soPhieu);
      const targetUrl = isSalesOrder 
        ? `/api/quotations/erp-sales-order/${encodeURIComponent(soPhieu)}`
        : `/api/quotations/erp-lookup/${encodeURIComponent(soPhieu)}`;

      let res = await fetch(targetUrl);
      let payload;

      // If quotation lookup fails with 404 or success: false, fallback to check if it's a sales order
      if ((!res.ok || res.status === 404) && !isSalesOrder) {
        try {
          const soRes = await fetch(`/api/quotations/erp-sales-order/${encodeURIComponent(soPhieu)}`);
          if (soRes.ok) {
            const soPayload = await soRes.json();
            if (soPayload.success && soPayload.data) {
              res = soRes;
              payload = soPayload;
              isSalesOrder = true;
            }
          }
        } catch {
          // ignore fallback error and keep original response
        }
      }

      if (!payload) {
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

        try {
          payload = await res.json();
        } catch (jsonErr) {
          logger.error('Invalid JSON response:', jsonErr);
          notify.error('Lỗi định dạng phản hồi từ ERP.');
          return;
        }
      }
      
      if (!payload.success) {
         notify.warning(payload.error || `Số phiếu/đơn hàng "${soPhieu}" không tồn tại trên ERP`);
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

      // Auto-match customer from ERP data if found in existing CRM customers (Priority: Tax Code -> Phone -> Code -> Name)
      const customerSnapshot = data.customer_snapshot || {};
      const erpTaxCode = (customerSnapshot.tax_code || data.ma_so_thue || data.tax_code || data.customer_id || '').trim().replace(/[\s\-_]/g, '');
      const erpPhone = (customerSnapshot.phone || data.so_dien_thoai || data.phone || data.our_contact_person || '').trim().replace(/[\s\-_]/g, '');
      const erpCustomerCode = (data.customer_id || data.ma_khach_hang || '').trim();
      const erpCustomerName = (customerSnapshot.customer_name || data.ten_khach_hang || data.customer_name || '').trim();

      // Address
      const erpAddress = data.delivery_address || customerSnapshot.address || data.dia_chi || '';
      if (erpAddress) {
        setValue('diaChi', erpAddress, { shouldDirty: true });
      }

      if (Array.isArray(customers) && customers.length > 0) {
        const matched = customers.find((c: any) => 
          (erpTaxCode && erpTaxCode.length >= 8 && ((c.maSoThue || '').replace(/[\s\-_]/g, '') === erpTaxCode || (c.taxCode || '').replace(/[\s\-_]/g, '') === erpTaxCode)) ||
          (erpPhone && (c.sdt === erpPhone || c.contacts?.[0]?.sdt === erpPhone)) ||
          (erpCustomerCode && c.maKh === erpCustomerCode) ||
          (erpCustomerName && c.tenKhachHang?.toLowerCase() === erpCustomerName.toLowerCase())
        );

        if (matched) {
          setValue('customerId', matched.id, { shouldDirty: true, shouldValidate: true });
          setValue('maKh', matched.maKh || erpCustomerCode, { shouldDirty: true });
          setValue('tenKhachHang', matched.tenKhachHang || erpCustomerName, { shouldDirty: true });
          setValue('sdt', matched.sdt || matched.contacts?.[0]?.sdt || erpPhone, { shouldDirty: true });
          setValue('nguoiDaiDien', matched.nguoiDaiDien || matched.contacts?.[0]?.nguoiDaiDien || customerSnapshot.representative || '', { shouldDirty: true });
          setUnmatchedErpCustomer(null);
        } else {
          // If customer not yet in CRM, keep customer info visible from ERP and trigger Ingestion Gate
          if (erpCustomerName) setValue('tenKhachHang', erpCustomerName, { shouldDirty: true });
          if (erpPhone) setValue('sdt', erpPhone, { shouldDirty: true });
          if (erpCustomerCode) setValue('maKh', erpCustomerCode, { shouldDirty: true });
          if (customerSnapshot.representative) setValue('nguoiDaiDien', customerSnapshot.representative, { shouldDirty: true });
          
          if (erpCustomerName || erpTaxCode || erpPhone) {
            setUnmatchedErpCustomer({
              tenKhachHang: erpCustomerName,
              maSoThue: erpTaxCode,
              sdt: erpPhone,
              nguoiDaiDien: customerSnapshot.representative || '',
              diaChi: erpAddress || data.delivery_address || customerSnapshot.address || '',
              erpOrderCode: data.code || soPhieu,
              erpCustomerCode
            });
          }
        }
      } else {
        if (erpCustomerName) setValue('tenKhachHang', erpCustomerName, { shouldDirty: true });
        if (erpPhone) setValue('sdt', erpPhone, { shouldDirty: true });
        if (erpCustomerCode) setValue('maKh', erpCustomerCode, { shouldDirty: true });
        if (customerSnapshot.representative) setValue('nguoiDaiDien', customerSnapshot.representative, { shouldDirty: true });

        if (erpCustomerName || erpTaxCode || erpPhone) {
          setUnmatchedErpCustomer({
            tenKhachHang: erpCustomerName,
            maSoThue: erpTaxCode,
            sdt: erpPhone,
            nguoiDaiDien: customerSnapshot.representative || '',
            diaChi: erpAddress || data.delivery_address || customerSnapshot.address || '',
            erpOrderCode: data.code || soPhieu,
            erpCustomerCode
          });
        }
      }

      // Content & Notes
      const noteContent = data.content || data.noi_dung || '';
      if (noteContent) {
        const fullNote = isSalesOrder && data.code ? `[Số ĐH ERP: ${data.code}] ${noteContent}` : noteContent;
        setValue('noiDungGhiChu', fullNote, { shouldDirty: true, shouldValidate: true });
      }

      // Date
      const dateRaw = data.order_date || data.ngay_lap || data.signed_date;
      if (dateRaw) {
        const parsedDate = parseFlexibleDate(dateRaw);
        if (parsedDate) {
          setValue('ngayBaoGia', parsedDate, { shouldDirty: true, shouldValidate: true });
        }
      }
      if (data.expected_delivery_days || data.hieu_luc_bao_gia !== undefined) {
        setValue('hieuLuc', Number(data.expected_delivery_days || data.hieu_luc_bao_gia), { shouldDirty: true, shouldValidate: true });
      }

      // Attachments & Source Lineage (Nexus 50.0)
      if (Array.isArray(data.files) && data.files.length > 0) {
        const mappedAttachments = data.files.map((f: any) => ({
          name: f.fileName,
          url: f.url,
          key: f.key,
          uploadedAt: new Date().toISOString(),
          source: 'ERP_SALES_ORDER',
        }));
        setValue('attachments', mappedAttachments, { shouldDirty: true });
      }

      if (data.code) {
        setValue('soDonHangErp', data.code, { shouldDirty: true });
        setValue('sourceRef', {
          origin: isSalesOrder ? 'ERP_SALES_ORDER' : 'ERP_QUOTATION',
          code: data.code,
          id: data._id,
          approvalStatus: data.so_approval_status || 'approved',
          syncedAt: new Date().toISOString(),
        }, { shouldDirty: true });
      }

      // Map all 9 fields from ERP lines / items with float quantity support
      const erpItems = data.lines || data.items || [];
      if (Array.isArray(erpItems) && erpItems.length > 0) {
        const currentLoaiVal = getValues('loai') || getValues('loaiBaoGia');
        const normLoai = normalizeLoai(currentLoaiVal);
        const defaultItemType = normLoai === QUOTATION_LOAI.VAT_TU ? 'MATERIAL' : (normLoai === QUOTATION_LOAI.DICH_VU ? 'SERVICE' : 'MACHINE');

        const mappedProducts: ProductItem[] = erpItems.map((item: any, idx: number) => {
          const snapshot = item.item_snapshot || {};
          const itemCode = (snapshot.item_code || item.item_code || item.item_id || '').trim();
          const itemName = (snapshot.item_name || item.item_name || item.name || 'Sản phẩm từ ERP').trim();
          const unit = (snapshot.unit_of_measure?.display_unit || item.converted_unit_code || item.unit || 'Cái').trim();
          const qty = Number(item.quantity ?? item.qty ?? 1);
          const unitPrice = Number(item.unit_price ?? item.price ?? 0);
          const discountPct = (item.discount_rate_pct !== undefined ? item.discount_rate_pct : item.discount_pct) !== undefined
            ? Number(item.discount_rate_pct ?? item.discount_pct) 
            : undefined;
          const discountAmount = (item.discount_amount !== undefined && item.discount_amount !== null) ? Number(item.discount_amount) : undefined;
          const vatPct = (item.vat_rate_pct !== undefined ? item.vat_rate_pct : item.vat_pct) !== undefined
            ? Number(item.vat_rate_pct ?? item.vat_pct) 
            : undefined;
          const taxAmount = (item.vat_amount !== undefined ? item.vat_amount : item.tax_amount) !== undefined
            ? Number(item.vat_amount ?? item.tax_amount) 
            : undefined;
          const noteText = item.notes || item.note || item.ghiChu || '';

          const itemType = detectItemType(itemName, unit, defaultItemType, itemCode);

          const baseItem: ProductItem = {
            id: crypto.randomUUID(),
            stt: idx + 1,
            productId: itemCode,
            item_code: itemCode,
            productName: itemName,
            quantity: qty,
            price: unitPrice,
            unit,
            ghiChu: noteText,
            note: noteText,
            discountPct,
            discountAmount,
            vatPct,
            taxAmount,
            itemType,
            soNgayBaoHanh: itemType === 'MACHINE' ? 365 : undefined,
          };
          return computeLineItem(baseItem);
        });

        setValue('products', mappedProducts, { shouldDirty: true, shouldValidate: true });
        setIsErpLocked(true);
      } else {
         setIsErpLocked(true);
      }

      notify.success(`Đã nạp thành công ${erpItems.length} sản phẩm từ ERP (${soPhieu})`);

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

  return { lookupErp, isLookingUp, isErpLocked, setIsErpLocked, unmatchedErpCustomer, setUnmatchedErpCustomer };
}
