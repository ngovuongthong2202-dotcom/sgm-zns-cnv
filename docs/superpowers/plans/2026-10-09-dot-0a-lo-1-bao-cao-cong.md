# Báo cáo cổng Đợt 0A – lô 1 (tắt chức năng nguy hiểm) và lô 2 (giới hạn 500 dòng)

Ngày chạy: 10/10/2026. Nhánh `dot-0a-cam-mau`. Cổng chạy lần đầu tại `22fcfe7` (19 commit kể từ `main` = `2b56114`); sau rà soát cuối nhánh và một đợt sửa (mục 4), **chạy lại toàn bộ cổng tại commit `6cc9c37`** (23 commit kể từ `main`; lúc chạy, commit này còn mang SHA `4aaa960`, xem mục 4). Mọi số ở mục 1–3 là của lần chạy lại này. Không khởi động máy chủ. Toàn bộ kiểm thử chạy **offline** nhờ Việc 1 (bốn biến `test.env` = `offline` và `offline-guard.ts`); nhật ký các worker nạp client máy chủ đều ghi "Running with mock fallback backend client" (không worker nào có địa chỉ CSDL thật; `offline-guard.ts` dừng ngay nếu có).

## 1. Kết quả các cổng

| Cổng | Kết quả thực tế | Mong đợi |
|---|---|---|
| `npx vitest run` (toàn bộ, `CI=true`, không `-u`) | 105 tệp đạt; **688 passed, 5 skipped, 0 failed** (693 kiểm thử); 9,96 giây | 0 failed, 5 skipped, passed ≈ 679 ± 3 (xem mục 2) |
| `npx tsc --noEmit` | 7 lỗi, **giống hệt từng dòng** `baseline-tsc.txt` (cùng tệp, vị trí, mã lỗi) | bằng mốc (7) |
| `npx eslint .` | trước 3302 vấn đề (193 errors, 3109 warnings) → sau 3142 (**168 errors**, 2974 warnings); không tệp nào nhiều lỗi hơn mốc (−25 errors: 11 ở tệp đã sửa, 14 do xóa `BulkZnsModal`, `CustomerConsolidationModal`, spec cũ) | errors ≤ 193 |
| `npx eslint --quiet` trên 39 tệp `.ts/.tsx` thêm/sửa/đổi tên (trừ `scripts/`) | không in dòng nào, `eslint-exit=0` (0 errors; 207 warnings không tính) | rỗng, exit 0 |
| `npm run build` | `✓ built in 880ms`, exit 0, 3072 module, không cảnh báo | "built in …" |
| `git grep` tổng (19 mẫu; `src`, `server.ts`) | 27 dòng ở 12 tệp, **tất cả thuộc danh sách cho phép** (mục 3) | chỉ danh sách cho phép |
| Ảnh chụp giao diện | `components.snapshot.spec.tsx` 7 passed; `git status --porcelain src/tests/__snapshots__` rỗng; không `.snap` nào đổi so với `main` | 7 passed; rỗng |

## 2. Đối chiếu số passed: 688 thực tế so với ≈ 679 của kế hoạch

Chênh +9 (vượt ±3) nên đối chiếu theo từng tệp spec đã thêm/xóa/sửa. Tổng kiểm thử khai báo tăng từ 667 (`main`: đếm tĩnh 663 từ `git show main:<tệp>` cộng 4 kiểm thử sinh bằng vòng lặp trong `vendor-webhook.handler.spec.ts`, tệp không đổi trên nhánh; không chạy `main`) lên 693 (HEAD = 688 passed + 5 skipped), tức +26 và bằng tổng chênh theo tệp:

| Tệp spec | main | HEAD | Chênh |
|---|---|---|---|
| `customer-consolidation-modal.spec.tsx` (xóa) | 9 | 0 | −9 |
| `customerConsolidationEngine.spec.ts` + `customerIdentityResolver.spec.ts` (nhận lại) | 5 + 9 | 10 + 10 | +6 |
| `bulk-zns-orchestrator.spec.tsx` (xóa) | 20 | 0 | −20 |
| `zns-chrono-and-status.spec.ts` (mới) | 0 | 9 | +9 |
| `CustomerCascadeImpactModal.spec.tsx` | 3 | 4 | +1 |
| `omni-sovereign-fabric-v39.spec.ts` | 7 | 6 | −1 |
| 11 spec mới (retired 7, cron **7**, customer 6, workflow 2, zns 5, useMutation 1, form 1, contact **5**, hub 1, system 2, offline-guard **3**) | 0 | 40 | +40 |
| `nexus-os.spec.ts` + `sovereign-mdm-nexus.spec.ts` | 9 + 13 | 9 + 13 | 0 (5 chuyển sang skipped) |
| Toàn bộ bộ kiểm thử (95 tệp ở `main`, 105 tệp ở HEAD; bằng tổng chênh các dòng trên) | 667 | 693 | **+26** |

Ba điểm lệch giữa công thức của kế hoạch và thực tế:

- **+5:** mốc 662 là số *passed* đo khi chạy offline lúc lập kế hoạch (667 khai báo trừ 5 kiểm thử lỗi offline: nexus-os 4, mdm 1, như kế hoạch Việc 1 ghi). Năm kiểm thử này vốn không nằm trong 662, nên bước "−5 skipped" trừ hai lần.
- **+2:** `CustomerZnsContactModal.spec.tsx` có 5 kiểm thử thay vì 3: commit `657fb01` (sửa sau rà soát Việc 11) thêm hai kiểm thử hồi quy (một đầu mối đang chờ Zalo không được chọn sẵn kể cả khi mặc định "chọn hết"; các đầu mối đã gửi xong vẫn chọn hết).
- **+2:** đợt sửa sau rà soát cuối nhánh thêm hai kiểm thử: `cron.routes.lock.spec.ts` (gọi `/process-outbox` với token sai → 401, không chạy tác vụ) và `offline-guard.spec.ts` (địa chỉ Supabase có khoảng trắng ở đầu vẫn bị chặn).

679 + 5 + 2 + 2 = 688, khớp số thực tế. Không có tệp đỏ nên không phải bọc thêm `it.skipIf(!HAS_REAL_DB)`.

## 3. Grep tổng: mọi dòng khớp đều được phép

| Tệp | Dòng | Lý do được phép |
|---|---|---|
| `src/backend/config/supabase.admin.ts:95`, `src/platform/data/schema.descriptor.ts:68` | 2 | một dòng ánh xạ `crossEntitySyncJobs` mỗi tệp (giữ theo Ràng buộc chung) |
| `src/backend/routes/retired.routes.ts:41` | 1 | chú thích của router chặn `/api/migration` |
| `cron.routes.ts:65`, `customer.routes.ts:77`, `workflow.routes.ts:27` | 3 | dòng stub trả mã cố định (`/preview`, `/trigger-sync`, `/reconcile-duplicates`); dòng cron có chú thích "màn đối soát CronPage đã xóa" |
| `customer.routes.lock.spec.ts` 3, `workflow.routes.lock.spec.ts` 3, `zns.routes.lock.spec.ts` 6 | 12 | spec khẳng định đường đã khóa |
| `retired.routes.spec.ts` | 5 | các đường `/api/migration/*` |
| `useMutation.spec.ts` 2, `CustomerFormModal.spec.tsx` 2 | 4 | khẳng định vắng mặt `trigger-sync` / `crossEntitySyncJobs` |
| Cộng | 27 | |

`server.ts` và `zns-chrono-and-status.spec.ts` không khớp (lời chú thích đã chọn chữ để tránh mẫu); `zns.routes.ts`, `SystemPage.spec.tsx`, `ZnsHubTable.spec.tsx` cũng không có dòng khớp. `cron.routes.lock.spec.ts` (3 dòng ở lần chạy đầu) nay không còn dòng khớp vì đợt sửa đã bỏ hàm giả `syncCustomerSnapshots` (hàm thật đã bị xóa) cùng kiểm tra dựa trên nó.

## 4. Danh sách commit (`git log --oneline 2b56114..HEAD` trước commit cập nhật báo cáo này: 23 commit)

```
6cc9c37 docs(dot-0a): state the old-bundle risk fully in the gate report and acceptance preamble
ec3a078 test(dot-0a): prove no DB access on every retired cron/zns route; widen the offline guard
db07e48 fix(customers,sales): plain Vietnamese labels in the impact dialog and duplicate pill; delete the live BGT renumbering hook (A4)
0072e75 docs(dot-0a): lô 1 gate report
22fcfe7 chore(scripts): archive one-off merge/reconcile scripts behind an unconditional exit (Đợt 0A K2)
efbd9a5 feat(settings): delete CronPage job cards and the data standardization panel; Cron tab shows the monitor only (Đợt 0A A4/Z0.1)
13f5b7f feat(zns-hub): remove retry buttons (replay endpoints retired) and the dead RealtimeZnsTickerV2 (Đợt 0A Z0.1)
7e5eb63 feat(sales): remove bulk ZNS entry point and the BulkZnsModal widget; keep pure chrono/status specs (Đợt 0A Z0.1)
657fb01 fix(customers): contact ZNS dialog never pre-selects contacts awaiting a Zalo result, even in the select-all fallback
c2a29c3 fix(customers): contact ZNS dialog no longer writes contactsZnsHistory back; skip pre-selecting contacts awaiting Zalo result (Đợt 0A Z0.1)
af0ad57 feat(customers): remove merge and bulk-ZNS entry points from the customers page, keep the duplicate-tax-code warning (Đợt 0A K2/Z0.1)
fc048e9 feat(customers): impact dialog becomes read-only with a single 'save customer only' action; drop browser-side document sync (Đợt 0A K1)
904e608 feat(customers): remove the 'Đồng bộ chứng từ' drawer action that overwrote linked documents (Đợt 0A K1)
d9399a5 fix(customers): stop queueing cross-entity sync jobs and calling trigger-sync after a customer update (Đợt 0A K1)
be6c8ce chore(zns-api): document the optional preview-enrichment catch so eslint no-empty passes
40a6014 feat(zns-api): retire bulk-send/replay (410) and drop customer lookup by name in /send (Đợt 0A Z0.1)
e19b35b feat(workflow-api): lock reconcile-duplicates (403) and delete the renumbering service (Đợt 0A A4)
a8e01ea test(customers-api): prove no DB access on every locked route and guard against cron.service re-import
5103069 feat(customers-api): lock merge/rollback/merge-history (403) and retire trigger-sync (410) (Đợt 0A K2/K1)
3759fdc feat(cron): retire sync-snapshots and preview, delete syncCustomerSnapshots (Đợt 0A K1)
10c0a98 feat(api): add retired() fixed responders and retire /api/migration/* (Đợt 0A A4)
fc0b821 test(safety): drop unused imports in sovereign-mdm-nexus.spec
f9bfcc7 test(safety): force offline Supabase for every vitest worker and skip real-DB specs
```

19 commit dưới cùng là mã và kiểm thử của lô 1; `0072e75` là báo cáo cổng lần đầu; ba commit trên cùng là đợt sửa sau rà soát cuối nhánh (khi chạy cổng còn mang SHA `72e5bd0`, `4ac2f09`, `4aaa960`; sau đó chỉ dòng ghi công `Co-Authored-By` được viết lại thành `Claude Fable 5.1`, cây mã không đổi nên mọi số ở mục 1–3 vẫn đúng). Trên cùng nữa là commit cập nhật báo cáo này ("docs(dot-0a): gate report reflects the final branch state after the review fix wave"), ghi công cùng dòng.

## 5. Nghiệm thu thủ công

_(chủ sở hữu/nhân viên IT, sau khi lên bản chạy thật **và xong bước 0**; chỉ thao tác đọc trừ mục 4 (hủy ở hộp cảnh báo, không lưu), 5 (ghi 1 hồ sơ khách thử) và 7–8)_

Điều kiện lên bản: máy chủ và bản giao diện lên **cùng một lần** (một commit, Render dựng `dist/` từ cùng mã); làm ngoài giờ. Như vậy vẫn **chưa đủ**: tab trình duyệt mở từ trước khi lên bản vẫn chạy giao diện cũ cho tới khi được tải lại, và hiện chưa có gì nhắc người dùng tải lại. Khóa ở máy chủ (kiểm ở mục 1–3) không chặn được ba việc sau của giao diện cũ, vì chúng không đi qua các đường đã khóa:

- **Gộp khách:** nút "Tiến Hành Gộp Nhóm MST" nhận 403 rồi tự chạy gộp dự phòng ngay trên trình duyệt: đánh dấu khách phụ đã gộp, đổi tên thành "[ĐÃ GỘP VÀO …]", chuyển báo giá, hợp đồng, phiếu thu, phiếu giao sang khách chính.
- **Đồng bộ chứng từ theo hồ sơ khách:** "1-Click Đồng bộ an toàn" (hộp Phân tích Tác động khi lưu khách) và "Đồng bộ chứng từ" (chân ngăn chi tiết khách) ghi đè tên, SĐT, địa chỉ, MST, người đại diện của khách lên báo giá, hợp đồng, phiếu thu, phiếu giao.
- **Gửi ZNS hàng loạt:** nút "Gửi ZNS Hàng Loạt" (trang Khách hàng và trang Báo giá) của bản cũ không hề gọi `/api/zns/bulk-send` (đường đã khóa) mà gọi `POST /api/zns/send` (đường gửi lẻ, vẫn mở) lần lượt cho từng người nhận, rồi ghi ngược `contacts`/`contactsZnsHistory` lên hồ sơ khách (gửi theo báo giá thì ghi trạng thái gửi lên báo giá).

Các lệnh ghi lên hồ sơ khách và chứng từ ở cả ba việc trên đi thẳng từ trình duyệt vào Supabase (khóa anon), không qua máy chủ; riêng lệnh gửi tin ở việc thứ ba đi qua `/api/zns/send`, là đường gửi lẻ vẫn mở.

**Bước 0 (bắt buộc, ngay sau khi lên bản):** mọi nhân viên **đóng hẳn mọi tab và cửa sổ SGM OS rồi mở lại** (nếu chỉ bấm **Ctrl+F5** thì phải bấm ở từng tab đang mở, vì mỗi tab giữ riêng một bản cũ). Cách xác nhận: IT gửi danh sách tên vào nhóm chat; từng người mở trang **Khách hàng**, thấy thanh công cụ **không còn nút "Gộp trùng MST"** (bản cũ luôn hiện nút này với mọi tài khoản; ô vàng "Trùng MST: N nhóm" của bản mới không phải nút đó) thì trả lời "đã tải lại"; còn thấy nút nghĩa là tab đó vẫn chạy bản cũ → đóng tab đó rồi mở lại. Chưa đủ người xác nhận thì chưa tính là lên bản xong. Không dùng nhật ký truy cập thay cho bước này: tab cũ để yên thì không tải tệp nào nên không để lại dấu vết.

Đề xuất cho Đợt 0B: giao diện tự so mã bản dựng (build-id) với máy chủ và hiện băng "Tải lại để dùng phiên bản mới" khi hai bên lệch nhau.

1. `curl -i -X POST https://<host>/api/customers/merge -H "Content-Type: application/json" -d "{}"` → `HTTP/1.1 403`, thân JSON đúng bảng mã; lặp lại với `rollback-merge` (403), `GET merge-history` (403), `POST trigger-sync` (410).
2. `curl -i -X POST https://<host>/api/cron/sync-snapshots -H "Authorization: Bearer <token quản trị đang dùng>"` → 410 (không còn 401/200 dù token nào); `POST /api/cron/preview` → 410.
3. `curl -i -X POST https://<host>/api/workflow/reconcile-duplicates` → 403; `POST /api/zns/bulk-send`, `/replay-dlq`, `/replay` → 410; `POST /api/migration/standardize-entities` và `GET /api/migration` → 410.
4. Trang **Khách hàng**: không còn "Gộp N KH đã chọn", "Gộp trùng MST", "Gửi ZNS Hàng Loạt"; nếu có nhóm trùng MST thì hiện ô vàng "Trùng MST: N nhóm" (không bấm được); "Thêm Excel/CSV" còn; thêm khách với MST đã có → vẫn hiện "Phát hiện dữ liệu trùng lặp" → bấm **Hủy**, không lưu.
5. Dùng khách thử nghiệm nội bộ có hợp đồng đã ký (hoặc ghi lại SĐT cũ và đổi về ngay sau khi kiểm tra) → **Chỉnh sửa** → đổi số điện thoại → Lưu → hộp "Phân tích Tác động" chỉ có "Quay lại chỉnh sửa" và "Chỉ lưu Khách Hàng (Giữ nguyên chứng từ cũ)" → bấm lưu → không báo lỗi; mở hợp đồng đó: tên/SĐT bên mua **không đổi**.
6. Ngăn chi tiết khách: chân ngăn không còn "Đồng bộ chứng từ".
7. Gửi ZNS lẻ cho **một** báo giá (số điện thoại thử nghiệm nội bộ) từ nút "Gửi ZNS" ở chân ngăn chi tiết báo giá → "Xác nhận gửi ZNS (#…)" → trạng thái báo giá chuyển "THÀNH CÔNG"/chờ kết quả như trước; khách có ≥ 2 đầu mối: "Gửi tin Zalo" mở cửa sổ đầu mối, "Gửi ngay" gửi được; sau khi Zalo trả kết quả, huy hiệu "Đã gửi ZNS" của đầu mối đó sáng lên (ghi bởi webhook).
8. Trang **Báo giá**: trong nhóm nút phụ của thanh công cụ chỉ còn "Dựng từ ĐH ERP" (bên cạnh nút "Báo giá mới" sẵn có); không còn "Gửi ZNS Hàng Loạt".
9. **Cài đặt › Hệ thống**: tab "Cron & Worker" chỉ còn "Giám sát System & Cron"; tab "Sao lưu & Dữ liệu" không còn "Trung tâm Chuẩn hoá Dữ liệu (Data Hygiene)"; tab "Hiệu năng & Đồng bộ" mở bình thường.
10. **ZNS Control Hub**: không còn biểu tượng "Retry DLQ" trên hàng lỗi và nút "Thử gửi lại (Retry Workflow)" trong panel chi tiết; lọc, xuất CSV, "Tải thêm logs lịch sử" vẫn chạy.
11. Chủ sở hữu xác nhận trên bảng điều khiển Render rằng **không có** cron/scheduler bên ngoài nào gọi `/api/cron/process-outbox` hay `/api/cron/sync-snapshots` (kho không có scheduler; `cloud-scheduler.yaml` chỉ là mẫu chưa triển khai).

## 6. Ghi chú

- Các việc ngoài phạm vi lô 1 đã ghi nhận nằm ở mục "Ngoài phạm vi lô 1" của kế hoạch lô 1 (`2026-10-09-dot-0a-lo-1-tat-chuc-nang-nguy-hiem.md`); giới hạn 500 dòng làm ở lô 2.
- `npm run build` in thông báo của Vite: `.env` có `NODE_ENV=production` mà Vite không hỗ trợ. Có từ trước, không phải do lô này; lô này không đụng `.env`.

## 7. Lô 2 – giới hạn 500 dòng (DL01, bản tạm): cổng cuối

