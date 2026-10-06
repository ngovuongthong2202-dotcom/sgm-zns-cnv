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

/**
 * Chuẩn hóa ngày tháng năm strictly theo định dạng dd/mm/yyyy dành riêng cho ZNS
 * Tuyệt đối không trả về chuỗi '---' gây lỗi từ chối kiểm duyệt tham số của Zalo OA
 */
export function formatZnsDate(dateVal: any): string {
  if (!dateVal) {
    const now = new Date();
    const d = String(now.getDate()).padStart(2, '0');
    const m = String(now.getMonth() + 1).padStart(2, '0');
    return `${d}/${m}/${now.getFullYear()}`;
  }

  // 1. Trực tiếp format Date instance bằng Local Time để tránh lệch ngày do UTC ISOString
  if (dateVal instanceof Date) {
    if (!isNaN(dateVal.valueOf())) {
      const d = String(dateVal.getDate()).padStart(2, '0');
      const m = String(dateVal.getMonth() + 1).padStart(2, '0');
      return `${d}/${m}/${dateVal.getFullYear()}`;
    }
  }

  // 2. Firestore Timestamp / object có .toDate()
  if (typeof dateVal?.toDate === 'function') {
    try {
      const dObj = dateVal.toDate();
      if (dObj instanceof Date && !isNaN(dObj.valueOf())) {
        const d = String(dObj.getDate()).padStart(2, '0');
        const m = String(dObj.getMonth() + 1).padStart(2, '0');
        return `${d}/${m}/${dObj.getFullYear()}`;
      }
    } catch {
      // fallback
    }
  }

  // 3. Epoch seconds hoặc millis
  if (typeof dateVal === 'object' && typeof dateVal.seconds === 'number') {
    const dObj = new Date(dateVal.seconds * 1000);
    if (!isNaN(dObj.valueOf())) {
      const d = String(dObj.getDate()).padStart(2, '0');
      const m = String(dObj.getMonth() + 1).padStart(2, '0');
      return `${d}/${m}/${dObj.getFullYear()}`;
    }
  }

  if (typeof dateVal === 'number') {
    const dObj = new Date(dateVal);
    if (!isNaN(dObj.valueOf())) {
      const d = String(dObj.getDate()).padStart(2, '0');
      const m = String(dObj.getMonth() + 1).padStart(2, '0');
      return `${d}/${m}/${dObj.getFullYear()}`;
    }
  }

  const str: string = typeof dateVal === 'string' ? dateVal.trim() : String(dateVal).trim();
  if (!str || str === '---') {
    const now = new Date();
    const d = String(now.getDate()).padStart(2, '0');
    const m = String(now.getMonth() + 1).padStart(2, '0');
    return `${d}/${m}/${now.getFullYear()}`;
  }

  // 4. Nếu đã là d/m/yyyy hoặc dd/mm/yyyy: chuẩn hóa padding 2 số
  const dmyMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (dmyMatch) {
    const d = dmyMatch[1].padStart(2, '0');
    const m = dmyMatch[2].padStart(2, '0');
    const y = dmyMatch[3];
    return `${d}/${m}/${y}`;
  }

  // 5. Nếu là YYYY-MM-DD hoặc ISO YYYY-MM-DDTHH:mm:ss
  const ymdMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (ymdMatch) {
    const y = ymdMatch[1];
    const m = ymdMatch[2].padStart(2, '0');
    const d = ymdMatch[3].padStart(2, '0');
    return `${d}/${m}/${y}`;
  }

  // 6. Parse Date string bằng Date constructor
  try {
    const dObj = new Date(str);
    if (!isNaN(dObj.valueOf())) {
      const d = String(dObj.getDate()).padStart(2, '0');
      const m = String(dObj.getMonth() + 1).padStart(2, '0');
      return `${d}/${m}/${dObj.getFullYear()}`;
    }
  } catch {
    // fallback
  }

  const now = new Date();
  const d = String(now.getDate()).padStart(2, '0');
  const m = String(now.getMonth() + 1).padStart(2, '0');
  return `${d}/${m}/${now.getFullYear()}`;
}
