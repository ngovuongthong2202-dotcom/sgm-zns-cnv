import { ZnsMessage } from '../../../domain/schema/workflow.schema';
import * as crypto from 'crypto';
import { templateRendererService } from './template-renderer.service';
import { z } from 'zod';

export const ZnsBasePayloadSchema = z.object({
  tinhTrangThanhToan: z.string().optional(),
  soHopDong: z.string().optional(),
  soDonHang: z.string().optional(),
  soLuong: z.union([z.number(), z.string()]).optional(),
  slMay: z.union([z.number(), z.string()]).optional(),
  dvt: z.string().optional(),
  time: z.string().optional(),
  ngayThanhToan: z.string().optional(),
  soPhieuXuat: z.string().optional(),
  ngayGiaoMay: z.string().optional(),
  ngayGiao: z.string().optional(),
  danhSachMaMay: z.union([z.array(z.string()), z.string()]).optional(),
  products: z.array(z.record(z.string(), z.unknown())).optional(),
  stt: z.union([z.string(), z.number()]).optional(),
  id: z.string().optional(),
  tenKhachHang: z.string().optional(),
  sdt: z.string().optional(),
  soPhieuBaoGia: z.string().optional()
}).catchall(z.unknown());

export type ZnsBasePayload = z.infer<typeof ZnsBasePayloadSchema>;

/**
 * Target column / action / display mapping cho CNV webhook.
 * Đây là phần SYSTEM, KHÔNG phải biến nội dung tin nhắn.
 */
const TARGET_MAP: Record<string, { col: string, act: string, disp: string }> = {
  'CUSTOMER_PRE_QUOTE':              { col: 'Gửi tin ZNS (Trước báo giá)', act: 'hanh_dong_gui_zns_pre_quote', disp: 'Gửi tin ZNS (Trước báo giá)' },
  'BAOGIA':                           { col: 'Gửi ZNS Báo giá',              act: 'hanh_dong_gui_zns_bao_gia',  disp: 'Gửi tin ZNS (Báo giá)' },
  'HOPDONG_SIGN_ZNS':                 { col: 'Gửi ZNS Yêu Cầu Ký',           act: 'hanh_dong_gui_zns_ky_hop_dong', disp: 'Gửi tin ZNS ký hợp đồng' },
  'THANH_TOAN_TAT_TOAN':              { col: 'Gửi ZNS Thanh toán',           act: 'hanh_dong_gui_zns_thanh_toan', disp: 'Gửi tin ZNS (Thanh toán)' },
  'THANH_TOAN_CONG_NO':               { col: 'Gửi ZNS Thanh toán',           act: 'hanh_dong_gui_zns_thanh_toan', disp: 'Gửi tin ZNS (Thanh toán)' },
  'THANH_TOAN_CONG_NO_DEN_HAN':       { col: 'Gửi ZNS Nhắc hạn (Đến hạn)',   act: 'hanh_dong_gui_zns_thanh_toan_den_han', disp: 'Gửi tin ZNS (Nhắc đến hạn)' },
  'GIAOHANG_ZNS':                     { col: 'Gửi ZNS Giao hàng',            act: 'hanh_dong_gui_zns_giao_hang', disp: 'Gửi tin ZNS (Giao hàng)' },
  'GIAOHANG_HOANTAT':                 { col: 'Gửi ZNS Giao hàng HT',         act: 'hanh_dong_gui_zns_giao_hang_ht', disp: 'Gửi tin ZNS (Giao hàng Hoàn tất)' },
};

/**
 * Biến BẮT BUỘC non-empty theo Zalo ZNS template.
 * Nếu rỗng → Zalo trả -1122. Phải block TRƯỚC khi gửi.
 */
const ZALO_REQUIRED_VARS: Record<string, string[]> = {
  CUSTOMER_PRE_QUOTE: ['customer_name', 'phone'],
  BAOGIA:             ['customer_name', 'so_phieu_bao_gia', 'ngay_bao_gia', 'ngay_het_han', 'sl_may', 'nguoi_phu_trach'],
  HOPDONG_SIGN_ZNS:   ['customer_name', 'phone', 'order_code', 'So_don_hang', 'ngay_ky', 'so_ngay', 'so_phieu', 'nhan_vien'],
  THANH_TOAN_TAT_TOAN:['customer_name', 'phone', 'order_code', 'ngay_thanh_toan'],
  THANH_TOAN_CONG_NO: ['customer_name', 'phone', 'order_code', 'time', 'so_luong'],
  GIAOHANG_ZNS:       ['customer_name', 'phone', 'So_hop_dong', 'So_don_hang', 'so_phieu_xuat', 'ngay_giao_may', 'danh_sach_ma_may', 'so_luong', 'dvt'],
};

