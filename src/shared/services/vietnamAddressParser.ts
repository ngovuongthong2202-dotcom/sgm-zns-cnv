/**
 * SGM Vietnam Hierarchical Right-to-Left Geocoding Engine
 * Tự động nhận diện Tỉnh / Thành phố từ chuỗi địa chỉ chi tiết tiếng Việt
 * 
 * Đặc tính kỹ thuật:
 * 1. Phân tích phân cấp từ Phải-Sang-Trái (Right-to-Left Hierarchical Anchor).
 * 2. Loại trừ bẫy tên đường (Street Name Collision Avoidance - e.g. "Đường Hà Nội tại TP.HCM").
 * 3. Hỗ trợ đầy đủ alias, viết tắt (tphcm, sg, hn, đn, br-vt) và các KCN trọng điểm.
 * 4. Tự động ánh xạ và đối sánh chính xác với danh mục API (normalize & canonicalize).
 */

import { normalizeProvinceName } from './vietnamProvincesApi';

// Từ điển Alias & Viết tắt cấp Tỉnh / Thành phố
const PROVINCE_ALIASES: Record<string, string[]> = {
  'TP Hồ Chí Minh': [
    'tp hồ chí minh', 'tp. hồ chí minh', 'thành phố hồ chí minh', 'tp.hồ chí minh',
    'tphcm', 'tp.hcm', 'tp hcm', 'tp-hcm', 'hcm', 'hcmc', 'ho chi minh',
    'sài gòn', 'saigon', 'sg',
    // Các quận / huyện đặc thù chỉ có ở TP.HCM
    'thủ đức', 'bình tân', 'tân bình', 'tân phú', 'bình thạnh', 'phú nhuận', 'gò vấp',
    'bình chánh', 'hóc môn', 'củ chi', 'nhà bè', 'cần giờ',
    'quận 1', 'quận 2', 'quận 3', 'quận 4', 'quận 5', 'quận 6', 'quận 7', 'quận 8', 'quận 9', 'quận 10', 'quận 11', 'quận 12',
    'q.1', 'q.2', 'q.3', 'q.4', 'q.5', 'q.6', 'q.7', 'q.8', 'q.9', 'q.10', 'q.11', 'q.12',
    'q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8', 'q9', 'q10', 'q11', 'q12',
    'phú lâm', 'an lạc', 'bình trị đông', 'tân tạo', 'tân quy', 'thảo điền'
  ],
  'Hà Nội': [
    'hà nội', 'ha noi', 'hn', 'thủ đô hà nội', 'tp hà nội', 'tp. hà nội', 'thành phố hà nội',
    'ba đình', 'hoàn kiếm', 'tây hồ', 'long biên', 'cầu giấy', 'đống đa', 'hai bà trưng',
    'hoàng mai', 'thanh xuân', 'sóc sơn', 'đông anh', 'gia lâm', 'nam từ liêm', 'bắc từ liêm',
    'thanh trì', 'mê linh', 'hà đông', 'sơn tây', 'ba vì', 'phúc thọ', 'đan phượng',
    'hoài đức', 'quốc oai', 'thạch thất', 'chương mỹ', 'thanh oai', 'thường tín', 'phú xuyên', 'ứng hòa', 'mỹ đức'
  ],
  'Đà Nẵng': [
    'đà nẵng', 'da nang', 'đn', 'tp đà nẵng', 'tp. đà nẵng', 'thành phố đà nẵng',
    'hải châu', 'thanh khê', 'sơn trà', 'ngũ hành sơn', 'liên chiểu', 'cẩm lệ', 'hòa vang', 'hoàng sa'
  ],
  'Bình Dương': [
    'bình dương', 'binh duong', 'bd',
    'thủ dầu một', 'thuận an', 'dĩ an', 'bến cát', 'tân uyên', 'bàu bàng', 'dầu tiếng', 'phú giáo',
    'kcn sóng thần', 'sóng thần', 'kcn vsip', 'vsip', 'kcn mỹ phước', 'mỹ phước', 'an tây'
  ],
  'Đồng Nai': [
    'đồng nai', 'dong nai', 'đn',
    'biên hòa', 'long khánh', 'long thành', 'nhơn trạch', 'trảng bom', 'thống nhất',
    'cẩm mỹ', 'vĩnh cửu', 'xuân lộc', 'định quán', 'tân phú đồng nai', 'kcn amata', 'amata', 'kcn gò dầu'
  ],
  'Hải Phòng': [
    'hải phòng', 'hai phong', 'hp', 'tp hải phòng', 'tp. hải phòng', 'thành phố hải phòng',
    'hồng bàng', 'ngô quyền', 'lê chân', 'hải an', 'kiến an', 'đồ sơn', 'dương kinh',
    'thủy nguyên', 'an dương', 'an lão', 'kiến thụy', 'tiên lãng', 'vĩnh bảo', 'cát hải', 'bạch long vĩ'
  ],
  'Cần Thơ': [
    'cần thơ', 'can tho', 'tp cần thơ', 'tp. cần thơ', 'thành phố cần thơ',
    'ninh kiều', 'bình thủy', 'cái răng', 'ô môn', 'thốt nốt', 'phong điền', 'thới lai', 'cờ đỏ', 'vĩnh thạnh'
  ],
  'Bà Rịa - Vũng Tàu': [
    'bà rịa - vũng tàu', 'bà rịa vũng tàu', 'vũng tàu', 'bà rịa', 'brvt', 'br-vt',
    'phú mỹ', 'thị xã phú mỹ', 'châu đức', 'xuyên mộc', 'đất đỏ', 'long điền', 'côn đảo', 'kcn phú mỹ'
  ],
  'Long An': [
    'long an', 'tân an', 'kiến tường', 'bến lức', 'đức hòa', 'cần giuộc', 'cần đước',
    'thủ thừa', 'tân trụ', 'châu thành long an', 'thạnh hóa', 'tân thạnh', 'mộc hóa', 'vĩnh hưng', 'tân hưng'
  ],
  'Bắc Ninh': [
    'bắc ninh', 'bac ninh', 'từ sơn', 'yên phong', 'quế võ', 'tiên du', 'thuận thành', 'gia bình', 'lương tài'
  ],
  'Quảng Ninh': [
    'quảng ninh', 'quang ninh', 'hạ long', 'cẩm phả', 'uông bí', 'móng cái', 'đông triều', 'quảng yên'
  ],
  'Khánh Hòa': [
    'khánh hòa', 'khanh hoa', 'nha trang', 'cam ranh', 'ninh hòa', 'vạn ninh', 'diên khánh', 'cam lâm'
  ],
  'Lâm Đồng': [
    'lâm đồng', 'lam dong', 'đà lạt', 'bảo lộc', 'đức trọng', 'di linh', 'đơn dương', 'lạc dương'
  ],
  'Thanh Hóa': [
    'thanh hóa', 'thanh hoa', 'sầm sơn', 'bỉm sơn', 'nghi sơn', 'tĩnh gia'
  ],
  'Nghệ An': [
    'nghệ an', 'nghe an', 'vinh', 'cửa lò', 'hoàng mai nghệ an', 'thái hòa'
  ],
  'Huế': [
    'huế', 'thừa thiên huế', 'thừa thiên - huế', 'tt huế', 'tt. huế', 'tp huế'
  ],
  'Tây Ninh': [
    'tây ninh', 'tay ninh', 'trảng bàng', 'hòa thành'
  ],
  'Tiền Giang': [
    'tiền giang', 'tien giang', 'mỹ tho', 'gò công', 'cai lậy'
  ],
  'An Giang': [
    'an giang', 'long xuyên', 'châu đốc', 'tân châu an giang'
  ],
  'Bến Tre': [
    'bến tre', 'ben tre', 'ba tri', 'mỏ cày'
  ],
  'Bình Thuận': [
    'bình thuận', 'binh thuan', 'phan thiết', 'la gi'
  ],
  'Bình Phước': [
    'bình phước', 'binh phuoc', 'đồng xoài', 'chơn thành', 'phước long', 'bình long'
  ],
  'Đắk Lắk': [
    'đắk lắk', 'đăk lăk', 'dak lak', 'daklak', 'buôn ma thuột', 'bmt'
  ],
  'Gia Lai': [
    'gia lai', 'pleiku', 'an khê', 'ayun pa'
  ],
  'Vĩnh Long': [
    'vĩnh long', 'vinh long', 'bình minh'
  ]
};