Ngày chạy: 11/10/2026, nhánh `dot-0a-cam-mau`. Cổng chạy lần đầu tại `083e47c` (7 commit kể từ `b3e30f4`, tip của lô 1); sau rà soát cuối nhánh và một đợt sửa (mục 7.4), **chạy lại toàn bộ cổng tại commit `b81f525`** (12 commit kể từ `b3e30f4`; mã không có thay đổi chưa commit). Mọi số ở mục 7.1–7.3 là của lần chạy lại này. Không khởi động máy chủ, không sửa `.env`, **không chạy nghiệm thu trên dữ liệu thật** (mục 7.6: chưa thực hiện). Kiểm thử chạy **offline**: `vitest.config.ts` vẫn có khối `test.env` (bốn biến = `offline`) và `setupFiles: ['./src/tests/setup/offline-guard.ts']`; nhật ký có 13 dòng "Running with mock fallback backend client" và không có địa chỉ `supabase.co`.

### 7.1 Kết quả các cổng

| Cổng | Kết quả thực tế | Mong đợi |
|---|---|---|
| `npx vitest run` (toàn bộ, `CI=true`, không `-u`) | 109 tệp đạt; **728 passed, 5 skipped, 0 failed** (733 kiểm thử); 12,96 giây | 0 failed, 5 skipped, passed = 728 (xem 7.2) |
| `npx tsc --noEmit` | 7 lỗi, giống `baseline-tsc.txt` (chụp tại `b3e30f4`) về tệp, mã lỗi và nội dung; chỉ khác số dòng của `usePaymentZns.ts` (193 → 201, do Việc 5 thêm mã phía trên) | bằng mốc (7) |
| `npx eslint .` | trước 3142 vấn đề (168 errors, 2974 warnings) → sau 3154 (**164 errors**, 2990 warnings); không tệp nào nhiều lỗi hơn mốc; −4 errors là `usePaymentZns.ts` 2 → 0 và `omni-sovereign-fabric-v30.spec.ts` 2 → 0 (nhập/gán thừa, Việc 5 gỡ khi sửa hai tệp); `productTypeCascadingSyncService.ts` vẫn 29, đúng bộ lỗi cũ | errors ≤ 168, từng tệp ≤ mốc |
| `npx eslint --quiet` trên 28 tệp `.ts/.tsx` lô 2 thêm/sửa | chỉ in 29 lỗi cũ của `productTypeCascadingSyncService.ts` (28 `no-explicit-any`, 1 `no-unused-imports`); exit 1 chỉ vì 29 lỗi này | chỉ 29 lỗi cũ đó |
| `npm run build` | `✓ built in 989ms`, exit 0, 3074 module (lô 1: 3072; +2 là `list-limits.ts` và `paymentWindow.ts`) | "built in …" |
| `git grep` theo mẫu của kế hoạch | 11 dòng ở 5 tệp: 5 dòng mã đúng danh sách ngoài phạm vi + 6 dòng khẳng định trong 2 spec của lô 2 (mục 7.3) | 5 dòng ngoài phạm vi |
| Ảnh chụp giao diện | `components.snapshot.spec.tsx` 7 passed trong lần chạy đầy đủ; `git status --porcelain src/tests/__snapshots__` rỗng; lô 2 không đổi tệp `.snap` nào | 7 passed; rỗng |

Warnings +16 không tính vào cổng: chủ yếu ở spec thêm/mở rộng (`realtime-store.spec.ts` +12, `base.repo.spec.ts` +14, `DataViewEngine.loadinfo.spec.tsx` +5), bớt ở `base.repo.ts` −17. Đợt sửa sau rà soát thêm 2 warnings, đều ở `base.repo.spec.ts`: một `no-explicit-any` theo kiểu mock sẵn có của tệp và một `max-lines` (tệp vượt 280 dòng).

### 7.2 Đối chiếu số passed: 728 thực tế so với 711 của công thức kế hoạch

Công thức của kế hoạch (688 của lô 1 + 4 + 7 + 5 + 3 + 1 + 3) cho 711; thực tế 728, chênh +17. Đối chiếu theo từng tệp spec (số kiểm thử tại `b3e30f4` đếm bằng `git show b3e30f4:<tệp>`, không tệp nào sinh kiểm thử bằng vòng lặp; số đếm ở HEAD khớp số chạy thật 22, 8, 11):

| Tệp spec | `b3e30f4` | HEAD | Chênh | Commit |
|---|---|---|---|---|
| `src/platform/data/list-limits.spec.ts` (mới) | 0 | 4 | +4 | `d99516b` |
| `src/data/repositories/base.repo.spec.ts` | 7 | 22 | +15 | `272307e` +7, `09d8f49` +1, `8be00ee` +6, `b81f525` +1 |
| `src/data/realtime-store.spec.ts` | 1 | 8 | +7 | `dbf8857` |
| `src/platform/ui/design-system/dataview/DataViewEngine.loadinfo.spec.tsx` (mới) | 0 | 4 | +4 | `1931f39` +3, `1094238` +1 |
| `src/tests/omni-sovereign-fabric-v30.spec.ts` | 10 | 11 | +1 | `083e47c` |
| `src/data/swr-fetchers.spec.ts` (mới) | 0 | 4 | +4 | `083e47c` +3, `a944d6b` +1 |
| `src/modules/billing/ui/hooks/paymentWindow.spec.ts` (mới) | 0 | 5 | +5 | `083e47c` |
| Toàn bộ bộ kiểm thử (105 tệp → 109 tệp; bằng tổng chênh các dòng trên) | 693 | 733 | **+40** | |

693 = 688 passed + 5 skipped của lô 1; 733 = 728 + 5. Năm kiểm thử skipped không đổi (`nexus-os.spec.ts` 4, `sovereign-mdm-nexus.spec.ts` 1). Số tệp đếm lại từ `git ls-tree`: 105 tại `b3e30f4` (98 tệp `*.spec.ts` + 7 tệp `.tsx` khai báo trong `vitest.config.ts`), 109 tại HEAD (thêm 4 spec mới; `DataViewEngine.loadinfo.spec.tsx` được đưa vào `include` ở Việc 4).

Bốn điểm lệch giữa công thức của kế hoạch và thực tế (711 + 7 + 2 + 5 + 3 = 728):

- **+7:** `base.repo.spec.ts` có 14 kiểm thử mới thay vì 7: ngoài 7 kiểm thử của kế hoạch (`272307e`), hai commit sửa theo rà soát thêm 1 (`09d8f49`: trang đầy nhưng có dòng `deletedAt` kiểu JSONB vẫn nạp tiếp) và 6 (`8be00ee`: 4 kiểm thử hàm thuần `applyCdcEvent`; chạm trần mà số đếm bằng đúng số dòng đã nạp thì `capped=false`; chạm trần mà lệnh đếm lỗi thì `capped=true`, `total=null`).
- **+2:** `realtime-store.spec.ts` có 7 kiểm thử mới thay vì 5: thêm "`loadMore` giữ nguyên danh tính giữa các lần thông báo" và "lượt nâng trần bị lỗi: lùi về cỡ cũ, dừng tự nạp, thử lại thủ công dùng cỡ cũ".
- **+5:** `paymentWindow.spec.ts` (hàm thuần `isPaymentWindowReady`: cửa sổ phiếu thu đã đủ tin cậy để tính điểm tích lũy chưa) là tệp Việc 5 tách thêm; công thức của kế hoạch không có.
- **+3:** đợt sửa sau rà soát cuối nhánh thêm một kiểm thử vào mỗi tệp: `DataViewEngine.loadinfo.spec.tsx` (`1094238`: chú thích của dòng cảnh báo chỉ hứa "tải thêm" khi còn nạp thêm được), `swr-fetchers.spec.ts` (`a944d6b`: lượt đọc lỗi không để lại unhandled rejection), `base.repo.spec.ts` (`b81f525`: lỗi ở trang 2 bên trong `subscribe({ maxRows })` chỉ tới `onError`, không tới callback dữ liệu).

### 7.3 Grep tổng: mọi dòng khớp đều được phép

Chạy nguyên văn lệnh của kế hoạch (Việc 6, Bước 2): `git grep -n -E "currentLimit \+= 500|currentLimit: 500|limit: 500|\.limit\(5000\)|:5000'" -- src` → 11 dòng ở 5 tệp, không phải 5 dòng như kế hoạch dự kiến: kế hoạch không tính tới các kiểm thử do chính lô 2 thêm, nên `limit: 500` khớp cả vào hai spec.

| Tệp | Dòng | Lý do được phép |
|---|---|---|
| `src/features/tracking/PublicOrderTrackingPage.tsx:271-273` | 3 | cổng tra cứu công khai: ngoài phạm vi lô 2 (thuộc kế hoạch cổng) |
| `src/hooks/usePresence.ts:90` | 1 | đăng ký theo dõi hiện diện người dùng: ngoài phạm vi |
| `src/hooks/useSharedFields.ts:40` | 1 | đọc mẫu ZNS `znsTemplates`: ngoài phạm vi |
| `src/data/swr-fetchers.spec.ts:40,43,47,49` | 4 | kiểm thử khẳng định hai đường vẫn dùng 500 như cũ: khóa có khóa ngoại (`payments:500:contractId:x`) và bộ sưu tập ngoài nhóm lõi (`notifications:500`) |
| `src/tests/omni-sovereign-fabric-v30.spec.ts:296,300` | 2 | kiểm thử khẳng định quét tác động đổi loại sản phẩm **không còn** gọi `list({ limit: 500 })` (tên kiểm thử và `not.toHaveBeenCalledWith`) |
| Cộng | 11 | |

Loại `*.spec.*` khỏi lệnh (`-- src ':(exclude)*.spec.ts' ':(exclude)*.spec.tsx'`) thì còn đúng 5 dòng mã ở ba hàng đầu. Các kiểm tra còn lại đều rỗng: `currentLimit += 500` và `currentLimit: 500,` trong `realtime-store.ts` (nhánh ngoài nhóm lõi dùng `DEFAULT_WINDOW_LIMIT`); `git grep ":5000'" -- src`; `.limit(5000)`; `list({ limit: 500 })` ở `usePaymentZns.ts`, `productTypeCascadingSyncService.ts`, `swr-fetchers.ts`.

### 7.4 Danh sách commit (`git log --oneline b3e30f4..b81f525`: 12 commit, trước commit cập nhật báo cáo này)

```
b81f525 test(data): pin that a page-2 error inside a paged subscribe reaches onError and never the data callback (Đợt 0A DL01)
a944d6b fix(data): SWR core fallback no longer leaves an unhandled rejection when a capped read fails (Đợt 0A DL01)
1094238 fix(ui): cap tooltip offers scrolling only when more rows can load; say the window is newest by entry time (Đợt 0A DL01)
456a9e1 docs(dot-0a): lô 2 gate report - load-failure limitation, build-time cap variables and Supabase max-rows notes
63bfa1b docs(dot-0a): lô 2 gate report and new cap ETA
083e47c fix(data): loyalty points, product-type impact scan and SWR core fallback read up to the cap instead of 500 rows (Đợt 0A DL01)
1931f39 feat(ui): show 'Đang hiển thị X/Y dòng mới nhất' when a core list hits its cap; load more only when capped (Đợt 0A DL01)
dbf8857 feat(data): core realtime windows load up to the cap with loaded/total/capped state and a guarded loadMore (Đợt 0A DL01)
8be00ee fix(data): paged realtime windows never trim live inserts; capped follows the exact count at the boundary; CDC application is a pure, tested function (Đợt 0A DL01)
09d8f49 fix(data): listAll decides the last page on the raw PostgREST page length, not the client-filtered one (Đợt 0A DL01)
272307e feat(data): BaseRepository.listAll pages with .range() up to a cap, reports total/capped, buffers realtime events during load (Đợt 0A DL01)
d99516b feat(data): centralize browser list limits (page 1000, cap 2000, ceiling 5000) (Đợt 0A DL01)
```

`d99516b` là Việc 1; `272307e`, `09d8f49`, `8be00ee` là Việc 2 (hai commit sau là sửa theo rà soát); `dbf8857` là Việc 3; `1931f39` là Việc 4; `083e47c` là Việc 5; `63bfa1b` và `456a9e1` là Việc 6 (báo cáo này; commit sau bổ sung mục 8 của 7.6 và mục 7.7 theo rà soát cuối nhánh, chỉ sửa tài liệu); `1094238`, `a944d6b`, `b81f525` là đợt sửa sau rà soát cuối nhánh (mục 7.8). Cả 12 commit mang dòng ghi công `Co-Authored-By: Claude Fable 5.1`. SHA là của lúc chạy cổng; mọi số ở 7.1–7.3 đo trên cây mã tại `b81f525`. Sau đó chỉ có commit cập nhật báo cáo này (chỉ sửa tài liệu).

### 7.5 Ngày dự kiến chạm trần mới (cho lịch Đợt 0B/1)

Số đo 09/10/2026 của kế hoạch lô 2 (chỉ đọc; lô này không truy vấn CSDL nên chưa đo lại): `payments` 200 dòng hoạt động, 15,6 dòng/ngày; `quotations` 313 dòng, 6,9 dòng/ngày. Ba bảng còn lại còn xa trần (`customers` 181, `contracts` 24, `deliveries` 20) và chưa có tốc độ tăng đo được.

| Bảng | Chạm trần 500 (cũ) | Chạm trần 2.000 (mới) |
|---|---|---|
| `payments` | ≈ 29/10/2026 | **≈ 02/2027** (tính ra 02/02/2027) |
| `quotations` | ≈ 06/11/2026 | **≈ 06/2027** (tính ra 11/06/2027) |

Ước tính theo số đo 09/10/2026, chủ sở hữu tính lại bằng truy vấn chỉ đọc khi nghiệm thu (ngày chạm = 09/10/2026 + (trần − số dòng hiện có) / tốc độ mỗi ngày, làm tròn lên; chạy trong Supabase SQL editor, đổi `payments` thành `quotations` để tính bảng kia):

```sql
with s as (select count(*) as active, count(*) filter (where created_at >= now() - interval '14 days') / 14.0 as per_day from payments where deleted_at is null) select active, round(per_day,1), current_date + ceil((2000 - active) / nullif(per_day, 0))::int as eta_2000 from s;
```

Khi một bảng chạm 2.000, chân bảng hiện "Đang hiển thị 2.000/… dòng mới nhất": đó là tín hiệu để làm phân trang và tổng hợp phía máy chủ (Đợt 0B/1), muộn nhất trước ≈ 02/2027 (phiếu thu). Việc theo dõi sau khi lên bản chạy thật nằm ở mục "Nghiệm thu sau khi lên bản chạy thật" của kế hoạch lô 2.

### 7.6 Nghiệm thu trên dữ liệu thật với trần hạ thấp (chủ sở hữu/IT thực hiện; chưa làm trong lô này)

_Trạng thái: **chưa thực hiện**. Làm trên máy phát triển, bằng trình duyệt, **chỉ đọc**; chưa cần tạo 600 phiếu thu vì trần được hạ bằng biến môi trường. Số dòng ngày 09/10/2026 theo kế hoạch: 200 phiếu thu, 313 báo giá, 181 khách, 24 hợp đồng, 20 phiếu giao; đếm lại bằng truy vấn chỉ đọc trước khi đối chiếu. Chụp màn hình từng mục và ghi vào báo cáo này._

**Lần chạy 1 – trần hạ thấp** (làm các mục 1, 2, 3, 4a, 7, 8; mỗi trang tải 50 dòng, trần 100 dòng):

```powershell
$env:VITE_CORE_PAGE_SIZE='50'; $env:VITE_CORE_HARD_CAP='100'; npm run dev
```

Hai biến này chỉ dành cho `npm run dev` trên máy nghiệm thu; đừng để chúng lọt vào bản dựng chạy thật (xem 7.7).

**Lần chạy 2 – trần mặc định** (làm các mục 4b, 5, 6 và dòng xác nhận cuối): xóa hai biến rồi chạy lại (hoặc mở cửa sổ PowerShell mới). **Không** chạy `vitest` trong phiên còn đặt hai biến này, vì `import.meta.env` của vitest đọc `process.env`.

```powershell
Remove-Item Env:\VITE_CORE_PAGE_SIZE, Env:\VITE_CORE_HARD_CAP -ErrorAction SilentlyContinue
npm run dev
```

1. **[lần 1]** Trang **Thanh toán**: chân bảng hiện "Đang hiển thị 100/200 dòng mới nhất" (200 = số phiếu thu đang hoạt động, đối chiếu bằng truy vấn chỉ đọc `SELECT count(*) FROM payments WHERE deleted_at IS NULL` trong Supabase SQL editor). Tab Mạng (Network): 2 lượt `payments?…&offset=…`, mỗi lượt ≤ 50 dòng, cộng 1 lượt `HEAD` (`count=exact`); không lượt `payments?…` nào có `limit=` lớn hơn 50 (các bảng ngoài nhóm lõi như `znsMessages`/`notifications` vẫn 500, đúng thiết kế). **Kiểm lượt đầu tiên có `limit=50` trước khi tin các mục sau**: nếu vẫn `limit=1000` thì biến môi trường chưa vào `import.meta.env` (xem LƯU Ý ở đầu `src/platform/data/list-limits.ts`).
2. **[lần 1]** Cuộn xuống cuối bảng: mỗi lần cuộn tới cuối trang hiện tại nâng cửa sổ thêm đúng một trang (50 dòng trong lần chạy hạ trần; 1.000 dòng ở trần mặc định), dòng cảnh báo đổi thành "Đang hiển thị 150/200 …"; cuộn tiếp tới khi hết thì dòng cảnh báo biến mất; không có hàng "đang tải" ảo đứng mãi ở cuối bảng.
3. **[lần 1]** Lặp lại ở **Báo giá** (313 dòng), **Khách hàng** (181), **Hợp đồng** (24: không chạm trần nên không có dòng cảnh báo), **Giao hàng** (20).
4. **Tổng quan.** (a) **[lần 1]** các số tổng (số khách, tổng báo giá, công nợ) tính trên cửa sổ bị cắt, ví dụ số khách = 100 chứ không phải 181: đúng với hạn chế đã ghi ở "Ngoài phạm vi lô 2" của kế hoạch (BC-07), chỉ ghi nhận, không phải lỗi. (b) **[lần 2]** số khách, tổng báo giá, công nợ phải khớp truy vấn chỉ đọc: `SELECT count(*) FROM customers WHERE deleted_at IS NULL`, tương tự cho `quotations` và `payments`.
5. **[lần 2]** Mở ngăn chi tiết một hợp đồng cũ (đã ký lâu nhất): "Tiến độ thanh toán" và danh sách phiếu thu liên kết hiển thị đúng.
6. **[lần 2]** **Xem trước** (không bấm gửi) tin ZNS thanh toán của một phiếu thu thuộc khách có nhiều phiếu thu nhất: "điểm tích lũy" phải bằng tổng điểm tính tay từ danh sách phiếu thu của khách đó, theo cách tính của `loyaltyEngine.ts:39-55`: mỗi phiếu lấy tổng `dotThanhToan[].soTien` nếu có đợt thu, ngược lại lấy `soTien`; khớp khách theo `customer_id` **hoặc** `data->>'maKh'`; điểm = floor(tổng / 1000). SQL chỉ đọc tương đương (đơn giản hơn: chọn khách không có đợt thu và không có mã gộp rồi so floor(sum / 1000)):

   ```sql
   SELECT floor(sum(coalesce((SELECT sum((d->>'soTien')::numeric) FROM jsonb_array_elements(CASE WHEN jsonb_typeof(data->'dotThanhToan')='array' AND jsonb_array_length(data->'dotThanhToan')>0 THEN data->'dotThanhToan' ELSE NULL END) d), (data->>'soTien')::numeric, 0))/1000) AS diem FROM payments WHERE deleted_at IS NULL AND (customer_id = '<id>' OR data->>'maKh' = '<maKh>')
   ```

