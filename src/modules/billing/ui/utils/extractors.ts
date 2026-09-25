/**
 * Extracts a unique, sorted list of provinces from a list of customers.
 */
export function extractPaymentTinhThanhList(customers: any[]): string[] {
  if (!customers || !Array.isArray(customers)) return [];
  const validProvinces = customers.map(c => c.tinhThanh).filter(Boolean);
  return Array.from(new Set(validProvinces)).sort();
}
