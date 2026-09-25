import { Router } from 'express';
import axios from 'axios';
import { getErpConfig } from '../services/erp/erp.config';

const router = Router();

router.get('/erp-lookup/:so', async (req, res) => {
  try {
    const rawSo = req.params.so || '';
    // Trim/clear khoảng trắng đầu-cuối + ký tự ẩn (zero-width, NBSP...)
    const cleanSo = rawSo.replace(/[\u200B-\u200D\uFEFF\u00A0]/g, '').trim();

    if (!cleanSo) {
      return res.status(400).json({ success: false, error: 'Mã số báo giá không hợp lệ' });
    }

    const erpConfig = await getErpConfig();
    const erpUrl = `${erpConfig.quotationUrl}/${encodeURIComponent(cleanSo)}`;
    const response = await axios.get(erpUrl, {
      timeout: (erpConfig.timeoutSeconds || 10) * 1000,
      validateStatus: () => true // Handle statuses explicitly without throwing uncaught errors
    });

    if (response.status === 200 && response.data) {
      return res.json({ success: true, data: response.data });
    }

    if (response.status === 404) {
      return res.status(404).json({ success: false, error: `Không tìm thấy báo giá "${cleanSo}" trên hệ thống ERP` });
    }

    const upstreamMsg = response.data?.message || response.data?.error || `Hệ thống ERP trả về trạng thái ${response.status}`;
    console.warn(`ERP Lookup non-200 response for "${cleanSo}":`, response.status, upstreamMsg);
    return res.status(200).json({ success: false, error: upstreamMsg });
  } catch (error: any) {
    const errorMsg = error.code === 'ECONNABORTED'
      ? 'Hết thời gian chờ kết nối máy chủ ERP (quá 10s)'
      : (error.message || 'Lỗi kết nối tới hệ thống ERP');
    console.warn('ERP Lookup Connection Error:', errorMsg);
    return res.status(200).json({ success: false, error: errorMsg });
  }
});

export default router;