7. **[lần 1]** Trong lúc đang ở trang Thanh toán với trần nhỏ, chờ một phiếu thu mới do nhân viên tạo trong giờ (hoặc hẹn người tạo một phiếu thử rồi xóa mềm): phiếu mới xuất hiện ở đầu danh sách mà không cần F5 (kênh realtime vẫn chạy sau khi nạp theo trang).
8. **[lần 1]** Tắt mạng (DevTools → Network → Offline) rồi cuộn tới cuối bảng để kích hoạt tải thêm (không có nút riêng; `DataView.tsx:105-113` gọi `fetchMore` khi hàng cuối hiện ra): hiện đúng một thông báo "Không tải được dữ liệu, thử lại"; dữ liệu đang có không bị cắt, cửa sổ giữ cỡ đã nạp thành công; cuộn tiếp không tự nạp. **Hạn chế đã biết:** các trang này không có nút "Thử lại" hay nút làm mới (màn lỗi của bảng không bao giờ hiện vì trang truyền `error={null}` hoặc không truyền `error`; `refresh` chỉ chạy sau các thao tác ghi: tạo, sửa, xóa), và **kênh realtime của bộ sưu tập đó tắt cho tới khi tải lại trang**. Cách khôi phục duy nhất hiện nay là bật mạng lại rồi **F5** (tải lại trang). Đợt 0B sẽ nối nút "Thử lại" từ trạng thái lỗi của store.

**Dòng xác nhận cuối (lần chạy 2, trần mặc định):** không trang nào hiện dòng cảnh báo (mọi bảng còn dưới 2.000 dòng); tab Mạng cho thấy mỗi bảng lõi chỉ 1 lượt đọc ≤ 1.000 dòng (phiếu thu 200 dòng thì 1 lượt). Kết quả 8 mục và ảnh chụp: chưa có (ghi vào đây khi làm).

### 7.7 Lưu ý vận hành khi lên bản chạy thật

- **Trước khi dựng bản chạy thật:** các biến nghiệm thu `VITE_CORE_*` (`VITE_CORE_PAGE_SIZE`, `VITE_CORE_HARD_CAP` và cả `VITE_CORE_ABSOLUTE_CEILING`) được đọc **lúc dựng** (`list-limits.ts` đọc `import.meta.env`), nên `npm run build` và việc triển khai phải chạy từ một cửa sổ PowerShell **không đặt** các biến này (`Remove-Item Env:\VITE_CORE_PAGE_SIZE, Env:\VITE_CORE_HARD_CAP, Env:\VITE_CORE_ABSOLUTE_CEILING -ErrorAction SilentlyContinue`, hoặc mở cửa sổ mới; dựng bằng dịch vụ như Render thì phần biến môi trường của dịch vụ cũng không được có hai biến này). Nếu chúng lọt vào bản dựng, mọi nhân viên sẽ chỉ thấy trần 100 dòng. Sau khi lên bản, mở tab Mạng và xác nhận lượt đọc đầu tiên của một danh sách lõi (ví dụ `payments?…`) mang `limit=1000` (đọc dòng 0–999), không phải `limit=50`.
- **Cài đặt Supabase:** `max-rows` của PostgREST trong dự án phải giữ **từ 1.000 trở lên** (= `CORE_PAGE_SIZE`). Nếu từng bị hạ thấp hơn, mọi danh sách lõi sẽ dừng ở con số đó mà **không có dòng cảnh báo** (trang thô ngắn được hiểu là trang cuối). Đã xác nhận bằng 1.000 ngày 09/10/2026; kiểm lại khi nghiệm thu bằng giá trị Max rows trong cài đặt API của dự án Supabase, và bằng cách so số dòng ở chân bảng với `SELECT count(*)` của mục 1 và 4b (cách so này chỉ lộ ra khi bảng có nhiều dòng hơn `max-rows`).
- **Tab đang mở:** tab trình duyệt mở từ trước khi lên bản vẫn chạy giao diện cũ (cửa sổ 500 dòng) cho tới khi được tải lại; lô này không đổi API máy chủ nên tab cũ không hỏng, chỉ còn cắt 500 dòng như trước. Nếu lô 2 lên bản cùng lô 1 thì Bước 0 ở mục 5 đã bao gồm việc này, nếu lên bản riêng thì nhắc mọi người đóng hẳn rồi mở lại tab.
- **Số lượt truy vấn:** không đổi so với hôm nay khi mỗi bảng lõi còn dưới 1.000 dòng: 1 lượt đọc cho mỗi bộ sưu tập lõi, không có lượt đếm. Từ 1.000 dòng trở lên thêm một lượt đọc cho mỗi 1.000 dòng; chạm trần 2.000 thì lần nạp đầu là 2 lượt đọc + 1 lượt đếm (`count=exact`) cho mỗi bộ sưu tập. Ngày chạm trần ≈ 02/2027 (phiếu thu) và ≈ 06/2027 (báo giá) theo số đo 09/10/2026, chủ sở hữu tính lại bằng truy vấn chỉ đọc (mục 7.5).

### 7.8 Ghi chú

- Các việc ngoài phạm vi lô 2 nằm ở mục "Ngoài phạm vi lô 2" của kế hoạch lô 2 (`2026-10-09-dot-0a-lo-2-gioi-han-500-dong.md`). Riêng ý thứ ba của mục đó (dòng mới chèn khi đã chạm trần đẩy dòng cũ nhất ra khỏi bộ nhớ) đã lỗi thời sau `8be00ee`: cửa sổ nạp theo trang không còn bị cắt khi có dòng mới đến, `total` tăng thêm 1.
- `npm run build` vẫn in thông báo của Vite: `.env` có `NODE_ENV=production` mà Vite không hỗ trợ. Có từ trước, lô này không đụng `.env`.
- Đợt sửa sau rà soát cuối nhánh: câu "Cuộn xuống cuối bảng để tải thêm." trong chú thích của dòng "Đang hiển thị X/Y dòng mới nhất" giờ chỉ hiện khi còn nạp thêm được (câu đầu nói rõ "mới nhất theo thời điểm nhập vào hệ thống"); lượt đọc SWR bị lỗi không còn để lại lỗi "Uncaught (in promise)" (unhandled rejection).

## 8. Lô 3 – vá khẩn bảo mật và chứng từ (0A.1, 0A.2, 0A.4, 0A.5, 0A.7): cổng cuối

Ngày chạy: 12/10/2026, nhánh `dot-0a-lo-3` tách từ `main` `59919be`, cổng chạy tại commit `1fb7b6f` (50 commit). Không khởi động máy chủ, không sửa `.env`, **không chạy tệp SQL nào trên CSDL thật**, **không nghiệm thu trên dữ liệu thật** (mục 8.6: chưa thực hiện). Kiểm thử chạy offline như lô 1/2: `vitest.config.ts` vẫn có khối `test.env` (bốn biến = `offline`) và `setupFiles: ['./src/tests/setup/offline-guard.ts']`; nhật ký có 22 dòng "Running with mock fallback backend client" và không có địa chỉ `supabase.co`. **Việc 29 (gỡ `admin`/mật khẩu mặc định) chưa làm** — chờ chủ sở hữu xác nhận A2 (mục 8.8).

### 8.1 Kết quả các cổng

| Cổng | Kết quả thực tế | Mong đợi |
|---|---|---|
| `npx vitest run` (toàn bộ, `CI=true`, không `-u`) | 145 tệp đạt; **1107 passed, 5 skipped, 0 failed** (1112 kiểm thử); 16,79 giây | 0 failed; passed ≈ 968 (xem 8.2) |
| `npx tsc --noEmit` | 6 lỗi = 7 lỗi của mốc lô 2 (`baseline-tsc.txt`, chụp tại `59919be`) trừ `usePaymentZns.ts` TS2322 (Việc 16 gỡ); 6 lỗi còn lại cùng tệp, mã lỗi và nội dung; `DrawerStackContext.tsx` (398/488/703 → 400/490/705) và `DeliveryDetailDrawer.tsx` (1331 → 1317) chỉ đổi số dòng | 6, cùng tệp/mã/thông báo |
| `npx eslint .` | trước 3154 vấn đề (164 errors, 2990 warnings) → sau 3136 (**148 errors**, 2988 warnings); không tệp nào nhiều lỗi hơn mốc; −16 errors là nhập/gán thừa đã dọn ở 5 tệp: `TabLichSuGiaoHang.tsx` 6 → 0 (Việc 15), `VendorPage.tsx` 4 → 0 (Việc 6), `useDeliveriesActions.ts` 4 → 0 (Việc 14), `UniversalZnsPreviewModal.tsx` 3 → 2 (Việc 16), `sales/ui/columns.config.tsx` 1 → 0 (Việc 23) | errors ≤ 164, từng tệp ≤ mốc |
| `npx eslint --quiet` trên 100 tệp `.ts/.tsx` đã đổi (trừ `scripts/`) | chỉ 9 dòng lỗi cũ được phép (`QuickCustomerModal.tsx` ×5, `DeliveryDetailDrawer.tsx` ×2, `UniversalZnsPreviewModal.tsx` ×2 — bảng ở 8.3), không dòng nào khác; exit 1 chỉ vì 9 dòng này | chỉ lỗi cũ được phép (Ràng buộc chung) |
| `npm run build` | `✓ built in 1.24s`, exit 0, 3082 module (lô 2: 3074; +8 là tám tệp mới phía giao diện: `paymentZnsNote.ts`, `payment-prefill.ts`, `payment-gate.ts`, `shipment-revert.ts`, `RevertShipmentConfirmModal.tsx`, `complete-delivery.rules.ts`, `vietnamDate.ts`, `session-sanitizer.ts`) | "built in …" |
| Grep tổng (Việc 28, Bước 2, theo điều chỉnh P5/P8/P9) | 9 dòng, đều trong danh sách được phép: lệnh 3 → 1 dòng `paymentZnsNote.ts`; lệnh 4 → 2 dòng hiển thị (P8) + 2 dòng hằng lọc dữ liệu cũ trong `DeliveryFormHelpers.ts`; lệnh 8 → 4 dòng trong spec; 7 lệnh còn lại rỗng (mục 8.3) | chỉ các dòng được phép (`paymentZnsNote.ts`, P8, hằng lọc của Việc 21, spec) |
| Ba spec của `zns.routes.ts` chạy chung một lượt (Bước 3) | 3 tệp; **76 passed** = `zns.routes.lock.spec.ts` 5 + `zns.routes.config.spec.ts` 19 + `zns.routes.payment-gate.spec.ts` 52; bằng đúng số của từng tệp chạy riêng ở báo cáo từng việc (không rò trạng thái giữa spec) | 5 + 13 + 15 (số của kế hoạch; phần tăng do vòng sửa, xem 8.2) |
| Ảnh chụp giao diện | `components.snapshot.spec.tsx` 7 passed trong lần chạy đầy đủ; `.snap` đổi: **không** (`git status --porcelain src/tests/__snapshots__` rỗng; không commit nào của lô 3 đổi tệp `.snap`) | không đổi ngoài ý muốn |

Warnings −2 không tính vào cổng: +42 ở tệp thêm/sửa (chủ yếu spec mới: `base.repo.hardDelete.spec.ts` +10, `users.repo.spec.ts` +9, `payment-quotation-integration.spec.tsx` +8, `zns-universal-preview-matrix.spec.ts` +3) và −44 ở mã đã sửa (`useDeliveryForm.ts` −20, `PaymentDetailDrawer.tsx` −5, `PaymentRecordDrawer.tsx` −4, `ContractModalsContainer.tsx` −4, `BulkActionsMenu.tsx` bị xóa −2, …).

### 8.2 Đối chiếu số passed: 1107 thực tế so với ≈ 968 của công thức kế hoạch

Công thức của kế hoạch (728 của lô 2 + 240 ca mới của Việc 1–27) cho 968; thực tế 1107, chênh +139 (vượt ±5 nên đối chiếu theo từng tệp). Số ca tại `59919be` đếm bằng `git show 59919be:<tệp>` (4 tệp có sẵn, không tệp nào sinh ca bằng vòng lặp); số ca tại HEAD lấy bằng `npx vitest list` trên 40 tệp spec đã thêm/sửa (chỉ thu thập tên ca, không chạy thêm; tính từng dòng của `it.each`). Tổng các dòng dưới đây bằng đúng chênh của lần chạy đầy đủ:

| Tệp spec | `59919be` | HEAD | Chênh | Việc / commit |
|---|---|---|---|---|
| `src/backend/config/supabase.admin.auth.spec.ts` (mới) | 0 | 8 | +8 | Việc 1: `b202557` +5, `878a8ca` +3 |
| `src/backend/routes/cron.routes.auth.spec.ts` (mới) | 0 | 11 | +11 | Việc 1: `b202557` +8, `878a8ca` +3 |
| `src/tests/no-secret-literals.spec.ts` (mới) | 0 | 3 | +3 | Việc 2 `59deedf` +2; Việc 10 `8d2d3b2` +1 |
| `src/backend/routes/search.routes.spec.ts` (mới) | 0 | 9 | +9 | Việc 3 `80088ca` |
| `src/backend/routes/workflow.routes.whitelist.spec.ts` (mới) | 0 | 15 | +15 | Việc 3 `80088ca` |
| `src/hooks/useManualZnsBypass.spec.ts` (mới) | 0 | 2 | +2 | Việc 3 `80088ca` |
| `src/backend/routes/workflow.routes.delivery-waiver.spec.ts` (mới) | 0 | 10 | +10 | Việc 4: `d5468df` +8, `25d349c` +2 |
| `src/backend/routes/analytics.routes.spec.ts` (mới) | 0 | 3 | +3 | Việc 5 `77d6fc0` |
| `src/backend/routes/reports.routes.spec.ts` (mới) | 0 | 3 | +3 | Việc 5 `77d6fc0` |
| `src/modules/reporting/infrastructure/metrics/recent-zns-projection.spec.ts` (mới) | 0 | 3 | +3 | Việc 5 `77d6fc0` |
| `src/backend/routes/zns.routes.config.spec.ts` (mới) | 0 | 19 | +19 | Việc 6: `7bfbbab` +8, `670626b` +3; Việc 7: `635a348` +5, `339b1f0` +3 |
| `src/backend/routes/zns.routes.lock.spec.ts` | 5 | 5 | 0 | Việc 6 `7bfbbab`: chuyển sang bộ giả lập dùng chung, assertion không đổi |
| `src/features/system/settings/pages/VendorPage.spec.tsx` (mới) | 0 | 5 | +5 | Việc 6 `7bfbbab` +1; Việc 7 `635a348` +4 (`339b1f0` sửa ca, không thêm) |
| `src/backend/services/zns/zns-config.policy.spec.ts` (mới) | 0 | 4 | +4 | Việc 7 `635a348` |
| `src/backend/services/zns/zalo-token-manager.service.spec.ts` (mới) | 0 | 10 | +10 | Việc 7: `635a348` +7, `339b1f0` +3 |
| `src/modules/billing/domain/paymentZnsNote.spec.ts` (mới) | 0 | 19 | +19 | Việc 8: `627436f` +15, `92477db` +4 |
| `src/backend/routes/zns.routes.payment-gate.spec.ts` (mới) | 0 | 52 | +52 | Việc 9: `13699d3` +16, `1cfe2e1` +20, `b9bd0b7` +3, `2323e1a` +8, `dc7fbb6` +5 |
| `src/data/repositories/users.repo.spec.ts` (mới) | 0 | 6 | +6 | Việc 11 `8b18776` |
| `src/modules/iam/domain/session-sanitizer.spec.ts` (mới) | 0 | 2 | +2 | Việc 11 `8b18776` |
| `src/modules/iam/ui/AuthContext.spec.tsx` (mới) | 0 | 5 | +5 | Việc 11 `8b18776` (`77cff39` sửa 2 dòng, không thêm) |
| `src/modules/fulfillment/ui/utils/shipment-revert.spec.ts` (mới) | 0 | 26 | +26 | Việc 12: `cc42705` +16, `1235f02` +5, `c15c884` +5 |
| `src/modules/fulfillment/ui/components/RevertShipmentConfirmModal.spec.tsx` (mới) | 0 | 15 | +15 | Việc 13: `c4c3e72` +8, `9fed17b` +7 |
| `src/modules/fulfillment/ui/hooks/useDeliveriesActions.revertShipment.spec.tsx` (mới) | 0 | 33 | +33 | Việc 14: `353306e` +13, `8b87c4e` +20 |
| `src/widgets/TabLichSuGiaoHang.spec.tsx` (mới) | 0 | 4 | +4 | Việc 15 `7b90703` |
| `src/modules/billing/ui/hooks/usePaymentZns.note.spec.ts` (mới) | 0 | 4 | +4 | Việc 16 `57359fb` (`fbe5376` sửa ca 2, không thêm) |
| `src/platform/ui/zns/UniversalZnsPreviewModal.ghichu.spec.tsx` (mới) | 0 | 5 | +5 | Việc 16: `57359fb` +4, `fbe5376` +1 |
| `src/tests/zns-universal-preview-matrix.spec.ts` | 7 | 11 | +4 | Việc 17 `e52a0d2` +1; Việc 18 `25a9de5` +1; sửa chung `ccf82a4` +2 |
| `src/backend/services/zns/zns-payload.builder.note.spec.ts` (mới) | 0 | 9 | +9 | Việc 17 `e52a0d2` +1; sửa chung `ccf82a4` +8 |
| `src/modules/billing/ui/utils/payment-prefill.spec.ts` (mới) | 0 | 5 | +5 | Việc 19 `a11be90` |
| `src/tests/payment-quotation-integration.spec.tsx` | 1 | 6 | +5 | Việc 19: `a11be90` sửa ca có sẵn (không còn "Tất toán" điền sẵn), `81ecadf` +5 |
| `src/modules/contracts/ui/utils/payment-gate.spec.ts` (mới) | 0 | 2 | +2 | Việc 20 `44c3bde` |
| `src/modules/fulfillment/ui/components/DeliveryFormHelpers.spec.ts` (mới) | 0 | 18 | +18 | Việc 21: `4591915` +12, `759f58c` +4, `268ad5f` +2 |
| `src/modules/fulfillment/ui/hooks/useDeliveryForm.waiver.spec.ts` (mới) | 0 | 7 | +7 | Việc 21: `4591915` +3, `759f58c` +3, `268ad5f` +1 |
| `src/modules/fulfillment/ui/utils/deliveryWorkflowIntegrity.spec.ts` | 5 | 5 | 0 | Việc 21 `4591915`: các ca "CSSM" viết lại theo luật mới (không tự bật đặc cách), số ca không đổi |
| `src/modules/fulfillment/ui/components/complete-delivery.rules.spec.ts` (mới) | 0 | 3 | +3 | Việc 22 `e620353` |
| `src/shared/utils/vietnamDate.spec.ts` (mới) | 0 | 3 | +3 | Việc 22 `e620353` |
| `src/platform/ui/design-system/dataview/cells/CurrencyCell.spec.tsx` (mới) | 0 | 3 | +3 | Việc 23 `04e9c38` |
| `src/tests/db-migrations/b0c-cam-xoa-cung.spec.ts` (mới) | 0 | 12 | +12 | Việc 24 `3f02f02` +9; Việc 25 `f1eeb9d` +3 (`851ed58`, `bec57bb`, `248c104` sửa ca, không thêm) |
| `src/data/repositories/base.repo.hardDelete.spec.ts` (mới) | 0 | 16 | +16 | Việc 26 `0098b07` (5 ca + `it.each` 11 bảng) |
| `src/backend/config/supabase.admin.fallback.spec.ts` (mới) | 0 | 16 | +16 | Việc 27: `e6106cd` +4, `1fb7b6f` +12 |
| Toàn bộ bộ kiểm thử (109 tệp → 145 tệp; bằng tổng chênh các dòng trên) | 733 | 1112 | **+379** | |

