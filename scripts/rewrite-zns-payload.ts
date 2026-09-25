import * as fs from 'fs';

let content = fs.readFileSync('src/backend/services/zns/zns-payload.builder.ts', 'utf8');

content = content.replace('const payload = (message.payload as any) as any;', 'const payload = message.payload as Record<string, any>;\n    const p = payload;');

content = content.replace(
`    if (requiredVarsSet.has('order_code')) {
        // use combined string if both are present
        if ((message.payload as any) && (message.payload as any)) {
            rendered.order_code = \`\${(message.payload as any)} | \${(message.payload as any)}\`;
        } else if (isEmp(rendered.order_code)) {
            rendered.order_code = (message.payload as any) || (message.payload as any) || '';
        }
    }`,
`    if (requiredVarsSet.has('order_code')) {
        // use combined string if both are present
        if (p.soHopDong && p.soDonHang) {
            rendered.order_code = \`\${p.soHopDong} | \${p.soDonHang}\`;
        } else if (isEmp(rendered.order_code)) {
            rendered.order_code = p.soHopDong || p.soDonHang || '';
        }
    }`
);

content = content.replace(
`    if ((requiredVarsSet.has('so_don_hang') || requiredVarsSet.has('So_don_hang')) && isEmp(rendered.so_don_hang) && isEmp(rendered.So_don_hang)) {
        const robustDonHangFallback = (message.payload as any) || 'Không có';
        rendered.So_don_hang = robustDonHangFallback;
        rendered.so_don_hang = robustDonHangFallback;
        if ((message.payload as any)) {
            (message.payload as any) = robustDonHangFallback;
            (message.payload as any) = robustDonHangFallback;
            (message.payload as any) = robustDonHangFallback;
        }
    }`,
`    if ((requiredVarsSet.has('so_don_hang') || requiredVarsSet.has('So_don_hang')) && isEmp(rendered.so_don_hang) && isEmp(rendered.So_don_hang)) {
        const robustDonHangFallback = p.soDonHang || 'Không có';
        rendered.So_don_hang = robustDonHangFallback;
        rendered.so_don_hang = robustDonHangFallback;
    }`
);

content = content.replace(
`    if ((requiredVarsSet.has('so_hop_dong') || requiredVarsSet.has('So_hop_dong')) && isEmp(rendered.so_hop_dong) && isEmp(rendered.So_hop_dong)) {
        const robustFallback = (message.payload as any) || (message.payload as any) || 'Không có';
        rendered.So_hop_dong = robustFallback;
        rendered.so_hop_dong = robustFallback;
        if ((message.payload as any)) {
            (message.payload as any) = robustFallback;
            (message.payload as any) = robustFallback;
            (message.payload as any) = robustFallback;
        }
    }`,
`    if ((requiredVarsSet.has('so_hop_dong') || requiredVarsSet.has('So_hop_dong')) && isEmp(rendered.so_hop_dong) && isEmp(rendered.So_hop_dong)) {
        const robustFallback = p.soHopDong || 'Không có';
        rendered.So_hop_dong = robustFallback;
        rendered.so_hop_dong = robustFallback;
    }`
);

content = content.replace(
`    if (requiredVarsSet.has('so_luong') && (isEmp(rendered.so_luong) || String(rendered.so_luong) === '0' || String(rendered.so_luong) === '0 Máy')) {
        let defaultSl = String((message.payload as any) || (message.payload as any) || '0');
        if (defaultSl === '0' && (message.payload as any) && (message.payload as any) > 0) {
            defaultSl = String((message.payload as any)((acc: number, p: any) => acc + (Number(p.quantity) || 0), 0));
        }
        rendered.so_luong = defaultSl;
        if ((message.payload as any)) {
            (message.payload as any) = defaultSl;
            (message.payload as any) = defaultSl;
        }
    }`,
`    if (requiredVarsSet.has('so_luong') && (isEmp(rendered.so_luong) || String(rendered.so_luong) === '0' || String(rendered.so_luong) === '0 Máy')) {
        let defaultSl = String(p.soLuong || p.slMay || '0');
        if (defaultSl === '0' && p.products && p.products.length > 0) {
            defaultSl = String(p.products.reduce((acc: number, item: any) => acc + (Number(item.quantity) || 0), 0));
        }
        rendered.so_luong = defaultSl;
    }`
);

