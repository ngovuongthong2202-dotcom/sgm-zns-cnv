# End-to-End Tests (Playwright)

Thư mục này chứa E2E tests cho hệ thống, viết bằng Playwright.

## Cấu trúc

- `playwright.config.ts`: Cấu hình 4 workers concurrent với base URL local.
- `fixtures/test-user.ts`: Helper cho login, fake data.
- `tests/happy-paths.spec.ts`: 5 kịch bản happy paths (Tạo KH, BG, HĐ, PT, PG).
- `tests/sad-paths.spec.ts`: 5 kịch bản sad paths (Trùng SĐT, Offline, Conflict 2 tab, Delete ràng buộc, Gate reject).
- `tests/zns-paths.spec.ts`: 2 kịch bản ZNS (Send ZNS, Mock Webhook trả SUCCESS).

## Cách chạy

1. Khởi động Firebase Emulator:
   ```bash
   npm run build
   npx firebase emulators:start
   ```
2. Mở terminal mới, chạy Vite server hoặc node server:
   ```bash
   npm run start
   ```
3. Chạy tests:
   ```bash
   npm run e2e
   ```
   (Lệnh này sẽ thực thi `playwright test -c e2e/playwright.config.ts`)

Đảm bảo `.env.local` hoặc environment ở terminal có `PLAYWRIGHT_TEST_BASE_URL=http://localhost:3000` (mặc định nếu không cung cấp).