733 = 728 passed + 5 skipped của lô 2; 1112 = 1107 + 5. Năm kiểm thử skipped không đổi (`nexus-os.spec.ts` 4, `sovereign-mdm-nexus.spec.ts` 1; lô 3 không đụng hai tệp này). Số tệp: 109 tại `59919be` → 145 tại HEAD (+36 tệp spec mới: 29 tệp `*.spec.ts` + 7 tệp `.tsx` được thêm vào `include` của `vitest.config.ts`); không tệp spec nào bị xóa.

Điểm lệch giữa công thức và thực tế (968 + 139 = 1107). Mọi phần thêm là ca do vòng sửa sau rà soát yêu cầu (hoặc người làm thêm khi tự rà); 12 việc khớp đúng số của kế hoạch (Việc 2, 3, 5, 10, 11, 15, 20, 22, 23, 24, 25, 26); Việc 17 và 18 khớp ở commit của riêng mỗi việc (`e52a0d2` +2, `25a9de5` +1), phần thêm của hai việc nằm ở commit sửa chung `ccf82a4` (dòng Việc 17+18 dưới đây):

- **Việc 1 +6** (`878a8ca`): `it.each(['test','staging',''])` ở cả hai spec ghim "mã dev và đường vòng cron chỉ mở ở `development`".
- **Việc 4 +2** (`25d349c`): công tắc `block` không chặn nhầm phiếu có đặc cách hợp lệ hoặc có phiếu thu đã thu.
- **Việc 6 +3** (`670626b`): ping lỗi trả `PING_FAILED` không lặp địa chỉ đã lưu; từ chối địa chỉ có tên đăng nhập/mật khẩu hoặc cổng riêng.
- **Việc 7 +6** (`339b1f0`): `zns.routes.config.spec.ts` +3 (ca "Kiểm tra kết nối" với Refresh Token vừa gõ, hai ca chặn 503 `ZNS_CONFIG_UNREADABLE`; ca cũ về form để trống viết lại theo cách đọc khóa trong khóa chạy), `zalo-token-manager.service.spec.ts` +3 (hai ca xen kẽ làm mới tự động/thủ công, một ca `sendZaloAlert` ném lỗi).
- **Việc 8 +4** (`92477db`): phiếu chỉ có số tiền đầu phiếu + chỉ số 0 = "Đợt 1"; ghim nghĩa chỉ số thô khi `cacDotThu` không xếp thứ tự.
- **Việc 9 +37**: `13699d3` +1 (một ca chế độ `report` thêm khi làm), `1cfe2e1` +20, `b9bd0b7` +3, `2323e1a` +8, `dc7fbb6` +5 (lặp ghi chú nội bộ, giữ N đã gõ, 503 khi không đọc được phiếu, gỡ ghi chú trong bản sao `data` lồng, ghi chú cấp phiếu mơ hồ).
- **Việc 12 +10** (`1235f02` +5, `c15c884` +5): chỉ hủy đợt của chính phiếu; PXK khác thì từ chối.
- **Việc 13 +9** (`c4c3e72` +2 người làm thêm, `9fed17b` +7 gồm một `it.each` 5 dòng): nhãn trạng thái thường, không đóng hộp khi đang gửi, nút xác nhận khóa khi đợt không còn hợp lệ.
- **Việc 14 +24** (`353306e` +4 người làm thêm, `8b87c4e` +20 gồm hai bảng `it.each`): đọc lại CSDL trước khi ghi, câu lỗi tiếng Việt, luật lùi hợp đồng dùng chung.
- **Việc 16 +1** (`fbe5376`): ghi chú đúng 30 ký tự gửi được.
- **Việc 17+18 +10** (`ccf82a4`): 8 ca hành vi của builder, 2 ca trong ma trận xem trước.
- **Việc 19 +5** (`81ecadf`): phiếu chưa lưu giữ "Chưa TT" khi nguồn đã có phiếu thu đã thu tiền; gợi ý "Còn phải thu" chỉ khi chưa lưu.
- **Việc 21 +10** (`759f58c` +7, `268ad5f` +3): đặc cách tự điền cũ không được kế thừa, luật chỉ cho phiếu giao mới, phiếu giao đã hủy (`HUY`, `CANCELLED`) không truyền đặc cách.
- **Việc 27 +12** (`1fb7b6f`): 9 ca giá trị khóa (khóa công khai dán nhầm, biên độ dài, không khóa nào dùng được) + 3 ca dòng log khởi động.

### 8.3 Grep tổng: mọi dòng khớp đều được phép

Chạy mười lệnh của Việc 28, Bước 2 với các điều chỉnh của điều phối viên: lệnh 3 dùng mẫu `tất toán 100% hợp đồng` (P5); lệnh 4 và 5 thêm `':(exclude)*.spec.*'` (P8, P9). Vì an toàn bí mật, lệnh 1 và 2 chạy với `-l` (chỉ in tên tệp): lệnh 1 đọc chuỗi mã quản trị cũ từ hằng `LEGACY_DEV_TOKEN` của `src/backend/config/supabase.admin.auth.spec.ts` vào một biến của shell rồi `git grep -l -F` bằng biến đó, không in giá trị ra.

| Lệnh | Kết quả |
|---|---|
| 1. Mã quản trị viết cứng cũ trong `src`, `server.ts`, `scripts` (trừ `*.spec.ts`) | rỗng. Đối chứng không loại spec: chỉ 3 spec giữ hằng có chủ đích (`supabase.admin.auth.spec.ts`, `cron.routes.auth.spec.ts` của Việc 1; `no-secret-literals.spec.ts` của Việc 2) |
| 2. Tiền tố chung của mọi JWT (mẫu của lệnh 2; không chép vào đây để lệnh này chạy trên toàn kho vẫn rỗng) toàn kho (trừ `package-lock.json`) | rỗng |
| 3. `tất toán 100% hợp đồng` (P5) | 1 dòng, được phép (bảng dưới) |
| 4. Câu đặc cách tự điền, nhãn "Ban Giám Đốc" mặc định, `365`, `defaultLeader` (P8) | 4 dòng, được phép (bảng dưới) |
| 5. `handleRevertShipment`, "Sửa / Hủy xác nhận", `BulkActionsMenu`, `collection: 'znsTemplates'`, `/api/workflow/create/auditLogs` (P9) | rỗng |
| 6. `search-index` ngoài `src/backend` | rỗng |
| 7. `p.ghiChu \|\| `, `payload.ghiChu`, `auth.getSession()` ở bốn thư mục ZNS/khách hàng | rỗng |
| 8. `testUrl` | 4 dòng, đều trong spec (bảng dưới) |
| 9. `prefillPaymentStatus`, `isChuaTT ? `, `quoTotal > 0 ? 'Tất toán'` | rỗng |
| 10. `toISOString().split('T')[0]` trong `CompleteDeliveryModal.tsx` | rỗng |

| Tệp:dòng | Lệnh | Lý do được phép |
|---|---|---|
| `src/modules/billing/domain/paymentZnsNote.ts:12` | 3 | hằng `LEGACY_AUTO_SETTLED_PREFIX = 'tất toán 100% hợp đồng'`: tiền tố dùng để **nhận diện** câu tự điền cũ và chặn nó (409 `PAYMENT_NOTE_REJECTED`), không phải câu gửi khách |
| `src/modules/billing/ui/columns.config.tsx:436` | 4 | `\|\| 'Ban Giám Đốc'` trong chú thích (tooltip) của một đặc cách **đã ghi nhận**: chỉ hiển thị, không điền sẵn (P8; để Đợt 1) |
| `src/modules/billing/ui/components/PaymentDetailDrawer.tsx:343` | 4 | như trên, dòng chữ trong ngăn chi tiết phiếu thu (P8) |
| `src/modules/fulfillment/ui/components/DeliveryFormHelpers.ts:82` | 4 | phần tử của hằng `LEGACY_AUTO_FILLED_REASONS` ("Kế thừa Đặc cách Ban Giám Đốc từ đợt giao trước"): câu lý do chỉ mã cũ từng tự viết, dùng để **từ chối** kế thừa đặc cách tự điền trước Đợt 0A, không điền sẵn gì (Việc 21 vòng sửa 1, `759f58c`) |
| `src/modules/fulfillment/ui/components/DeliveryFormHelpers.ts:83` | 4 | như trên ("… từ đơn hàng"). Cùng khối còn dòng 78 (`LEGACY_GENERIC_APPROVER_LABEL = 'Ban Giám Đốc'`) và dòng 81 (câu lý do thứ nhất; ba câu lý do ở dòng 81–83), hai dòng này không khớp mẫu |
| `src/backend/routes/zns.routes.config.spec.ts:17,20,42` | 8 | spec gửi `testUrl` lạ để khẳng định máy chủ **bỏ qua** nó và chỉ gọi địa chỉ đã lưu |
| `src/features/system/settings/pages/VendorPage.spec.tsx:52` | 8 | tên ca khẳng định thân POST của nút "Ping Thử Nghiệm Webhook CNV" **không có** `testUrl` |
| Cộng | | 9 dòng |

Mẫu cũ của lệnh 3 (`tất toán 100%`, trước P5) khớp thêm 8 dòng ở 6 tệp (`lifecycle-reconciler.ts` ×2, trong đó một dòng chú thích mã; `PaymentDeliveryPortalView.tsx`; `PaymentDetailDrawer.tsx`; `RecordInstallmentModal.tsx`; `ContractDetailDrawer.tsx` ×2; `CustomerOmniFlowStream.tsx`) — nhãn hoặc mô tả trạng thái công nợ như "✓ Đã tất toán 100%", không phải câu gửi khách, nên P5 thu hẹp mẫu.

Chín dòng lỗi cũ được phép của `npx eslint --quiet` trên 100 tệp đã đổi (có sẵn tại `59919be`, Ràng buộc chung mục (a)); chỉ số dòng dịch do chính các việc sửa tệp đó, cùng luật và cùng cột:

| Tệp | Dòng hiện tại (tại `59919be`) | Luật | Dịch dòng do |
|---|---|---|---|
| `src/modules/customers/ui/components/QuickCustomerModal.tsx` | 527, 531, 533, 538, 833 (529, 533, 535, 540, 835) | `no-restricted-syntax` (bảng màu) | Việc 2 `59deedf` (−2) |
| `src/modules/fulfillment/ui/components/DeliveryDetailDrawer.tsx` | 1182, 1245 (1211, 1274) | `no-restricted-syntax` (bảng màu) | Việc 15 `7b90703` (−29) |
| `src/platform/ui/zns/UniversalZnsPreviewModal.tsx` | 277 (276) | `no-empty` | Việc 16 `57359fb` |
| `src/platform/ui/zns/UniversalZnsPreviewModal.tsx` | 505 (491) | `no-restricted-syntax` (bảng màu) | Việc 16 `57359fb` |

### 8.4 Danh sách commit (`git log --oneline 59919be..HEAD` trước commit báo cáo này: 50 commit)

```
1fb7b6f fix(server): the health db mode also flags a public anon/publishable key pasted into SUPABASE_SERVICE_ROLE_KEY; the startup log says which mistake it is (Đợt 0A MC13)
e6106cd feat(server): detect the anon-key fallback of the admin client, log it once at startup and expose a coarse db mode on the health endpoints (Đợt 0A MC13)
0098b07 fix(data): BaseRepository.hardDelete refuses business, log and counter tables before any network call and surfaces a refused delete instead of swallowing it (Đợt 0A CSDL01)
248c104 docs(db): run sheet accepts HTTP/1.1 status lines, never sends the owner to a full restore, says what a non-refused probe looks like (Đợt 0A CSDL05)
bec57bb fix(db): undoing 0002 keeps the live Zalo keys; the run sheet expects 401 for public-key probes, wraps every write probe in a rolled-back transaction and gives ready-to-run checks (Đợt 0A ZNS05 CSDL05)
851ed58 fix(db): migration 0002 keeps the first backup row on re-run so its rollback can always restore the original Zalo config (Đợt 0A ZNS05)
f1eeb9d db(zns): migration 0002 removes the nested legacy Zalo config from settings/zns_config with a pre-change backup row; Vietnamese run-sheet for the owner (Đợt 0A ZNS05 CSDL05)
3f02f02 db(b0c): numbered migration revoking DELETE/TRUNCATE on business and log tables and all writes on server-only tables from anon and authenticated, with rollback, read-only precheck and a static guard spec (Đợt 0A CSDL01)
04e9c38 fix(ui): currency cells keep every digit on one line, clip on the right with a tooltip, and the quotation/contract value columns are wider (Đợt 0A BG01)
e620353 fix(fulfillment): handover confirmation no longer prefills the planned date, rejects dates after today and uses Vietnam time for the quick buttons (Đợt 0A GH15)
268ad5f fix(fulfillment): a delivery cancelled in the app ('HUY') passes no waiver on to the next delivery (Đợt 0A GH02)
759f58c fix(fulfillment): old auto-filled waivers (generic 'Ban Giám Đốc' or a reason only the old code wrote) are no longer inherited; the contract-without-receipt rule applies to new deliveries only; cancelled deliveries pass no waiver on (Đợt 0A GH02)
4591915 fix(fulfillment): the delivery waiver is never auto-enabled or prefilled; approver and reason are required by the form; contract deliveries without a receipt need a waiver; anchor receipts stop defaulting a 365-day warranty (Đợt 0A GH02)
44c3bde fix(contracts): receipts created from a contract start 'Chưa TT' with no amount; the row action shares the one-receipt-per-contract gate with the detail drawer (Đợt 0A TT04)
81ecadf fix(billing): a brand-new receipt keeps 'Chưa TT' until an amount is typed, even when the source already has collected receipts; the 'Còn phải thu' hint shows only while creating (Đợt 0A TT04)
a11be90 fix(billing): a receipt created from a quotation or a picked source document starts blank and 'Chưa TT' with a 'Còn phải thu' hint instead of a prefilled 100% 'Tất toán' (Đợt 0A TT04)
ccf82a4 test(zns): the builder's ghi_chu rule is pinned by behaviour, not only by a text grep; the vendor trims ghi_chu and falls back on blank (Đợt 0A TT01)
25a9de5 fix(zns): template 646935 ghi_chu is declared at 30 characters and the auto-send toggle no longer promises 'Tất toán 100%' (Đợt 0A TT01)
e52a0d2 fix(zns): server composers read only ghi_chu for template 646935; internal notes never reach the vendor or the preview API (Đợt 0A TT01)
fbe5376 fix(billing): a receipt-level payment ZNS no longer rewrites the installment ledger on success; only an explicitly chosen installment is marked (Đợt 0A TT01)
57359fb fix(billing): the three payment-ZNS senders use the shared note builder, block uncollected receipts before the preview and never fall back to internal notes; preview refuses notes over 30 chars (Đợt 0A TT01)
7b90703 feat(fulfillment): 'Sửa' on a delivered shipment becomes 'Hủy xác nhận đợt n' with a reason dialog; the browser-direct revert that forced 'Chưa giao' is gone; shipment actions are permission-gated (Đợt 0A GH01)
8b87c4e fix(fulfillment): shipment un-confirmation re-reads the delivery from the database, shows plain Vietnamese errors and never reopens a cancelled contract (Đợt 0A GH01)
353306e fix(fulfillment): shipment un-confirmation writes through the audited update route from the freshest record, rolls the contract back best-effort and refreshes the drawer from the saved document (Đợt 0A GH01)
9fed17b fix(fulfillment): the revert dialog shows plain status labels and cannot be dismissed mid-submit (Đợt 0A GH01)
c4c3e72 feat(fulfillment): reason dialog that lists what a shipment un-confirmation removes and how the delivery status will change (Đợt 0A GH01)
c15c884 fix(fulfillment): a shipment revert refuses a target whose PXK differs from the stored shipment's (Đợt 0A GH01)
1235f02 fix(fulfillment): a shipment revert only touches the shipment the delivery itself owns (no number fallback on an id mismatch; legacy đợt 1 must carry the delivery's own PXK) (Đợt 0A GH01)
cc42705 feat(fulfillment): pure shipment-revert helper derives the master status from the remaining shipments and keeps the old handover evidence in a history entry (Đợt 0A GH01)
77cff39 test(iam): AuthContext session tests pin every strip point, not only the background refresh (Đợt 0A BM03)
8b18776 fix(iam): never keep the password in the browser session; users repo strips it on read, verifies it in place and stops string-building the lookup filter (Đợt 0A BM03 BM06)
8d2d3b2 chore(scripts): read the Supabase URL and anon key from the environment instead of hard-coding them; guard against JWT literals (Đợt 0A K-SEC-7)
dc7fbb6 fix(zns): an echoed receipt-level note never pins the installment number (Đợt 0A TT01)
2323e1a fix(zns): payment confirmations also strip internal notes from the nested data copy and number an echoed installment note by its own installment (Đợt 0A TT01)
b9bd0b7 fix(zns): the typed installment number is only reused for over-long legacy sentences (Đợt 0A TT01)
1cfe2e1 fix(zns): payment confirmations replace echoed internal notes, keep the typed installment number and refuse to send when the receipt cannot be read (Đợt 0A TT01)
13699d3 fix(zns): payment confirmation sends are gated on the collected ledger in the database (409), internal notes are stripped and the server composes 'Thanh toán đợt N' (Đợt 0A TT01)
92477db fix(billing): a head-only receipt's synthesized 'Đợt 1' row (installment index 0) is a valid payment-ZNS target (Đợt 0A TT01)
627436f feat(billing): shared payment-ZNS note builder derives 'Thanh toán đợt N' from the collected ledger and never from internal notes (Đợt 0A TT01)
339b1f0 fix(zns): a Zalo test keeps unsaved page edits and never leaves a consumed refresh token in the form; queued refreshes re-read credentials inside the lock; config save refuses to write when the stored row is unreadable (Đợt 0A ZNS05 Z0.3)
635a348 fix(zns): config API masks Zalo secrets and accepts only allow-listed fields; token refresh failures alert instead of reusing a dead token; one lock for auto and manual refresh; Vendor page reloads after a test (Đợt 0A ZNS05 Z0.3)
670626b fix(zns): shared harness resets mock implementations between tests; dry-run ping never echoes the saved URL and rejects credentials or custom ports (Đợt 0A ZNS01)
7bfbbab fix(zns): the CNV dry-run ping only calls the saved hub.cnvcdp.com URL, never follows redirects and returns status/latency only; shared supertest harness for zns.routes (Đợt 0A ZNS01)
77d6fc0 fix(reports): retire /api/reports/search-index (410) and strip phone numbers and message bodies from /api/analytics/today recentZns (Đợt 0A BM01)
25d349c test(workflow): pin that the unpaid-contract guard never blocks waived or paid contract deliveries (Đợt 0A GH02)
d5468df fix(workflow): a delivery waiver needs an approver and a reason (422); contract deliveries without a receipt are reported, blockable by DELIVERY_UNPAID_CONTRACT_GUARD (Đợt 0A GH02)
80088ca fix(api): /api/search and /api/workflow/* accept only the five business tables; manual ZNS bypass log gets a fixed route; drop the dead template import menu (Đợt 0A BM01)
59deedf fix(customers): stop sending the retired dev token as a fallback bearer from the customer forms; add a no-secret-literals guard (Đợt 0A BM02)
878a8ca test(auth): pin that the dev token and cron bypasses stay closed outside development (Đợt 0A BM02 K-SEC-8)
b202557 fix(auth): drop the hard-coded dev admin token, confine DEV_BYPASS_AUTH and the cron bypass to development (Đợt 0A BM02)
```