content = content.replace(
`    if (requiredVarsSet.has('dvt')) {
        // Evaluate default DVT from root payload or products array
        let defaultDvt = (message.payload as any);
        if ((!defaultDvt || defaultDvt === 'Cái') && (message.payload as any) && (message.payload as any) > 0) {
            defaultDvt = (message.payload as any) || (message.payload as any) || (message.payload as any) || 'Máy';
        }
        
        // If template renderer returned empty or if we found a better unit from products than default fallback 'Cái'
        if (isEmp(rendered.dvt) || (rendered.dvt === 'Cái' && defaultDvt && defaultDvt !== 'Cái')) {
            rendered.dvt = defaultDvt || 'Máy';
        } else if (isEmp(rendered.dvt)) {
            rendered.dvt = 'Máy';
        }
        if ((message.payload as any)) (message.payload as any) = rendered.dvt;
    }`,
`    if (requiredVarsSet.has('dvt')) {
        // Evaluate default DVT from root payload or products array
        let defaultDvt = p.dvt;
        if ((!defaultDvt || defaultDvt === 'Cái') && p.products && p.products.length > 0) {
            defaultDvt = p.products[0]?.unit || p.products[0]?.dvt_chuan || p.products[0]?.dvt || 'Máy';
        }
        
        // If template renderer returned empty or if we found a better unit from products than default fallback 'Cái'
        if (isEmp(rendered.dvt) || (rendered.dvt === 'Cái' && defaultDvt && defaultDvt !== 'Cái')) {
            rendered.dvt = defaultDvt || 'Máy';
        } else if (isEmp(rendered.dvt)) {
            rendered.dvt = 'Máy';
        }
    }`
);

content = content.replace(
`    if (requiredVarsSet.has('time') && isEmp(rendered.time)) {
        rendered.time = (message.payload as any) || '';
    }`,
`    if (requiredVarsSet.has('time') && isEmp(rendered.time)) {
        rendered.time = p.time || p.ngayThanhToan || '';
    }`
);

content = content.replace(
`    if (requiredVarsSet.has('so_phieu_xuat') && isEmp(rendered.so_phieu_xuat)) {
        const spFallback = (message.payload as any) || (message.payload as any) || 'Không có';
        rendered.so_phieu_xuat = spFallback;
        if ((message.payload as any)) {
            (message.payload as any) = spFallback;
            (message.payload as any) = spFallback;
        }
    }`,
`    if (requiredVarsSet.has('so_phieu_xuat') && isEmp(rendered.so_phieu_xuat)) {
        const spFallback = p.soPhieuXuat || 'Không có';
        rendered.so_phieu_xuat = spFallback;
    }`
);

content = content.replace(
`    if (requiredVarsSet.has('ngay_giao_may') && isEmp(rendered.ngay_giao_may)) {
        rendered.ngay_giao_may = (message.payload as any) || 'Không có';
        if ((message.payload as any) && !(message.payload as any)) {
            (message.payload as any) = 'Không có';
            (message.payload as any) = 'Không có';
        }
    }`,
`    if (requiredVarsSet.has('ngay_giao_may') && isEmp(rendered.ngay_giao_may)) {
        rendered.ngay_giao_may = p.ngayGiaoMay || p.ngayGiao || 'Không có';
    }`
);

