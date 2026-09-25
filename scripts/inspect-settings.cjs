const { createClient } = require('@supabase/supabase-js');
const url = "https://baduyiiwvaxudcplffri.supabase.co";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJhZHV5aWl3dmF4dWRjcGxmZnJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAxNDg2ODksImV4cCI6MjEwNTcyNDY4OX0.1FSGqLqHN_g09NOt6mFw8vGGk8I1VH735iPgaMx-0ao";

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
