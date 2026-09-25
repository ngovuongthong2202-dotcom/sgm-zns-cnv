# CHUẨN KIẾN TRÚC & ĐẢM BẢO TUÂN THỦ (Conformance)
### SGM OS / ZNS-SGM — Enterprise Modular Monolith
### Áp dụng BẮT BUỘC cho cả 14 phase refactor

> Tài liệu này **chốt chuẩn** và **đảm bảo** kế hoạch 14 phase đi đúng mô hình bạn yêu cầu. Điểm điều chỉnh quan trọng: thống nhất tên 4 lớp theo chuẩn **Presentation / Application / Domain / Infrastructure** (lớp "ui" trong file 14-phase = **Presentation**). Hãy dùng tên này xuyên suốt.

---

## 1. MÔ HÌNH CHỐT (không bàn lại)

**Enterprise Modular Monolith** — KHÔNG phải microservices:
- ✅ **Một codebase** (một repo, một `package.json`).
- ✅ **Một app chính** (một entry: `src/app` bootstrap + `server.ts`).
- ✅ **Một nơi deploy chính** (một tiến trình Express phục vụ cả API lẫn web — như `server.ts` hiện tại). KHÔNG tách service riêng, KHÔNG message broker ngoài, KHÔNG nhiều deploy.
- ✅ Bên trong chia **module theo bounded context** rất rõ, ranh giới cứng bằng quy tắc import (ESLint), giao tiếp qua **public API + Domain Events** trong cùng tiến trình.

→ Lợi ích: rõ ràng & dễ bảo trì như "nhiều service" nhưng vận hành đơn giản như một app (đúng nhu cầu nội bộ doanh nghiệp, máy yếu, một nơi deploy).

---

## 2. CẤU TRÚC 4 LỚP CHUẨN (mỗi module)

Mỗi module tuân đúng 4 lớp, **phụ thuộc chỉ hướng VÀO TRONG** (Presentation → Application → Domain ← Infrastructure):

```
src/modules/<context>/
├─ presentation/      # GIAO DIỆN: React page/components/hooks + HTTP route (controller)
│                     #   → CHỈ gọi Application (use-case). KHÔNG logic nghiệp vụ. KHÔNG chạm Firestore/repo.
├─ application/       # ỨNG DỤNG: use-cases (Command/Query), điều phối Domain + Repository(interface) + phát Domain Event.
│                     #   → KHÔNG import Presentation. KHÔNG biết Firestore cụ thể (chỉ qua interface).
├─ domain/           # NGHIỆP VỤ THUẦN: Aggregate, Value Object, Domain Service, Repository INTERFACE (port), Domain Event.
│                     #   → KHÔNG import React/Firestore/UI/Infrastructure/Application. Thuần TypeScript.
├─ infrastructure/   # HẠ TẦNG: Repository Firestore (implements interface của Domain), vendor adapter (ZNS/CNV), event bus binding.
│                     #   → Mới được import Firestore/Admin SDK. Implements interface Domain.
└─ index.ts           # PUBLIC API của module: chỉ export use-case + type được phép dùng bởi module khác.
```

**Quy tắc phụ thuộc (luật bất di bất dịch):**
1. Presentation → Application → Domain. (một chiều)
2. Infrastructure → Domain (implements interface). Infrastructure KHÔNG bị Domain/Application import trực tiếp; được "tiêm" vào Application qua interface/factory.
3. Domain KHÔNG import bất cứ lớp nào khác, KHÔNG import `react`/`firebase`.
4. Module A dùng Module B **chỉ** qua `modules/B/index.ts` (public API) — CẤM import sâu `modules/B/domain/...`.
5. `platform/` (shared-kernel) KHÔNG import `modules/`.

Tầng dùng chung:
```
src/platform/         # shared-kernel: Value Object chung, AggregateRoot, DomainEvent, EventBus, base Repository, mapper, design-system primitives, widgets dùng chung.
src/app/              # bootstrap 1 app: routing, providers, layout, wiring EventBus + đăng ký handler.
backend/ (server.ts)  # 1 nơi deploy: mount HTTP route của presentation từng module.
```

---

## 3. MA TRẬN TRUY VẾT — 6 trụ cột × phase (đảm bảo không thiếu)

| Yêu cầu bạn nêu | Hiện thực ở đâu | Phase đảm bảo |
|---|---|---|
| **Modular Monolith** (1 codebase/app/deploy, chia module rõ) | `src/modules/<context>` + `index.ts` public API + ESLint zone; vẫn 1 `server.ts`, 1 build | P01 (skeleton) → P05–P10 (bóc module) → P14 (siết ranh giới "error") |
| **Clean Architecture** (Presentation/Application/Domain/Infrastructure) | 4 thư mục/lớp mỗi module + luật phụ thuộc một chiều | P04 (ports), P05 (khuôn 4 lớp), P06–P11 (áp cho mọi module), P14 (enforce) |
| **Practical DDD** (Aggregate, VO, Domain Service, Repo interface) | `domain/` của module + `platform/domain` (Money, PhoneNumber, BusinessKey, EntityRef) | P02 (VO), P05 (Aggregate mẫu), P07–P11 (aggregate từng module) |
| **Domain Events** (ghi nhận sự kiện nghiệp vụ) | `platform/events` EventBus + `workflowEvents` (log) + handler idempotent | P03 (bus + song song) → P11/P12 (thay đường cũ) → P14 (gỡ đường cũ) |
| **CQRS-lite cho báo cáo** (tách đọc báo cáo khỏi ghi chính) | Command side = use-case ghi; Query side = `modules/reporting` đọc projection (`metricsRollup`); projection cập nhật bởi event handler | P12 |
| **AI-ready Data Layer** (dữ liệu sạch sẵn cho AI) | `modules/reporting/ai` đọc read-model + event log có nhãn; gom `@google/genai` | P13 |