content = content.replace(
`    if (requiredVarsSet.has('danh_sach_ma_may') && isEmp(rendered.danh_sach_ma_may)) {
        // user requirement: danh_sach_ma_may = productId separated by |
        if ((message.payload as any) > 0) {
            rendered.danh_sach_ma_may = (message.payload as any)
                .map((p: any) => p.productId || p.productName)
                .filter(Boolean)
                .join(' | ');
        } else if (Array.isArray((message.payload as any)) && (message.payload as any) > 0) {
            rendered.danh_sach_ma_may = (message.payload as any)(' | ');
        }
    }`,
`    if (requiredVarsSet.has('danh_sach_ma_may') && isEmp(rendered.danh_sach_ma_may)) {
        // user requirement: danh_sach_ma_may = productId separated by |
        if (p.products && p.products.length > 0) {
            rendered.danh_sach_ma_may = p.products
                .map((item: any) => item.productId || item.productName)
                .filter(Boolean)
                .join(' | ');
        } else if (Array.isArray(p.danhSachMaMay) && p.danhSachMaMay.length > 0) {
            rendered.danh_sach_ma_may = p.danhSachMaMay.join(' | ');
        } else if (typeof p.danhSachMaMay === 'string') {
            rendered.danh_sach_ma_may = p.danhSachMaMay;
        }
    }`
);

content = content.replace(
`    const stt = (message.payload as any)() || idempotencyKey;`,
`    const stt = p.stt?.toString() || p.id?.toString() || idempotencyKey;`
);

content = content.replace(
`    const cleanCustomerName = (variables.customer_name || (message.payload as any) || '').toString().trim().substring(0, 60);
    const cleanPhone = (variables.phone || (message.payload as any) || phoneObj || '').toString().trim();`,
`    const cleanCustomerName = (variables.customer_name || p.tenKhachHang || '').toString().trim().substring(0, 60);
    const cleanPhone = (variables.phone || p.sdt || phoneObj || '').toString().trim();`
);

content = content.replace(
`      // Spread the raw payload first. This ensures any legacy CNV workflow mapped directly
      // to camelCase properties (like tenKhachHang, soPhieuBaoGia) continues to work.
      ...((message.payload as any) || {}),`,
`      // Spread the raw payload first. This ensures any legacy CNV workflow mapped directly
      // to camelCase properties (like tenKhachHang, soPhieuBaoGia) continues to work.
      ...(p || {}),`
);

content = content.replace(
`      ten_khach_hang: cleanCustomerName,
      so_hop_dong: variables.so_hop_dong || (message.payload as any) || '',
      so_don_hang: variables.So_don_hang || variables.so_don_hang || (message.payload as any) || '',

      // Schema explicit mappings (to support old workflow if user forgot to map new ones)
      soDonHang: variables.So_don_hang || variables.so_don_hang || (message.payload as any) || '',
      soHopDong: variables.so_hop_dong || (message.payload as any) || '',
      slMay: variables.so_luong || (message.payload as any) || (message.payload as any) || '0',
      soLuong: variables.so_luong || (message.payload as any) || (message.payload as any) || '0',
      ngayThanhToan: variables.time || (message.payload as any) || '',`,
`      ten_khach_hang: cleanCustomerName,
      so_hop_dong: variables.so_hop_dong || p.soHopDong || '',
      so_don_hang: variables.So_don_hang || variables.so_don_hang || p.soDonHang || '',

      // Schema explicit mappings (to support old workflow if user forgot to map new ones)
      soDonHang: variables.So_don_hang || variables.so_don_hang || p.soDonHang || '',
      soHopDong: variables.so_hop_dong || p.soHopDong || '',
      slMay: variables.so_luong || p.slMay || p.soLuong || '0',
      soLuong: variables.so_luong || p.soLuong || p.slMay || '0',
      ngayThanhToan: variables.time || p.ngayThanhToan || '',`
);