/**
 * Chuẩn hóa chuỗi văn bản phục vụ so khớp không dấu và loại bỏ ký tự lạ
 */
export function normalizeVietnameseString(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^\w\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Tìm tên Tỉnh / Thành phố chuẩn xác từ danh mục cung cấp
 */
function findCanonicalProvince(targetCanonicalName: string, provinceList: string[]): string | null {
  if (!Array.isArray(provinceList) || provinceList.length === 0) {
    return targetCanonicalName;
  }

  // 1. Khớp chính xác 100%
  const exact = provinceList.find(p => p.trim().toLowerCase() === targetCanonicalName.trim().toLowerCase());
  if (exact) return exact;

  // 2. Khớp qua normalizeProvinceName
  const normalizedTarget = normalizeProvinceName(targetCanonicalName).toLowerCase();
  const normalizedMatch = provinceList.find(p => normalizeProvinceName(p).toLowerCase() === normalizedTarget);
  if (normalizedMatch) return normalizedMatch;

  // 3. Khớp không dấu
  const nonAccentTarget = normalizeVietnameseString(targetCanonicalName);
  const nonAccentMatch = provinceList.find(p => normalizeVietnameseString(p) === nonAccentTarget);
  if (nonAccentMatch) return nonAccentMatch;

  // 4. Khớp bao hàm (vd: 'Thành phố Hồ Chí Minh' chứa 'Hồ Chí Minh')
  const partial = provinceList.find(p => {
    const pNorm = normalizeVietnameseString(p);
    return pNorm.includes(nonAccentTarget) || nonAccentTarget.includes(pNorm);
  });
  if (partial) return partial;

  return targetCanonicalName;
}

/**
 * Kiểm tra xem một từ khóa có bị rơi vào bẫy tên đường (Street Collision) hay không.
 * Vd: "Đường Hà Nội", "Phố Hà Nội", "Ngõ Hà Nội"
 */
function isStreetNameCollision(rawAddress: string, matchKeyword: string): boolean {
  const normAddr = normalizeVietnameseString(rawAddress);
  const normKey = normalizeVietnameseString(matchKeyword);

  const streetPrefixes = ['duong', 'pho', 'ngo', 'hem', 'ngach', 'so'];
  for (const prefix of streetPrefixes) {
    const pattern = new RegExp(`\\b${prefix}\\s+${normKey}\\b`, 'i');
    if (pattern.test(normAddr)) {
      return true;
    }
  }
  return false;
}

/**
 * Thuật toán nhận diện Tỉnh / Thành phố từ chuỗi địa chỉ chi tiết
 * Quét phân cấp Phải-Sang-Trái (Right-to-Left Hierarchical Scanning)
 * 
 * @param address Chuỗi địa chỉ chi tiết người dùng nhập / dán (ví dụ: "310 Nguyễn Văn Luông, Phú Lâm, Tphcm")
 * @param provinceList Danh sách Tỉnh thành hợp lệ lấy từ API hoặc SWR
 * @returns Tên tỉnh thành chuẩn hóa khớp với provinceList, hoặc null nếu không nhận diện được
 */
export function detectProvinceFromAddress(address: string, provinceList: string[] = []): string | null {
  if (!address || typeof address !== 'string') return null;
  const trimmed = address.trim();
  if (trimmed.length < 2) return null;

  // 1. Phân rã chuỗi địa chỉ thành các phân đoạn (Segments) ngăn cách bởi dấu phẩy, gạch ngang, chấm phẩy
  const rawSegments = trimmed
    .split(/[,;\-\n\t]+/)
    .map(s => s.trim())
    .filter(Boolean);

  // 2. ƯU TIÊN 1: Quét từ phân đoạn cuối cùng ngược về trước (Right-to-Left)
  // Vì trong văn hóa Việt Nam, phân đoạn cuối luôn là Tỉnh/Thành hoặc Quận/Huyện
  for (let i = rawSegments.length - 1; i >= Math.max(0, rawSegments.length - 3); i--) {
    const segment = rawSegments[i];
    const normSegment = normalizeVietnameseString(segment);

    // Kiểm tra trực tiếp với danh sách tỉnh thành chuẩn
    for (const [canonicalName, aliases] of Object.entries(PROVINCE_ALIASES)) {
      for (const alias of aliases) {
        const normAlias = normalizeVietnameseString(alias);
        // Khớp trọn vẹn phân đoạn hoặc phân đoạn kết thúc bằng alias
        if (normSegment === normAlias || normSegment.endsWith(` ${normAlias}`) || normSegment.startsWith(`${normAlias} `)) {
          // Kiểm tra xem phân đoạn này có phải là tên đường không
          if (isStreetNameCollision(segment, alias) && i < rawSegments.length - 1) {
            continue; // Bỏ qua nếu là tên đường ở giữa
          }
          return findCanonicalProvince(canonicalName, provinceList);
        }
      }
    }
  }

  // 3. ƯU TIÊN 2: Quét toàn bộ chuỗi địa chỉ tìm các alias đặc thù với độ ưu tiên dài nhất
  // Sắp xếp các alias theo độ dài giảm dần để ưu tiên cụm từ dài nhất (vd: 'tp hồ chí minh' trước 'hcm')
  const candidateMatches: { canonicalName: string; alias: string; matchIndex: number; isStreet: boolean }[] = [];

  for (const [canonicalName, aliases] of Object.entries(PROVINCE_ALIASES)) {
    for (const alias of aliases) {
      const normAddr = normalizeVietnameseString(trimmed);
      const normAlias = normalizeVietnameseString(alias);
      
      const regex = new RegExp(`\\b${normAlias}\\b`, 'i');
      const match = normAddr.match(regex);
      if (match && typeof match.index === 'number') {
        const isStreet = isStreetNameCollision(trimmed, alias);
        candidateMatches.push({
          canonicalName,
          alias,
          matchIndex: match.index,
          isStreet
        });
      }
    }
  }

  if (candidateMatches.length > 0) {
    // Lọc các match không phải là tên đường (hoặc nếu tất cả đều là tên đường thì chọn match nằm gần cuối chuỗi nhất)
    const nonStreetMatches = candidateMatches.filter(m => !m.isStreet);
    const validMatches = nonStreetMatches.length > 0 ? nonStreetMatches : candidateMatches;

    // Sắp xếp ưu tiên:
    // a. Nằm càng về phía cuối chuỗi càng tốt (Right-to-Left: matchIndex lớn hơn)
    // b. Độ dài alias càng dài càng chính xác
    validMatches.sort((a, b) => {
      const idxDiff = b.matchIndex - a.matchIndex;
      if (Math.abs(idxDiff) > 10) return idxDiff;
      return b.alias.length - a.alias.length;
    });

    const bestCandidate = validMatches[0];
    return findCanonicalProvince(bestCandidate.canonicalName, provinceList);
  }

  // 4. ƯU TIÊN 3: Đối soát trực tiếp với danh sách provinceList truyền vào
  for (const p of provinceList) {
    const normP = normalizeVietnameseString(p);
    const normAddr = normalizeVietnameseString(trimmed);
    const regex = new RegExp(`\\b${normP}\\b`, 'i');
    if (regex.test(normAddr)) {
      if (!isStreetNameCollision(trimmed, p)) {
        return p;
      }
    }
  }

  return null;
}
