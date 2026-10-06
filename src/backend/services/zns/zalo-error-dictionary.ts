/**
 * Zalo ZNS Error Code Dictionary
 * Maps official Zalo Notification Service error codes to user-friendly Vietnamese explanations and recommended actions.
 */
export interface ZaloErrorInfo {
  code: number | string;
  name: string;
  vietnameseReason: string;
  actionGuide: string;
}

export const ZALO_ERROR_MAP: Record<string, ZaloErrorInfo> = {
  '-118': {
    code: -118,
    name: 'Zalo account not existed',
    vietnameseReason: 'Tài khoản Zalo không tồn tại hoặc số điện thoại chưa đăng ký Zalo',
    actionGuide: 'Kiểm tra lại số điện thoại hoặc liên hệ khách hàng qua điện thoại bàn/cuộc gọi trực tiếp.'
  },
  '-110': {
    code: -110,
    name: 'Invalid phone format',
    vietnameseReason: 'Số điện thoại không đúng định dạng nhận tin ZNS',
    actionGuide: 'Kiểm tra lại đầu số di động Việt Nam (09x, 08x, 07x, 03x, 05x).'
  },
  '-1472': {
    code: -1472,
    name: 'Daily limit exceeded',
    vietnameseReason: 'Vượt hạn mức gửi tin ZNS của Zalo OA trong ngày',
    actionGuide: 'Liên hệ quản trị viên nâng hạn mức OA hoặc gửi lại vào ngày hôm sau.'
  },
  '-1121': {
    code: -1121,
    name: 'customer_name data breaks max length',
    vietnameseReason: 'Tên khách hàng vượt quá độ dài tối đa cho phép của Zalo (tối đa 30 ký tự)',
    actionGuide: 'Hệ thống đã tự động ưu tiên lấy trường "Chuẩn ZNS" (≤ 30 ký tự) từ hồ sơ khách hàng. Vui lòng kiểm tra lại trường "Chuẩn ZNS" trong hồ sơ khách hàng.'
  },
  '-1122': {
    code: -1122,
    name: 'Missing required template parameters',
    vietnameseReason: 'Thiếu tham số bắt buộc trong mẫu tin ZNS đã duyệt',
    actionGuide: 'Kiểm tra dữ liệu chứng từ nguồn (tên KH, số phiếu, ngày ký, v.v.).'
  },
  '-108': {
    code: -108,
    name: 'OA permission denied',
    vietnameseReason: 'Zalo OA chưa được cấp quyền hoặc mẫu tin chưa được phê duyệt',
    actionGuide: 'Kiểm tra trạng thái xác thực và quyền của Zalo Official Account.'
  },
  '-132': {
    code: -132,
    name: 'User blocked OA',
    vietnameseReason: 'Khách hàng đã chặn hoặc từ chối nhận thông báo từ Zalo OA',
    actionGuide: 'Liên hệ khách hàng mở chặn Zalo OA hoặc trao đổi qua kênh khác.'
  },
  '-124': {
    code: -124,
    name: 'Access token expired',
    vietnameseReason: 'Phiên kết nối Zalo OA (Access Token) đã hết hạn',
    actionGuide: 'Cập nhật lại Access Token trong ZNS Hub / Cài đặt.'
  },
  '-125': {
    code: -125,
    name: 'Template not existed or inactive',
    vietnameseReason: 'Mẫu tin không tồn tại hoặc đang bị tạm dừng trên Zalo',
    actionGuide: 'Kiểm tra lại mã ID mẫu tin (Template ID) trên CNV CDP / Zalo OA.'
  },
  '-104': {
    code: -104,
    name: 'Insufficient balance / quota',
    vietnameseReason: 'Tài khoản ZNS không đủ số dư để gửi tin',
    actionGuide: 'Nạp thêm tiền vào tài khoản Zalo Cloud Account (ZCA).'
  }
};

/**
 * Parses raw error text or object to extract Zalo error code and friendly explanation
 */
export function resolveZaloError(rawInput: unknown): {
  code: string | number;
  reason: string;
  actionGuide?: string;
  rawMessage: string;
} {
  if (!rawInput) {
    return {
      code: 'UNKNOWN',
      reason: 'Gửi tin ZNS không thành công (Lỗi chưa xác định)',
      rawMessage: ''
    };
  }

  const rawStr = typeof rawInput === 'object' ? JSON.stringify(rawInput) : String(rawInput);

  // 1. Try regex matching for numeric Zalo response codes, e.g. "Response code: -118", "code": -118, "code: -1472"
  const codeMatch = rawStr.match(/(?:response\s*code|error\s*code|code)["':\s]+(-?\d+)/i) ||
                    rawStr.match(/-118|-1472|-110|-1121|-1122|-108|-132|-124|-125|-104/);

  if (codeMatch) {
    const code = codeMatch[1] || codeMatch[0];
    const info = ZALO_ERROR_MAP[code];
    if (info) {
      return {
        code: info.code,
        reason: info.vietnameseReason,
        actionGuide: info.actionGuide,
        rawMessage: rawStr
      };
    }
  }

  // 2. Keyword matching fallbacks
  const lower = rawStr.toLowerCase();
  if (lower.includes('not existed') || lower.includes('not exist') || lower.includes('chưa đăng ký')) {
    const info = ZALO_ERROR_MAP['-118'];
    return {
      code: info.code,
      reason: info.vietnameseReason,
      actionGuide: info.actionGuide,
      rawMessage: rawStr
    };
  }

  if (lower.includes('limit') || lower.includes('hạn mức')) {
    const info = ZALO_ERROR_MAP['-1472'];
    return {
      code: info.code,
      reason: info.vietnameseReason,
      actionGuide: info.actionGuide,
      rawMessage: rawStr
    };
  }

  if (lower.includes('format') || lower.includes('định dạng')) {
    const info = ZALO_ERROR_MAP['-110'];
    return {
      code: info.code,
      reason: info.vietnameseReason,
      actionGuide: info.actionGuide,
      rawMessage: rawStr
    };
  }

  // Fallback to cleaned message
  const cleaned = rawStr.replace(/[{}"\\]/g, ' ').substring(0, 150).trim();
  return {
    code: 'FAIL',
    reason: cleaned || 'Gửi thất bại từ Zalo Gateway',
    rawMessage: rawStr
  };
}

export function translateZaloError(code: number | string, defaultMsg?: string): { explanation: string; actionGuide: string } {
  const codeStr = String(code);
  const found = ZALO_ERROR_MAP[codeStr];
  if (found) {
    return {
      explanation: found.vietnameseReason,
      actionGuide: found.actionGuide
    };
  }
  return {
    explanation: defaultMsg || 'Lỗi xử lý yêu cầu Zalo OpenAPI',
    actionGuide: 'Kiểm tra tài khoản Zalo Cloud hoặc liên hệ ban quản trị.'
  };
}
