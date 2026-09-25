# Enterprise UI/UX Refactor Design Specification (SGM OS / ZNS-SGM B2B CRM)
**Date:** 2026-05-28  
**Author:** Staff TypeScript/Firebase Engineer & Senior Principal Frontend Architect  
**Status:** APPROVED  

---

## 1. Executive Summary & Audit of Core Root Causes

An extensive audit of the SGM OS repository has identified several critical structural, cosmetic, and functional issues that prevent the application from delivering a premium, high-density, enterprise-grade experience. This document outlines the findings and specifies the structural contracts for a unified design system.

### Root Cause Analysis

| Issue Identified | Root Cause | Refactoring Remedy | Priority |
| :--- | :--- | :--- | :---: |
| **Duplicated Toolbar / Filters / SEARCH / CTA** | The Customer page implements a custom `CustomersToolbar` component containing identical controls (Search, Columns, Saved Views, CTA) as the structural `DataViewToolbar` injected natively by `DataViewEngine`, causing stacked double-elements. | Eliminate `CustomersToolbar` completely. Fully leverage `DataViewEngine`'s native toolbar by passing domain-specific filters into the `entityFilters` slot. | **P0** |
| **Low Density & High Cell Padding** | Default row and cell configurations are overly spacious; element wrapping is unconstrained; and cells with flex containers do not apply inline `truncate` correctly, leading to bloated heights. | Enforce rigid `compact` and `normal` heights (32px / 40px) at the table level using CSS variables; apply `min-w-0 truncate` to all text strings; and ban multiline wrapping in data rows. | **P0** |
| **Noisy Auto-Save Alerts** | Form auto-saving executes every 8 seconds and invokes noisy active toast popups (`notify.success('Đã lưu nháp tự động')`), breaking focused data entry and generating severe cognitive fatigue. | Retain robust draft preservation via the Firestore-integrated `useDraft` hook but transition to a completely silent UI design: a quiet state label inside the form footer (e.g., *"Đơn nháp đã tự động lưu lúc 14:15:32"*). | **P0** |
| **Incomplete Columns Popover** | The `ColumnsManager` component is a basic list menu lacking mass selection toggles, reset capabilities, and proper scroll containment for heavy, multi-column setups. | Upgrade `ColumnsManager` with fully-featured "Chọn tất cả", "Ẩn tất cả", "Khôi phục mặc định" triggers, and a flexible max-height scroll container. | **P1** |
| **Static Summary / KPI Cards** | KPI metrics at the top of domain dashboards are styled as cards with no mouse interactivity, missing click-to-filter mechanics and trend diagnostics. | Upgrade KPI stats cards with hover states, click handlers that directly apply corresponding presets to column filters (e.g., clicking "ZNS Thất bại" sets the ZNS column filter to "THAT_BAI"), and micro-sparklines. | **P1** |
| **Over-engineered / Shiny Drawer Elements** | Customer drawers use flashy B2C dark gradients, circular blurry spots, and massive heights that distract from compact desk-centered operations. | Refactor elements inside `CustomerOverviewBento` into a clean, flat, high-density typographic layout matching the Slate design system. | **P1** |

---

## 2. Refactoring Approach Selection

We evaluated three strategic pathways for executing this refactor:

*   **Approach A: Patch domain pages independently**
    *   *Trade-offs:* Highly fragmented; doesn't solve core design system drift; duplicates logic across pages; high maintenance cost.
*   **Approach B: Infrastructure-First Refactor (RECOMMENDED)**
    *   *Trade-offs:* Rewrites and hardens core common controls (`DataView`, `ColumnsManager`, `DetailDrawer`, general forms shell) first, then systematically applies these modular updates across the 5 target domains (Customers, Quotations, Contracts, Payments, Deliveries). This approach yields 100% architectural homogeneity, guarantees zero regressions, and simplifies validation.
*   **Approach C: Total UI Rewrite**
    *   *Trade-offs:* Discards valuable business logic, schema logic, and active workflows; high risk of breaking Firebase sync and backend ZNS triggers.

