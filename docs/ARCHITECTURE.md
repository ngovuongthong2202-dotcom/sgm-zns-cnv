# SGM OS Architecture 

## Overview
SGM OS is a modern, modular, type-safe CRM/ERP tailored for small businesses and factories.
It is built with React 19, TypeScript, Vite, Tailwind CSS, Supabase (PostgreSQL, Realtime CDC, Service Role Admin), and uses a dual frontend/backend architecture inside an Enterprise Modular Monolith setup.

## Core Pillars
1. **Zod as Single Source of Truth**: All data exchanges, database mappings, and form validations are governed by universal Zod schemas (`src/domain/schema/*`).
2. **Component-Driven with Design System**: Standardized `src/design-system` ensuring uniform visual language across UI, combined with `src/widgets` for reusable domain-aware components.
3. **DataView & TanStack Table Engine**: Advanced data tabular view supporting filtering, grouping, aggregation, dynamic sizing, and virtualization.
4. **Config-Driven Operations**: Systems like ZNS (Zalo Notification Service) Templates and workflow state machines are dynamically configured in DB, not hard-coded.
5. **Real-time Synchronized with Supabase**: Leverages Supabase Realtime Channels (PostgreSQL CDC) for instant updates across user interfaces while backend scripts use idempotent, event-driven cron routines.
6. **Enterprise Hybrid Data Modeling**: Physical indexed B-tree columns for high-speed foreign key lookups and CDC filters combined with JSONB for rich domain agility.

## Architecture Diagram

```mermaid
graph TD
    classDef frontend fill:#3B82F6,stroke:#1E3A8A,stroke-width:2px,color:#fff;
    classDef backend fill:#10B981,stroke:#047857,stroke-width:2px,color:#fff;
    classDef supabase fill:#059669,stroke:#064E3B,stroke-width:2px,color:#fff;
    classDef external fill:#64748B,stroke:#334155,stroke-width:2px,color:#fff;

    Client[Trình duyệt / Single Page App]:::frontend
    
    subgraph Frontend "React 19 Frontend SPA"
        DevAuth[Dev Role Switcher / Auto-Login]:::frontend
        UI[Design System & UI Components]:::frontend
        Widgets[Domain Widgets & DataView]:::frontend
        Cache[L1 EntityCachePool & SWR Cache]:::frontend
        RepoPort[Repository Port Adapter]:::frontend
    end

    subgraph Backend "Node Express Modular Monolith (server.ts)"
        Routes[Express Routes API]:::backend
        Workflow[Workflow State Machine]:::backend
        ZNS[ZNS Outbound & Webhook Handler]:::backend
        Rollup[Metrics CQRS Rollup & Cron]:::backend
        AdminClient[Supabase Admin Client (Service Role)]:::backend
    end

    subgraph Supabase "Supabase Cloud / PostgreSQL Core"
        Tables[(Hybrid Tables: Customers, Quotes, Contracts, Payments...)]:::supabase
        RealtimeCDC[Supabase Realtime CDC Channels]:::supabase
        AtomicFunc[Postgres Functions / RPC: Decrement Quota]:::supabase
        Views[CQRS Materialized / Metric Views]:::supabase
    end

    External_Zalo[Zalo ZNS / OA]:::external
    External_Webhooks[Vendor Webhooks CNV]:::external

    Client -->|Auto-Login Admin| DevAuth
    DevAuth --> UI
    UI --> Widgets
    Widgets --> Cache
    Cache <--> RepoPort

    RepoPort <-->|Query & Mutations| Tables
    Tables -.->|Filtered Realtime CDC| Cache

    External_Webhooks --> Routes
    Routes --> Workflow
    Workflow --> ZNS
    ZNS --> External_Zalo
    ZNS <-->|Dedup & Atomic Quota| AdminClient
    Rollup <-->|Fast CQRS Reads| AdminClient
    AdminClient <-->|Service Role Bypass RLS| Tables
    AdminClient <--> AtomicFunc
```

## System Components

### Frontend (SPA)
- `src/domain/*`: Zod schemas, state machine policies, mapping transformers, and business logic enums. Unified source of truth for both sides.
- `src/features/*`: Encapsulated domain logic modules (Quotations, Contracts, Payments, etc.) following vertical slicing.
- `src/widgets/*`: Reusable component blocks composed of primitives and bounded to specific domain entities (e.g., StatusPill, EntityLinks).
- `src/components/*`: Reusable layout and wrapper modules agnostic to deep business logic.
- `src/design-system/*`: Pure UI primitives (Buttons, Inputs, DataView Engine).
- State Management: React context + custom SWR hooks combining `useSWR` caching with a lightweight Supabase Realtime global store (`realtime-store.ts`) and L1 cache (`entity-cache-pool.ts`).

### Backend (Express)
- `src/backend/routes/*`: API surface for heavy synchronous operations and aggregations.
- `src/backend/services/*`: Business logic handling external integrations (ZNS, Telegram) and automations (Cron, Metrics rollup).
- `src/backend/workflow/*`: State machine evaluating and executing business flows before writing to database.
- `src/backend/config/supabase.admin.ts`: Supabase service role client bypassing RLS for webhook dedup, quota decrement and scheduled cron jobs.
