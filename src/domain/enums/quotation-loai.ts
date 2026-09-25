export enum QUOTATION_LOAI {
  MAY = 'BG Máy',
  VAT_TU = 'BG Vật tư',
  DICH_VU = 'BG Dịch vụ',
}

export function normalizeLoai(loai?: string | null): QUOTATION_LOAI | undefined {
  if (!loai) return undefined;
  const lower = loai.toLowerCase().trim();
  if (lower === 'bg máy' || lower === 'bg may' || lower.includes('máy') || lower.includes('may')) return QUOTATION_LOAI.MAY;
  if (lower === 'bg vật tư' || lower === 'bg vat tu' || lower.includes('vật tư') || lower.includes('vat tu')) return QUOTATION_LOAI.VAT_TU;
  if (lower === 'bg dịch vụ' || lower === 'bg dich vu' || lower.includes('dịch vụ') || lower.includes('dich vu')) return QUOTATION_LOAI.DICH_VU;
  return loai as QUOTATION_LOAI;
}
