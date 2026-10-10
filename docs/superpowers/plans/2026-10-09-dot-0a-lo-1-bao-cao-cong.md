# Báo cáo cổng cuối lô 1 – Đợt 0A (tắt chức năng nguy hiểm)

Ngày chạy: 10/10/2026. Nhánh `dot-0a-cam-mau`, HEAD khi chạy cổng: `22fcfe7` (19 commit kể từ `main` = `2b56114`). Không khởi động máy chủ. Toàn bộ kiểm thử chạy **offline** nhờ Việc 1 (bốn biến `test.env` = `offline` và `offline-guard.ts`); nhật ký các worker nạp client máy chủ đều ghi "Running with mock fallback backend client" (không worker nào có địa chỉ CSDL thật; `offline-guard.ts` dừng ngay nếu có).

## 1. Kết quả các cổng

| Cổng | Kết quả thực tế | Mong đợi |
|---|---|---|
| `npx vitest run` (toàn bộ, `CI=true`, không `-u`) | 105 tệp đạt; **686 passed, 5 skipped, 0 failed** (691 kiểm thử); 11,06 giây | 0 failed, 5 skipped, passed ≈ 679 ± 3 (xem mục 2) |
| `npx tsc --noEmit` | 7 lỗi, **giống hệt từng dòng** `baseline-tsc.txt` (cùng tệp, vị trí, mã lỗi) | bằng mốc (7) |
| `npx eslint .` | trước 3302 vấn đề (193 errors, 3109 warnings) → sau 3144 (**168 errors**, 2976 warnings); không tệp nào nhiều lỗi hơn mốc (−25 errors: 11 ở tệp đã sửa, 14 do xóa `BulkZnsModal`, `CustomerConsolidationModal`, spec cũ) | errors ≤ 193 |
| `npx eslint --quiet` trên 39 tệp `.ts/.tsx` thêm/sửa/đổi tên (trừ `scripts/`) | không in dòng nào, `eslint-exit=0` (0 errors; 207 warnings không tính) | rỗng, exit 0 |
| `npm run build` | `✓ built in 1.05s`, exit 0, 3073 module, không cảnh báo | "built in …" |
| `git grep` tổng (19 mẫu; `src`, `server.ts`) | 30 dòng ở 13 tệp, **tất cả thuộc danh sách cho phép** (mục 3) | chỉ danh sách cho phép |
| Ảnh chụp giao diện | `components.snapshot.spec.tsx` 7 passed; `git status --porcelain src/tests/__snapshots__` rỗng; không `.snap` nào đổi so với `main` | 7 passed; rỗng |

## 2. Đối chiếu số passed: 686 thực tế so với ≈ 679 của kế hoạch

Chênh +7 (vượt ±3) nên đối chiếu theo từng tệp spec đã thêm/xóa/sửa. Tổng kiểm thử khai báo tăng từ 667 (`main`: đếm tĩnh 663 từ `git show main:<tệp>` cộng 4 kiểm thử sinh bằng vòng lặp trong `vendor-webhook.handler.spec.ts`, tệp không đổi trên nhánh; không chạy `main`) lên 691 (HEAD = 686 passed + 5 skipped), tức +24 và bằng tổng chênh theo tệp:

| Tệp spec | main | HEAD | Chênh |
|---|---|---|---|
| `customer-consolidation-modal.spec.tsx` (xóa) | 9 | 0 | −9 |
| `customerConsolidationEngine.spec.ts` + `customerIdentityResolver.spec.ts` (nhận lại) | 5 + 9 | 10 + 10 | +6 |
| `bulk-zns-orchestrator.spec.tsx` (xóa) | 20 | 0 | −20 |
| `zns-chrono-and-status.spec.ts` (mới) | 0 | 9 | +9 |
| `CustomerCascadeImpactModal.spec.tsx` | 3 | 4 | +1 |
| `omni-sovereign-fabric-v39.spec.ts` | 7 | 6 | −1 |
| 11 spec mới (retired 7, cron 6, customer 6, workflow 2, zns 5, useMutation 1, form 1, contact **5**, hub 1, system 2, offline-guard 2) | 0 | 38 | +38 |
| `nexus-os.spec.ts` + `sovereign-mdm-nexus.spec.ts` | 9 + 13 | 9 + 13 | 0 (5 chuyển sang skipped) |
| Toàn bộ bộ kiểm thử (95 tệp ở `main`, 105 tệp ở HEAD; bằng tổng chênh các dòng trên) | 667 | 691 | **+24** |

Hai điểm lệch giữa công thức của kế hoạch và thực tế:

- **+5:** mốc 662 là số *passed* đo khi chạy offline lúc lập kế hoạch (667 khai báo trừ 5 kiểm thử lỗi offline: nexus-os 4, mdm 1, như kế hoạch Việc 1 ghi). Năm kiểm thử này vốn không nằm trong 662, nên bước "−5 skipped" trừ hai lần.
- **+2:** `CustomerZnsContactModal.spec.tsx` có 5 kiểm thử thay vì 3: commit `657fb01` (sửa sau rà soát Việc 11) thêm hai kiểm thử hồi quy (một đầu mối đang chờ Zalo không được chọn sẵn kể cả khi mặc định "chọn hết"; các đầu mối đã gửi xong vẫn chọn hết).

679 + 5 + 2 = 686, khớp số thực tế. Không có tệp đỏ nên không phải bọc thêm `it.skipIf(!HAS_REAL_DB)`.

## 3. Grep tổng: mọi dòng khớp đều được phép

