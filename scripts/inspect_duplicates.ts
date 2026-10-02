import 'dotenv/config';
import { supabase } from '../src/shared/config/supabase.client';

async function inspectAllDuplicates() {
  console.log('=== TOÀN DIỆN: RÀ SOÁT TRÙNG LẶP DỮ LIỆU THỰC TẾ TRÊN SUPABASE ===\n');

  // 1. QUOTATIONS
  const { data: quotations, error: qErr } = await supabase
    .from('quotations')
    .select('id, ma_bao_gia, customer_id, tong_tien, created_at, data')
    .is('deleted_at', null);

  if (qErr) {
    console.error('Lỗi lấy quotations:', qErr);
  } else if (quotations) {
    console.log(`--- 1. BÁO GIÁ (Tổng cộng: ${quotations.length} bản ghi) ---`);
    const qMap = new Map<string, any[]>();
    for (const q of quotations) {
      const code = q.ma_bao_gia || q.data?.soPhieuBaoGia || q.data?.maBaoGia;
      if (!code) continue;
      if (!qMap.has(code)) qMap.set(code, []);
      qMap.get(code)!.push(q);
    }

    const qDups = [];
    for (const [code, list] of qMap.entries()) {
      if (list.length > 1) qDups.push({ code, count: list.length, items: list });
    }

    console.log(`Số mã Báo giá bị trùng: ${qDups.length}`);
    for (const dup of qDups) {
      console.log(`  [TRÙNG BÁO GIÁ] Mã: "${dup.code}" (${dup.count} bản ghi):`);
      for (const item of dup.items) {
        console.log(`    - ID: ${item.id} | KH: ${item.data?.tenKhachHang || 'N/A'} (ID: ${item.customer_id}) | Loại: ${item.data?.loai || 'N/A'} | Ngày: ${item.data?.ngayBaoGia || item.created_at} | Tiền: ${item.tong_tien?.toLocaleString('vi-VN')} đ`);
      }
    }

    // Inspect prefixes & numbers
    console.log('\n--- Kiểm tra phân bổ số thứ tự Báo Giá (BGM, BGVT, BGDV) ---');
    const specificCodes = ['0171', '0174', '0175'];
    for (const spec of specificCodes) {
      const matches = quotations.filter((q: any) => {
        const c = q.ma_bao_gia || q.data?.soPhieuBaoGia || '';
        return c.includes(spec);
      });
      console.log(`Các báo giá có chứa '${spec}':`);
      for (const m of matches) {
        console.log(`    * Mã: "${m.ma_bao_gia || m.data?.soPhieuBaoGia}" | KH: ${m.data?.tenKhachHang} | Loại: ${m.data?.loai} | Ngày: ${m.data?.ngayBaoGia}`);
      }
    }
  }

  // 2. CONTRACTS
  const { data: contracts, error: cErr } = await supabase
    .from('contracts')
    .select('id, ma_hop_dong, customer_id, quotation_id, created_at, data')
    .is('deleted_at', null);

  if (cErr) {
    console.error('Lỗi lấy contracts:', cErr);
  } else if (contracts) {
    console.log(`\n--- 2. HỢP ĐỒNG (Tổng cộng: ${contracts.length} bản ghi) ---`);
    const cMap = new Map<string, any[]>();
    for (const c of contracts) {
      const code = c.ma_hop_dong || c.data?.soHopDong || c.data?.maHopDong;
      if (!code) continue;
      if (!cMap.has(code)) cMap.set(code, []);
      cMap.get(code)!.push(c);
    }
    const cDups = [];
    for (const [code, list] of cMap.entries()) {
      if (list.length > 1) cDups.push({ code, count: list.length, items: list });
    }
    console.log(`Số mã Hợp đồng bị trùng: ${cDups.length}`);
    for (const dup of cDups) {
      console.log(`  [TRÙNG HỢP ĐỒNG] Mã: "${dup.code}" (${dup.count} bản ghi):`);
      for (const item of dup.items) {
        console.log(`    - ID: ${item.id} | KH: ${item.data?.tenKhachHang || item.customer_id} | Quotation: ${item.quotation_id} | Ngày: ${item.data?.ngayKy || item.created_at}`);
      }
    }
  }

  // 3. PAYMENTS
  const { data: payments, error: pErr } = await supabase
    .from('payments')
    .select('id, ma_thanh_toan, customer_id, quotation_id, contract_id, so_tien, created_at, data')
    .is('deleted_at', null);

  if (pErr) {
    console.error('Lỗi lấy payments:', pErr);
  } else if (payments) {
    console.log(`\n--- 3. THANH TOÁN (Tổng cộng: ${payments.length} bản ghi) ---`);
    const pMap = new Map<string, any[]>();
    for (const p of payments) {
      const code = p.ma_thanh_toan || p.data?.maThanhToan;
      if (!code) continue;
      if (!pMap.has(code)) pMap.set(code, []);
      pMap.get(code)!.push(p);
    }
    const pDups = [];
    for (const [code, list] of pMap.entries()) {
      if (list.length > 1) pDups.push({ code, count: list.length, items: list });
    }
    console.log(`Số mã Thanh toán bị trùng: ${pDups.length}`);
    for (const dup of pDups) {
      console.log(`  [TRÙNG THANH TOÁN] Mã: "${dup.code}" (${dup.count} bản ghi):`);
      for (const item of dup.items) {
        console.log(`    - ID: ${item.id} | KH: ${item.customer_id} | BG: ${item.quotation_id} | Số tiền: ${item.so_tien?.toLocaleString('vi-VN')} đ | Ngày: ${item.data?.ngayThanhToan || item.created_at}`);
      }
    }
  }

  // 4. DELIVERIES
  const { data: deliveries, error: dErr } = await supabase
    .from('deliveries')
    .select('id, ma_giao_hang, customer_id, quotation_id, contract_id, created_at, data')
    .is('deleted_at', null);

  if (dErr) {
    console.error('Lỗi lấy deliveries:', dErr);
  } else if (deliveries) {
    console.log(`\n--- 4. GIAO HÀNG (Tổng cộng: ${deliveries.length} bản ghi) ---`);
    const dMap = new Map<string, any[]>();
    for (const d of deliveries) {
      const code = d.ma_giao_hang || d.data?.maGiaoHang;
      if (!code) continue;
      if (!dMap.has(code)) dMap.set(code, []);
      dMap.get(code)!.push(d);
    }
    const dDups = [];
    for (const [code, list] of dMap.entries()) {
      if (list.length > 1) dDups.push({ code, count: list.length, items: list });
    }
    console.log(`Số mã Giao hàng bị trùng: ${dDups.length}`);
    for (const dup of dDups) {
      console.log(`  [TRÙNG GIAO HÀNG] Mã: "${dup.code}" (${dup.count} bản ghi):`);
      for (const item of dup.items) {
        console.log(`    - ID: ${item.id} | KH: ${item.customer_id} | HĐ: ${item.contract_id} | BG: ${item.quotation_id} | Ngày: ${item.data?.ngayGiaoMay || item.created_at}`);
      }
    }
  }
}

inspectAllDuplicates().then(() => process.exit(0)).catch(e => {
  console.error(e);
  process.exit(1);
});