Theo việc: Việc 1 `b202557`, `878a8ca`; Việc 2 `59deedf`; Việc 3 `80088ca`; Việc 4 `d5468df`, `25d349c`; Việc 5 `77d6fc0`; Việc 6 `7bfbbab`, `670626b`; Việc 7 `635a348`, `339b1f0`; Việc 8 `627436f`, `92477db`; Việc 9 `13699d3`, `1cfe2e1`, `b9bd0b7`, `2323e1a`, `dc7fbb6`; Việc 10 `8d2d3b2`; Việc 11 `8b18776`, `77cff39`; Việc 12 `cc42705`, `1235f02`, `c15c884`; Việc 13 `c4c3e72`, `9fed17b`; Việc 14 `353306e`, `8b87c4e`; Việc 15 `7b90703`; Việc 16 `57359fb`, `fbe5376`; Việc 17 `e52a0d2`; Việc 18 `25a9de5`; sửa chung Việc 17+18 `ccf82a4`; Việc 19 `a11be90`, `81ecadf`; Việc 20 `44c3bde`; Việc 21 `4591915`, `759f58c`, `268ad5f`; Việc 22 `e620353`; Việc 23 `04e9c38`; Việc 24 `3f02f02`; Việc 25 `f1eeb9d`, `851ed58`, `bec57bb`, `248c104`; Việc 26 `0098b07`; Việc 27 `e6106cd`, `1fb7b6f`. Commit thứ hai trở đi của một việc là vòng sửa sau rà soát (mục 8.9). Cả 50 commit mang dòng ghi công `Co-Authored-By: Claude Opus 5.5` (A1; kiểm bằng `git log --format=%B`, không commit nào thiếu). Mọi số ở 8.1–8.3 đo trên cây mã tại `1fb7b6f`; sau đó chỉ có các commit của báo cáo này (`7c1d5ec` và vòng sửa sau rà soát; chỉ sửa tài liệu).

### 8.5 Khác biệt với tài liệu gốc và quyết định khi soạn (chủ sở hữu duyệt)

- **0A.1:** "5 chỗ trên trình duyệt" chỉ còn 3 vì `CronPage.tsx` đã xóa ở lô 1. `/api/reports/search-index` trả **410** (B2 giữ "vẫn tắt"), không phải 403 "tạm khóa". Nhập mẫu ZNS hàng loạt: component chưa từng được gắn vào giao diện → **xóa**, không "tạm khóa" (giao diện không có nút nhập; lưu mẫu lẻ ghi thẳng Supabase, không đi qua rào). Nhật ký "xác nhận ZNS thủ công" đi đường cố định mới `POST /api/workflow/zns-manual-bypass` (bảng `auditLogs`, theo mẫu `/log-bypass`); hiện chưa có nút nào gọi được đường này vì nơi dùng duy nhất của hook (`WorkflowTimeline.tsx`) chưa gắn vào trang nào. `next-code` cũng chỉ nhận 5 loại. Ba đường `log-bypass`, `notifications/mark-read`, `notifications/mark-all-read` không nhận tên bảng. Đường xóa khách lấy danh tính từ `userId` (tồn đọng lô 1, dòng 17) → **B2**. Chuỗi mã quản trị cũ còn trong kế hoạch lô 1 chưa commit → bước quét trước commit tài liệu (8.8). Làm mới mã Zalo lỗi: trả mã cũ **khi còn hạn**, hết hạn trả `null` (phụ lục Q4). HYBRID không chuyển sang CNV khi lỗi Zalo/Token: **ngoài phạm vi**, chờ Z-2. `DEV_BYPASS_AUTH` và đường vòng cron chỉ còn ở `NODE_ENV=development` (không có môi trường "staging"). "Làm mới lỗi thì báo" (Z0.3) trong lô này = log lỗi trên Render + `sendZaloAlert` (ghi bảng `systemAlerts` **chưa tồn tại** → thực tế chỉ còn log cho tới MC07) + lỗi hiện trên màn Vendor & Webhook khi bấm "Kiểm tra kết nối"; **chưa có kênh báo tới người** (quyết định 12(h)). Cách đọc dòng 207 "`/api/workflow/*` chỉ nhận 5 bảng": không đường nào nhận **tên bảng từ người gọi**; hai đường mục đích cố định vẫn ghi bảng ngoài 5 bảng (`zns-manual-bypass` → `auditLogs`; `log-bypass` sẵn có → `gatebypasses`). Sau Việc 29, tài khoản có trong bảng nhưng chưa đặt mật khẩu bị từ chối với thông báo đăng nhập chung (12(k)). Năm ca của `zns.routes.lock.spec.ts` (lô 1) chạy lại trên bộ giả lập dùng chung của Việc 6, assertion không đổi.
- **0A.2:** `audit_logs` thuộc nhóm A dù trình duyệt ghi nhật ký **đang lỗi** (HT02) — ghi chú hoạt động từ trình duyệt hiện **mất**, không do SQL. Bốn câu Q1–Q4 soạn theo khuyến nghị (thu cả ghi của `zns_messages`; gồm TRUNCATE; thu EXECUTE hai hàm; `settings` giữ xóa). Policy RESTRICTIVE cho `settings` → B3/B4a. Bảng thật ngoài 23 bảng → phân nhóm trước khi chạy (precheck). Việc 27 công bố chế độ CSDL (`service-role`/`anon-fallback`/`offline`, không kèm giá trị khóa) trên `/health` và `/api/health` **không cần đăng nhập** (Q7 của bản đồ 0A.2; quyết định 12(i)).
- **0A.4:** hủy xác nhận ghi qua `PUT /api/workflow/update` (nhật ký `before`/`after` ở máy chủ); nút "Sửa" thật (sửa ngày/người ký không hủy) → **chưa làm** (GH03/0B); hộp lý do cho hủy xác nhận cấp phiếu và shim đọc nhật ký cho tab "Nhật ký & Hoạt động" → chưa làm (tùy chọn E/F). Trạng thái phiếu khi hủy một đợt: "Đang giao" (Q1). Ai được hủy: mọi vai trò có `can('update','delivery')` (Q2; siết ở 0A.9/HT01) — và vì cùng một cổng quyền, vai trò **không** có quyền sửa cũng không còn thấy nút "Xác nhận giao Đợt n" (ngoài dòng 210, Việc 15 Bước 4). "Khôi phục được" = giá trị cũ giữ trong `lichSuHuyXacNhan` + `before` của nhật ký; khôi phục bằng cách xác nhận lại đợt, **không** có nút khôi phục một-cú-bấm (Q9). Hủy xác nhận đợt đã gửi tin Zalo "đã giao"/bảo hành: cho phép; hộp xác nhận ghi ở khối "Giữ nguyên": "… và tin Zalo đã gửi (không thu hồi được)" (Q8; 12(j)).
- **0A.5:** khác thiết kế cổng §9 dòng 4 (vẫn giữ câu trung tính do máy chủ dựng tới Z1.3) và §9.11 (chưa từ chối khi thiếu `ngayThu`/`loai_don` lạ). Mã trả lời **409** (`PAYMENT_NOT_COLLECTED`, `PAYMENT_NOTE_REJECTED`) và **400** (`INVALID_INSTALLMENT`) ngoài chú giải dòng 213 của kế hoạch tổng thể → đề nghị bổ sung chú giải "409 = trạng thái dữ liệu không cho phép, 422 = thiếu dữ liệu bắt buộc" (bảng đủ các mã mới ở gạch đầu dòng "Chung"). Giới hạn 30 ký tự của `ghi_chu` là giả định cần xác nhận trên Zalo OA. Phiếu "Chưa TT" có `soTien > 0` không có đợt thu bị coi là chưa thu (§4.7.1). Câu "Thanh toán đợt N" khi gửi ở cấp phiếu: N = `lanThu` của đợt có tiền mới nhất; phiếu một khoản không có `cacDotThu` → "Thanh toán đợt 1" (12(f)). Luật câu "Tất toán…" cũ cho phiếu chưa thu đủ **chặn ngay** (409) theo mặc định, có công tắc `PAYMENT_NOTE_GUARD=report` để hạ xuống chỉ ghi nhận — khác Việc 4 (mặc định ghi nhận) vì câu sai gửi tới khách là thiệt hại trực tiếp (12(e)). Màn xem trước có chốt tự động riêng (`UniversalZnsPreviewModal.ghichu.spec.tsx`): không câu mặc định, từ chối gửi khi ô Ghi chú rỗng hoặc quá 30 ký tự. Màn điện thoại trong bản xem trước (`ZnsOfficialPhonePreview`) thôi đọc ghi chú nội bộ và thôi hiện câu 'Thanh toán đợt hợp đồng' khi ô Ghi chú rỗng (hiện `---`).
- **0A.7:** QB9 còn mở — làm theo khuyến nghị ★ (`ngayThanhToan`/người tạo vẫn điền sẵn; nếu chọn "duyệt từng ô" phải gỡ thêm). QB11 còn mở — làm phương án A; kiểm tra vai trò chờ B2. Luật "hợp đồng chưa có phiếu thu" ở máy chủ chạy **chỉ ghi nhận** (`DELIVERY_UNPAID_CONTRACT_GUARD` chưa đặt) tới khi chủ sở hữu bật `block`. Nhãn chung "Ban Giám Đốc" vẫn chọn được bằng tay tới khi nhập tên thật. Phiếu thu từ hợp đồng vẫn mở ở chế độ "sửa" (tiêu đề "Cập nhật Phiếu TT") — MC04. Nút "Dứt điểm" (`usePaymentsActions.ts:77-106`) **giữ nguyên** việc mở phiếu mới với số còn lại và "Tất toán": là thao tác tất toán có chủ đích, không phải giá trị mặc định của phiếu trắng (12(g); đổi ý → thêm bước vào Việc 19). Ngoài dòng 222: danh sách trạng thái khi điền từ hợp đồng đổi thành `['Chưa TT','Công nợ','Tất toán','Miễn phí']` và bỏ bước chuyển `pendingDeliveryContract` (Việc 20). Dây nối của `CompleteDeliveryModal` (`max`, nút Hôm nay/Hôm qua) chỉ kiểm bằng tay ở 8.6 §17; luật và helper ngày Việt Nam có spec (Việc 22). Chốt quy trình giao hàng ở ngăn hợp đồng vẫn chỉ chạy khi hợp đồng có phiếu thu (như trước). Với hợp đồng chưa có phiếu thu, form phiếu giao mở với đặc cách tắt; muốn giao trước phải bật đặc cách, chọn người duyệt và ghi lý do (form và máy chủ cùng kiểm). Câu 'luôn chạy chốt giao hàng với hợp đồng chưa có phiếu thu' của báo cáo rà soát thuộc bản cuối của GH02, cần đăng nhập ở máy chủ (B2; phụ lục 01 dòng 68).
- **Chung:** hậu tố "(Đợt 0A)" chỉ ở hàm trả lời đường gỡ/khóa; thông báo kiểm tra dữ liệu mới không hậu tố (chờ chủ sở hữu quyết một lần). Không có CSDL thử (A5): "chạy trên cơ sở dữ liệu thử" thay bằng khóa offline của vitest + mục 8.6. Mã trả lời mới của lô (thân lỗi luôn là JSON có `success: false`, `code`, `error`): **400** `INVALID_COLLECTION`, `INVALID_ENTITY`, `INVALID_BYPASS`, `NO_SAVED_VENDOR_URL`, `VENDOR_URL_NOT_ALLOWED`, `INVALID_INSTALLMENT`; **409** `PAYMENT_NOT_COLLECTED`, `PAYMENT_NOTE_REJECTED`; **410** `SEARCH_INDEX_REMOVED`; **422** `WAIVER_INCOMPLETE`, `CONTRACT_WITHOUT_RECEIPT`; và ba mã thêm ở vòng sửa, ngoài bảng mã của kế hoạch: **500** `PING_FAILED` (ping thử CNV lỗi, không lặp lại địa chỉ đã lưu), **503** `ZNS_CONFIG_UNREADABLE` (không đọc được cấu hình ZNS đang lưu nên không ghi), **503** `PAYMENT_READ_FAILED` (không đọc được phiếu thu nên không gửi tin). Đề nghị chú giải thêm "503 = tạm thời không đọc được dữ liệu nên chưa làm gì, thử lại sau".

Khác kế hoạch do quyết định của điều phối viên khi rà soát từng việc (mỗi dòng một hành vi; lý do và cái giá nếu sai ở 8.9):

- **Ping thử Webhook CNV** (Việc 6, `670626b`): lỗi khi gọi CNV trả 500 `PING_FAILED` với câu tiếng Việt cố định, chi tiết chỉ vào log máy chủ; địa chỉ đã lưu có tên đăng nhập/mật khẩu hoặc cổng khác 443 không được ping.
- **Vendor & Webhook** (Việc 7, `339b1f0`): "Kiểm tra kết nối" thành công không tải lại cả trang — chỉ làm trống hai ô bí mật vừa dùng, bật cờ "Đã lưu" và cập nhật hạn mã, nên các sửa đổi chưa lưu khác vẫn còn; nút "Lưu toàn bộ cấu hình" khóa trong lúc đang kiểm tra; lượt làm mới mã xếp hàng đọc lại khóa bên trong khóa chạy; `POST /api/zns/config` từ chối 503 `ZNS_CONFIG_UNREADABLE` và không ghi gì khi không đọc được dòng cấu hình đang lưu mà thân không mang khóa mới.
- **Phiếu thu chỉ có số tiền đầu phiếu** (Việc 8, `92477db`): gửi từ dòng "Đợt 1" dựng sẵn (chỉ số 0) được coi là "Thanh toán đợt 1"; chỉ số từ 1 trở lên vẫn bị từ chối.
- **Chốt gửi tin thanh toán ở máy chủ** (Việc 9, `1cfe2e1`, `b9bd0b7`, `2323e1a`, `dc7fbb6`): ô Ghi chú trùng một ghi chú nội bộ đã lưu bị thay bằng câu máy chủ "Thanh toán đợt N" (N là đợt có đúng ghi chú đó; trùng ghi chú cấp phiếu thì lấy đợt có tiền mới nhất); câu cũ dài hơn 30 ký tự "Thanh toán đợt N (Còn lại …)" giữ đúng N đã gõ; ghi chú ≤ 30 ký tự giữ nguyên như bản xem trước; không đọc được phiếu thu → 503 `PAYMENT_READ_FAILED`, không gửi; ghi chú nội bộ được gỡ cả trong bản sao `data` lồng bên trong trước khi tới nhà cung cấp.
- **Hủy xác nhận đợt – chọn đúng đợt** (Việc 12, `1235f02`, `c15c884`): chỉ hủy được đợt thuộc chính phiếu giao đó; đợt có số phiếu xuất kho khác với số đã lưu bị từ chối ("Không tìm thấy đợt giao cần hủy xác nhận trong phiếu.").
- **Hộp hủy xác nhận** (Việc 13, `9fed17b`): trạng thái phiếu hiện bằng chữ (Hoàn tất / Đang giao / Chưa giao / Đã hủy), không hiện mã; không đóng được bằng Esc hay bấm ra ngoài khi đang gửi.
- **Ghi hủy xác nhận** (Việc 14, `8b87c4e`): đọc lại phiếu từ CSDL ngay trước khi ghi (bỏ bản đệm của tab); lỗi hiện bằng câu tiếng Việt thường; hợp đồng đã hủy không bao giờ bị mở lại, chỉ hợp đồng đang "hoàn tất" mới lùi trạng thái — áp dụng cho cả nút hủy xác nhận cả phiếu.
- **Gửi tin thanh toán cấp phiếu** (Việc 16, `fbe5376`): không đánh dấu dòng đợt nào là "đã gửi" (như trước lô này); chỉ đợt được chọn rõ mới được đánh dấu.
- **Biến `ghi_chu` gửi nhà cung cấp** (Việc 17+18, `ccf82a4`): được cắt khoảng trắng; rỗng thì dùng câu trung tính.
- **Phiếu thu chưa lưu** (Việc 19, `81ecadf`): giữ "Chưa TT" cho tới khi nhân viên gõ số thực thu, kể cả khi chứng từ nguồn đã có phiếu thu khác đã thu tiền; dòng "Còn phải thu" chỉ hiện khi phiếu chưa lưu; phiếu chưa lưu, số tiền trống mà đang để trạng thái khác "Chưa TT" (trừ "Miễn phí") được đưa về "Chưa TT".
- **Phiếu giao – đặc cách** (Việc 21, `759f58c`, `268ad5f`): đặc cách do mã cũ tự điền (người duyệt "Ban Giám Đốc" hoặc một trong ba câu lý do mã cũ tự viết) không được kế thừa sang phiếu mới; luật "hợp đồng chưa có phiếu thu" của form chỉ áp khi lập phiếu giao **mới** (mở sửa phiếu cũ không bị chặn); phiếu giao đã hủy (`HUY`/`HỦY`/`Hủy`/`CANCELLED`) không truyền đặc cách.
- **SQL 0002** (Việc 25, `851ed58`, `bec57bb`): dòng sao lưu chỉ ghi ở lần chạy đầu (`ON CONFLICT (id) DO NOTHING`); hoàn tác chỉ đưa lại lớp lồng cũ và giữ các khóa Zalo đang dùng (`b.data || s.data`).
- **Sổ tay chạy SQL** (Việc 24–25, `f1eeb9d`, `bec57bb`, `248c104`): thử bằng khóa công khai qua API mong đợi **401** kèm `"code":"42501"` (không phải 403); mọi lệnh thử ghi chạy trong giao dịch tự hoàn tác; không bao giờ khuyên khôi phục cả cơ sở dữ liệu; `db/migrations/**` luôn LF (`.gitattributes`); spec khẳng định tệp kiểm tra trước chỉ đọc.
- **Danh sách cấm xóa cứng ở trình duyệt** (Việc 26, `0098b07`): spec ràng buộc nó bằng đúng 17 bảng mà SQL 0001 thu quyền (nhóm A ∪ B), để hai danh sách không lệch nhau.
- **Cờ `db` của `/api/health`** (Việc 27, `1fb7b6f`): báo `anon-fallback` cả khi `SUPABASE_SERVICE_ROLE_KEY` chứa khóa công khai (trùng khóa anon, JWT vai `anon`, hoặc khóa công khai kiểu mới `sb_publishable_…`); báo `offline` khi không khóa nào dùng được; log khởi động nói rõ là thiếu khóa hay dán nhầm khóa công khai, không in khóa.