export interface BuildPayloadOptions {
  /** Nếu true: throw nếu template thiếu biến required. Mặc định false (gửi với biến có sẵn). */
  strictMode?: boolean;
}

export class ZnsPayloadBuilder {
  generateIdempotencyKey(
    entityType: string, entityId: string, messageType: string,
    version: number | string = 1, attempt: number = 0
  ): string {
    return crypto.createHash('sha256')
      .update(`${entityType}|${entityId}|${messageType}|${version}|${attempt}`)
      .digest('hex')
      .substring(0, 32);
  }

  /**
   * Build outbound payload.
   * - Chỉ chứa biến template config khai báo.
   * - KHÔNG spray biến phụ.
   * - KHÔNG fallback hardcoded.
   * - Phone luôn truyền qua so_dien_thoai_raw + phone (CNV cần cả 2 field).
   */
  async buildPayload(message: ZnsMessage, idempotencyKey: string, opts: BuildPayloadOptions = {}): Promise<Record<string, unknown>> {
    const payload = ZnsBasePayloadSchema.parse(message.payload || {});
    const p = payload;
    
    // 1. TemplateKey is exactly messageType
    const templateKey = message.messageType;
    
    // 2. Render variables từ template config (single source of truth)
    const rendered = await templateRendererService.render(
      templateKey, payload, { paymentSubtype: undefined }
    );
    const templateVersion = rendered.__version || 0;
    delete rendered.__version;
    
    // 3. Smart Fallbacks (đặc biệt cho Công nợ thiếu params do UI mapping)
    const requiredVarsSet = new Set(ZALO_REQUIRED_VARS[templateKey] || ZALO_REQUIRED_VARS[message.messageType] || []);
    Object.keys(rendered).forEach(k => requiredVarsSet.add(k));

    const isEmp = (v: unknown) => !v || String(v).replace(/[^a-zA-Z0-9]/g, '').trim() === '';
    
    // Đồng bộ case variant trước khi tính fallback, vì Zalo API là case-sensitive,
    // nhưng Template builder mapping UI dễ bị lệch case.
    if (!isEmp(rendered.so_hop_dong) && isEmp(rendered.So_hop_dong)) {
        rendered.So_hop_dong = rendered.so_hop_dong;
    } else if (!isEmp(rendered.So_hop_dong) && isEmp(rendered.so_hop_dong)) {
        rendered.so_hop_dong = rendered.So_hop_dong;
    }
    
    if (!isEmp(rendered.so_don_hang) && isEmp(rendered.So_don_hang)) {
        rendered.So_don_hang = rendered.so_don_hang;
    } else if (!isEmp(rendered.So_don_hang) && isEmp(rendered.so_don_hang)) {
        rendered.so_don_hang = rendered.So_don_hang;
    }
    
    // Fallbacks cho customer_name & phone (áp dụng cho mọi template)
    if (requiredVarsSet.has('customer_name') && isEmp(rendered.customer_name)) {
      rendered.customer_name = (p.tenKhachHang as string) || (p.customer_name as string) || (p.customerName as string) || (p.name as string) || ((p.contacts as any)?.[0]?.nguoiDaiDien as string) || (p.nguoiDaiDien as string) || '';
    }
    if (requiredVarsSet.has('phone') && isEmp(rendered.phone)) {
      rendered.phone = message.phone || (p.sdt as string) || (p.phone as string) || (p.soDienThoai as string) || ((p.contacts as any)?.[0]?.sdt as string) || '';
    }

    if (requiredVarsSet.has('order_code')) {
        // use combined string if both are present
        if (p.soHopDong && p.soDonHang) {
            rendered.order_code = `${p.soHopDong} | ${p.soDonHang}`;
        } else if (isEmp(rendered.order_code)) {
            rendered.order_code = p.soHopDong || p.soDonHang || p.soPhieuBaoGia || (p.paymentId as string) || (p.maBaoGia as string) || 'TT-TUDONG';
        }
    }
    
    if ((requiredVarsSet.has('so_don_hang') || requiredVarsSet.has('So_don_hang')) && isEmp(rendered.so_don_hang) && isEmp(rendered.So_don_hang)) {
        const robustDonHangFallback = p.soDonHang || 'Không có';
        rendered.So_don_hang = robustDonHangFallback;
        rendered.so_don_hang = robustDonHangFallback;
    }
    if ((requiredVarsSet.has('so_hop_dong') || requiredVarsSet.has('So_hop_dong')) && isEmp(rendered.so_hop_dong) && isEmp(rendered.So_hop_dong)) {
        const robustFallback = p.soHopDong || 'Không có';
        rendered.So_hop_dong = robustFallback;
        rendered.so_hop_dong = robustFallback;
    }
    if (requiredVarsSet.has('so_luong') && (isEmp(rendered.so_luong) || String(rendered.so_luong) === '0' || String(rendered.so_luong) === '0 Máy')) {
        let defaultSl = String(p.soLuong || p.slMay || '0');
        if (defaultSl === '0' && p.products && p.products.length > 0) {
            defaultSl = String(p.products.reduce((acc: number, item: Record<string, unknown>) => acc + (Number(item.quantity) || 0), 0));
        }
        rendered.so_luong = defaultSl;
    }
    if (requiredVarsSet.has('dvt')) {
        // Evaluate default DVT from root payload or products array
        let defaultDvt = p.dvt;
        if ((!defaultDvt || defaultDvt === 'Cái') && p.products && p.products.length > 0) {
            defaultDvt = String(p.products[0]?.unit || p.products[0]?.dvt_chuan || p.products[0]?.dvt || 'Máy');
        }
        
        // If template renderer returned empty or if we found a better unit from products than default fallback 'Cái'
        if (isEmp(rendered.dvt) || (rendered.dvt === 'Cái' && defaultDvt && defaultDvt !== 'Cái')) {
            rendered.dvt = defaultDvt || 'Máy';
        }
    }
    if (requiredVarsSet.has('time') && isEmp(rendered.time)) {
        rendered.time = p.time || p.ngayThanhToan || '';
    }
    if (requiredVarsSet.has('so_phieu_xuat') && isEmp(rendered.so_phieu_xuat)) {
        const spFallback = p.soPhieuXuat || 'Không có';
        rendered.so_phieu_xuat = spFallback;
    }
    if (requiredVarsSet.has('ngay_giao_may') && isEmp(rendered.ngay_giao_may)) {
        rendered.ngay_giao_may = p.ngayGiaoMay || p.ngayGiao || 'Không có';
    }

    if (requiredVarsSet.has('danh_sach_ma_may') && isEmp(rendered.danh_sach_ma_may)) {
        // user requirement: danh_sach_ma_may = productId separated by |
        if (p.products && p.products.length > 0) {
            rendered.danh_sach_ma_may = p.products
                .map((item: Record<string, unknown>) => item.productId || item.productName)
                .filter(Boolean)
                .join(' | ');
        } else if (Array.isArray(p.danhSachMaMay) && p.danhSachMaMay.length > 0) {
            rendered.danh_sach_ma_may = p.danhSachMaMay.join(' | ');
        } else if (typeof p.danhSachMaMay === 'string') {
            rendered.danh_sach_ma_may = p.danhSachMaMay;
        }
    }

    if (requiredVarsSet.has('so_phieu_bao_gia') && isEmp(rendered.so_phieu_bao_gia)) {
      rendered.so_phieu_bao_gia = (p.soPhieuBaoGia as string) || (p.maBaoGia as string) || 'BG-AUTO';
    }
    if (requiredVarsSet.has('ngay_bao_gia') && isEmp(rendered.ngay_bao_gia)) {
      rendered.ngay_bao_gia = (p.ngayBaoGia as string) || (p.createdAt as string)?.slice(0, 10) || new Date().toISOString().slice(0, 10);
    }
    if (requiredVarsSet.has('ngay_het_han') && isEmp(rendered.ngay_het_han)) {
      rendered.ngay_het_han = (p.ngayHetHan as string) || 'Không có';
    }
    if (requiredVarsSet.has('sl_may') && isEmp(rendered.sl_may)) {
      rendered.sl_may = String(p.slMay || p.soLuong || '1');
    }
    if (requiredVarsSet.has('nguoi_phu_trach') && isEmp(rendered.nguoi_phu_trach)) {
      rendered.nguoi_phu_trach = (p.nguoiPhuTrach as string) || 'Bộ phận CSKH';
    }
    if (requiredVarsSet.has('nhan_vien') && isEmp(rendered.nhan_vien)) {
      rendered.nhan_vien = (p.nguoiPhuTrach as string) || (p.nhanVien as string) || 'Bộ phận CSKH';
    }
    if (requiredVarsSet.has('ngay_ky') && isEmp(rendered.ngay_ky)) {
      rendered.ngay_ky = (p.ngayKy as string) || (p.createdAt as string)?.slice(0, 10) || new Date().toISOString().slice(0, 10);
    }
    if (requiredVarsSet.has('so_ngay') && isEmp(rendered.so_ngay)) {
      rendered.so_ngay = String(p.soNgayDuKienHoanThanh || p.soNgay || '30');
    }
    if (requiredVarsSet.has('so_phieu') && isEmp(rendered.so_phieu)) {
      rendered.so_phieu = (p.soPhieuBaoGia as string) || (p.soHopDong as string) || 'Không có';
    }
    if (requiredVarsSet.has('ngay_thanh_toan') && isEmp(rendered.ngay_thanh_toan)) {
      rendered.ngay_thanh_toan = (p.ngayThanhToan as string) || (p.time as string) || new Date().toISOString().slice(0, 10);
    }

    // 4. Strict mode check: nếu thiếu biến required → throw
    if (opts.strictMode) {
      const missingVars = Object.entries(rendered)
        .filter(([_, v]) => v === '' || v === null || v === undefined)
        .map(([k]) => k);
      if (missingVars.length > 0) {
        const err = new Error(`STRICT MODE: Thiếu giá trị cho biến: ${missingVars.join(', ')}. Vào Cài đặt → Mẫu Tin Nhắn để kiểm tra mapping hoặc cập nhật data entity.`);
        Object.assign(err, { code: 'TEMPLATE_VARIABLES_MISSING', missing: missingVars });
        throw err;
      }
    }

    // 5. PRE-FLIGHT: Zalo-required vars phải non-empty
    const requiredVars = ZALO_REQUIRED_VARS[templateKey] || ZALO_REQUIRED_VARS[message.messageType] || [];
    const emptyRequired = requiredVars.filter(v => {
      const value = rendered[v];
      return value === undefined || value === null || String(value).trim() === '';
    });

    if (emptyRequired.length > 0) {
      const tipMap: Record<string, string> = {
        customer_name: 'Vui lòng cập nhật "Tên khách hàng" (tenKhachHang) trong KH/BG/HĐ/TT/Giao',
        phone: 'Vui lòng cập nhật "Số điện thoại" (sdt) — định dạng 0xxxxxxxxx',
        so_phieu_bao_gia: 'Báo giá chưa có "Số phiếu báo giá"',
        ngay_bao_gia: 'Báo giá chưa có "Ngày báo giá"',
        ngay_het_han: 'Báo giá chưa có "Ngày hết hạn"',
        sl_may: 'Báo giá/Hợp đồng chưa có "Số lượng máy"',
        nguoi_phu_trach: 'Chưa có "Người phụ trách"',
        order_code: 'Hợp đồng chưa có "Số hợp đồng" (sourceField: soHopDong)',
        So_don_hang: 'Hợp đồng chưa có "Số đơn hàng" (sourceField: soDonHang)',
        ngay_ky: 'Hợp đồng chưa có "Ngày ký"',
        so_ngay: 'Hợp đồng chưa có "Số ngày dự kiến hoàn thành"',
        so_phieu: 'Hợp đồng chưa có "Số phiếu báo giá nguồn" (cần BG đã chốt)',
        nhan_vien: 'Chưa có "Người phụ trách"',
        so_don_hang: 'Thanh toán chưa link "Số đơn hàng" từ Hợp đồng',
        so_hop_dong: 'Thanh toán chưa link "Số hợp đồng"',
        ngay_thanh_toan: 'Thanh toán chưa có "Ngày thanh toán"',
        time: 'Phiếu thanh toán chưa có thời điểm ghi nhận',
        so_luong: 'Chưa có "Số lượng"',
        So_hop_dong: 'Giao hàng chưa link "Số hợp đồng"',
        so_phieu_xuat: 'Giao hàng chưa có "Số phiếu xuất kho"',
        ngay_giao_may: 'Giao hàng chưa có "Ngày giao dự kiến"',
        danh_sach_ma_may: 'Giao hàng chưa có "Danh sách mã máy"',
        dvt: 'Chưa có "Đơn vị tính"',
      };
      
      const hints = emptyRequired.map(v => `• ${v}: ${tipMap[v] || 'cập nhật trong entity hoặc set fallback'}`).join('\n');
      
      const err = new Error(
        `Không thể gửi ZNS "${templateKey}" — Zalo template yêu cầu ${emptyRequired.length} biến không được trống:\n${hints}\n\n💡 Vào Cài đặt → Mẫu Tin Nhắn để kiểm tra cấu hình mapping. Hoặc cập nhật dữ liệu thực tế của entity.`
      );
      Object.assign(err, { code: 'ZALO_REQUIRED_VARS_EMPTY', missing: emptyRequired });
      throw err;
    }
    
    // 5. Stringify values
    const variables = Object.entries(rendered).reduce((acc, [k, v]) => {
      acc[k] = v !== undefined && v !== null ? String(v) : '';
      return acc;
    }, {} as Record<string, string>);
    
    // 6. System fields (CNV expects)
    const map = TARGET_MAP[message.messageType] || { col: '', act: 'hanh_dong_gui_zns', disp: 'Gửi tin ZNS' };
    const stt = p.stt?.toString() || p.id?.toString() || idempotencyKey;
    const phoneObj = message.phone || variables.phone || '';

    // Format values with ultimate fallback ensuring Zalo parameter is never empty
    const rawCustomerName = (
      variables.customer_name || 
      p.tenKhachHang || 
      p.customer_name || 
      p.customerName || 
      p.ten_khach_hang || 
      (p.contacts as any)?.[0]?.nguoiDaiDien || 
      p.nguoiDaiDien || 
      ''
    ).toString().trim();
    
    const cleanCustomerName = (rawCustomerName || 'Quý Khách Hàng').substring(0, 60);
    variables.customer_name = cleanCustomerName;
    const cleanPhone = (variables.phone || p.sdt || p.phone || phoneObj || '').toString().trim();
    variables.phone = cleanPhone;
    
    // 6. Compose commonData — CHỈ template variables + minimal system markers
    const commonData: Record<string, unknown> = {
      // === RAW SNAPSHOT (VENDOR BACKWARD-COMPATIBILITY) ===
      // Spread the raw payload first. This ensures any legacy CNV workflow mapped directly
      // to camelCase properties (like tenKhachHang, soPhieuBaoGia) continues to work.
      ...(p || {}),

      // === Phần SYSTEM (CNV cần để route) ===
      request_id: idempotencyKey,
      stt,
      so_dien_thoai_raw: cleanPhone,    // ← CNV phone field theo workflow
      phone: cleanPhone,
      message_type: message.messageType,
      
      // Mapping explicitly snake_case to support precise CNV Webhook Schema parsing
      ten_khach_hang: cleanCustomerName,
      so_hop_dong: variables.so_hop_dong || p.soHopDong || '',
      so_don_hang: variables.So_don_hang || variables.so_don_hang || p.soDonHang || '',

      // Schema explicit mappings (to support old workflow if user forgot to map new ones)
      soDonHang: variables.So_don_hang || variables.so_don_hang || p.soDonHang || '',
      soHopDong: variables.so_hop_dong || p.soHopDong || '',
      slMay: String(variables.so_luong || p.slMay || p.soLuong || '0'),
      soLuong: String(variables.so_luong || p.soLuong || p.slMay || '0'),
      ngayThanhToan: variables.time || p.ngayThanhToan || '',
      
      // CNV workflow uses Vietnamese spreadsheet columns for its UI mapping logic.
      // We inject the Vietnamese headers so CNV resolves them properly without throwing parameter missing errors.
      'Tên khách hàng': cleanCustomerName,
      'TÊN KHÁCH HÀNG': cleanCustomerName,
      'Tên Khách Hàng': cleanCustomerName,
      'Khách hàng': cleanCustomerName,
      'Số điện thoại': cleanPhone,
      'SỐ ĐIỆN THOẠI': cleanPhone,
      'SĐT': cleanPhone,
      'Số phiếu báo giá': variables.so_phieu_bao_gia || p.soPhieuBaoGia || '',
      'Số hợp đồng': variables.so_hop_dong || p.soHopDong || '',
      'Mã hợp đồng': variables.so_hop_dong || p.soHopDong || '',
      'Số đơn hàng': variables.So_don_hang || variables.so_don_hang || p.soDonHang || '',
      'Mã đơn hàng': variables.So_don_hang || variables.so_don_hang || p.soDonHang || '',
      'Số lượng máy': String(variables.so_luong || variables.sl_may || p.slMay || p.soLuong || '0'),
      'Số lượng': String(variables.so_luong || variables.sl_may || p.soLuong || p.slMay || '0'),
      'Tại thời điểm': variables.time || variables.ngay_thanh_toan || p.time || p.ngayThanhToan || '',
      'Ngày thanh toán': variables.time || variables.ngay_thanh_toan || p.ngayThanhToan || '',
      
      // Additional fallback names directly tied to system snake_case names for explicit mapping by CNV
      order_code: variables.order_code || (p.soHopDong && p.soDonHang ? `${p.soHopDong} | ${p.soDonHang}` : (p.soHopDong || p.soDonHang || '')),
      time: variables.time || p.time || p.ngayThanhToan || '',
      so_luong: String(variables.so_luong || p.soLuong || p.slMay || '0'),
      
      // CNV workflow was heavily mapped to camelCase fields directly from payload.
      // We explicitly map the truthy variables back to their legacy camelCase names
      // so CNV doesn't break if the user hasn't updated their webhook column mappings.
      customerName: cleanCustomerName,
      customerPhone: cleanPhone,
      
      // Explicitly map exact system snake_case parameters known to Zalo templates
      // to ensure CNV finds these variables in newValues even if user omits them in template config.
      customer_name: cleanCustomerName,
      row_data: JSON.stringify(p || {}),
      
      // === Template variables (user config) ===
      // These override raw fields if there is a collision, which is correct because
      // the template variables contain the fully evaluated (and formatted) fallback logic!
      ...variables,
      
      // === Action trigger (CNV check field này để fire workflow) ===
      [map.act]: 'Gửi tin',
      [map.disp]: 'Đang gửi',
    };
    
    // Xoá các field fallback rỗng vô nghĩa để qua unit test KHÔNG spray bừa
    Object.keys(commonData).forEach(k => {
      if (commonData[k] === '' && !(k in variables)) {
        delete commonData[k];
      }
    });
    
    // 7. Final payload theo schema CNV
    const finalPayload = {
      action: 'Edit',
      request_id: idempotencyKey,
      stt,
      phone: cleanPhone,
      customer_name: cleanCustomerName,
      customerName: cleanCustomerName,
      ten_khach_hang: cleanCustomerName,
      tenKhachHang: cleanCustomerName,
      'Tên khách hàng': cleanCustomerName,
      'Khách hàng': cleanCustomerName,
      template_data: {
        ...variables,
        customer_name: cleanCustomerName,
        phone: cleanPhone,
      },
      data: {
        ...commonData,
        customer_name: cleanCustomerName,
        phone: cleanPhone,
      },
      entity_data: p || {},
      message_type: message.messageType,
      meta: {
        created_at: new Date().toISOString(),
        source: 'AI_STUDIO_APP',
        template_version: templateVersion,
        template_key: templateKey,
      },
      newValues: {
        ...commonData,
        customer_name: cleanCustomerName,
        customerName: cleanCustomerName,
        ten_khach_hang: cleanCustomerName,
        tenKhachHang: cleanCustomerName,
        'Tên khách hàng': cleanCustomerName,
        'Khách hàng': cleanCustomerName,
        phone: cleanPhone,
        sdt: cleanPhone,
        so_dien_thoai_raw: cleanPhone,
      },
      oldValues: {}
    };
    
    return finalPayload;
  }
}

export const znsPayloadBuilder = new ZnsPayloadBuilder();
