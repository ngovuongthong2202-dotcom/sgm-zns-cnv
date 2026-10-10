// KHÔNG CHẠY LẠI. Script dùng một lần (10/2026) đã lưu trữ theo Đợt 0A (phụ lục 06, K2). Thoát ngay khi được gọi.
// Lưu ý: tệp đã chuyển thư mục nên import tương đối `../src/...` phía dưới không còn nạp được (tsx báo ERR_MODULE_NOT_FOUND trước khi chạy dòng nào).
// Dù có sửa đường dẫn thì các import đó cũng chỉ đọc .env và tạo client, không ghi gì; process.exit(1) bên dưới vẫn chặn phần thân.
process.exit(1);
import 'dotenv/config';
import { supabase } from '../src/shared/config/supabase.client';

async function reconcileLiveSupabase() {
  console.log('=== BẮT ĐẦU HÒA GIẢI DỮ LIỆU TRÙNG LẶP TRÊN SUPABASE ===\n');

  // ==========================================
  // 1. HÒA GIẢI BÁO GIÁ BGVT-2026-0171
  // ==========================================
  console.log('--- 1. Kiểm tra và hòa giải BGVT-2026-0171 ---');
  const { data: quoList, error: quoErr } = await supabase
    .from('quotations')
    .select('id, ma_bao_gia, customer_id, tong_tien, created_at, data')
    .or('ma_bao_gia.eq.BGVT-2026-0171,data->>soPhieuBaoGia.eq.BGVT-2026-0171')
    .is('deleted_at', null);

  if (quoErr) {
    console.error('Lỗi truy vấn quotations:', quoErr);
    return;
  }

  if (quoList && quoList.length > 1) {
    console.log(`Tìm thấy ${quoList.length} bản ghi mang mã BGVT-2026-0171:`);
    for (const q of quoList) {
      console.log(`  - ID: ${q.id} | KH: ${q.data?.tenKhachHang} | Ngày: ${q.data?.ngayBaoGia || q.created_at} | Tiền: ${q.tong_tien}`);
    }

    // Xác định bản ghi Hoa Sen giữ mã, bản ghi Phúc Thịnh Phát nhận mã mới
    const hoaSen = quoList.find(q => (q.data?.tenKhachHang || '').toLowerCase().includes('hoa sen'));
    const phucThinhPhat = quoList.find(q => (q.data?.tenKhachHang || '').toLowerCase().includes('phúc thịnh phát') || q.id !== hoaSen?.id);

    if (hoaSen && phucThinhPhat) {
      // Tìm số thứ tự lớn nhất hiện tại của Báo giá trong năm 2026
      const { data: allQuos } = await supabase
        .from('quotations')
        .select('ma_bao_gia, data')
        .is('deleted_at', null);

      let maxSeq = 175;
      (allQuos || []).forEach((q: any) => {
        const c = q.ma_bao_gia || q.data?.soPhieuBaoGia || '';
        const match = c.match(/(\d+)$/);
        if (match && match[1]) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num > maxSeq && num < 9000) {
            maxSeq = num;
          }
        }
      });

      const nextQuotationSeq = maxSeq + 1;
      const newQuoCode = `BGVT-2026-${String(nextQuotationSeq).padStart(4, '0')}`;
      console.log(`\n=> Kế hoạch hòa giải Báo giá:`);
      console.log(`   + Hoa Sen (ID: ${hoaSen.id}): GIỮ NGUYÊN MÃ BGVT-2026-0171`);
      console.log(`   + Phúc Thịnh Phát (ID: ${phucThinhPhat.id}): CẤP MÃ MỚI "${newQuoCode}"`);

      // Cập nhật Phúc Thịnh Phát
      const updatedData = {
        ...(phucThinhPhat.data || {}),
        soPhieuBaoGia: newQuoCode,
        maBaoGia: newQuoCode,
        soBaoGia: newQuoCode,
        reconciledFrom: 'BGVT-2026-0171',
        reconciledAt: new Date().toISOString()
      };

      const { error: updErr } = await supabase
        .from('quotations')
        .update({
          ma_bao_gia: newQuoCode,
          data: updatedData,
          updated_at: new Date().toISOString()
        })
        .eq('id', phucThinhPhat.id);

      if (updErr) {
        console.error('Lỗi cập nhật quotation Phúc Thịnh Phát:', updErr);
      } else {
        console.log(`   [THÀNH CÔNG] Đã cập nhật Phúc Thịnh Phát thành ${newQuoCode}`);

        // Cập nhật các bản ghi con liên kết
        // 1. Payments
        const { data: linkedPayments } = await supabase
          .from('payments')
          .select('id, data')
          .eq('quotation_id', phucThinhPhat.id);
        
        if (linkedPayments && linkedPayments.length > 0) {
          for (const lp of linkedPayments) {
            await supabase.from('payments').update({
              data: { ...(lp.data || {}), soPhieuBaoGia: newQuoCode, quotationCode: newQuoCode },
              updated_at: new Date().toISOString()
            }).eq('id', lp.id);
            console.log(`   - Cập nhật payment con ${lp.id} sang mã mới ${newQuoCode}`);
          }
        }

        // 2. Deliveries
        const { data: linkedDeliveries } = await supabase
          .from('deliveries')
          .select('id, data')
          .eq('quotation_id', phucThinhPhat.id);

        if (linkedDeliveries && linkedDeliveries.length > 0) {
          for (const ld of linkedDeliveries) {
            await supabase.from('deliveries').update({
              data: { ...(ld.data || {}), soPhieuBaoGia: newQuoCode },
              updated_at: new Date().toISOString()
            }).eq('id', ld.id);
            console.log(`   - Cập nhật delivery con ${ld.id} sang mã mới ${newQuoCode}`);
          }
        }
      }
    }
  } else {
    console.log('Không còn bản ghi trùng BGVT-2026-0171 hoặc đã được hòa giải.');
  }

  // ==========================================
  // 2. HÒA GIẢI 5 MÃ THANH TOÁN TRÙNG LỊCH SỬ
  // ==========================================
  console.log('\n--- 2. Kiểm tra và hòa giải các mã Thanh toán bị trùng ---');
  const { data: payments, error: payErr } = await supabase
    .from('payments')
    .select('id, ma_thanh_toan, customer_id, quotation_id, so_tien, created_at, data')
    .is('deleted_at', null)
    .order('created_at', { ascending: true });

  if (payErr) {
    console.error('Lỗi truy vấn payments:', payErr);
    return;
  }

  if (payments) {
    const payMap = new Map<string, any[]>();
    let maxPaySeq = 9243;

    for (const p of payments) {
      const code = p.ma_thanh_toan || p.data?.maThanhToan || p.data?.paymentId;
      if (!code) continue;
      if (!payMap.has(code)) payMap.set(code, []);
      payMap.get(code)!.push(p);

      const m = code.match(/(\d+)$/);
      if (m && m[1]) {
        const num = parseInt(m[1], 10);
        if (!isNaN(num) && num > maxPaySeq) {
          maxPaySeq = num;
        }
      }
    }

    const payDups = Array.from(payMap.entries()).filter(([_, list]) => list.length > 1);
    console.log(`Tìm thấy ${payDups.length} nhóm mã Thanh toán bị trùng:`);

    for (const [dupCode, list] of payDups) {
      console.log(`\n+ Xử lý nhóm trùng: "${dupCode}" (${list.length} bản ghi):`);
      // Giữ nguyên bản ghi tạo sớm nhất
      const original = list[0];
      console.log(`  - Bản ghi 1 (gốc, tạo ${original.created_at}): GIỮ NGUYÊN MÃ "${dupCode}" (ID: ${original.id})`);

      // Các bản ghi còn lại cấp mã mới kế tiếp
      for (let i = 1; i < list.length; i++) {
        maxPaySeq++;
        const newPayCode = `PT-2026-${maxPaySeq}`;
        const itemToHeal = list[i];
        console.log(`  - Bản ghi ${i + 1} (tạo ${itemToHeal.created_at}): CẤP MÃ MỚI "${newPayCode}" (ID: ${itemToHeal.id})`);

        const updatedPayData = {
          ...(itemToHeal.data || {}),
          maThanhToan: newPayCode,
          paymentId: newPayCode,
          reconciledFrom: dupCode,
          reconciledAt: new Date().toISOString()
        };

        const { error: pUpdErr } = await supabase
          .from('payments')
          .update({
            ma_thanh_toan: newPayCode,
            data: updatedPayData,
            updated_at: new Date().toISOString()
          })
          .eq('id', itemToHeal.id);

        if (pUpdErr) {
          console.error(`    Lỗi cập nhật payment ${itemToHeal.id}:`, pUpdErr);
        } else {
          console.log(`    [THÀNH CÔNG] Đã đổi mã payment sang ${newPayCode}`);

          // Cập nhật tham chiếu trong deliveries nếu có
          const { error: dUpdErr } = await supabase
            .from('deliveries')
            .update({
              payment_id: newPayCode,
              updated_at: new Date().toISOString()
            })
            .eq('payment_id', itemToHeal.id);

          if (!dUpdErr) {
            console.log(`    - Đã đồng bộ delivery liên kết.`);
          }
        }
      }
    }
  }

  console.log('\n=== HÒA GIẢI HOÀN TẤT. TIẾN HÀNH KIỂM TRA LẠI ===\n');
}

reconcileLiveSupabase().then(() => process.exit(0)).catch(e => {
  console.error(e);
  process.exit(1);
});