### 8.6 Nghiệm thu trên bản chạy thật và CSDL thật (chủ sở hữu/IT; **chưa thực hiện**)

_Điều kiện: đã làm mục "Việc chủ sở hữu cần làm" điểm 1–7; máy chủ và giao diện lên cùng một lần deploy; Bước 0 của lô 1 xong. Thay `<host>` bằng địa chỉ Render; `<MÃ_QUẢN_TRỊ_VIẾT_CỨNG>` là chuỗi cũ (lấy từ lịch sử git, không ghi vào đây). **Luôn làm mục 1 trước tiên** (chỉ đọc). Mọi mục sau, kể cả lượt 2 và phần SQL, chỉ làm khi mục 1 trả `"db":"service-role"`: các mục 2, 4, 9 và 10 gửi lệnh chạy, ghi hoặc gửi tin (gọi hàng đợi gửi tin, thử tạo và xóa, thử gửi tin ZNS, thử tạo phiếu giao) — bản mới từ chối chúng trước khi đụng dữ liệu, còn bản cũ (chưa deploy lô 3, hoặc sau Render › Rollback) có thể làm thật: gửi tin, tạo tài khoản, tạo phiếu giao. Thao tác có tác dụng thật trên hệ thống đang chạy được đánh dấu **[ghi …]** hoặc **[gửi thật …]**. "Chỉ mở xem" (mục 15–17) vẫn để lại dấu vết: mở một phiếu thu mới còn trống hoặc bấm "+ Phiếu giao" đã dùng mất một số chứng từ (số kế tiếp sẽ nhảy), và bật công tắc đặc cách làm form tự lưu nháp. Dán kết quả (không có bí mật) vào đây._

**Lượt 1 – curl (trước khi chạy SQL 0001; mục 1 trước tiên):**
1. **Làm trước mọi mục khác:** `curl -i https://<host>/api/health` → chỉ làm tiếp khi thân có `"db":"service-role"`. `"anon-fallback"` **hoặc** `"offline"` → **dừng mọi mục**: sửa `SUPABASE_SERVICE_ROLE_KEY` trên Render (thiếu, dán nhầm khóa công khai, quá ngắn hoặc toàn khoảng trắng — trường hợp cuối làm máy chủ chạy bản giả lập và báo `offline` mà không có lỗi), deploy lại rồi làm lại mục này; chưa được chạy SQL 0001. Thân **không có** khóa `db` = bản đang chạy còn cũ (chưa deploy lô 3, hoặc vừa Rollback) → **dừng mọi mục**, deploy bản lô 3 trước.
2. `curl -i -X POST https://<host>/api/cron/process-outbox -H "Authorization: Bearer <MÃ_QUẢN_TRỊ_VIẾT_CỨNG>"` → `401`. (Đừng dùng `/api/cron/preview` hay `/sync-snapshots` để kiểm: hai đường này đã gỡ, trả `410`.) Chỉ chạy sau mục 1: trên bản cũ, lệnh này chạy thật hàng đợi gửi tin.
3. `curl -i https://<host>/api/search/users` → `400` `INVALID_COLLECTION`; `curl -i "https://<host>/api/search/contracts,quotations?q=hd"` → `200`. Chỉ dán dòng trạng thái (ví dụ `HTTP/1.1 200 OK`) vào đây, không dán thân trả về: thân của lệnh thứ hai có tên và số điện thoại khách.
4. `curl -i -X POST https://<host>/api/workflow/create/users -H "Content-Type: application/json" -d "{\"data\":{\"username\":\"x\"}}"` → `400` `INVALID_ENTITY`; `curl -i -X DELETE https://<host>/api/workflow/delete/settings/__probe__ -H "Content-Type: application/json" -d "{\"userId\":\"ghost\"}"` → `400` (`INVALID_ENTITY`; mã `__probe__` không tồn tại nên bản cũ cũng không xóa được gì). Chỉ chạy sau mục 1: trên bản cũ, lệnh tạo ở trên tạo thật một dòng tài khoản `x`.
5. `curl -i https://<host>/api/zns/config` → trong `config` không có ô `zaloSecretKey`, `zaloAccessToken`, `zaloRefreshToken`, `vendorWebhookSecret` mang giá trị; chỉ có `config.secrets` với các cờ `true`/`false` (đã lưu hay chưa).
6. `curl -i https://<host>/api/reports/search-index` → `410` `SEARCH_INDEX_REMOVED`.
7. Ngay sau deploy, **[ghi – chỉ số liệu thống kê]** chạy một lần `curl -i -X POST https://<host>/api/reports/flush` → `200` (tính lại số liệu tổng quan, để trình duyệt không giữ bản cũ còn số điện thoại); rồi `curl -i https://<host>/api/analytics/today` → trong `data.zns.recentZns` không có `phone`, `sdt`, `payload`, tên khách.
8. **[gửi thật: một POST thật tới hub CNV với `dry_run`]** `curl -i -X POST https://<host>/api/zns/test-webhook-dryrun -H "Content-Type: application/json" -d "{\"testUrl\":\"http://169.254.169.254/\"}"` → máy chủ bỏ qua `testUrl`, chỉ POST một gói thử có `dry_run: true` (số giả `0900000000`) tới địa chỉ CNV đã lưu; thân trả về chỉ có: `200` `success`, `status`, `latencyMs`, `message`; `502` (CNV trả mã lỗi) `success: false`, `status`, `latencyMs`, `error`, không có `code`; `400` `NO_SAVED_VENDOR_URL` hoặc `VENDOR_URL_NOT_ALLOWED`, `500` `PING_FAILED`, cả hai kèm `error`; **không** nhắc địa chỉ gửi lên, **không** có `response`.
9. `curl -i -X POST https://<host>/api/zns/send -H "Content-Type: application/json" -d "{\"entityId\":\"<id phiếu Chưa TT>\",\"entityType\":\"PAYMENT\",\"messageType\":\"THANH_TOAN_XAC_NHAN\",\"phone\":\"<số nội bộ>\",\"payload\":{}}"` → `409` `PAYMENT_NOT_COLLECTED`; SQL chỉ đọc `select count(*) from zns_messages where entity_id = '<id>' and created_at > now() - interval '10 minutes';` → `0`. Chỉ chạy sau mục 1: trên bản cũ, lệnh này gửi thật một tin ZNS tới `<số nội bộ>`.
10. `curl -i -X POST https://<host>/api/workflow/create/delivery -H "Content-Type: application/json" -d "{\"data\":{\"contractId\":\"<id hợp đồng chưa có phiếu thu>\",\"dacCachGiaoTruoc\":true,\"lyDoDacCach\":\"thử\"}}"` → `422` `WAIVER_INCOMPLETE`; `select count(*) from deliveries where created_at > now() - interval '10 minutes';` không tăng. Chỉ chạy sau mục 1: trên bản cũ, lệnh này tạo thật một phiếu giao.

**Lượt 2 – giao diện (1440 px và 390 px, chụp màn hình):**
11. Màn đăng nhập: dòng "Tài khoản mặc định" **vẫn còn** cho tới Việc 29 (chỉ kiểm việc nó biến mất sau Việc 29). Đăng nhập đúng → DevTools › Application › Local Storage › `sgm_user_session` **không** có khóa `password`. (Tài khoản có tên ngoài mẫu mới không đăng nhập được nữa — kiểm bằng truy vấn ở 8.8 **trước khi lên bản**.)
12. Cài đặt › Vendor & Webhook: ô Secret Key/Refresh Token trống với chỗ giữ "Đã lưu — để trống nếu không đổi"; bấm "Kiểm tra kết nối Zalo OpenAPI" **[ghi: đổi mã làm mới Zalo đang dùng — Zalo cấp cặp mã mới, máy chủ lưu ngay]** (trong lúc kiểm, nút "Lưu toàn bộ cấu hình" bị khóa; kiểm xong, hai ô bí mật trống lại, các ô khác đang sửa vẫn giữ) → "Lưu toàn bộ cấu hình" **[ghi: lưu cấu hình]** → **[ghi 1]** gửi thử **một** tin ZNS lẻ tới số nội bộ: thành công. Nếu mã làm mới đã bị dùng (hậu quả ZNS05 cũ): cấp quyền lại OA, gõ Refresh Token mới, lặp lại. "Ping Thử Nghiệm Webhook CNV" dùng địa chỉ đã lưu **[gửi thật: như mục 8]**.
13. Thanh toán: phiếu "Công nợ" thu 30 % → "Gửi tin Zalo" → ô Ghi chú ở bản xem trước = "Thanh toán đợt 1"; phiếu "Chưa TT" → không mở được bản xem trước, toast hướng dẫn "Ghi nhận đợt thu trước". Lặp lại việc mở bản xem trước từ ngăn chi tiết phiếu thu và từ trang Tổng quan (hai nơi gửi này chưa có kiểm thử tự động). Hai phép thử "không gửi được" sau đây chỉ làm trên phiếu thử nội bộ có số điện thoại nội bộ (nếu tin vẫn gửi đi được: dừng, báo IT): xóa trống ô Ghi chú → màn điện thoại hiện `---` và không gửi được; gõ quá 30 ký tự → không gửi được. (Tùy chọn **[ghi 2]**: gửi thật 1 tin cho phiếu thu 30 % tới số nội bộ — tin trên điện thoại khớp bản xem trước, xác nhận giới hạn 30 ký tự.)
14. Giao hàng: phiếu thử nội bộ có 2 đợt đã xác nhận → nút "Hủy xác nhận đợt 1" (amber) → hộp liệt kê ngày/người ký sẽ xóa, "Hoàn tất → Đang giao (còn 1 đợt đã giao)" → nhập lý do (ít nhất 5 ký tự) → **[ghi 3]** xác nhận → thẻ phiếu "Đang giao", cột tiến độ "Giao 2 đợt"/"Chờ xác nhận", dòng "Đã hủy xác nhận … lý do …" hiện ngay dưới đợt (kiểm vị trí bằng mắt); SQL chỉ đọc `select created_at, user_id, data->'before'->'cacDotGiao' as truoc, data->'after' as sau from audit_logs where entity_id = '<id>' order by created_at desc limit 1;` → ngày và người ký cũ nằm trong `truoc`. Đăng nhập bằng một vai trò không có quyền sửa phiếu giao: không thấy nút "Xác nhận giao Đợt n" lẫn "Hủy xác nhận đợt n". (Nếu ghi thất bại, hộp vẫn đóng và phải gõ lại lý do.)
15. **Chỉ mở xem, đừng bấm Lưu.** Thanh toán › "Thanh toán mới" từ báo giá, và nút "Tạo Thanh Toán" trên dòng hợp đồng chưa có phiếu thu: ô Thực thu trống, trạng thái "Chưa TT", dòng "Còn phải thu: … ₫ — nhập số thực thu" (chỉ hiện khi phiếu **chưa lưu**; mở lại phiếu đã lưu thì không còn); báo giá đã có phiếu thu khác đã thu tiền → phiếu mới vẫn "Chưa TT", số tiền trống; nút trên dòng hợp đồng đã có phiếu thu → báo "… Mỗi hợp đồng chỉ tạo 1 phiếu thu …".
16. **Chỉ mở xem, đừng bấm Lưu** — trừ phép thử bị chặn dưới đây (nên làm trên hợp đồng thử nội bộ). Hợp đồng chưa có phiếu thu → "+ Phiếu giao": công tắc đặc cách **tắt**, không có người duyệt/lý do điền sẵn, dòng nhắc amber; bật đặc cách mà chưa chọn người duyệt rồi bấm Lưu → **đạt khi không lưu được**, có câu nêu người duyệt (nếu lưu được: dừng, báo IT). Luật này áp khi lập phiếu giao **mới**; mở sửa một phiếu giao cũ không bị chặn. Kiểm thêm ở hai lối vào còn lại (nút tạo phiếu giao trong ngăn phiếu thu; form "Lập phiếu giao" khi chọn hợp đồng hoặc phiếu thu): đặc cách cũ do máy tự điền ở phiếu giao trước ("Ban Giám Đốc" hoặc câu lý do của mã cũ) không được chép sang. Số liệu để đối chiếu (SQL chỉ đọc): `select count(*) from deliveries where deleted_at is null and data->>'dacCachGiaoTruoc' = 'true' and (trim(data->>'nguoiPheDuyetDacCach') = 'Ban Giám Đốc' or data->>'lyDoDacCach' in ('Giao hàng trước thanh toán theo phê duyệt của Lãnh đạo', 'Kế thừa Đặc cách Ban Giám Đốc từ đợt giao trước', 'Kế thừa Đặc cách Ban Giám Đốc từ đơn hàng'));` (phiếu mang đặc cách tự điền cũ) và `select count(*) from deliveries where deleted_at is null and coalesce(nullif(contract_id, ''), nullif(data->>'contractId', '')) is not null and coalesce(nullif(payment_id, ''), nullif(data->>'paymentId', '')) is null and coalesce(data->>'dacCachGiaoTruoc', 'false') <> 'true';` (phiếu giao theo hợp đồng không phiếu thu, không đặc cách — so với số dòng `[GH02 report-only]` trong Render › Logs trước khi bật `block`).
17. **Chỉ mở xem, đừng bấm Xác nhận** — trừ phép thử ngày tương lai dưới đây (làm trên phiếu giao thử nội bộ). Giao hàng › "Xác nhận hoàn tất": ô ngày **trống** (xác nhận lại một đợt đã có ngày thì hiện đúng ngày đã ghi); lịch chọn ngày không cho chọn ngày sau hôm nay, nên gõ tay ngày mai rồi bấm Xác nhận → **đạt khi không lưu được** (có thể hiện "Ngày bàn giao không được sau hôm nay" hoặc thông báo riêng của Chrome); nút "Hôm nay"/"Hôm qua" điền đúng ngày Việt Nam (kiểm trước 7 giờ sáng nếu có thể; chỉ xem ngày được điền, không bấm Xác nhận).
18. Báo giá: dòng có trị giá ≥ 1 tỷ hiện đủ chữ số trên một dòng, rê chuột thấy số đầy đủ — kiểm dòng của báo cáo rà soát (STT 311, `BGM-2026-1344`) ở độ rộng cột mặc định và khi thu hẹp cột; danh sách hợp đồng tương tự. Dòng phụ "11 Máy • 10 Phụ kiện" có thể bị cắt "…" ở độ rộng 170 px (rê chuột thấy đủ). Chưa thử trên Firefox/Safari.

**SQL (sau lượt 1 và 2), làm đúng theo `db/migrations/README.md`:** sao lưu → chạy `0001_…precheck.sql` từng truy vấn (truy vấn 1 phải trống; dán kết quả truy vấn 2–4 vào đây: quyền hiện có của `anon`/`authenticated` theo từng bảng, hai cờ quyền chạy hai hàm (trước 0001 mong đợi `true, true`) và danh sách `id` trong `settings`; precheck không cho biết chủ bảng hay quyền cấp cho PUBLIC — vấn đề về chủ bảng hoặc quyền PUBLIC chỉ lộ ra ở bước thử bị từ chối, khi một dòng thử không báo `permission denied`) → `0001_….sql` **[ghi: đổi quyền CSDL]** → kiểm quyền (truy vấn quyền theo ba loại bảng; truy vấn hai hàm ra `false, false, true, false, false, true`) → thử bị từ chối trong SQL editor, mỗi dòng trong `begin; set local role …; …; rollback;` → phải báo `permission denied` mã `42501` (hiện "Success. No rows returned" = 0001 chưa có hiệu lực: dừng, báo người soạn) → thử qua API bằng `curl.exe` với `<KHÓA_ANON>`: xóa `quotations` → **401** kèm `"code":"42501"` (không phải 403), đọc `zns_messages` → `200` → kiểm trên ứng dụng theo bước 8 của README **[ghi: nháp, thông báo, khách thử, một tin ZNS]** (mở rồi đóng form sửa ở năm loại chứng từ, Console không có "Failed to release lock"; nháp; thông báo; tạo rồi xóa khách thử; một tin ZNS) → dán kết quả vào đây; kiểm lại sau 24 giờ (Render › Logs không có `permission denied`). Sau 0001, `scripts/verify-zns-hub-fix.cjs` sẽ lỗi ở **dòng 35** (ghi thử `zns_messages` bằng khóa công khai; lỗi không được kiểm nên script chạy tiếp mà không có dòng mẫu) và **dòng 99** (xóa `zns_messages` bằng khóa công khai) — đúng ý, đừng dùng script này để kiểm. Sau khi mục 12 đạt: chạy `0002_….sql` **[ghi: sửa dòng cấu hình Zalo, có dòng sao lưu]** theo README (kiểm trước: chỉ một dòng `zns_config` với `con_lop_long` = `true`; kiểm sau: hai dòng đúng giá trị README nêu) → Vendor & Webhook "Kiểm tra kết nối Zalo OpenAPI" **[ghi: đổi mã làm mới]** → "Lưu toàn bộ cấu hình" **[ghi]** → **[ghi]** một tin ZNS lẻ tới số nội bộ; rồi mới làm B6. Hoàn tác (nếu cần) **[ghi]**: `0001_…rollback.sql` / `0002_…rollback.sql` theo README — hoàn tác 0002 giữ các khóa Zalo đang dùng; không bao giờ khôi phục cả cơ sở dữ liệu.

### 8.7 Phần còn mở (không được hiểu là "đã an toàn")

