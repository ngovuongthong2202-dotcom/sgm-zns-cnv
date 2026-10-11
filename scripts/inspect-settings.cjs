const { createClient } = require('@supabase/supabase-js');
// Đợt 0A (K-SEC-7): không viết khóa vào script. Chạy: node --env-file=.env scripts/inspect-settings.cjs
const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;
if (!url || !key) {
  console.error('Thiếu VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY trong môi trường. Chạy: node --env-file=.env scripts/inspect-settings.cjs');
  process.exit(1);
}

const supabase = createClient(url, key);

async function check() {
  const tables = ['customers', 'quotations', 'contracts', 'payments', 'deliveries', 'users', 'audit_logs', 'zns_messages', 'zns_callbacks', 'settings'];
  for (const t of tables) {
    const { data, error } = await supabase.from(t).select('*').limit(1);
    if (error) {
      console.log(`Table ${t} ERROR:`, error.message);
    } else {
      console.log(`Table ${t} cols:`, data.length > 0 ? Object.keys(data[0]) : '(empty table)');
    }
  }
}

check().catch(console.error);
