const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

function normalizeTaxCode(tax) {
  return (tax || '').trim().replace(/[\s\-_]/g, '');
}

async function runConsolidation() {
  console.log('--- BẮT ĐẦU TIẾN TRÌNH GOM KHÁCH HÀNG TRÙNG MÃ SỐ THUẾ TRÊN SUPABASE ---');

  // 1. Fetch all customers
  const { data: allCustomers, error: custErr } = await supabase.from('customers').select('*');
  if (custErr) throw custErr;

  console.log(`Tổng số khách hàng hiện tại: ${allCustomers.length}`);

  // 2. Fetch all quotations, contracts, payments, deliveries
  const [qRes, cRes, pRes, dRes] = await Promise.all([
    supabase.from('quotations').select('id, customer_id, data'),
    supabase.from('contracts').select('id, customer_id, data'),
    supabase.from('payments').select('id, customer_id, data'),
    supabase.from('deliveries').select('id, customer_id, data'),
  ]);

  const allQuotations = qRes.data || [];
  const allContracts = cRes.data || [];
  const allPayments = pRes.data || [];
  const allDeliveries = dRes.data || [];

  // Group by 10-digit tax code
  const groupsByTax = new Map();
  allCustomers.forEach(c => {
    if (c.is_archived || c.data?.isArchived || c.data?.mergedInto) return;
    const mst = normalizeTaxCode(c.data?.maSoThue);
    if (mst && mst.length >= 8 && mst.length < 13) {
      if (!groupsByTax.has(mst)) groupsByTax.set(mst, []);
      groupsByTax.get(mst).push(c);
    }
  });

  const duplicateGroups = [];
  groupsByTax.forEach((list, mst) => {
    if (list.length > 1) {
      duplicateGroups.push({ mst, list });
    }
  });

  console.log(`Tìm thấy ${duplicateGroups.length} nhóm trùng mã số thuế cần gộp:`);

  for (const group of duplicateGroups) {
    console.log(`\n=================== XỬ LÝ NHÓM MST: ${group.mst} ===================`);
    const customersInGroup = group.list;

    // Pick Master Customer:
    // Sort by quotations count descending, then maKh ascending
    const sorted = [...customersInGroup].sort((a, b) => {
      const qCountA = allQuotations.filter(q => q.customer_id === a.id || q.data?.maKh === a.ma_kh).length;
      const qCountB = allQuotations.filter(q => q.customer_id === b.id || q.data?.maKh === b.ma_kh).length;
      if (qCountB !== qCountA) return qCountB - qCountA;
      return (a.ma_kh || '').localeCompare(b.ma_kh || '');
    });

    const master = sorted[0];
    const secondaries = sorted.slice(1);

    console.log(`  -> MASTER: ${master.ma_kh} (${master.ten_khach_hang}) - ID: ${master.id}`);
    console.log(`  -> SECONDARIES CẦN GỘP: ${secondaries.map(s => `${s.ma_kh} (${s.id})`).join(', ')}`);

    // Gộp contacts
    const mergedContacts = [...(master.data?.contacts || [])];
    const seenPhones = new Set();
    const seenNames = new Set();

    if (master.sdt) seenPhones.add(master.sdt.replace(/\D/g, ''));
    if (master.data?.nguoiDaiDien) seenNames.add(master.data.nguoiDaiDien.toLowerCase().trim());
    if (master.ten_khach_hang) seenNames.add(master.ten_khach_hang.toLowerCase().trim());

    mergedContacts.forEach(ct => {
      if (ct.sdt) seenPhones.add(ct.sdt.replace(/\D/g, ''));
      if (ct.nguoiDaiDien) seenNames.add(ct.nguoiDaiDien.toLowerCase().trim());
    });

    // Bổ sung đầu mối từ Master nếu chưa có trong mảng
    if (master.data?.nguoiDaiDien && !mergedContacts.some(ct => ct.nguoiDaiDien === master.data.nguoiDaiDien)) {
      mergedContacts.unshift({
        nguoiDaiDien: master.data.nguoiDaiDien,
        sdt: master.sdt || '',
        chucVu: master.data.chucVu || 'Đại diện chính',
        chiNhanh: master.data.chiNhanh || master.tinh_thanh || '',
      });
    }

    // Duyệt qua từng secondary để gom contacts
    for (const sec of secondaries) {
      const secPhoneClean = (sec.sdt || '').replace(/\D/g, '');
      const secName = sec.data?.nguoiDaiDien || '';
      const secNameLower = secName.toLowerCase().trim();

      const isNewPhone = secPhoneClean && !seenPhones.has(secPhoneClean);
      const isNewName = secName && !seenNames.has(secNameLower);

      if (isNewPhone || isNewName) {
        mergedContacts.push({
          nguoiDaiDien: secName || `Đầu mối (${sec.ma_kh})`,
          sdt: sec.sdt || '',
          chucVu: sec.data?.chucVu || `Đầu mối từ ${sec.ma_kh}`,
          chiNhanh: sec.data?.chiNhanh || sec.tinh_thanh || '',
        });
        if (secPhoneClean) seenPhones.add(secPhoneClean);
        if (secNameLower) seenNames.add(secNameLower);
      }

      // Cũng duyệt mảng contacts của secondary nếu có
      if (Array.isArray(sec.data?.contacts)) {
        for (const ct of sec.data.contacts) {
          const ctPhoneClean = (ct.sdt || '').replace(/\D/g, '');
          const ctName = ct.nguoiDaiDien || '';
          const ctNameLower = ctName.toLowerCase().trim();

          const isCtNewPhone = ctPhoneClean && !seenPhones.has(ctPhoneClean);
          const isCtNewName = ctName && !seenNames.has(ctNameLower);

          if (isCtNewPhone || isCtNewName) {
            mergedContacts.push({
              nguoiDaiDien: ctName || `Đầu mối (${sec.ma_kh})`,
              sdt: ct.sdt || '',
              chucVu: ct.chucVu || `Đầu mối từ ${sec.ma_kh}`,
              chiNhanh: ct.chiNhanh || sec.tinh_thanh || '',
            });
            if (ctPhoneClean) seenPhones.add(ctPhoneClean);
            if (ctNameLower) seenNames.add(ctNameLower);
          }
        }
      }
    }

    console.log(`  -> ĐẦU MỐI SAU KHI GỘP (${mergedContacts.length}):`, mergedContacts.map(ct => `${ct.nguoiDaiDien} (${ct.sdt})`));

    // Cập nhật Master Customer trong Supabase
    const updatedMasterData = {
      ...(master.data || {}),
      contacts: mergedContacts,
      ghiChuHeThong: [
        master.data?.ghiChuHeThong,
        `[MDM-CONSOLIDATION] Đã hợp nhất các hồ sơ trùng MST ${group.mst}: ${secondaries.map(s => s.ma_kh).join(', ')} vào ngày ${new Date().toISOString()}`
      ].filter(Boolean).join('\n'),
      updatedAt: new Date().toISOString()
    };

    const { error: masterUpErr } = await supabase.from('customers').update({
      data: updatedMasterData,
      updated_at: new Date().toISOString()
    }).eq('id', master.id);

    if (masterUpErr) {
      console.error(`  Lỗi khi cập nhật Master ${master.ma_kh}:`, masterUpErr);
      continue;
    }
    console.log(`  ✓ Đã cập nhật Master ${master.ma_kh} thành công!`);

    // Lưu trữ và đánh dấu các Secondaries
    for (const sec of secondaries) {
      const updatedSecData = {
        ...(sec.data || {}),
        isArchived: true,
        mergedInto: master.id,
        mergedIntoMaKh: master.ma_kh,
        mergedAt: new Date().toISOString(),
        tenKhachHang: `[ĐÃ GỘP VÀO ${master.ma_kh}] ${sec.ten_khach_hang}`
      };

      const { error: secUpErr } = await supabase.from('customers').update({
        is_archived: true,
        data: updatedSecData,
        updated_at: new Date().toISOString()
      }).eq('id', sec.id);

      if (secUpErr) {
        console.error(`  Lỗi khi lưu trữ Secondary ${sec.ma_kh}:`, secUpErr);
      } else {
        console.log(`  ✓ Đã đánh dấu gộp Secondary ${sec.ma_kh} -> ${master.ma_kh}!`);
      }

      // Điều chuyển Quotations của Secondary sang Master ID
      const secQuotes = allQuotations.filter(q => q.customer_id === sec.id || q.data?.maKh === sec.ma_kh);
      for (const q of secQuotes) {
        const updatedQData = {
          ...(q.data || {}),
          customerId: master.id,
          maKh: master.ma_kh,
          // BẢO TOÀN THÔNG TIN ĐẦU MỐI GỐC CỦA CHÍNH BÁO GIÁ NÀY
          nguoiDaiDien: q.data?.nguoiDaiDien || sec.data?.nguoiDaiDien || '',
          sdt: q.data?.sdt || sec.sdt || '',
          mergedFromCustomerId: sec.id,
          mergedFromMaKh: sec.ma_kh,
        };

        await supabase.from('quotations').update({
          customer_id: master.id,
          data: updatedQData,
          updated_at: new Date().toISOString()
        }).eq('id', q.id);

        console.log(`    -> Chuyển giao Báo Giá ${q.data?.soPhieuBaoGia || q.id} (Đầu mối: ${updatedQData.nguoiDaiDien}) sang ${master.ma_kh}`);
      }

      // Điều chuyển Contracts của Secondary sang Master ID
      const secContracts = allContracts.filter(c => c.customer_id === sec.id || c.data?.maKh === sec.ma_kh);
      for (const c of secContracts) {
        const updatedCData = {
          ...(c.data || {}),
          customerId: master.id,
          maKh: master.ma_kh,
          mergedFromCustomerId: sec.id,
          mergedFromMaKh: sec.ma_kh,
        };

        await supabase.from('contracts').update({
          customer_id: master.id,
          data: updatedCData,
          updated_at: new Date().toISOString()
        }).eq('id', c.id);

        console.log(`    -> Chuyển giao Hợp Đồng ${c.data?.soHopDong || c.id} sang ${master.ma_kh}`);
      }

      // Điều chuyển Payments của Secondary sang Master ID
      const secPayments = allPayments.filter(p => p.customer_id === sec.id || p.data?.maKh === sec.ma_kh);
      for (const p of secPayments) {
        const updatedPData = {
          ...(p.data || {}),
          customerId: master.id,
          maKh: master.ma_kh,
          tenNguoiNop: p.data?.tenNguoiNop || sec.data?.nguoiDaiDien || '',
          sdt: p.data?.sdt || sec.sdt || '',
          mergedFromCustomerId: sec.id,
          mergedFromMaKh: sec.ma_kh,
        };

        await supabase.from('payments').update({
          customer_id: master.id,
          data: updatedPData,
          updated_at: new Date().toISOString()
        }).eq('id', p.id);

        console.log(`    -> Chuyển giao Phiếu Thu ${p.data?.paymentId || p.id} sang ${master.ma_kh}`);
      }

      // Điều chuyển Deliveries của Secondary sang Master ID
      const secDeliveries = allDeliveries.filter(d => d.customer_id === sec.id || d.data?.maKh === sec.ma_kh);
      for (const d of secDeliveries) {
        const updatedDData = {
          ...(d.data || {}),
          customerId: master.id,
          maKh: master.ma_kh,
          nguoiNhanHang: d.data?.nguoiNhanHang || d.data?.nguoiLienHe || sec.data?.nguoiDaiDien || '',
          sdtNguoiNhan: d.data?.sdtNguoiNhan || d.data?.sdtLienHe || sec.sdt || '',
          mergedFromCustomerId: sec.id,
          mergedFromMaKh: sec.ma_kh,
        };

        await supabase.from('deliveries').update({
          customer_id: master.id,
          data: updatedDData,
          updated_at: new Date().toISOString()
        }).eq('id', d.id);

        console.log(`    -> Chuyển giao Giao Hàng ${d.data?.deliveryId || d.id} sang ${master.ma_kh}`);
      }
    }
  }

  console.log('\n--- HOÀN THÀNH TOÀN DIỆN TIẾN TRÌNH GOM KHÁCH HÀNG TRÙNG MÃ SỐ THUẾ TRÊN SUPABASE ---');
}

runConsolidation().catch(console.error);