- Tới B2: `/api/zns/send` (gửi tin tính phí tới số bất kỳ), `DELETE /api/customers/:id` (xóa khách chưa có chứng từ, danh tính từ `userId`), `POST /api/reports/flush`, `/api/customers/check-duplicate` và mọi `/api` khác vẫn gọi được **không cần đăng nhập**; chốt 409/422 mới là kiểm tra dữ liệu, không phải kiểm soát truy cập. Vai trò của người dùng Supabase Auth vẫn là `admin` trong `verifyIdToken` (B1).
- Tới B3: trước khi chạy 0001, khóa anon **đọc, sửa và xóa cứng** được mọi bảng. Sau 0001: vẫn **đọc** được mọi bảng (gồm `users` có mật khẩu và `settings` có khóa Zalo); vẫn **thêm và sửa** được 6 bảng nghiệp vụ và nhật ký cùng `users`, `settings`, `zns_templates`, `notifications`, `drafts`, `presence`; chỉ còn **xóa cứng** được 6 bảng sau cùng này; mất quyền ghi ở 11 bảng chỉ máy chủ ghi. Mật khẩu vẫn đi qua mạng tới trình duyệt (B1). Che khóa ở API không chặn người cầm khóa anon đọc `settings`.
- Khóa anon và chuỗi mã quản trị cũ **vẫn nằm trong lịch sử git** của kho từng công khai → B6 đổi khóa Supabase, Zalo, `CRON_SECRET`.
- Tab trình duyệt cũ giữ hành vi cũ (nút "Sửa" một-cú-bấm ghi thẳng Supabase, điền sẵn 100 %, tự bật đặc cách, dòng gợi ý đăng nhập) cho tới Bước 0.
- Ghi chú hoạt động từ trình duyệt vẫn mất (HT02); tab "Nhật ký & Hoạt động" chưa hiện bảng trước/sau của dòng máy chủ.
- Làm mới mã Zalo thất bại chỉ được **ghi log** trên Render (và hiện lỗi khi bấm "Kiểm tra kết nối"); không ai được báo tự động cho tới khi có kênh (MC07/Đợt 0B) — ZNS Hub cần được xem sau mỗi lần triển khai.
- Việc 29 chưa làm: cửa hậu `admin`/mật khẩu mặc định vẫn còn cho tới khi A2 được xác nhận.
- Dữ liệu khách vẫn lộ ở chỗ khác (B2/B3): router thống kê/báo cáo chưa cần đăng nhập (gồm `/webhook`, `/recalculate`, `/custom-task`); `/api/analytics/today` vẫn trả tên khách ở `actionItems`; `/api/reports/full-data` trả 50 ký tự đầu của lỗi gửi; `POST /api/zns/preview` trả nguyên dữ liệu chứng từ, kể cả ghi chú nội bộ; khóa anon đọc thẳng số điện thoại ở `zns_messages` và `metrics_rollup` (chính sách công khai `FOR ALL USING (true)`), các bản thống kê ngày cũ vẫn giữ số điện thoại; dòng `zns_config` và dòng sao lưu `zns_config__bak_0002` (sau 0002) đọc được bằng khóa anon tới đợt bảo mật sau.
- "Ghi chú nội bộ không tới nhà cung cấp" chỉ chắc chắn cho biến `ghi_chu` và đường `/api/zns/send`: trên đường này `lyDoDacCach`, `logTomTat`, `cacDotThu[].soChungTuThamChieu` vẫn theo `row_data` tới webhook CNV; ở các đường gửi khác (dự phòng HYBRID → CNV, `EntityEventsHandler` đang tắt) builder còn gửi cả `ghiChu`/`note` thô. Đường Zalo chính thức chỉ gửi tham số của mẫu.
- Luật đặc cách của máy chủ chỉ chạy khi **tạo** phiếu giao: sửa phiếu (`PUT /api/workflow/update`) và đợt 2 trở đi (thêm bằng cập nhật) không qua luật "đặc cách cần người duyệt và lý do"; cổng `canCreateDelivery` vẫn nhận cờ đặc cách của phiếu thu không có người duyệt (GH20); luật "hợp đồng chưa có phiếu thu" chỉ xét `contractId` (đơn chỉ có báo giá lọt qua khi bật `block`, GH12).
- Lưu cấu hình ZNS đúng lúc máy chủ đang làm mới mã Zalo vẫn có thể ghi lại mã làm mới đã dùng (lệnh ghi gộp cả khối JSON; khóa chỉ che việc làm mới) → B3/MC sửa bằng gộp JSONB phía SQL. Khi CSDL báo lỗi dạng `{ error }` thay vì ném lỗi, máy chủ vẫn trả 409 "chưa ghi nhận khoản thu nào" (không gửi tin) thay vì 503 — nhân viên có thể ghi thêm một đợt thu trùng. Ô bí mật trên trang Vendor & Webhook để trống nghĩa là giữ nguyên, nên không còn xóa được một khóa đã lưu từ giao diện.
- Sửa hồ sơ hoặc màn chào mừng (`setUser` ghi đè cả khối `data`) có thể xóa mật khẩu đã lưu của người đó → người đó không đăng nhập được nữa (có từ trước, B1); dòng `admin` trong bảng `users` chưa có mật khẩu lưu (vẫn vào bằng cặp dựng sẵn tới Việc 29).
- Gửi tin cho một đợt cụ thể, khi thành công, vẫn ghi đè danh sách đợt thu bằng bản đang mở trên màn hình (có từ trước; nên đánh dấu ở máy chủ — Đợt 0B/1). Sau một lần hủy xác nhận bị từ chối, ngăn chi tiết không tự tải lại (vẫn hiện "Đã giao" và nút) cho tới khi mở lại.
- Nút "Tạo Thanh Toán" trên dòng hợp đồng im lặng khi mất mạng (lỗi kiểm cổng không được bắt); ngày của phiếu thu dựng từ hợp đồng lấy theo giờ UTC (00:00–06:59 giờ Việt Nam ra ngày hôm qua); lưu phiếu thu từ hợp đồng bị lỗi thì ngăn vẫn đóng và mất phần đã gõ (có từ trước); nút ⚡100 % và chọn "Tất toán" điền cả tổng tiền, không trừ phần đã thu ở phiếu khác (có từ trước).
- Trạng thái hủy của phiếu giao ghi không thống nhất (`HUY`/`HỦY`/`Hủy`): phiếu hủy từ giao diện (`HUY`) vẫn được tính vào số đợt và số lượng đã giao (có từ trước).
- Ô ngày bàn giao chưa có luật định dạng: chuỗi ngày lạ (ví dụ năm 5 chữ số) chỉ bị trình duyệt chặn. Ở độ rộng cột 170 px, dòng phụ "11 Máy • 10 Phụ kiện" bị cắt "…" (rê chuột thấy đủ).

### 8.8 Lưu ý vận hành