| Tệp | Dòng | Lý do được phép |
|---|---|---|
| `src/backend/config/supabase.admin.ts:95`, `src/platform/data/schema.descriptor.ts:68` | 2 | một dòng ánh xạ `crossEntitySyncJobs` mỗi tệp (giữ theo Ràng buộc chung) |
| `src/backend/routes/retired.routes.ts:41` | 1 | chú thích của router chặn `/api/migration` |
| `cron.routes.ts:65`, `customer.routes.ts:77`, `workflow.routes.ts:27` | 3 | dòng stub trả mã cố định (`/preview`, `/trigger-sync`, `/reconcile-duplicates`); dòng cron có chú thích "màn đối soát CronPage đã xóa" |
| `cron.routes.lock.spec.ts` 3, `customer.routes.lock.spec.ts` 3, `workflow.routes.lock.spec.ts` 3, `zns.routes.lock.spec.ts` 6 | 15 | spec khẳng định đường đã khóa |
| `retired.routes.spec.ts` | 5 | các đường `/api/migration/*` |
| `useMutation.spec.ts` 2, `CustomerFormModal.spec.tsx` 2 | 4 | khẳng định vắng mặt `trigger-sync` / `crossEntitySyncJobs` |
| Cộng | 30 | |

`server.ts` và `zns-chrono-and-status.spec.ts` không khớp (lời chú thích đã chọn chữ để tránh mẫu); `zns.routes.ts`, `SystemPage.spec.tsx`, `ZnsHubTable.spec.tsx` cũng không có dòng khớp.

## 4. Danh sách commit (`git log --oneline main..dot-0a-cam-mau` tại HEAD `22fcfe7`: 19 commit)

```
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

Hai commit tiếp theo trên nhánh là chính báo cáo này và commit tài liệu kế hoạch/đặc tả/rà soát.

## 5. Nghiệm thu thủ công

_(chủ sở hữu/nhân viên IT, sau khi lên bản chạy thật **và xong bước 0**; chỉ thao tác đọc trừ mục 4 (hủy ở hộp cảnh báo, không lưu), 5 (ghi 1 hồ sơ khách thử) và 7–8)_

Điều kiện lên bản: máy chủ và bản giao diện lên **cùng một lần** (một commit, Render dựng `dist/` từ cùng mã); làm ngoài giờ. Như vậy vẫn **chưa đủ**: tab trình duyệt mở từ trước khi lên bản vẫn chạy giao diện cũ cho tới khi được tải lại, và hiện chưa có gì nhắc người dùng tải lại. Khóa ở máy chủ (kiểm ở mục 1–3) không chặn được ba việc sau của giao diện cũ, vì chúng không đi qua các đường đã khóa:

- **Gộp khách:** nút "Tiến Hành Gộp Nhóm MST" nhận 403 rồi tự chạy gộp dự phòng ngay trên trình duyệt: đánh dấu khách phụ đã gộp, đổi tên thành "[ĐÃ GỘP VÀO …]", chuyển báo giá, hợp đồng, phiếu thu, phiếu giao sang khách chính.
- **Đồng bộ chứng từ theo hồ sơ khách:** "1-Click Đồng bộ an toàn" (hộp Phân tích Tác động khi lưu khách) và "Đồng bộ chứng từ" (chân ngăn chi tiết khách) ghi đè tên, SĐT, địa chỉ, MST, người đại diện của khách lên báo giá, hợp đồng, phiếu thu, phiếu giao.
- **Gửi ZNS hàng loạt:** nút "Gửi ZNS Hàng Loạt" (trang Khách hàng và trang Báo giá) của bản cũ không hề gọi `/api/zns/bulk-send` (đường đã khóa) mà gọi `POST /api/zns/send` (đường gửi lẻ, vẫn mở) lần lượt cho từng người nhận, rồi ghi ngược `contacts`/`contactsZnsHistory` lên hồ sơ khách (gửi theo báo giá thì ghi trạng thái gửi lên báo giá).

Các lệnh ghi lên hồ sơ khách và chứng từ ở cả ba việc trên đi thẳng từ trình duyệt vào Supabase (khóa anon), không qua máy chủ; riêng lệnh gửi tin ở việc thứ ba đi qua `/api/zns/send`, là đường gửi lẻ vẫn mở.

**Bước 0 (bắt buộc, ngay sau khi lên bản):** mọi nhân viên bấm **Ctrl+F5** (hoặc đóng hẳn mọi tab SGM OS rồi mở lại). Cách xác nhận: IT gửi danh sách tên vào nhóm chat; từng người mở trang **Khách hàng**, thấy thanh công cụ **không còn nút "Gộp trùng MST"** (bản cũ luôn hiện nút này với mọi tài khoản; ô vàng "Trùng MST: N nhóm" của bản mới không phải nút đó) thì trả lời "đã tải lại"; còn thấy nút nghĩa là tab đó vẫn chạy bản cũ → Ctrl+F5 lại. Chưa đủ người xác nhận thì chưa tính là lên bản xong. Không dùng nhật ký truy cập thay cho bước này: tab cũ để yên thì không tải tệp nào nên không để lại dấu vết.

Đề xuất cho Đợt 0B: giao diện tự so mã bản dựng (build-id) với máy chủ và hiện băng "Tải lại để dùng phiên bản mới" khi hai bên lệch nhau.

1. `curl -i -X POST https://<host>/api/customers/merge -H "Content-Type: application/json" -d "{}"` → `HTTP/1.1 403`, thân JSON đúng bảng mã; lặp lại với `rollback-merge` (403), `GET merge-history` (403), `POST trigger-sync` (410).
2. `curl -i -X POST https://<host>/api/cron/sync-snapshots -H "Authorization: Bearer sgm_admin_dev_token"` → 410 (không còn 401/200 dù token nào); `POST /api/cron/preview` → 410.
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