content = content.replace(
`      'Số phiếu báo giá': variables.so_phieu_bao_gia || (message.payload as any) || '',
      'Số hợp đồng': variables.so_hop_dong || (message.payload as any) || '',
      'Mã hợp đồng': variables.so_hop_dong || (message.payload as any) || '',
      'Số đơn hàng': variables.So_don_hang || variables.so_don_hang || (message.payload as any) || '',
      'Mã đơn hàng': variables.So_don_hang || variables.so_don_hang || (message.payload as any) || '',
      'Số lượng máy': variables.so_luong || variables.sl_may || (message.payload as any) || (message.payload as any) || '0',
      'Số lượng': variables.so_luong || variables.sl_may || (message.payload as any) || (message.payload as any) || '0',
      'Tại thời điểm': variables.time || variables.ngay_thanh_toan || (message.payload as any) || '',
      'Ngày thanh toán': variables.time || variables.ngay_thanh_toan || (message.payload as any) || '',
      
      // Additional fallback names directly tied to system snake_case names for explicit mapping by CNV
      order_code: variables.order_code || ((message.payload as any) && (message.payload as any) ? \`\${(message.payload as any)} | \${(message.payload as any)}\` : ((message.payload as any) || (message.payload as any) || '')),
      time: variables.time || (message.payload as any) || '',
      so_luong: variables.so_luong || (message.payload as any) || (message.payload as any) || '0',`,
`      'Số phiếu báo giá': variables.so_phieu_bao_gia || p.soPhieuBaoGia || '',
      'Số hợp đồng': variables.so_hop_dong || p.soHopDong || '',
      'Mã hợp đồng': variables.so_hop_dong || p.soHopDong || '',
      'Số đơn hàng': variables.So_don_hang || variables.so_don_hang || p.soDonHang || '',
      'Mã đơn hàng': variables.So_don_hang || variables.so_don_hang || p.soDonHang || '',
      'Số lượng máy': variables.so_luong || variables.sl_may || p.slMay || p.soLuong || '0',
      'Số lượng': variables.so_luong || variables.sl_may || p.soLuong || p.slMay || '0',
      'Tại thời điểm': variables.time || variables.ngay_thanh_toan || p.time || p.ngayThanhToan || '',
      'Ngày thanh toán': variables.time || variables.ngay_thanh_toan || p.ngayThanhToan || '',
      
      // Additional fallback names directly tied to system snake_case names for explicit mapping by CNV
      order_code: variables.order_code || (p.soHopDong && p.soDonHang ? \`\${p.soHopDong} | \${p.soDonHang}\` : (p.soHopDong || p.soDonHang || '')),
      time: variables.time || p.time || p.ngayThanhToan || '',
      so_luong: variables.so_luong || p.soLuong || p.slMay || '0',`
);

content = content.replace(
`      // Explicitly map exact system snake_case parameters known to Zalo templates
      // to ensure CNV finds these variables in newValues even if user omits them in template config.
      customer_name: cleanCustomerName,
      row_data: JSON.stringify((message.payload as any) || {}),`,
`      // Explicitly map exact system snake_case parameters known to Zalo templates
      // to ensure CNV finds these variables in newValues even if user omits them in template config.
      customer_name: cleanCustomerName,
      row_data: JSON.stringify(p || {}),`
);

content = content.replace(
`      template_data: variables,
      entity_data: (message.payload as any) || {},`,
`      template_data: variables,
      entity_data: p || {},`
);

// One missed any in error code
content = content.replace(
`        (err as any).code = 'TEMPLATE_VARIABLES_MISSING';
        (err as any).missing = missingVars;`,
`        Object.assign(err, { code: 'TEMPLATE_VARIABLES_MISSING', missing: missingVars });`
);

content = content.replace(
`      (err as any).code = 'ZALO_REQUIRED_VARS_EMPTY';
      (err as any).missing = emptyRequired;`,
`      Object.assign(err, { code: 'ZALO_REQUIRED_VARS_EMPTY', missing: emptyRequired });`
);

fs.writeFileSync('src/backend/services/zns/zns-payload.builder.ts', content, 'utf8');

console.log("Done overwriting");