- Lên bản ngoài giờ, máy chủ + giao diện cùng một lần; **Bước 0** (mọi người đóng hẳn tab SGM OS rồi mở lại, xác nhận theo tên).
- Render › Environment trước khi deploy: `NODE_ENV=production`, `DEV_BYPASS_AUTH` khác `true`, `CRON_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `APP_URL`, `TZ`. `DELIVERY_UNPAID_CONTRACT_GUARD`: chưa đặt (= chỉ ghi nhận); sau 2–3 ngày đọc Render › Logs tìm `[GH02 report-only]`, không có dương tính giả thì đặt `block` và deploy lại. `PAYMENT_NOTE_GUARD`: chưa đặt (= chặn 409 câu "Tất toán…" cho phiếu chưa thu đủ); chỉ đặt `report` nếu nhân viên bị chặn oan trên phiếu đã thu đủ thật (khi đó đọc `[TT01 report-only]` trong Logs). **Không** đặt `ZALO_ACCESS_TOKEN`/`ZALO_TOKEN_EXPIRES_AT` trên Render: khi ô trong CSDL trống, máy chủ lấy giá trị ở đây, nên một mã cũ đặt ở đây sẽ thắng.
- **Trước khi lên bản** (SQL chỉ đọc, chỉ in mã và tên đăng nhập): `select id, username from public.users where username !~ '^[a-z0-9._-]{1,64}$' or id !~ '^[a-z0-9._-]{1,64}$' or id <> username;` → mong đợi không dòng nào. Sau khi lên bản, tài khoản có tên ngoài mẫu (chữ thường, số, `.`, `_`, `-`, tối đa 64 ký tự) hoặc có `id` khác tên đăng nhập sẽ không đăng nhập qua bảng `users` được nữa; có dòng thì báo IT sửa trước.
- Máy phát triển: `DEV_BYPASS_AUTH=true` chỉ còn tác dụng khi `.env` của máy có `NODE_ENV=development` (hiện `.env` ghi `production`, Vite có nhắc khi build).
- Gỡ lệnh dặn ở mục 0.4 của kế hoạch tổng thể sau Bước 0: dòng 105 (Vendor & Webhook), 108 (tin thanh toán), 109 (đặc cách); dòng 104 **viết lại** thành: "Trên đợt đã giao, nút 'Hủy xác nhận đợt' chỉ dùng khi thật sự cần và phải ghi lý do; ngày giao và người ký cũ được giữ trong lịch sử của đợt."
- Trước khi commit tài liệu (`docs/superpowers`): kho phải riêng tư; quét và thay chuỗi mã quản trị cũ trong kế hoạch lô 1 bằng chỗ giữ (5 chỗ, tồn đọng lô 1 dòng 18). Quét theo tên tệp ngày 12/10/2026: chuỗi còn ở 9 tệp tài liệu chưa commit (danh sách ở 8.9); bản dựng trong `dist/` sau lần build của cổng này không còn chuỗi đó; Bước 6 của Việc 28 chưa làm.
- A2 (Việc 29): chỉ triển khai sau khi xác nhận mật khẩu Administrator thật, có tài khoản Administrator dự phòng, dòng `admin` có mật khẩu lưu; triển khai **một mình**; đường lui Render › Rollback. Sau mọi lần Rollback hoặc deploy lại, làm lại mục 1 của 8.6 (khóa `db` của `/api/health`) trước khi chạy bất kỳ lệnh nào khác của 8.6.
- Nghiệm thu dữ liệu thật của lô 2 (mục 7.6) làm cùng phiên với mục 8.6.

### 8.9 Ghi chú

**(i) Khi chạy cổng**

- Cổng xanh ngay lần chạy đầu: không ca nào lỗi, không lỗi tsc mới, không dòng grep ngoài danh sách được phép, không ảnh chụp đổi → không việc nào phải trả lại. Không chạy lại spec nào vì nghi chập chờn.
- 1107 passed so với ≈ 968 của công thức: +139 là các ca thêm trong vòng sửa sau rà soát (bảng 8.2); công thức của kế hoạch là ước tính (A10).
- Bước 3: 76 passed (5 + 19 + 52) thay vì 5 + 13 + 15 — `zns.routes.config.spec.ts` 13 → 19 (+3 ở `670626b`, +3 ở `339b1f0`), `zns.routes.payment-gate.spec.ts` 15 → 52 (+1 khi làm Việc 9, +36 qua ba vòng sửa); `zns.routes.lock.spec.ts` vẫn 5.
- tsc: `DrawerStackContext.tsx` dịch +2 dòng vì hai dòng import được phép của Việc 16 (P11); `DeliveryDetailDrawer.tsx` dịch −14 vì Việc 15 sửa phần phía trên.
- eslint toàn kho giảm 16 errors (kế hoạch chỉ đòi "dưới 164"); chín dòng lỗi cũ của `--quiet` mang số dòng mới (bảng 8.3).
- Build: 3082 module (+8 so với lô 2, đúng tám tệp mới phía giao diện); `BulkActionsMenu.tsx` bị xóa vốn không nằm trong bản dựng. Vite vẫn nhắc `.env` có `NODE_ENV=production` (có từ trước, không đụng `.env`).
- Grep: lệnh 1 và 2 chạy với `-l` (chỉ tên tệp), lệnh 1 đọc chuỗi từ hằng `LEGACY_DEV_TOKEN` vào biến, không in ra; P5/P8/P9 áp dụng; lệnh 4 có thêm hai dòng hằng lọc dữ liệu cũ của Việc 21 (`DeliveryFormHelpers.ts:82-83`), đúng điều chỉnh của điều phối viên.
- Nhật ký kiểm thử: 22 dòng "Running with mock fallback backend client", 0 dòng `supabase.co`; một cảnh báo của Node 25 (`--localstorage-file` không có đường dẫn) khi chạy spec jsdom — vô hại (A20).
- Số ca theo tệp ở HEAD lấy bằng `npx vitest list` (chỉ thu thập tên ca); lần chạy toàn bộ duy nhất của lô là lần ở 8.1.
- Tệp `.snap`: không cập nhật tệp nào; Việc 19, 21, 23 chạy ảnh chụp không `-u` và không đổi.
- Bước 6 (thay chuỗi mã quản trị cũ trong tài liệu): **bỏ qua** vì kho còn công khai; tài liệu ngoài báo cáo này giữ chưa commit. Chín tệp chưa commit còn chuỗi đó (quét theo tên tệp, không in giá trị): `docs/superpowers/audits/2026-10-09-ra-soat-toan-dien-ung-dung.md`; `docs/superpowers/plans/2026-10-09-dot-0a-lo-1-tat-chuc-nang-nguy-hiem.md`, `2026-10-09-dot-0a-lo-1-ton-dong-sau-ra-soat.md`, `2026-10-09-ke-hoach-tong-the-nang-cap-sgm-os.md`; `docs/superpowers/plans/phu-luc-2026-10-09/00-yeu-cau-va-quyet-dinh-da-chot.md`, `02-bao-mat-dot-0.md`, `03-cong-tra-cuu-va-bao-gia-theo-mau.md`, `06-du-lieu-khach-hang.md`; `docs/superpowers/specs/2026-10-09-gop-khach-dong-bo-zns-hang-loat-de-xuat.md`. Báo cáo này không chứa chuỗi đó.
- Danh sách quyết định dưới đây: 56 dòng "Ruling" điều phối viên trích từ sổ theo dõi, cộng 1 dòng của Việc 27 (ghi vào sổ sau khi trích).
- Rà soát báo cáo, vòng sửa 1: mục 1 của 8.6 giờ là kiểm tra `/api/health` (trước là mục 10; các mục 1–9 cũ thành 2–10) và mọi mục khác chỉ làm khi mục 1 trả `"db":"service-role"`; lệnh xóa thử dùng mã không tồn tại `__probe__`; mọi thao tác có tác dụng thật được gắn nhãn **[ghi …]**/**[gửi thật …]**; truy vấn tên đăng nhập chuyển sang 8.8 (trước khi lên bản); sửa số dòng ở 8.3 và số việc khớp kế hoạch ở 8.2.

**(ii) Quyết định của điều phối viên trong lượt chạy** (mỗi dòng: đã quyết gì — vì sao — nếu sai thì tốn gì; commit thực hiện trong ngoặc)

_Trước khi chạy:_
- Dòng ghi công `Co-Authored-By: Claude Opus 5.5` thay dòng Fable 5.1 của kế hoạch — phiên đã chuyển sang Opus 5.5 và hướng dẫn ghi công hiện hành nói vậy, chủ sở hữu không có quy tắc riêng — sai thì sửa dòng ghi công trước khi gộp (chỉ hình thức).
- "Hãy bắt đầu thực hiện" chưa trả lời điểm 12 (a)–(k) và bước chuẩn bị 1–7 → làm theo mặc định đã ghi của kế hoạch (quy ước hậu tố; `DELIVERY_UNPAID_CONTRACT_GUARD` chỉ ghi nhận; `PAYMENT_NOTE_GUARD` chặn; luật N; "Dứt điểm" giữ nguyên; làm mới mã Zalo lỗi chỉ ghi log; `/api/health` công bố chế độ CSDL; cho hủy xác nhận kèm câu nhắc; thông báo đăng nhập chung; Q1–Q4 của 0001 theo khuyến nghị; `ghi_chu` tối đa 30 ký tự) — mỗi mặc định đổi được bằng một commit nhỏ — sai thì mỗi quyết định chủ sở hữu đổi tốn một commit.
- Không làm Việc 29 (gỡ tài khoản `admin` dựng sẵn) — chờ A2 (chủ sở hữu xác nhận mật khẩu Administrator thật) — sai thì không tốn gì (việc vẫn chờ; cửa hậu còn tới A2).
- Không đẩy commit lô 3 lên kho chung, không deploy; SQL 0001/0002 chỉ soạn và kiểm tĩnh, không chạy — kho còn công khai, commit mô tả lỗ hổng — sai thì không tốn gì.
- Rà soát trước khi chạy giao một tác tử chỉ đọc (opus) đọc 28 tệp giao việc vì kế hoạch dài khoảng 7.100 dòng; điều phối viên duyệt bảng và ra mọi quyết định — sai thì xung đột bị sót lộ ra ở vòng duyệt từng việc.

_Rà soát trước (P1–P17):_
- P1 (Việc 6/7/9/28): bộ giả lập dùng chung khai báo `const znsHarness = vi.hoisted(...)` rồi `export { znsHarness };` ở dòng cuối, dự phòng là `vi.mock` trong từng spec — vitest 4.1.9 từ chối `export const x = vi.hoisted()` — sai thì dùng đường dự phòng.
- P2 (Việc 24): kiểm "vai trò được bảo vệ" chỉ áp cho câu REVOKE; SQL phải GRANT EXECUTE cho `service_role`, có ca kiểm riêng — không tốn gì.
- P3 (Việc 3): `collection: vi.fn((_name: string) => makeQuery())` trong hai khối hoisted — `vi.fn(() => …)` gây TS2493, phá cổng tsc — không tốn gì.
- P4 (Việc 9): thêm `vi` vào dòng import của spec — không thì TS2304 — không tốn gì.
- P5 (Việc 16/28): mẫu grep "tất toán 100% hợp đồng" (-i) — mẫu cũ khớp cả nhãn giao diện không liên quan — không tốn gì.
- P6 (Việc 16): `ZnsOfficialPhonePreview.tsx` hiện `renderHighlighted('ghi_chu', values.ghi_chu)` (không đọc ghi chú nội bộ, không bịa câu, mặc định `---`) — bản xem trước phải khớp tin gửi và không lộ ghi chú nội bộ (TT01) — sai thì màn điện thoại hiện `---` thay vì câu bịa khi ô trống (khi đó cũng không gửi được).
- P7 (Việc 18): kết quả grep chỉ còn `PaymentDetailDrawer.tsx` (nhãn công nợ "✓ Tất toán 100%", không phải tin gửi khách) — không tốn gì.
- P8 (Việc 21/28): giữ hai chỗ hiển thị `|| 'Ban Giám Đốc'` cho đặc cách đã ghi nhận (`billing/ui/columns.config.tsx` ~436, `PaymentDetailDrawer.tsx` ~343), lệnh grep 4 loại spec — không phải điền sẵn; 3 phiếu đặc cách thật đều có người duyệt thật và đặc cách mới không lưu được khi thiếu người duyệt (form + 422) — sai thì một đặc cách cũ thiếu người duyệt sẽ hiện "Ban Giám Đốc" (chưa thấy trường hợp nào); để Đợt 1.
- P9 (Việc 3/28): chú thích của hook viết thành "/create/auditLogs" (bỏ tiền tố "/api/workflow") và loại spec khỏi lệnh grep 5 — không tốn gì.
- P10 (Việc 21): "+ Phiếu giao" ở ngăn hợp đồng chỉ chạy chốt quy trình khi có phiếu thu (như cũ); hợp đồng chưa có phiếu thu mở form với đặc cách tắt, không người duyệt/lý do, có dòng nhắc; chặn bằng luật form + 422 `WAIVER_INCOMPLETE` + `CONTRACT_WITHOUT_RECEIPT` (chỉ ghi nhận tới khi bật `block`) — với chính sách cổng STRICT mặc định, mã của kế hoạch không bao giờ mở form (trái 8.6 mục 16 và trọng tâm rà soát 5); bản cuối của GH02 cần đăng nhập ở máy chủ (B2) — sai thì việc "luôn chạy chốt với hợp đồng chưa có phiếu thu" chờ tới B2; tới lúc đó giao trước vẫn cần đặc cách có người duyệt và lý do.
- P11 (Việc 16): cho phép đúng hai dòng import ở đầu `DrawerStackContext.tsx` ngoài khối `handleSendZns` — cả hai cần và chưa có — không tốn gì (ba lỗi TS2345 cũ dịch dòng).
- P12 (Việc 28): báo cáo cổng là tệp CRLF → nối mục 8 bằng CRLF và kiểm `git ls-files --eol` — không tốn gì.
- P13 (Việc 28): mục 8.4 ghi commit lô 3 mang dòng `Co-Authored-By: Claude Opus 5.5` (A1) — không tốn gì.
- P14 (mọi việc): bước RED chấm theo kết quả (ca dự đoán FAIL phải FAIL, ca dự đoán PASS phải PASS), lý do chỉ để tham khảo (A15) — vài lý do trong kế hoạch không chính xác dù kết quả đúng — không tốn gì.
- P15: grep của Việc 1 dùng `git grep --untracked` với chuỗi đọc vào biến trước Bước 3 (chỉ hai spec mới khớp); grep `.password` của Việc 11 chỉ còn `users.repo.ts`; số dòng của lỗi cũ được dịch (A17) — không tốn gì.
- P16: mọi việc chạy `npx tsc --noEmit` và `git ls-files --eol` trên tệp CRLF đã sửa (A16, kể cả Việc 10/25); điểm neo (c)–(f) của Việc 3 tìm theo đầu route (create 48, update 397, delete 487, restore 852) — không tốn gì.
- P17 (Việc 13): ô lỗi màu amber và dấu * bắt buộc `text-amber-600`, đỏ chỉ ở nút xác nhận cuối — theo quy tắc của kế hoạch — chỉ hình thức.

_Việc 1:_
- Thêm ca của người duyệt: cron `it.each(['test','staging',''])` với `CRON_SECRET=''`, `DEV_BYPASS_AUTH='false'`, `Bearer bat-ky` → 401, không gọi `processOutbox`; admin `it.each(['test','staging',''])` với `DEV_BYPASS_AUTH='true'` → `verifyIdToken('bat-ky')` = null (`878a8ca`) — dòng 207 của kế hoạch tổng thể "DEV_BYPASS_AUTH chỉ còn tác dụng trên máy phát triển" phải được kiểm thử ghim — sai thì thừa 6 ca kiểm thử.

_Việc 4:_
- Thêm hai ca dưới `DELIVERY_UNPAID_CONTRACT_GUARD=block`: hợp đồng + đặc cách hợp lệ + không phiếu thu → 200; hợp đồng + phiếu thu đã thu + không đặc cách → không phải `CONTRACT_WITHOUT_RECEIPT` (`25d349c`, không mã mới) — dương tính giả của luật (b) là rủi ro chính khi bật công tắc — sai thì thừa 2 ca.

_Việc 6:_
- Sửa ngay: `reset()` của bộ giả lập dùng `mockReset()` cho các hàm giả rồi gắn lại mặc định (`670626b`) — `vi.clearAllMocks` để rò cách cài đặt giữa các ca, mà Việc 7/9 dựa vào `reset()` — không tốn gì (chỉ kiểm thử).
- Gộp hai góp ý cùng hàm: nhánh 500 của ping thử không lặp `err.message` (lỗi của undici chứa cả địa chỉ đã lưu) → thân tiếng Việt cố định, mã `PING_FAILED`, chi tiết chỉ vào log; `isAllowedVendorUrl` từ chối địa chỉ có tên đăng nhập/mật khẩu và cổng khác ''/443 (+3 ca); thêm dòng đầu bộ giả lập nhắc `vi.mock` trong spec bị ghi đè (`670626b`) — phục vụ đúng giao diện của việc "trả { success, status, latencyMs, message }" — sai thì địa chỉ đã lưu có mật khẩu hoặc cổng riêng không ping được nữa.

_Việc 7:_
- Sửa cả ba mục quan trọng (`339b1f0`): kiểm tra Zalo thành công chỉ cập nhật phần đã đổi (làm trống hai ô bí mật, bật hai cờ "đã lưu", hạn mã từ phản hồi), không tải lại toàn trang; khóa "Lưu" khi đang kiểm tra; đọc lại khóa bên trong khóa chạy (tự động: dùng mã đang lưu nếu còn hạn, không thì làm mới bằng mã làm mới mới nhất; thủ công: form không có mã làm mới thì đọc mã đang lưu trong khóa) + 2 ca xen kẽ — mục tiêu của Z0.3/ZNS05 là kiểm tra rồi lưu không bao giờ mất hay dùng lại mã đã xoay — sai thì trang Vendor không đọc lại toàn bộ cấu hình sau khi kiểm tra.
- Gộp hai góp ý: spec của token manager giả lập logger, kiểm `logger.error` ở nhánh lỗi và ca `sendZaloAlert` ném lỗi; `POST /api/zns/config` đọc dòng trước, không đọc được mà thân không mang khóa mới → 503 `ZNS_CONFIG_UNREADABLE`, không ghi (`339b1f0`) — `DocRef.set(merge)` thành ghi đè toàn bộ khi lần đọc bên trong lỗi, có thể xóa khóa Zalo (kênh gửi duy nhất; mã làm mới không lấy lại được) — sai thì lần lưu đầu của một cài đặt mới phải kèm khóa Zalo; khe còn lại ghi cho B3/MC.

_Việc 8:_
- Phiếu chỉ có số tiền đầu phiếu + `installmentIndex === 0` = "Đợt 1" dựng sẵn (hợp lệ, số đợt 1, chỉ số null); chỉ số ≥ 1 vẫn `INVALID_INSTALLMENT`; thêm ca ghim nghĩa chỉ số thô khi `cacDotThu` không xếp thứ tự (`92477db`) — ngăn chi tiết và chốt máy chủ (Việc 9) cùng dựa vào — sai thì gửi cấp phiếu từ dòng dựng sẵn báo "đợt 1".

_Việc 9:_
- Thêm kiểm "lặp ghi chú nội bộ": ô Ghi chú trùng (sau chuẩn hóa NFC, cắt và gộp khoảng trắng, chữ thường) ghi chú nội bộ của phiếu hoặc của một đợt → thay bằng câu máy chủ, log `[TT01 echo]` (`1cfe2e1`) — yêu cầu ràng buộc của dòng 0A.5 — sai thì ghi chú nhân viên gõ tình cờ trùng ghi chú nội bộ bị thay bằng "Thanh toán đợt N".
- Gộp hai góp ý: câu cũ "Thanh toán đợt i+1 (Còn lại: …)" (> 30 ký tự) giữ đúng N đã gõ nếu N là đợt có tiền; lỗi đọc CSDL → 503 `PAYMENT_READ_FAILED` thay vì 409 "chưa ghi nhận khoản thu nào"; thêm ca phiếu xóa mềm (409) và phiếu chỉ có số tiền đầu phiếu với chỉ số 0 (200) (`1cfe2e1`) — tránh câu sai tới khách và hướng dẫn sai cho nhân viên — sai thì thêm một mã 503 vào bảng mã.
- Chỉ giữ N đã gõ với ghi chú dài hơn 30 ký tự; ≤ 30 ký tự giữ luật (4) (`b9bd0b7`) — không thì "Thanh toán đợt 1 - cọc" bị viết lại và tin khách nhận khác bản xem trước — không tốn gì.
- Phát hiện lặp ghi chú nội bộ thắng việc giữ N đã gõ (`b9bd0b7`) — không bao giờ lấy câu gửi khách từ ghi chú nội bộ — sai thì một ghi chú nội bộ dài bắt đầu bằng "Thanh toán đợt N" sẽ hiện N của đợt mới nhất.
- Coi việc ghi chú nội bộ lọt qua bản sao `data` lồng là thiếu sót của chính Việc 9 và sửa: gỡ cùng các khóa ghi chú trong `mergedPayload.data` (cả `cacDotThu[].ghiChu`) + ca với phiếu có đúng hình dạng thật; ghi chú lặp đúng ghi chú của một đợt có tiền → gửi "Thanh toán đợt N" của chính đợt đó (`2323e1a`) — luật (5) của chính việc — sai thì chỉ tốn đổi hai kỳ vọng kiểm thử.
- Ghi chú lặp mà cũng trùng ghi chú cấp phiếu → mơ hồ → dùng đợt có tiền mới nhất; thêm ca hình dạng DOT-1-INIT (`dc7fbb6`) — tab cũ gửi từ dòng 1 và từ chân ngăn không phân biệt được — sai thì gửi lại đợt 1 của những phiếu như vậy sẽ báo số đợt mới nhất.

_Chung (Việc 11, 16, 29):_
- Spec jsdom dùng `localStorage`/`sessionStorage` gắn bộ lưu thật của jsdom ngay sau các dòng import (A20) — máy của chủ sở hữu chạy Node 25, kiểm thử phải chạy được ở đó — sai thì thừa một dòng mỗi spec.

_Việc 11:_
- Grep `.password` còn khớp `zns.routes.ts` (kiểm `URL.password` trong luật ping của Việc 6) — đúng ý, không phải mật khẩu người dùng — không tốn gì.
- Ca 1 và 3 của `AuthContext.spec.tsx` tắt lượt làm mới nền (`mockResolvedValueOnce(leakyUser).mockResolvedValue(null)` và `mockResolvedValue(null)`), chứng minh mỗi ca hỏng khi tắt điểm gỡ mật khẩu tương ứng (`77cff39`) — ca phải ghim đúng điều tên ca nói — không tốn gì.

_Việc 12:_
- So id theo từng cặp (hai id cùng có thì phải bằng nhau; chỉ dùng số đợt khi một bên trống); nhánh dữ liệu cũ đòi PXK của đích bằng PXK của phiếu; so Đợt 2 với một bản mới và thêm ca đích cũ (lịch sử ghi giá trị đã lưu) (`1235f02`) — GH01 để chặn ghi đè không báo; trọng tâm rà soát 4 — sai thì hủy đợt của phiếu anh em từ dòng gộp bị từ chối "Không tìm thấy đợt giao" (phải hủy từ chính phiếu đó).
- Sau khi khớp, từ chối khi hai PXK cùng có mà khác nhau (PXK là danh tính của đợt trên giấy); ghim ca thành công ở chỉ số 1 chỉ xóa đúng đợt đó (`c15c884`) — lỗi gốc chưa đóng hẳn sau vòng 1 — sai thì một đợt đã bị sửa PXK sau khi lưu không hủy xác nhận được.

_Việc 13:_
- Trạng thái hiện tại đổi sang nhãn tiếng Việt qua `DeliveryStatusVO` ("Chưa rõ" khi trống) + ca `HOAN_TAT`, `DANG_GIAO`; Esc/bấm nền không hủy khi đang gửi; ca vẽ lại khi đợt không còn hợp lệ → nút xác nhận khóa (`9fed17b`) — quy tắc của chủ sở hữu: nhãn thường, không mã kỹ thuật — không tốn gì.

_Việc 14:_
- Bỏ mục đệm ngay trước khi đọc để `getById` đọc CSDL (lỗi hoặc null thì trả lại mục cũ rồi dùng nó); đổi mã lỗi sang câu tiếng Việt thường; một hàm lùi hợp đồng dùng chung cho cả hai nút, theo luật máy chủ (không đụng hợp đồng đã hủy; chỉ đổi trạng thái khi hợp đồng đang hoàn tất; cờ giao hàng HOAN_TAT → DANG_GIAO); không ghi nhật ký từ trình duyệt (`8b87c4e`) — trọng tâm rà soát 4 + "không mã kỹ thuật" — sai thì thêm một lượt đọc CSDL mỗi lần hủy và luật hợp đồng của nút hủy cấp phiếu đổi (hợp đồng đã hủy không còn bị mở lại).

_Việc 16:_
- Việc ghi "đã gửi" cho từng đợt vẫn theo đúng chỉ số người dùng chọn như trước (chỉ số thô trong trạng thái xem trước; chỉ số đã giải chỉ gửi lên máy chủ); thêm ca ghi chú 30 ký tự gửi được (`fbe5376`) — gỡ rủi ro mất dữ liệu mới và làm ba nơi gửi nhất quán lại — sai thì gửi cấp phiếu không đánh dấu dòng đợt nào (như trước; trạng thái cấp phiếu vẫn hiện đã gửi).

_Việc 17+18:_
- Giao Việc 17 và 18 cho một người làm, hai commit nối tiếp, một lượt duyệt — hai việc nhỏ liền nhau cùng sửa `zns-universal-preview-matrix.spec.ts` — sai thì một phát hiện ở việc này buộc vòng sửa phủ cả hai.
- Thêm ca hành vi cho builder (giả lập `templateRendererService.render`): chỉ có ghi chú nội bộ → `ghi_chu` trung tính; ô đã gõ giữ nguyên; `ghiChu`/`note`/`ghiChuNoiBo` không bao giờ tới `ghi_chu`; giữ bẫy dạng chữ nhưng sửa chú thích; vendor cắt khoảng trắng và dùng câu dự phòng khi trống; ghim registry vào `PAYMENT_ZNS_NOTE_MAX` (`ccf82a4`) — bẫy dạng chữ sót nhiều đột biến — không tốn gì.

_Việc 19:_
- Phương án (b): bộ điều phối trạng thái dừng sớm với phiếu mới có số tiền trống/0 + ca có phiếu thu khác của cùng báo giá đã thu → vẫn "Chưa TT", số tiền trống; gắn kiểm dòng gợi ý vào `data-testid="con-phai-thu"`; gợi ý "Còn phải thu" chỉ hiện khi đang lập phiếu (`81ecadf`) — câu nghiệm thu của dòng 0A.7 — sai thì phiếu mới không tự suy trạng thái cho tới khi gõ số tiền.
- Tín hiệu "phiếu mới" là "chưa lưu" (`!payment?.id`), không phải `isNew` — Việc 20 mở cùng ngăn với phiếu dựng từ hợp đồng (chưa có id); thêm ca cho đường đó (`81ecadf`) — sai thì nơi gọi truyền phiếu chưa lưu, số tiền trống giữ trạng thái đã truyền tới khi gõ số tiền (có chủ đích).
- Chấp nhận phần thêm của người làm: phiếu chưa lưu, chưa có số tiền mà trạng thái khác "Chưa TT" (sau nhánh "Miễn phí") được đưa về "Chưa TT" (`81ecadf`) — không thì chọn "Tất toán" trước khi chọn chứng từ để lại "Tất toán" 0 đ — sai thì một trạng thái chọn có chủ đích trên phiếu chưa lưu 0 đ bị đặt lại (trước lô này cũng vậy).

_Việc 21:_
- Chấp nhận khung hằng số ổn định trong `useDeliveryForm.waiver.spec.ts` (`4591915`) — spec nguyên văn không chạy được (vẽ lại vô hạn → hết bộ nhớ), assertion và giả lập không đổi — không tốn gì.
- (1) Đặc cách do mã cũ tự điền (người duyệt "Ban Giám Đốc" hoặc ba câu lý do mã cũ) không tính là đã ghi nhận nên không kế thừa; (2) luật hợp đồng chưa có phiếu thu chỉ áp phiếu giao mới (`!delivery?.id`); (3) phiếu giao đã hủy không làm nguồn đặc cách; (4) ngăn hợp đồng truyền nguồn theo thứ tự [phiếu thu, hợp đồng] (`759f58c`) — nguyên tắc 2 + nghiệm thu GH02 "không tự bật đặc cách" trên dữ liệu thật; luật máy chủ chỉ ở bước tạo và chỉ ghi nhận — sai thì đặc cách cố ý ghi "Ban Giám Đốc" phải chọn lại ở đợt sau, và sửa phiếu giao cũ không phiếu thu/đặc cách không bị form kiểm (như trước lô này).
- Bộ giải đặc cách tự bỏ phiếu giao trước đã hủy bằng `isDeliveryCancelled` (nhận `HUY`/`HỦY`/`Hủy`/`CANCELLED`); bộ lọc đếm đợt của hook giữ nguyên (`268ad5f`) — vòng 1 chỉ nêu 'HỦY', sót cách ghi 'HUY' của ứng dụng — không tốn gì ngoài một vòng sửa nhỏ.

_Việc 24 → 25:_
- Gộp hai góp ý của Việc 24 vào Việc 25: thêm `.gitattributes` một dòng `db/migrations/** text eol=lf`; khẳng định tệp kiểm tra trước của 0001 không có từ khóa ghi/DDL/giao dịch (bỏ phần trong dấu nháy) (`f1eeb9d`) — kiểm không-CRLF sẽ hỏng trên bản checkout Windows mới, còn phép kiểm cũ chấp nhận cả DELETE/DROP/GRANT — không tốn gì.

_Việc 26:_
- Spec khẳng định `HARD_DELETE_FORBIDDEN_TABLES` = nhóm A ∪ B nhập từ `src/tests/db-migrations/sql-grants.ts` (`0098b07`) — danh sách cấm của trình duyệt và ma trận SQL không lệch nhau — không tốn gì.

_Việc 25:_
- Dòng sao lưu của 0002 dùng `ON CONFLICT (id) DO NOTHING` (giữ bản đầu); README dặn chạy 0002 một lần; spec ghim DO NOTHING, cấm DO UPDATE (`851ed58`) — nguyên tắc 6 (sao lưu trước khi đổi, hoàn tác phải chạy được) thắng câu SQL nguyên văn — sai thì chạy lại sau hoàn tác + sửa cấu hình mà chưa dọn dòng sao lưu khiến lần hoàn tác sau trả về bản chụp lần đầu (README có cảnh báo).
- Sửa hai mục quan trọng và gộp góp ý cho chủ sở hữu (`bec57bb`): hoàn tác 0002 dùng `b.data || s.data` (chỉ đưa lại khóa đã gỡ, giữ mã đang dùng); thử bằng khóa anon qua API → 401 kèm `"code":"42501"`; mọi lệnh thử ghi chạy trong `begin; set local role …; …; rollback;`; truy vấn kiểm sẵn sàng với giá trị mong đợi; câu lệnh đổi tên/xóa dòng sao lưu; cách chạy một truy vấn; từ ngữ thường; không bao giờ bảo chủ sở hữu chép dòng `zns_config` — sổ tay là thứ chủ sở hữu làm theo trên CSDL thật — sai thì một diff README lớn hơn phải duyệt lại.
- Sửa ngay N-1…N-5 (`248c104`): chấp nhận dòng trạng thái HTTP/1.1; không bao giờ đưa chủ sở hữu tới khôi phục cả cơ sở dữ liệu; nói rõ một lệnh thử không bị từ chối trông thế nào; lời văn chính xác hơn — câu an toàn trên sổ tay dùng với CSDL thật — sai thì thêm một lượt duyệt lại nhỏ.

_Việc 27 (sổ theo dõi, ghi sau khi trích đầu vào):_
- Siết `resolveAdminDbMode`: `anon-fallback` cả khi biến khóa máy chủ trùng khóa anon, là JWT vai `anon` (chỉ giải mã, không kiểm chữ ký, không ghi log) hoặc là khóa công khai kiểu mới `sb_publishable_…`; `offline` khi không khóa nào dùng được; log khởi động phân biệt "thiếu" với "chứa khóa công khai", không in khóa, bỏ `audit_logs` khỏi câu log; ghi chú đồng bộ với dòng 11–15 (B3 phải sửa cả hai); spec thêm các ca này, biên 10/11 ký tự của khóa anon và ca log (`1fb7b6f`) — cờ health là đèn xanh/đỏ của chủ sở hữu trước SQL 0001, dán nhầm khóa anon là lỗi dễ gặp nhất — sai thì dạng khóa lạ được coi như trước (`service-role`), không thoái lui.
