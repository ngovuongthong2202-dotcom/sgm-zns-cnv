-- ==============================================================================
-- SGM OS (ZNS SGM) - SUPABASE POSTGRESQL HYBRID SCHEMA MIGRATION
-- Kiến trúc: Enterprise Hybrid Domain-Driven Architecture (Phương án 10)
-- Tối ưu: B-Tree Indexing, Realtime CDC Channels, Foreign Key Constraints & JSONB
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TRIGGER FUNCTION: Tự động cập nhật `updated_at`
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- 3. BẢNG DỮ LIỆU CỐT LÕI (CORE DOMAIN TABLES)
-- ==============================================================================

-- 3.1. KHÁCH HÀNG (CUSTOMERS)
CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    ma_kh TEXT,
    ten_khach_hang TEXT,
    sdt TEXT,
    tinh_thanh TEXT,
    nguoi_phu_trach TEXT,
    loai_kh TEXT,
    is_archived BOOLEAN DEFAULT false,
    total_debt NUMERIC(15, 2) DEFAULT 0,
    ltv NUMERIC(15, 2) DEFAULT 0,
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    deleted_by TEXT DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    data JSONB NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_customers_ma_kh ON customers(ma_kh);
CREATE INDEX IF NOT EXISTS idx_customers_sdt ON customers(sdt);
CREATE INDEX IF NOT EXISTS idx_customers_deleted_at ON customers(deleted_at);
CREATE INDEX IF NOT EXISTS idx_customers_created_at ON customers(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_customers_active_created ON customers (created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_customers_active_search ON customers (ten_khach_hang, sdt) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_customers_data_gin ON customers USING GIN (data);

-- 3.2. BÁO GIÁ (QUOTATIONS)
CREATE TABLE IF NOT EXISTS quotations (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    ma_bao_gia TEXT,
    customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
    trang_thai TEXT DEFAULT 'draft',
    tong_tien NUMERIC(15, 2) DEFAULT 0,
    nguoi_tao TEXT,
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    deleted_by TEXT DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    data JSONB NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_quotations_customer_id ON quotations(customer_id);
CREATE INDEX IF NOT EXISTS idx_quotations_ma_bao_gia ON quotations(ma_bao_gia);
CREATE INDEX IF NOT EXISTS idx_quotations_trang_thai ON quotations(trang_thai);
CREATE INDEX IF NOT EXISTS idx_quotations_deleted_at ON quotations(deleted_at);
CREATE INDEX IF NOT EXISTS idx_quotations_created_at ON quotations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quotations_active_created ON quotations (created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_quotations_customer_active ON quotations (customer_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_quotations_active_trangthai ON quotations (trang_thai, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_quotations_data_gin ON quotations USING GIN (data);

-- 3.3. HỢP ĐỒNG (CONTRACTS)
CREATE TABLE IF NOT EXISTS contracts (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    ma_hop_dong TEXT,
    quotation_id TEXT REFERENCES quotations(id) ON DELETE SET NULL,
    customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
    trang_thai TEXT DEFAULT 'draft',
    gia_tri_hop_dong NUMERIC(15, 2) DEFAULT 0,
    ngay_hoan_thanh TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    deleted_by TEXT DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    data JSONB NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_contracts_customer_id ON contracts(customer_id);
CREATE INDEX IF NOT EXISTS idx_contracts_quotation_id ON contracts(quotation_id);
CREATE INDEX IF NOT EXISTS idx_contracts_ma_hop_dong ON contracts(ma_hop_dong);
CREATE INDEX IF NOT EXISTS idx_contracts_trang_thai ON contracts(trang_thai);
CREATE INDEX IF NOT EXISTS idx_contracts_deleted_at ON contracts(deleted_at);
CREATE INDEX IF NOT EXISTS idx_contracts_created_at ON contracts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contracts_active_created ON contracts (created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_contracts_customer_active ON contracts (customer_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_contracts_active_trangthai ON contracts (trang_thai, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_contracts_data_gin ON contracts USING GIN (data);

-- 3.4. THANH TOÁN & CÔNG NỢ (PAYMENTS)
CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    ma_thanh_toan TEXT,
    contract_id TEXT REFERENCES contracts(id) ON DELETE SET NULL,
    customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
    quotation_id TEXT,
    so_tien NUMERIC(15, 2) DEFAULT 0,
    trang_thai TEXT DEFAULT 'pending',
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    deleted_by TEXT DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    data JSONB NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_payments_contract_id ON payments(contract_id);
CREATE INDEX IF NOT EXISTS idx_payments_customer_id ON payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_quotation_id ON payments(quotation_id);
CREATE INDEX IF NOT EXISTS idx_payments_trang_thai ON payments(trang_thai);
CREATE INDEX IF NOT EXISTS idx_payments_deleted_at ON payments(deleted_at);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_active_created ON payments (created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_payments_customer_active ON payments (customer_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_payments_contract_active ON payments (contract_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_payments_active_trangthai ON payments (trang_thai, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_payments_data_gin ON payments USING GIN (data);

-- 3.5. GIAO HÀNG (DELIVERIES)
CREATE TABLE IF NOT EXISTS deliveries (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    ma_giao_hang TEXT,
    contract_id TEXT REFERENCES contracts(id) ON DELETE SET NULL,
    payment_id TEXT,
    quotation_id TEXT,
    customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
    trang_thai TEXT DEFAULT 'pending',
    deleted_at TIMESTAMPTZ DEFAULT NULL,
    deleted_by TEXT DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    data JSONB NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_deliveries_contract_id ON deliveries(contract_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_payment_id ON deliveries(payment_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_quotation_id ON deliveries(quotation_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_customer_id ON deliveries(customer_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_trang_thai ON deliveries(trang_thai);
CREATE INDEX IF NOT EXISTS idx_deliveries_deleted_at ON deliveries(deleted_at);
CREATE INDEX IF NOT EXISTS idx_deliveries_created_at ON deliveries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_deliveries_active_created ON deliveries (created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_deliveries_customer_active ON deliveries (customer_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_deliveries_contract_active ON deliveries (contract_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_deliveries_active_trangthai ON deliveries (trang_thai, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_deliveries_data_gin ON deliveries USING GIN (data);

-- ==============================================================================
-- 4. BẢNG HỆ THỐNG & TÍCH HỢP (SYSTEM & INTEGRATIONS)
-- ==============================================================================

-- 4.1. NGƯỜI DÙNG & TÀI KHOẢN (USERS)
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    display_name TEXT,
    role TEXT DEFAULT 'Chuyên viên',
    department TEXT,
    position TEXT,
    email TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    data JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- 4.2. CẤU HÌNH HỆ THỐNG (SETTINGS)
CREATE TABLE IF NOT EXISTS settings (
    id TEXT PRIMARY KEY,
    data JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4.3. NHẬT KÝ TIN NHẮN ZNS (ZNS_MESSAGES)
CREATE TABLE IF NOT EXISTS zns_messages (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    tracking_id TEXT,
    entity_type TEXT,
    entity_id TEXT,
    status TEXT DEFAULT 'pending',
    phone TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    data JSONB NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_zns_messages_tracking_id ON zns_messages(tracking_id);
CREATE INDEX IF NOT EXISTS idx_zns_messages_entity ON zns_messages(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_zns_messages_created_at ON zns_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_zns_messages_status ON zns_messages(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_zns_messages_phone ON zns_messages(phone);

-- 4.4. MẪU TIN ZNS (ZNS_TEMPLATES)
CREATE TABLE IF NOT EXISTS zns_templates (
    id TEXT PRIMARY KEY,
    template_id TEXT,
    template_name TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    data JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- 4.5. BẢNG DEDUP WEBHOOK CALLBACK (ZNS_CALLBACKS)
CREATE TABLE IF NOT EXISTS zns_callbacks (
    id TEXT PRIMARY KEY, -- tracking_id
    processed_at TIMESTAMPTZ DEFAULT NOW(),
    payload JSONB DEFAULT '{}'::jsonb
);

-- 4.6. HÀNG ĐỢI XỬ LÝ LỖI (ZNS_DEAD_LETTERS)
CREATE TABLE IF NOT EXISTS zns_dead_letters (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    error_message TEXT,
    payload JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4.7. SỰ KIỆN WORKFLOW (WORKFLOW_EVENTS)
CREATE TABLE IF NOT EXISTS workflow_events (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    entity_type TEXT,
    entity_id TEXT,
    event_type TEXT,
    actor TEXT,
    cid TEXT,
    payload JSONB DEFAULT '{}'::jsonb,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_workflow_events_entity ON workflow_events(entity_type, entity_id);

-- 4.8. NHẬT KÝ KIỂM TOÁN (AUDIT_LOGS)
CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    entity_type TEXT,
    entity_id TEXT,
    action TEXT,
    user_id TEXT,
    user_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    data JSONB NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- 4.9. THÔNG BÁO (NOTIFICATIONS)
CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    user_id TEXT,
    title TEXT,
    message TEXT,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    data JSONB NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read, created_at DESC);

-- 4.10. BẢN NHÁP FORM (DRAFTS)
CREATE TABLE IF NOT EXISTS drafts (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    entity_type TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    data JSONB NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_drafts_user_entity ON drafts(user_id, entity_type);

-- 4.11. TRẠNG THÁI HIỆN DIỆN & KHÓA FORM (PRESENCE)
CREATE TABLE IF NOT EXISTS presence (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    current_entity_id TEXT,
    current_entity_type TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    data JSONB NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_presence_entity ON presence(current_entity_type, current_entity_id);

-- 4.12. NHẬT KÝ TELEGRAM BOT (TELEGRAM_SENT_LOG)
CREATE TABLE IF NOT EXISTS telegram_sent_log (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    chat_id TEXT,
    message_type TEXT,
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'success',
    data JSONB DEFAULT '{}'::jsonb
);

-- 4.13. BỘ ĐẾM SỐ THỨ TỰ (COUNTERS)
CREATE TABLE IF NOT EXISTS counters (
    id TEXT PRIMARY KEY,
    current_value BIGINT DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    data JSONB DEFAULT '{}'::jsonb
);

-- 4.14. NHỊP TIM TIẾN TRÌNH NGẦM (JOB_HEARTBEATS)
CREATE TABLE IF NOT EXISTS job_heartbeats (
    id TEXT PRIMARY KEY,
    service_name TEXT,
    last_heartbeat TIMESTAMPTZ DEFAULT NOW(),
    status TEXT,
    data JSONB DEFAULT '{}'::jsonb
);

-- 4.15. KHÓA PHÂN TÁN HỆ THỐNG (SYSTEM_LOCKS)
CREATE TABLE IF NOT EXISTS system_locks (
    id TEXT PRIMARY KEY,
    locked_by TEXT,
    locked_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    data JSONB DEFAULT '{}'::jsonb
);

-- 4.16. KHÓA IDEMPOTENCY CHỐNG TRÙNG LẶP (IDEMPOTENCY_KEYS)
CREATE TABLE IF NOT EXISTS idempotency_keys (
    id TEXT PRIMARY KEY,
    entity_id TEXT,
    response JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    data JSONB DEFAULT '{}'::jsonb
);

-- 4.17. TỔNG HỢP CHỈ SỐ BÁO CÁO (METRICS_ROLLUP)
CREATE TABLE IF NOT EXISTS metrics_rollup (
    id TEXT PRIMARY KEY,
    period TEXT,
    data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_metrics_rollup_period ON metrics_rollup(period);

-- 4.18. HÀNG ĐỢI ĐỒNG BỘ CHÉO THỰC THỂ (CROSS_ENTITY_SYNC_JOBS)
CREATE TABLE IF NOT EXISTS cross_entity_sync_jobs (
    id TEXT PRIMARY KEY,
    status TEXT DEFAULT 'pending',
    attempts INT DEFAULT 0,
    data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cross_sync_status ON cross_entity_sync_jobs(status, created_at);

-- ==============================================================================
-- 5. KÍCH HOẠT TRIGGER TỰ ĐỘNG CẬP NHẬT UPDATED_AT
-- ==============================================================================
DO $$
DECLARE
    tbl text;
BEGIN
    FOR tbl IN 
        SELECT unnest(ARRAY[
            'customers', 'quotations', 'contracts', 'payments', 
            'deliveries', 'users', 'settings', 'zns_messages', 
            'zns_templates', 'drafts', 'presence',
            'counters', 'metrics_rollup', 'cross_entity_sync_jobs'
        ])
    LOOP
        EXECUTE format('
            DROP TRIGGER IF EXISTS trg_%I_updated_at ON %I;
            CREATE TRIGGER trg_%I_updated_at
            BEFORE UPDATE ON %I
            FOR EACH ROW
            EXECUTE FUNCTION set_updated_at();
        ', tbl, tbl, tbl, tbl);
    END LOOP;
END;
$$;

-- ==============================================================================
-- 6. HÀM ATOMIC POSTGRES: QUẢN TRỊ VẬN HÀNH & TIẾT KIỆM TÀI NGUYÊN
-- ==============================================================================
-- 6.1. TRỪ HẠN MỨC ZNS (QUOTA DECREMENT)
CREATE OR REPLACE FUNCTION decrement_zns_quota(amount INT DEFAULT 1)
RETURNS INT AS $$
DECLARE
    current_val INT;
BEGIN
    UPDATE settings 
    SET data = jsonb_set(
        data, 
        '{balance}', 
        to_jsonb(GREATEST(0, COALESCE((data->>'balance')::int, 0) - amount))
    ),
    updated_at = NOW()
    WHERE id = 'zns_quota' AND COALESCE((data->>'balance')::int, 0) >= amount
    RETURNING (data->>'balance')::int INTO current_val;
    
    RETURN COALESCE(current_val, -1);
END;
$$ LANGUAGE plpgsql;

-- 6.2. DỌN DẸP DỮ LIỆU RÁC ĐỊNH KỲ (AUTOMATED STORAGE PRUNING & COST SAVING)
CREATE OR REPLACE FUNCTION cleanup_expired_system_data()
RETURNS jsonb AS $$
DECLARE
    deleted_presence INT;
    deleted_idempotency INT;
    deleted_heartbeats INT;
BEGIN
    DELETE FROM presence WHERE updated_at < NOW() - INTERVAL '1 hour';
    GET DIAGNOSTICS deleted_presence = ROW_COUNT;
    
    DELETE FROM idempotency_keys WHERE created_at < NOW() - INTERVAL '7 days';
    GET DIAGNOSTICS deleted_idempotency = ROW_COUNT;
    
    DELETE FROM job_heartbeats WHERE last_heartbeat < NOW() - INTERVAL '1 day';
    GET DIAGNOSTICS deleted_heartbeats = ROW_COUNT;

    RETURN jsonb_build_object(
        'deleted_presence', deleted_presence,
        'deleted_idempotency', deleted_idempotency,
        'deleted_heartbeats', deleted_heartbeats,
        'cleaned_at', NOW()
    );
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- 7. KÍCH HOẠT SUPABASE REALTIME (PUBLICATION) & REPLICA IDENTITY
-- ==============================================================================
ALTER TABLE customers REPLICA IDENTITY FULL;
ALTER TABLE quotations REPLICA IDENTITY FULL;
ALTER TABLE contracts REPLICA IDENTITY FULL;
ALTER TABLE payments REPLICA IDENTITY FULL;
ALTER TABLE deliveries REPLICA IDENTITY FULL;
ALTER TABLE zns_messages REPLICA IDENTITY FULL;
ALTER TABLE notifications REPLICA IDENTITY FULL;
ALTER TABLE presence REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE 
    customers, 
    quotations, 
    contracts, 
    payments, 
    deliveries, 
    zns_messages, 
    notifications, 
    presence;

-- ==============================================================================
-- 8. ROW LEVEL SECURITY (RLS) - BẬT CHO PHÉP TRUY CẬP ĐẦY ĐỦ Ở LOCAL
-- ==============================================================================
DO $$
DECLARE
    tbl text;
BEGIN
    FOR tbl IN 
        SELECT unnest(ARRAY[
            'customers', 'quotations', 'contracts', 'payments', 
            'deliveries', 'users', 'settings', 'zns_messages', 
            'zns_templates', 'zns_callbacks', 'zns_dead_letters', 
            'workflow_events', 'audit_logs', 'notifications', 'drafts', 'presence',
            'telegram_sent_log', 'counters', 'job_heartbeats', 'system_locks',
            'idempotency_keys', 'metrics_rollup', 'cross_entity_sync_jobs'
        ])
    LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', tbl);
        EXECUTE format('DROP POLICY IF EXISTS "Public access policy" ON %I;', tbl);
        EXECUTE format('CREATE POLICY "Public access policy" ON %I FOR ALL USING (true) WITH CHECK (true);', tbl);
    END LOOP;
END;
$$;

-- ==============================================================================
-- 9. KHỞI TẠO DỮ LIỆU BAN ĐẦU (SEED DATA)
-- ==============================================================================
-- 9.1. Tài khoản Quản trị viên mặc định
INSERT INTO users (id, username, display_name, role, department, position, email, data)
VALUES (
    'admin',
    'admin',
    'Mạnh Hùng (Admin)',
    'Administrator',
    'Ban Giám Đốc',
    'Administrator',
    'admin@sgm.vn',
    '{"username": "admin", "displayName": "Mạnh Hùng (Admin)", "role": "Administrator", "department": "Ban Giám Đốc", "position": "Administrator"}'::jsonb
)
ON CONFLICT (id) DO UPDATE SET 
    display_name = EXCLUDED.display_name,
    role = EXCLUDED.role;

-- 9.2. Cấu hình ZNS Quota ban đầu (10,000 tin nhắn)
INSERT INTO settings (id, data)
VALUES (
    'zns_quota',
    '{"balance": 10000, "warningThreshold": 100, "criticalThreshold": 20, "lastTopupDate": "2026-09-23"}'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- 9.3. Cấu hình ZNS Webhook Defaults
INSERT INTO settings (id, data)
VALUES (
    'zns_config',
    '{"requireSecret": false, "authSoftMode": true, "dedupWindowMinutes": 60}'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- ==============================================================================
-- HOÀN TẤT THIẾT LẬP SCHEMA SUPABASE CHO SGM OS!
-- ==============================================================================
