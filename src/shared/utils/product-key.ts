export function getProductItemKey(p: { id?: string; productId?: string; productName: string }, index?: number): string {
  if (p.productId && p.productId.trim() !== '') {
    return p.productId.trim();
  }
  if (p.productName && p.productName.trim() !== '') {
    return p.productName.trim();
  }
  if (p.id && !p.id.includes('-') && p.id.length < 20) {
    return p.id;
  }
  return typeof index === 'number' ? String(index) : 'unknown';
}
