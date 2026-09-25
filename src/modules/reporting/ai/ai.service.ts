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
1. "loaiHinh": Trích xuất loại hình (CÔNG TY TNHH, CÔNG TY CỔ PHẦN, TẬP ĐOÀN ĐẦU TƯ, TẬP ĐOÀN, TỔNG CÔNG TY, HỘ KINH DOANH, CHI NHÁNH, DNTN, v.v.). Giữ nguyên chữ IN HOA.
2. "tenNgan": Tên còn lại sau khi bỏ Loại hình DN. Hãy viết tắt thông minh các cụm từ hành chính phổ biến:
- "Chi Nhánh Tỉnh / Chi Nhánh Thành phố / Chi Nhánh Tp." -> viết gọn thành "- CN"
- Lọc bỏ "Tỉnh", "Thành phố", "Thành Phố", "Tp." ra khỏi tên (VD: "Chi nhánh Tỉnh Đồng Tháp" -> "CN Đồng Tháp", "Chi nhánh Thành phố Hồ Chí Minh" -> "CN Hồ Chí Minh").
- "Một Thành Viên" -> "MTV"
- "Thương Mại Và Dịch Vụ" / "Thương Mại Dịch Vụ" -> "TM&DV" hoặc "TMDV"
- Vận dụng "Và" -> "&" nếu cần thiết.
- Tên viết tắt chuẩn proper case (Capitalize Each Word), chỉ viết hoa toàn bộ với các từ viết tắt chuyên ngành (CN, TM, DV, XNK, HCM).
Mục tiêu là có một cái tên dễ nhìn, gọn gàng và đầy đủ ý nghĩa kinh doanh.

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
      return {
        loaiHinh: typeof parsed.loaiHinh === 'string' ? parsed.loaiHinh.trim() : '',
        tenNgan: typeof parsed.tenNgan === 'string' && parsed.tenNgan.trim() ? parsed.tenNgan.trim() : rawName
      };
    } catch (e) {
      console.warn('Failed to parse name response from Gemini, using fallback', e);
      return { loaiHinh: "", tenNgan: rawName };
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