→ Mọi trụ cột đều có phase phụ trách. Không trụ cột nào bị bỏ sót.

---

## 4. ĐIỀU CHỈNH CẦN ÁP VÀO 14 PHASE (để đúng chuẩn)

Áp các điều chỉnh nhỏ sau khi chạy (bổ sung vào System Prompt / từng phase):
1. **Đổi tên lớp "ui" → "presentation"** trong mọi module (P05–P11). Cấu trúc mỗi module phải đúng 4 tên: `presentation / application / domain / infrastructure`.
2. **HTTP route thuộc Presentation:** route Express của từng module đặt ở `modules/<context>/presentation/http/*` và CHỈ gọi use-case (controller mỏng). `server.ts` chỉ mount, không chứa logic.
3. **Inversion of Control rõ ràng:** Application phụ thuộc **interface repository** (Domain), Infrastructure cung cấp implementation qua một `composition root` ở `src/app` (hoặc factory) — KHÔNG để Application `import` thẳng class Firestore.
4. **Domain thuần tuyệt đối:** thêm ESLint chặn `domain/` import `react`, `firebase*`, `@/src/modules/*/infrastructure`, `@/src/modules/*/presentation`.
5. **CQRS đọc-ghi không lẫn:** Presentation báo cáo (dashboard) CHỈ gọi Query use-case của `reporting`; cấm gọi repository ghi/đọc raw trong báo cáo.
6. **AI chỉ đọc:** `reporting/ai` không được import use-case ghi của module khác; chỉ đọc read-model + event log.

> Đây chỉ là tinh chỉnh thuật ngữ + siết ranh giới — KHÔNG đổi nghiệp vụ, KHÔNG thêm phase. Vẫn 14 phase.

---

## 5. HÀNG RÀO TỰ KIỂM (Fitness Functions) — đảm bảo KHÔNG lệch chuẩn

Thêm các kiểm tra TỰ ĐỘNG để kiến trúc được "ép" tuân thủ, không phụ thuộc trí nhớ con người (bổ sung dần, bật "error" ở P14):

| Hàng rào | Công cụ | Kiểm tra điều gì |
|---|---|---|
| **Dependency zones** | ESLint `import/no-restricted-paths` | Presentation→Application→Domain một chiều; Infra chỉ implements Domain; platform ⊄ modules |
| **No deep import** | ESLint `no-restricted-imports` | Module khác chỉ import `modules/X/index.ts`, cấm `modules/X/domain/...` |
| **Domain tinh khiết** | ESLint zone | `domain/` cấm import react/firebase/infra/presentation |
| **Firestore chỉ ở Infrastructure** | ESLint | `import 'firebase/firestore'` chỉ trong `*/infrastructure` + `platform/data` |
| **Không cycle** | ESLint `import/no-cycle` = error | Không vòng phụ thuộc |
| **CQRS đọc-ghi** | review + test | Báo cáo chỉ đọc projection; không quét raw |
| **Parity nghiệp vụ** | Vitest/e2e | Kết quả (tính tiền, gate, số liệu) BẰNG trước refactor |
| **(khuyến nghị) test kiến trúc** | dependency-cruiser hoặc test ts-morph | Tự động fail nếu có import vi phạm lớp |

**Tiêu chí "đạt chuẩn" cuối cùng (sau P14):**
- [ ] Mỗi module có đủ 4 thư mục `presentation/application/domain/infrastructure` + `index.ts`.
- [ ] `grep "firebase/firestore"` chỉ xuất hiện trong `*/infrastructure` và `platform/data`.
- [ ] `domain/` không import react/firebase/infra/presentation (ESLint error xanh).
- [ ] Không module nào import sâu module khác (chỉ qua index.ts).
- [ ] Báo cáo/dashboard chỉ đọc qua Query use-case của `reporting` (projection).
- [ ] Domain Events thay thế side-effect cũ (đường cũ đã gỡ); handler idempotent.
- [ ] `reporting/ai` chỉ đọc read-model/event log.
- [ ] Vẫn **1 codebase, 1 `server.ts`, 1 build, 1 deploy**; `npm run build` ra 1 artifact.
- [ ] Toàn bộ Vitest + e2e (5 luồng + ZNS + dashboard + phân quyền) xanh.

---

## 6. CÂU CHỐT
Kế hoạch 14 phase **đã bao phủ đầy đủ** 6 trụ cột + cấu trúc 4 lớp + ràng buộc một-codebase/app/deploy. Cần làm thêm đúng 2 việc để "đảm bảo" tuyệt đối:
1. **Áp tên lớp chuẩn** `presentation/application/domain/infrastructure` (mục 4) trong các phase bóc module.
2. **Bật hàng rào tự kiểm** (mục 5) để kiến trúc được ép tuân thủ tự động, không lệch theo thời gian.