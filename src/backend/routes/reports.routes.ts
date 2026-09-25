import express from 'express';
import { adminDb } from '../config/supabase.admin';
import { metricsRollupService } from '../../modules/reporting/infrastructure/metrics/metrics-rollup.service';
import { GetReportsFullData } from '../../modules/reporting/application/queries/GetReportsFullData';
import { aiService, InsightRequestDto } from '../../modules/reporting/ai/ai.service';

const router = express.Router();

// GET /api/reports/full-data
router.get('/full-data', async (_req, res) => {
  try {
    const data = await GetReportsFullData.execute();

    return res.json({ success: true, data });
  } catch (err: unknown) {
    const errorDetails = err instanceof Error ? err.message : String(err);
    console.error('Failed to aggregate reports full-data:', err);
    return res.status(500).json({ success: false, error: errorDetails });
  }
});

// GET /api/reports/search-index
router.get('/search-index', async (_req, res) => {
  try {
    const [customersSnap, usersSnap] = await Promise.all([
      adminDb.collection('customers').select('tenKhachHang').get(),
      adminDb.collection('users').select('displayName', 'email').get(),
    ]);

    const customers = customersSnap.docs.map((doc: any) => ({
      id: doc.id,
      name: doc.data().tenKhachHang || 'N/A',
    }));

    const salesReps = usersSnap.docs.map((doc: any) => ({
      id: doc.id,
      name: doc.data().displayName || doc.data().email || 'Sales rep',
    }));

    return res.json({ success: true, index: { customers, salesReps } });
  } catch (err: unknown) {
    const errorDetails = err instanceof Error ? err.message : String(err);
    console.error('Failed search-index building:', err);
    return res.status(500).json({ success: false, error: errorDetails });
  }
});

// POST /api/reports/gemini-insight
router.post('/gemini-insight', async (req, res) => {
  try {
    const { reportsData } = req.body;

    const settingsSnap = await adminDb.collection('settings').doc('reports_config').get();
    let promptTemplate = `Bạn là chuyên gia phân tích kinh doanh B2B cao cấp (Staff Product Engineer & Business Analyst).
Dựa trên dữ liệu báo cáo SGM dưới đây, hãy đưa ra tối đa 4 nhận định hoặc gợi ý ngắn gọn, súc tích (1-2 câu mỗi ý, dạng Markdown gạch đầu dòng), tập trung vào:
- Một điểm sáng tăng trưởng vượt trội hoặc tỷ lệ chuyển đổi tốt.
- Một rủi ro về công nợ hợp đồng hoặc tiến độ giao hàng.
- Một khuyến nghị hành động thực tế có thể triển khai ngay cho đội ngũ kinh doanh.

Thông tin báo cáo:
{{reportsData}}`;

    if (settingsSnap.exists) {
      const settingsData = settingsSnap.data();
      if (settingsData?.insightPromptTemplate) {
        promptTemplate = settingsData.insightPromptTemplate;
      }
    } else {
      await adminDb.collection('settings').doc('reports_config').set({
        insightPromptTemplate: promptTemplate,
        updatedAt: new Date().toISOString(),
      });
    }

    const dto: InsightRequestDto = {
      version: 'v1',
      reportsData: reportsData,
      eventLogs: [] // Optional: fetch workflowEvents if needed, for now just pass empty or undefined as previous didn't have it.
    };

    const insightText = await aiService.generateReportInsight(dto, promptTemplate);

    return res.json({ success: true, insight: insightText });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('Gemini Insight generation error:', error);
    return res.status(500).json({ success: false, error: errMsg });
  }
});

// POST /api/reports/flush
router.post('/flush', async (_req, res) => {
  try {
    const todayString = new Date().toISOString().slice(0, 10);
    // Xoá field `generatedAt` để làm expired cache
    await adminDb.collection('metricsRollup').doc(`daily_${todayString}`).update({
      generatedAt: '1970-01-01T00:00:00.000Z'
    }).catch(() => {});
    await adminDb.collection('metrics').doc(`dashboard_kpis`).update({
      generatedAt: '1970-01-01T00:00:00.000Z'
    }).catch(() => {});

    // Khởi chạy ngầm để có dữ liệu sớm nếu SWR chưa gọi ngay
    await metricsRollupService.runRollup();

    return res.json({ success: true, message: 'Report cache flushed successfully' });
  } catch (err: unknown) {
    const errorDetails = err instanceof Error ? err.message : String(err);
    console.error('Failed to flush reports:', err);
    return res.status(500).json({ success: false, error: errorDetails });
  }
});

export default router;
