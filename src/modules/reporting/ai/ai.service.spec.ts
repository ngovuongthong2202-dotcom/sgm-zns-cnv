import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AiService } from './ai.service';

vi.mock('@google/genai', () => {
  return {
    GoogleGenAI: vi.fn().mockImplementation(function() {
      return {
        models: {
          generateContent: vi.fn(),
        },
      };
    }),
  };
});

describe('AiService', () => {
  let aiService: AiService;
  let mockGenerateContent: any;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GEMINI_API_KEY = 'test-key';
    aiService = new AiService();
    // @ts-expect-error - access private member for testing purposes
    mockGenerateContent = aiService.ai.models.generateContent;
  });

  it('should format customer name successfully', async () => {
    mockGenerateContent.mockResolvedValue({
      text: '{"loaiHinh": "CÔNG TY TNHH", "tenNgan": "ABC"}'
    });

    const result = await aiService.formatCustomerName('CÔNG TY TNHH ABC');
    expect(result).toEqual({ loaiHinh: 'CÔNG TY TNHH', tenNgan: 'ABC' });
    expect(mockGenerateContent).toHaveBeenCalledWith({
      model: 'gemini-3.5-flash',
      contents: expect.stringContaining('CÔNG TY TNHH ABC'),
      config: { responseMimeType: 'application/json' }
    });
  });

  it('should format customer name with markdown code fences and trailing text', async () => {
    mockGenerateContent.mockResolvedValue({
      text: '```json\n{"loaiHinh": "CÔNG TY TNHH", "tenNgan": "ABC"}\n```\nHere is the result'
    });

    const result = await aiService.formatCustomerName('CÔNG TY TNHH ABC');
    expect(result).toEqual({ loaiHinh: 'CÔNG TY TNHH', tenNgan: 'ABC' });
  });

  it('should return default formatted name if parsing fails', async () => {
    mockGenerateContent.mockResolvedValue({
      text: 'Invalid JSON'
    });

    const result = await aiService.formatCustomerName('CÔNG TY TNHH ABC');
    expect(result).toEqual({ loaiHinh: '', tenNgan: 'CÔNG TY TNHH ABC' });
  });

  it('should generate report insight successfully', async () => {
    mockGenerateContent.mockResolvedValue({
      text: 'Test insight'
    });

    const dto = {
      version: 'v1' as const,
      reportsData: { test: true },
      eventLogs: [{ type: 'TEST_EVENT' }]
    };

    const template = 'Gợi ý: {{reportsData}}';
    const result = await aiService.generateReportInsight(dto, template);
    
    expect(result).toBe('Test insight');
    expect(mockGenerateContent).toHaveBeenCalledWith({
      model: 'gemini-3.5-flash',
      contents: expect.stringContaining('TEST_EVENT')
    });
  });

  it('should fall back gracefully if API key is missing', async () => {
    const aiServiceWithoutKey = new AiService({ apiKey: '' });
    // Overriding env var isn't enough, we passed explicit empty key to config manually if we wanted to test this, 
    // but the constructor falls back to process.env. Let's just unset process.env for this test.
    const oldKey = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    
    const disabledService = new AiService();
    expect(disabledService.isEnabled()).toBe(false);
    
    const insightResult = await disabledService.generateReportInsight({
      version: 'v1',
      reportsData: {}
    }, 'test template');
    
    expect(insightResult).toBe('Tính năng Phân tích AI đang tắt vì chưa cấu hình API Key.');

    await expect(disabledService.formatCustomerName('Test')).rejects.toThrow('AI Service is disabled');

    // restore
    process.env.GEMINI_API_KEY = oldKey;
  });
});
