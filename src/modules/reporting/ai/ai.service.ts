import { GoogleGenAI } from '@google/genai';

export interface AiServiceConfig {
  apiKey?: string;
}

export interface InsightRequestDto {
  version: 'v1';
  reportsData: any;
  eventLogs?: any[];
}

export class AiService {
  private ai: GoogleGenAI | null = null;
  
  constructor(config?: AiServiceConfig) {
    const key = config?.apiKey || process.env.GEMINI_API_KEY;
    if (key) {
      this.ai = new GoogleGenAI({ 
        apiKey: key, 
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } } 
      });
    }
  }

  public isEnabled(): boolean {
    return this.ai !== null;
  }

  /**
   * Format customer name to extract Business Type and Display Name using AI
   */
  async formatCustomerName(rawName: string): Promise<{ loaiHinh: string, tenNgan: string }> {
    if (!this.ai) throw new Error('AI Service is disabled (missing API key)');
    
    const prompt = `Bạn là hệ thống chuẩn hóa dữ liệu doanh nghiệp B2B (Data Cleansing System). 
Nhiệm vụ: Trích xuất "Loại hình doanh nghiệp" và viết tắt thông minh "Tên hiển thị" từ chuỗi tên đầy đủ để làm tên lưu trong CRM.
Quy tắc:
1. "loaiHinh": Trích xuất loại hình doanh nghiệp chuẩn hóa (CHỈ CHỌN 1 TRONG CÁC LOẠI HÌNH: CÔNG TY CỔ PHẦN, CÔNG TY TNHH MỘT THÀNH VIÊN, CÔNG TY TNHH HAI THÀNH VIÊN TRỞ LÊN, CÔNG TY TNHH, DOANH NGHIỆP TƯ NHÂN, CÔNG TY HỢP DANH, HỘ KINH DOANH, HỢP TÁC XÃ / LIÊN HIỆP HTX, CHI NHÁNH / VĂN PHÒNG ĐẠI DIỆN, CƠ SỞ SẢN XUẤT / KINH DOANH, KHÁC).
2. "tenNgan": Tên còn lại sau khi bỏ Loại hình DN. BẮT BUỘC DƯỚI 30 KÝ TỰ (tối đa 29 ký tự). Hãy viết tắt thông minh các cụm từ hành chính/ngành nghề:
- "Thương Mại Và Dịch Vụ" / "Thương Mại Dịch Vụ" -> "TM&DV"
- "Sản Xuất Thương Mại" -> "SX-TM"
- "Sản Xuất" -> "SX", "Xây Dựng" -> "XD", "Kỹ Thuật" -> "KT", "Xuất Nhập Khẩu" -> "XNK", "Đầu Tư" -> "ĐT", "Vận Tải" -> "VT"
- "Chi Nhánh Tỉnh / Chi Nhánh Tp." -> "- CN"
- Lọc bỏ "Tỉnh", "Thành phố", "Thành Phố", "Tp." ra khỏi tên nếu không cần thiết.
- Tên viết tắt chuẩn proper case (Capitalize Each Word), chỉ viết hoa với từ viết tắt (TM, DV, SX, XD, XNK, KT, CN).
- ĐẢM BẢO CHIỀU DÀI "tenNgan" LUÔN NHỎ HƠN 30 KÝ TỰ.

Trả về chuỗi thuần JSON với cấu trúc { "loaiHinh": string, "tenNgan": string }. KHÔNG định dạng với thẻ markdown hay text nào khác.

Đầu vào cần xử lý: "${rawName}"`;

    const response = await this.ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json' }
    });
    
    try {
      const resultText = response.text || "{}";
      // Extract clean JSON substring if extra characters or markdown blocks exist
      let clean = resultText.trim();
      const match = clean.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
      if (match && match[1]) {
        clean = match[1].trim();
      }
      const firstBrace = clean.indexOf('{');
      const lastBrace = clean.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace >= firstBrace) {
        clean = clean.substring(firstBrace, lastBrace + 1);
      }
      const parsed = JSON.parse(clean);
      const loaiHinh = typeof parsed.loaiHinh === 'string' ? parsed.loaiHinh.trim() : '';
      let tenNgan = typeof parsed.tenNgan === 'string' && parsed.tenNgan.trim() ? parsed.tenNgan.trim() : rawName;
      
      // Bảo đảm tenNgan dưới 30 ký tự (< 30)
      if (tenNgan.length > 29) {
        const truncated = tenNgan.slice(0, 29);
        const lastSpace = truncated.lastIndexOf(' ');
        if (lastSpace > 12) {
          tenNgan = truncated.slice(0, lastSpace).trim();
        } else {
          tenNgan = truncated.trim();
        }
      }

      return { loaiHinh, tenNgan };
    } catch (e) {
      console.warn('Failed to parse name response from Gemini, using fallback', e);
      return { loaiHinh: "", tenNgan: rawName.length > 29 ? rawName.slice(0, 29).trim() : rawName };
    }
  }

  /**
   * Generates business insight based on standard DTO containing reports and event log.
   */
  async generateReportInsight(
    dto: InsightRequestDto,
    promptTemplate: string
  ): Promise<string> {
    if (!this.ai) {
      return 'Tính năng Phân tích AI đang tắt vì chưa cấu hình API Key.';
    }

    // Format DTO into a standard string representation
    const summaryPayload = {
      version: dto.version,
      reportsData: dto.reportsData,
      eventLogSummary: dto.eventLogs && dto.eventLogs.length > 0 ? dto.eventLogs.slice(0, 50) : 'No events provided'
    };
    
    const reportsSummary = JSON.stringify(summaryPayload, null, 2);
    const promptText = promptTemplate.replace('{{reportsData}}', reportsSummary);

    const response = await this.ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: promptText,
    });

    return response.text || '';
  }
}

export const aiService = new AiService();