**Selected Path:** **Approach B** (Infrastructure-first Refactor).

---

## 3. Structural Code Contracts (Contracts for Refactoring)

### 3.1 Design System Contract (Refining Spacing and Typography)
*   **Color Policy (ADR 0011):** Strict ban on purple, violet, indigo, pink, and fuchsia. Palette is strictly limited to Slate (primary text/structure), Blue (brand/information), Cyan/Teal (operations), Emerald (success), Amber (warning), and Red (errors).
*   **Density & Layout Specifications:**
    *   `compact` Row Height: Strictly `32px` line height. Only 1 line of vertical data allowed per cell.
    *   `normal` Row Height: Strictly `40px` line height.
    *   All cells rendering textual information *must* match the following tree structure:
      ```tsx
      <div className="w-full min-w-0 flex items-center">
        <span className="truncate block font-medium" title={textValue}>{textValue}</span>
      </div>
      ```

### 3.2 DataView & ListView Integration Contract
Instead of duplicating the header and search rows on target feature screens, pages must delegate formatting fully to the unified `<DataViewEngine>`.

*   **Customers Page Refactoring Blueprint:**
    ```tsx
    // 1. Remove CustomersToolbar Import and Element
    // 2. Define custom filters as inline JSX:
    const entityFilters = (
      <>
        <FilterDropdown
          label="Phụ trách"
          options={nguoiPhuTrachOptions}
          selectedValues={selectedNguoiPhuTrach ? [selectedNguoiPhuTrach] : []}
          onChange={(vals) => setSelectedNguoiPhuTrach(vals[0] || '')}
        />
        <FilterDropdown
          label="Khu vực"
          options={tinhThanhOptions}
          selectedValues={selectedTinhThanh ? [selectedTinhThanh] : []}
          onChange={(vals) => setSelectedTinhThanh(vals[0] || '')}
        />
        {/* ... Other Filters */}
      </>
    );

    // 3. Pass filters and primary creator trigger directly:
    return (
      <div className="flex flex-col h-full bg-slate-50">
        <PageHeader title="Khách hàng" meta="..." />
        <div className="px-6 pt-4 shrink-0">
          <CustomerStats
            customers={customers}
            onFilterChange={(znsStatus) => setSelectedZnsStatus(znsStatus)}
          />
        </div>
        <div className="flex-1 flex flex-col p-6 overflow-hidden min-h-0">
          <div className="flex-1 bg-white overflow-hidden shadow-sm border border-slate-200 rounded-xl flex flex-col">
            <DataViewEngine<Customer>
              dataView={dataView}
              columns={columns}
              title="Khách hàng"
              createNewLabel="Khách hàng mới"
              entityFilters={entityFilters}
              onResetAllFilters={handleResetFilters}
              onCreateNew={() => setDrawerState({ mode: 'new' })}
              // ...
            />
          </div>
        </div>
      </div>
    );
    ```

### 3.3 Upgraded ColumnsManager Contract
The `ColumnsManager` component must be refactored to support the following interface:

```typescript
export interface ColumnsManagerProps {
  visibility: Record<string, boolean>;
  onVisibilityChange: (visibility: Record<string, boolean>) => void;
  availableColumns: { id: string; label: string }[];
  defaultVisibility?: Record<string, boolean>; // Allows "Reset Default"
}
```

**Key Interactions to Add:**
*   **Select All (Hiện tất cả):** Set all keys in `visibility` to `true`.
*   **Select None / Hide All (Ẩn tất cả):** Keep only the essential identifying keys (e.g., `maKh`, `soPhieuBaoGia`, `actions`) as safe-visible.
*   **Reset Default (Mặc định):** Apply the predefined default column arrangement.
*   **Scroll & Alignment:** Ensure a fixed height dropdown menu of `max-h-72 overflow-y-auto` with clean hover states and accessibility labels.

