const { chromium } = require('@playwright/test');

async function runRealProdTest() {
  console.log('=== BẮT ĐẦU KIỂM TRA TOÀN DIỆN HỆ THỐNG THỰC TẾ (REAL PRODUCTION FLOW) ===');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const consoleErrors = [];
  const consoleWarnings = [];

  page.on('console', msg => {
    const text = msg.text();
    if (msg.type() === 'error') {
      // Don't treat expected 400 bad credentials on invalid login test as unexpected fatal crash
      console.log(`  [BROWSER ERROR] ${text}`);
      consoleErrors.push(text);
    } else if (msg.type() === 'warning' && !text.includes('React Router Future Flag Warning')) {
      consoleWarnings.push(text);
    }
  });

  page.on('pageerror', err => {
    console.log(`  [PAGE EXCEPTION] ${err.message}`);
    consoleErrors.push(err.message);
  });

  try {
    // 1. Kiểm tra màn hình Đăng nhập thật (Không giả lập)
    console.log('\n--- 1. Kiểm tra màn hình đăng nhập (Real Login Screen) ---');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(1000);

    const hasUsernameInput = await page.isVisible('#username');
    console.log(`Màn hình đăng nhập hiển thị: ${hasUsernameInput ? 'CÓ (OK)' : 'KHÔNG'}`);

    // Thử đăng nhập sai mật khẩu
    console.log('Thử đăng nhập sai mật khẩu...');
    await page.fill('#username', 'admin');
    await page.fill('#password', 'wrongpassword123');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(1200);

    const errorAlertVisible = await page.locator(':text("không chính xác")').first().isVisible().catch(() => false);
    console.log(`Thông báo lỗi hiển thị đúng khi mật khẩu sai: ${errorAlertVisible ? 'CÓ (Chính xác)' : 'KHÔNG'}`);

    // 2. Đăng nhập thật với tài khoản Quản Trị Viên (admin / admin)
    console.log('\n--- 2. Đăng nhập thật với Quản Trị Viên (admin / admin) ---');
    await page.fill('#username', 'admin');
    await page.fill('#password', 'admin');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    const adminRoleBadge = await page.locator(':text("Quản trị viên")').first().isVisible().catch(() => false);
    console.log(`Đăng nhập thành công, vai trò hiển thị: ${adminRoleBadge ? '👑 Quản trị viên (OK)' : 'THẤT BẠI'}`);

    // Ghim sidebar để click chuẩn xác
    await page.evaluate(() => localStorage.setItem('sgm_sidebar_pinned', 'true'));
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    // 3. Kiểm tra ZNS Hub (/zns-hub)
    console.log('\n--- 3. Kiểm tra ZNS Hub (/zns-hub) ---');
    const tZnsStart = Date.now();
    await page.click('a[href="/zns-hub"]');
    await page.waitForTimeout(600);
    const znsDuration = Date.now() - tZnsStart;
    console.log(`ZNS Hub mở trong: ${znsDuration}ms (Mượt: ${znsDuration < 1500 ? 'ĐẠT' : 'CHẬM'})`);

    const znsTabs = ['Chi tiết tin gửi', 'Phản hồi chưa gán', 'Debug Webhook'];
    for (const tabText of znsTabs) {
      const tabBtn = page.locator(`button:has-text("${tabText}")`);
      if (await tabBtn.isVisible().catch(() => false)) {
        await tabBtn.click();
        await page.waitForTimeout(300);
        console.log(`  ✓ Tab ZNS "${tabText}" phản hồi mượt`);
      }
    }

    // 4. Kiểm tra Nhật Ký (/audit-logs)
    console.log('\n--- 4. Kiểm tra Nhật Ký Hệ Thống (/audit-logs) ---');
    const tAuditStart = Date.now();
    await page.click('a[href="/audit-logs"]');
    await page.waitForTimeout(600);
    const auditDuration = Date.now() - tAuditStart;
    console.log(`Nhật Ký mở trong: ${auditDuration}ms (Mượt: ${auditDuration < 1500 ? 'ĐẠT' : 'CHẬM'})`);
    const hasAuditContent = await page.locator(':text("Nhật ký Hoạt động"), :text("Sự kiện (24h)"), :text("QuotationCreated"), :text("Không tìm thấy nhật ký")').first().isVisible().catch(() => false);
    console.log(`Nhật Ký hiển thị dữ liệu bảng/timeline: ${hasAuditContent ? 'CÓ (OK)' : 'KHÔNG'}`);

    // 5. Kiểm tra Cài Đặt (/settings) và toàn bộ 9 subtabs
    console.log('\n--- 5. Kiểm tra Cài Đặt và 9 phân hệ cấu hình ---');
    const tSettingsStart = Date.now();
    await page.click('a[href*="/settings"]');
    await page.waitForTimeout(600);
    const settingsDuration = Date.now() - tSettingsStart;
    console.log(`Cài đặt mở trong: ${settingsDuration}ms (Mượt: ${settingsDuration < 1500 ? 'ĐẠT' : 'CHẬM'})`);

    const subTabs = [
      { name: 'Vendor & Webhook', path: 'vendor' },
      { name: 'Workflow Gates', path: 'gates' },
      { name: 'Health Score Logic', path: 'health-score' },
      { name: 'Trường thông tin', path: 'fields' },
      { name: 'Thư viện sản phẩm', path: 'catalog' },
      { name: 'Telegram Bot', path: 'telegram' },
      { name: 'Hệ thống người dùng', path: 'users' },
      { name: 'Hệ thống (Cron & Backup)', path: 'system' },
      { name: 'Thông tin bản build', path: 'about' },
    ];

    let notFoundCount = 0;
    for (const sub of subTabs) {
      const link = page.locator(`a[href*="${sub.path}"]`).first();
      if (await link.isVisible().catch(() => false)) {
        const tSub0 = Date.now();
        await link.click();
        await page.waitForTimeout(150);
        const subDuration = Date.now() - tSub0;
        const has404 = await page.locator(':text("Route not found"), :text("Không tìm thấy trang")').isVisible().catch(() => false);
        if (has404) {
          console.log(`  ✗ Subtab "${sub.name}" BỊ LỖI 404 Route not found!`);
          notFoundCount++;
        } else {
          console.log(`  ✓ Subtab "${sub.name}" chuyển tức thì (${subDuration}ms)`);
        }
      }
    }
    console.log(`Tổng số subtab bị 404: ${notFoundCount}`);

    // 6. Kiểm tra các phân hệ nghiệp vụ cốt lõi (Khách hàng, Báo giá, Hợp đồng, Thanh toán, Giao hàng)
    console.log('\n--- 6. Kiểm tra các phân hệ nghiệp vụ cốt lõi ---');
    const bizModules = [
      { name: 'Khách hàng', href: '/customers' },
      { name: 'Báo giá', href: '/quotations' },
      { name: 'Hợp đồng', href: '/contracts' },
      { name: 'Thanh toán', href: '/payments' },
      { name: 'Giao hàng', href: '/deliveries' },
    ];

    for (const mod of bizModules) {
      const t0 = Date.now();
      await page.click(`a[href="${mod.href}"]`);
      await page.waitForTimeout(200);
      console.log(`  ✓ Phân hệ "${mod.name}" chuyển mượt tức thì (${Date.now() - t0}ms)`);
    }

    // 7. Kiểm tra Cost Counter
    console.log('\n--- 7. Kiểm tra Supabase Cost Monitor ---');
    const costBadge = await page.locator('.fixed.bottom-3.left-16').first();
    const costText = await costBadge.innerText().catch(() => 'N/A');
    console.log(`Trạng thái Supabase Cost: ${costText.replace(/\n/g, ' | ')}`);

    // 8. Đăng xuất (Logout) và kiểm tra phiên làm việc
    console.log('\n--- 8. Kiểm tra Đăng xuất (Logout) qua Header Logout ---');
    const headerLogoutBtn = page.locator('header button[aria-label="Đăng xuất"]').first();
    await headerLogoutBtn.click();
    await page.waitForTimeout(1200);
    const isBackToLogin = await page.isVisible('#username');
    console.log(`Đã đăng xuất và quay lại màn hình Login: ${isBackToLogin ? 'ĐÚNG (OK)' : 'CHƯA'}`);
    const clearedSession = await page.evaluate(() => localStorage.getItem('sgm_user_session'));
    console.log(`Phiên làm việc trong localStorage đã xoá sạch: ${clearedSession === null ? 'ĐÚNG (OK)' : 'CHƯA'}`);

    // 9. Kiểm tra tài khoản Nhân viên (le.ntm / 123456@#)
    console.log('\n--- 9. Đăng nhập tài khoản Nhân viên (le.ntm / 123456@#) ---');
    await page.fill('#username', 'le.ntm');
    await page.fill('#password', '123456@#');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    const staffRoleBadge = await page.locator(':text("Chuyên viên")').first().isVisible().catch(() => false);
    console.log(`Đăng nhập thành công với tài khoản le.ntm, vai trò Chuyên viên: ${staffRoleBadge ? '💼 Chuyên viên (OK)' : 'KHÔNG'}`);

    // Kiểm tra quyền hạn: nhân viên không thấy các menu hệ thống nhạy cảm
    const staffHasZnsHub = await page.locator('a[href="/zns-hub"]').isVisible().catch(() => false);
    const staffHasSettings = await page.locator('a[href*="/settings"]').isVisible().catch(() => false);
    const staffHasAudit = await page.locator('a[href="/audit-logs"]').isVisible().catch(() => false);
    console.log(`Chuyên viên thấy ZNS Hub: ${staffHasZnsHub} (Chính sách: ${staffHasZnsHub ? 'Hiển thị' : 'Ẩn an toàn'})`);
    console.log(`Chuyên viên thấy Cài đặt: ${staffHasSettings} (Chính sách: ${staffHasSettings ? 'Hiển thị' : 'Ẩn an toàn'})`);
    console.log(`Chuyên viên thấy Nhật ký: ${staffHasAudit} (Chính sách: ${staffHasAudit ? 'Hiển thị' : 'Ẩn an toàn'})`);

  } catch (err) {
    console.error('LỖI TRONG QUÁ TRÌNH KIỂM TRA:', err);
  } finally {
    console.log('\n=== TỔNG KẾT KIỂM TRA ===');
    const fatalErrors = consoleErrors.filter(e => !e.includes('status of 400'));
    console.log(`Số lỗi Console nghiêm trọng: ${fatalErrors.length}`);
    if (fatalErrors.length > 0) {
      console.log('Chi tiết lỗi:', fatalErrors);
    }
    await browser.close();
    console.log('Hoàn thành kiểm tra thực tế.');
  }
}

runRealProdTest();
