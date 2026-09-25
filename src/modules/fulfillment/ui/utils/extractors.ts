export function extractDeliveryTinhThanhList(customers: any[]): string[] {
  if (!customers || !Array.isArray(customers)) return [];
  const validProvinces = customers.map(c => c.tinhThanh).filter(Boolean);
  return Array.from(new Set(validProvinces)).sort();
}