### 3.4 DetailDrawer Design Contract
*   **Cosmetics Structure:** Eliminate high-opacity radial blurs and neon gradients from `CustomerOverviewBento`. Replace with flat, card-based groupings utilizing tight border boundaries (`border-slate-200/80`), elegant typography, and a cohesive monochrome style.
*   **Header Panel Refinement:** Keep title headers simple. Ensure the navigation arrow-toggles (left and right buttons to view next/previous records) remain static, and support accessibility-friendly focus outlines and hotkeys (`[` and `]`).
*   **Multi-User Real-time Presence:** Use integrated SWR tags to dynamically overlay badge lists displaying current active viewers, ensuring concurrent operations do not collide.

### 3.5 Form Shell v2 & Silent Auto-Save Contract (ADR 0018)
*   **Single-Screen Layout Constraints:** Forms must render in a neat single-column scroll card layout. Steppers are forbidden. Standard field inputs must operate with compact spacing (`h-8` field boxes instead of bloated 44px margins).
*   **Noisy Alerts Elimination:**
    *   **NEVER** trigger toast popups on automatic draft preservation cycles.
    *   Add a silent `<DraftSyncStatus />` small indicator label inside the form footer next to the action controls:
    ```tsx
    const [draftStatus, setDraftStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
    const [lastSavedTime, setLastSavedTime] = useState<string>('');

    // Inside the interval ticker:
    saveDraft(getValues());
    setDraftStatus('saved');
    setLastSavedTime(new Date().toLocaleTimeString());

    // Render:
    <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1">
      {draftStatus === 'saved' && (
        <>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Đã tự động lưu nháp lúc {lastSavedTime}</span>
        </>
      )}
    </div>
    ```

### 3.6 Data Normalization Contract (The Clean Proper-Case Rule)
To prevent polluted names and non-standard strings in production search queries, the form submit payload *must* enforce strict sanitization rules:

1.  **Proper Case for Names:**
    *   Full name strings (Customer names, Contact representatives) must execute standard Proper Case conversions via helper:
    *   `normalizeVietnameseProperCase('nguYỄN văn a')` $\rightarrow$ `Nguyễn Văn A`.
    *   `normalizeBusinessName('CÔNG TY tnhh tHương mạI A')` $\rightarrow$ `Công Ty TNHH Thương Mại A`. (Abbreviations like `TNHH`, `CP`, `B2B`, `ZNS` must remain beautifully uppercase).
2.  **Strict UPPERCASE for Codes:**
    *   Entity identifying codes (e.g., customer codes like `KH019`, voucher IDs, and payment reference numbers) *must* be converted to uppercase.
3.  **Whitespace Squeezing:**
    *   Double spaces must be squeezed into single spaces (`trim().replace(/\s+/g, ' ')`).

### 3.7 Database Sync & Safety Contract (Optimistic Locks)
*   Each update payload *must* fetch the existing document first and check `lastKnownUpdatedAt` against Firestore database records to prevent SWR cache race condition errors. Check is governed natively by the `isOptimisticLockValid()` cloud check in rules.
*   Under-drawer table contents (Quotations under Customers list, Contracts under quotations list) must defer queries actively via selective conditional keys: `customerId ? "quotations:500:customerId" : null`, ensuring database read limits are strictly respected.

---

## 4. Work Breakdown & Implementation Plan (Batchprompts Layout)

The implementation must be rolled out sequentially in 4 distinct batches to guarantee high quality and make regression verification simple.

```
       ┌──────────────────────────────┐
       │   Batch 1: Core DS & Controls│
       │   - ColumnsManager           │
       │   - Form Shell Auto-save     │
       └──────────────┬───────────────┘
                      ▼
       ┌──────────────────────────────┐
       │   Batch 2: Customers Refactor │
       │   - Remove CustomersToolbar  │
       │   - Unify DataViewToolbar    │
       │   - Interactive KPI cards    │
       │   - Bento Redesign           │
       └──────────────┬───────────────┘
                      ▼
       ┌──────────────────────────────┐
       │   Batch 3: Domain Alignment  │
       │   - Quotations, Contracts    │
       │   - Payments, Deliveries     │
       │   - Form Height Constraints  │
       └──────────────┬───────────────┘
                      ▼
       ┌──────────────────────────────┐
       │   Batch 4: Serialization &   │
       │   Testing Pipeline           │
       │   - Data Proper-Case Clean   │
       │   - Automated Verification   │
       └──────────────────────────────┘
```

