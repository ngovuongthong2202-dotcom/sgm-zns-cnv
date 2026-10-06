import { describe, expect, it } from 'vitest';
import { resolveZaloError, ZALO_ERROR_MAP } from './zalo-error-dictionary';

describe('Zalo Error Dictionary & Diagnostic Telemetry', () => {
  it('correctly maps Zalo error code -118 (Zalo account not existed)', () => {
    const rawError = 'Response code: -118 | Message: Zalo account not existed';
    const result = resolveZaloError(rawError);
    expect(result.code).toBe(-118);
    expect(result.reason).toBe(ZALO_ERROR_MAP['-118'].vietnameseReason);
    expect(result.reason).toContain('Tài khoản Zalo không tồn tại');
  });

  it('correctly maps Zalo error code -1472 (Daily limit exceeded)', () => {
    const rawObj = {
      isSuccess: false,
      response: {
        errorMessage: 'Response code: -1472 | Message: Daily limit exceeded'
      }
    };
    const result = resolveZaloError(rawObj);
    expect(result.code).toBe(-1472);
    expect(result.reason).toContain('Vượt hạn mức');
  });

  it('correctly maps Zalo error code -110 (Invalid phone format)', () => {
    const rawStr = 'Error: -110 (invalid phone number)';
    const result = resolveZaloError(rawStr);
    expect(result.code).toBe(-110);
    expect(result.reason).toContain('định dạng');
  });

  it('correctly maps Zalo error code -1121 (customer_name data breaks max length)', () => {
    const rawError = 'Response code: -1121 | Message: customer_name data breaks max length';
    const result = resolveZaloError(rawError);
    expect(result.code).toBe(-1121);
    expect(result.reason).toContain('độ dài tối đa');
    expect(result.actionGuide).toContain('Chuẩn ZNS');
  });

  it('handles unknown error gracefully without throwing', () => {
    const result = resolveZaloError('Network connection reset');
    expect(result.code).toBe('FAIL');
    expect(result.reason).toContain('Network connection reset');
  });
});
