import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // Đợt 0A (MC08/CSDL-10): bộ kiểm thử từng ghi vào CSDL sản xuất (workflow_events "QUOTE-12345",
    // bộ đếm số chứng từ, khách thử nghiệm). Bốn biến dưới đây ép cả client trình duyệt lẫn client
    // máy chủ về chế độ giả lập trong mọi worker (giá trị không bắt đầu bằng "http").
    // KHÔNG XÓA. Muốn chạy với CSDL thử nghiệm riêng: xem việc 0A.8 của kế hoạch tổng thể.
    env: {
      VITE_SUPABASE_URL: 'offline',
      VITE_SUPABASE_ANON_KEY: 'offline',
      SUPABASE_URL: 'offline',
      SUPABASE_SERVICE_ROLE_KEY: 'offline',
    },
    setupFiles: ['./src/tests/setup/offline-guard.ts'],
    include: [
      '**/*.spec.ts',
      'src/tests/components.snapshot.spec.tsx',
      'src/modules/customers/ui/components/CustomerCascadeImpactModal.spec.tsx',
      'src/modules/customers/ui/components/CustomerZnsContactModal.spec.tsx',
      'src/modules/customers/ui/components/CustomerFormModal.spec.tsx',
      'src/tests/payment-quotation-integration.spec.tsx',
      'src/tests/bulk-zns-orchestrator.spec.tsx'
    ],
    exclude: ['src/tests/e2e/**', 'node_modules/**', 'e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