### Batch 1: Common Infrastructure Refactoring
*   **Objectives:** Major functional improvements to core common packages.
*   **Files Modified:**
    *   `src/design-system/ColumnsManager.tsx`
    *   `src/design-system/dataview/DataViewToolbar.tsx`
*   **Key Tasks:**
    *   Implement "Chọn tất cả", "Ẩn tất cả", "Reset" keys within `ColumnsManager`.
    *   Ensure the default setting is supplied via column properties.
    *   Integrate quiet state messaging structure in the footer layout of forms to support auto-save diagnostics without noisy banner warnings.

### Batch 2: Customers Feature Clean-up & Bento Harmonization
*   **Objectives:** Eliminate the duplicate toolbar issue and redesign Bento cards on the Customer page.
*   **Files Modified:**
    *   `src/features/customers/page.tsx`
    *   `src/features/customers/components/CustomerStats.tsx`
    *   `src/features/customers/components/CustomerOverviewBento.tsx`
*   **Key Tasks:**
    *   Delete the custom `CustomersToolbar.tsx` file completely.
    *   Move target user dropdown controls directly to `<DataViewEngine>` via its `entityFilters` slot.
    *   Make KPI Stats cards clickable, directly altering table filtering targets upon cursor activation.
    *   Convert `CustomerOverviewBento` into a flat, elite, high-density Slate card deck.

### Batch 3: Document Form Modals, Spacing, and Domain Integration
*   **Objectives:** Align Quotations, Contracts, Payments, and Deliveries features with the refined spacing, layout constraints, and density guidelines.
*   **Files Modified:**
    *   `src/features/quotations/page.tsx`, `src/features/contracts/page.tsx`
    *   `src/features/payments/page.tsx`, `src/features/deliveries/page.tsx`
    *   `src/features/customers/components/CustomerFormModal.tsx`
*   **Key Tasks:**
    *   Enforce a strict `32px` cell height for `compact` views and `40px` cell height for `cozy` views across all domain tables.
    *   Configure form layout fields to use compact spacing (`h-8` entry boxes) to optimize vertical space usage on desktop screens.

### Batch 4: Proper-Case Sanitizers, Zod Schemas, and Final Acceptance Tests
*   **Objectives:** Standardize data entry formatting and execute final verification builds.
*   **Files Modified:**
    *   `src/shared/utils/textFormatter.ts` (or equivalent formatter utility)
    *   `src/features/customers/components/CustomerFormModal.tsx` and all domain creator forms
*   **Key Tasks:**
    *   Connect the Vietnamese Normalization Proper Case pipeline to form submission hooks.
    *   Validate proper normalization handling for Vietnamese business forms (e.g., ensuring `TNHH`, `CP` remain uppercase).
    *   Execute full linter checks (`npm run lint`), TypeScript compile tests (`tsc --noEmit`), and dev server verification to ensure a complete, production-ready release.

---

## 5. Verification Plan & Rollback Blueprint

### Visual Regression & Regression Checklist
*   [ ] No stacked headers or duplicate toolbars on any feature page.
*   [ ] Table rows respect the active density toggle and do not grow vertically from unconstrained or wrapping texts.
*   [ ] Custom stats cards respond to clicks and correctly update active table filters.
*   [ ] Automated form auto-saves happen silently without noisy green toast alerts.
*   [ ] Custom data input is normalized to Proper Case during submission.

### Rollback Playbook (Tag Trigger Controls)
Should any runtime compilation errors occur, or if critical Firestore security rules fail:
1.  **Immediate Soft Reset:** Revert the workspace to the pristine snapshot state using the Git branch pointer:
    `git checkout -f refactor-safepoint`
2.  **Hard Target Recoveries:** Re-verify manual rollbacks page-by-page. Since each domain's data layout is kept distinct, any domain-specific bug can be rolled back individually by checking out its corresponding folder:
    `git checkout -- src/features/payments/`

---
*End of Design Specification.*
