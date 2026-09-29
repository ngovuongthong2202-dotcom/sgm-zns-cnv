import { describe, it, expect } from 'vitest';
import { normalizePhone, formatPhoneDisplay, detectCarrier } from './SmartPhoneInput';

describe('SmartPhoneInput - Normalization, Carrier Detection & Cursor Formatting Logic', () => {
  it('normalizes various phone number formats into clean digits', () => {
    expect(normalizePhone('0902993093')).toBe('0902993093');
    expect(normalizePhone('0902 993 093')).toBe('0902993093');
    expect(normalizePhone('+84902993093')).toBe('0902993093');
    expect(normalizePhone('84902993093')).toBe('0902993093');
    expect(normalizePhone('0902.993.093')).toBe('0902993093');
    expect(normalizePhone('0902-993-093')).toBe('0902993093');
    expect(normalizePhone('')).toBe('');
  });

  it('formats clean phone strings into Vietnamese 4-3-3 ergonomic display format', () => {
    expect(formatPhoneDisplay('')).toBe('');
    expect(formatPhoneDisplay('0902')).toBe('0902');
    expect(formatPhoneDisplay('09029')).toBe('0902 9');
    expect(formatPhoneDisplay('0902993')).toBe('0902 993');
    expect(formatPhoneDisplay('0902993093')).toBe('0902 993 093');
    expect(formatPhoneDisplay('09029930939')).toBe('0902 993 0939');
  });

  it('accurately identifies Vietnamese mobile carriers', () => {
    // Viettel
    expect(detectCarrier('0981234567')?.name).toBe('Viettel');
    expect(detectCarrier('0861234567')?.name).toBe('Viettel');
    expect(detectCarrier('0381234567')?.name).toBe('Viettel');

    // VinaPhone
    expect(detectCarrier('0911234567')?.name).toBe('VinaPhone');
    expect(detectCarrier('0881234567')?.name).toBe('VinaPhone');
    expect(detectCarrier('0831234567')?.name).toBe('VinaPhone');

    // MobiFone
    expect(detectCarrier('0901234567')?.name).toBe('MobiFone');
    expect(detectCarrier('0791234567')?.name).toBe('MobiFone');
    expect(detectCarrier('0891234567')?.name).toBe('MobiFone');

    // Vietnamobile
    expect(detectCarrier('0921234567')?.name).toBe('Vietnamobile');
    expect(detectCarrier('0561234567')?.name).toBe('Vietnamobile');

    // Wintel
    expect(detectCarrier('0551234567')?.name).toBe('Wintel');

    // Gmobile
    expect(detectCarrier('0991234567')?.name).toBe('Gmobile');
  });

  it('calculates target cursor position accurately when editing digits at index 0 or 1', () => {
    // Simulating user changing '0' at index 0 to '0' or typing '9' at index 1
    const rawVal = '09802 993 093';
    const cursor = 3; // After '098'
    const digitsBeforeCursor = rawVal.slice(0, cursor).replace(/\D/g, '').length; // 3
    expect(digitsBeforeCursor).toBe(3);

    const normalized = normalizePhone(rawVal); // '09802993093'
    const formatted = formatPhoneDisplay(normalized); // '0980 299 3093'

    let newCursorPos = 0;
    let count = 0;
    for (let i = 0; i < formatted.length; i++) {
      if (/\d/.test(formatted[i])) count++;
      if (count === digitsBeforeCursor) {
        newCursorPos = i + 1;
        break;
      }
    }

    // After 3 digits '098', position should be 3 ('098' -> index 3)
    expect(newCursorPos).toBe(3);
  });
});
