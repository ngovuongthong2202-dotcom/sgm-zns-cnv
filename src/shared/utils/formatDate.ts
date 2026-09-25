export function formatDate(dateString: any): string {
  if (!dateString) return '---';
  
  let str: string;
  if (typeof dateString === 'string') {
    str = dateString;
  } else if (typeof dateString?.toDate === 'function') {
    try {
      str = dateString.toDate().toISOString();
    } catch {
      return '---';
    }
  } else if (dateString instanceof Date) {
    str = dateString.toISOString();
  } else if (typeof dateString === 'object' && typeof dateString.seconds === 'number') {
    str = new Date(dateString.seconds * 1000).toISOString();
  } else {
    str = String(dateString);
  }

  if (!str) return '---';
  
  // Check if it's already dd/MM/yyyy
  if (str.includes('/') && str.split('/')[0].length <= 2) return str;
  
  // Explicitly handle yyyy-MM-dd without Date parsing to prevent timezone drift
  if (/^\d{4}-\d{2}-\d{2}$/.test(str.trim())) {
    const [y, m, d] = str.trim().split('-');
    return `${d}/${m}/${y}`;
  }

  // check if it's an ISO string Date
  try {
    const d = new Date(str);
    if (isNaN(d.valueOf())) return str; // fallback
    
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    
    return `${day}/${month}/${year}`;
  } catch (e) {
    return str;
  }
}
