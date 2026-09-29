/**
 * SGM Vietnam Hierarchical Right-to-Left Geocoding & Logistics Intelligence Engine
 * Tự động nhận diện Tỉnh/Thành, Quận/Huyện, Cụm Khu Công Nghiệp và Phân vùng Vận tải Chành xe
 * 
 * Đặc tính kỹ thuật:
 * 1. Phân tích phân cấp từ Phải-Sang-Trái (Right-to-Left Hierarchical Anchor).
 * 2. Loại trừ bẫy tên đường (Street Name Collision Avoidance - e.g. "Đường Hà Nội tại TP.HCM").
 * 3. Hỗ trợ đầy đủ alias, viết tắt (tphcm, sg, hn, đn, br-vt) và các KCN trọng điểm.
 * 4. Bóc tách 3 cấp độ: [Tỉnh/Thành] + [Quận/Huyện/Thị Xã] + [Cụm Khu Công Nghiệp].
 * 5. Tự động ánh xạ Vùng Vận Tải Logistics & Gợi ý Chành xe chuyên tuyến cơ khí SGM.
 */

import { normalizeProvinceName } from './vietnamProvincesApi';

// Từ điển Alias & Viết tắt cấp Tỉnh / Thành phố
export const PROVINCE_ALIASES: Record<string, string[]> = {
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
    'quảng ninh', 'quang ninh', 'hạ long', 'cẩm phả', 'uông bí', 'móng cái', 'đông triều', 'quảng yên', 'vân đồn', 'tiên yên', 'hải hà', 'đầm hà', 'bình liêu', 'ba chẽ', 'cô tô'
  ],
  'Khánh Hòa': [
    'khánh hòa', 'khanh hoa', 'nha trang', 'cam ranh', 'ninh hòa', 'vạn ninh', 'diên khánh', 'cam lâm', 'khánh vĩnh', 'khánh sơn'
  ],
  'Lâm Đồng': [
    'lâm đồng', 'lam dong', 'đà lạt', 'bảo lộc', 'đức trọng', 'di linh', 'đơn dương', 'lạc dương', 'bảo lâm', 'đạ huoai', 'đạ tẻh', 'cát tiên', 'đam rông'
  ],
  'Thanh Hóa': [
    'thanh hóa', 'thanh hoa', 'sầm sơn', 'bỉm sơn', 'nghi sơn', 'tĩnh gia', 'hà trung', 'hậu lộc', 'hoằng hóa', 'nga sơn', 'triệu sơn', 'thọ xuân', 'yên định'
  ],
  'Nghệ An': [
    'nghệ an', 'nghe an', 'tp vinh', 'tp. vinh', 'thành phố vinh', 'cửa lò', 'hoàng mai nghệ an', 'thái hòa', 'diễn châu', 'quỳnh lưu', 'yên thành', 'nghi lộc', 'đô lương', 'thanh chương'
  ],
  'Hà Tĩnh': [
    'hà tĩnh', 'ha tinh', 'kỳ anh', 'hồng lĩnh', 'cẩm xuyên', 'thạch hà', 'nghi xuân', 'đức thọ', 'hương sơn', 'hương khê'
  ],
  'Huế': [
    'huế', 'thừa thiên huế', 'thừa thiên - huế', 'tt huế', 'tt. huế', 'tp huế', 'hương thủy', 'hương trà', 'phong điền huế', 'quảng điền', 'phú vang', 'phú lộc'
  ],
  'Quảng Nam': [
    'quảng nam', 'quang nam', 'hội an', 'tam kỳ', 'điện bàn', 'núi thành', 'thăng bình', 'đại lộc', 'duy xuyên'
  ],
  'Quảng Ngãi': [
    'quảng ngãi', 'quang ngai', 'đức phổ', 'bình sơn', 'sơn tịnh', 'tư nghĩa', 'mộ đức', 'nghĩa hành'
  ],
  'Bình Định': [
    'bình định', 'binh dinh', 'quy nhơn', 'an nhơn', 'hoài nhơn', 'tây sơn', 'phù mỹ', 'phù cát', 'tuy phước'
  ],
  'Phú Yên': [
    'phú yên', 'phu yen', 'tuy hòa', 'sông cầu', 'đông hòa', 'tây hòa', 'phú hòa', 'tuy an'
  ],
  'Ninh Thuận': [
    'ninh thuận', 'ninh thuan', 'phan rang', 'tháp chàm', 'ninh hải', 'ninh phước', 'thuận nam', 'thuận bắc'
  ],
  'Tây Ninh': [
    'tây ninh', 'tay ninh', 'trảng bàng', 'hòa thành', 'gò dầu', 'bến cầu', 'châu thành tây ninh', 'tân biên', 'tân châu'
  ],
  'Tiền Giang': [
    'tiền giang', 'tien giang', 'mỹ tho', 'gò công', 'cai lậy', 'châu thành tiền giang', 'chợ gạo', 'cái bè', 'tân phước', 'gò công đông', 'gò công tây'
  ],
  'Bến Tre': [
    'bến tre', 'ben tre', 'ba tri', 'mỏ cày', 'mỏ cày nam', 'mỏ cày bắc', 'châu thành bến tre', 'giồng trôm', 'bình đại', 'thạnh phú', 'chợ lách'
  ],
  'Đồng Tháp': [
    'đồng tháp', 'dong thap', 'cao lãnh', 'sa đéc', 'hồng ngự', 'lấp vò', 'lai vung', 'châu thành đồng tháp', 'thanh bình', 'tháp mười', 'tam nông'
  ],
  'Vĩnh Long': [
    'vĩnh long', 'vinh long', 'tp vĩnh long', 'thành phố vĩnh long', 'tp. vĩnh long', 'vl', 'long hồ', 'huyện long hồ', 'xã long hồ', 'tt long hồ', 'bình minh', 'tx bình minh', 'thị xã bình minh', 'mang thít', 'huyện mang thít', 'tam bình', 'huyện tam bình', 'trà ôn', 'huyện trà ôn', 'vũng liêm', 'huyện vũng liêm', 'bình tân vĩnh long', 'bình tân vl'
  ],
  'Trà Vinh': [
    'trà vinh', 'tra vinh', 'duyên hải', 'càng long', 'châu thành trà vinh', 'cầu kè', 'tiểu cần', 'cầu ngang', 'trà cú'
  ],
  'Hậu Giang': [
    'hậu giang', 'hau giang', 'vị thanh', 'ngã bảy', 'châu thành hậu giang', 'châu thành a', 'phụng hiệp', 'vị thủy', 'long mỹ'
  ],
  'Sóc Trăng': [
    'sóc trăng', 'soc trang', 'ngã năm', 'vĩnh châu', 'mỹ xuyên', 'trần đề', 'long phú', 'kế sách', 'châu thành sóc trăng', 'mỹ tú', 'thạnh trị'
  ],
  'Bạc Liêu': [
    'bạc liêu', 'bac lieu', 'giá rai', 'hòa bình bạc liêu', 'đông hải', 'vĩnh lợi', 'phước long bạc liêu', 'hồng dân'
  ],
  'Cà Mau': [
    'cà mau', 'ca mau', 'năm căn', 'cái nước', 'đầm dơi', 'trần văn thời', 'thới bình', 'u minh', 'ngọc hiển', 'phú tân cà mau'
  ],
  'An Giang': [
    'an giang', 'long xuyên', 'châu đốc', 'tân châu an giang', 'châu phú', 'châu thành an giang', 'chợ mới an giang', 'thoại sơn', 'phú tân an giang', 'tri tôn', 'tịnh biên'
  ],
  'Kiên Giang': [
    'kiên giang', 'kien giang', 'rạch giá', 'hà tiên', 'phú quốc', 'kiên lương', 'hòn đất', 'tân hiệp', 'châu thành kiên giang', 'giồng riềng', 'gò quao', 'an biên', 'an minh', 'vĩnh thuận'
  ],
  'Bình Thuận': [
    'bình thuận', 'binh thuan', 'phan thiết', 'la gi', 'hàm thuận bắc', 'hàm thuận nam', 'bắc bình', 'tuy phong', 'tánh linh', 'hàm tân', 'đức linh', 'phú quý'
  ],
  'Bình Phước': [
    'bình phước', 'binh phuoc', 'đồng xoài', 'chơn thành', 'phước long', 'bình long', 'hớn quản', 'đồng phú', 'bù đăng', 'bù đốp', 'bù gia mập', 'lộc ninh'
  ],
  'Đắk Lắk': [
    'đắk lắk', 'đăk lăk', 'dak lak', 'daklak', 'buôn ma thuột', 'bmt', 'buôn hồ', 'krông pắc', 'krông ana', 'krông búp', 'krông năng', 'krông bông', 'ea kar', 'ea hleo', 'cư mgar', 'cư kuin'
  ],
  'Đắk Nông': [
    'đắk nông', 'đăk nông', 'dak nong', 'gia nghĩa', 'đắk r lấp', 'đắk mil', 'cư jút', 'đắk song', 'krông nô', 'tuy đức', 'đắk glong'
  ],
  'Gia Lai': [
    'gia lai', 'pleiku', 'an khê', 'ayun pa', 'chư sê', 'chư păh', 'chư prông', 'chư pưh', 'đak đoa', 'đak pơ', 'đức cơ', 'ia grai', 'ia pa', 'kbang', 'kông chro', 'krông pa', 'phú thiện'
  ],
  'Kon Tum': [
    'kon tum', 'kontum', 'đắk hà', 'đắk tô', 'ngọc hồi', 'sa thầy', 'kon plông', 'kon rẫy', 'tu mơ rông', 'ia h drai'
  ],
  'Hưng Yên': [
    'hưng yên', 'hung yen', 'mỹ hào', 'văn giang', 'văn lâm', 'yên mỹ', 'khoái châu', 'ân thi', 'kim động', 'tiên lữ', 'phù cừ'
  ],
  'Hải Dương': [
    'hải dương', 'hai duong', 'chí linh', 'kinh môn', 'cẩm giàng', 'bình giang', 'nam sách', 'kim thành', 'thanh hà', 'thanh miện', 'gia lộc', 'tứ kỳ', 'ninh giang'
  ],
  'Nam Định': [
    'nam định', 'nam dinh', 'mỹ lộc', 'vụ bản', 'ý yên', 'nghĩa hưng', 'nam trực', 'trực ninh', 'xuân trường', 'giao thủy', 'hải hậu'
  ],
  'Thái Bình': [
    'thái bình', 'thai binh', 'vũ thư', 'kiến xương', 'tiền hải', 'đông hưng', 'quỳnh phụ', 'hưng hà', 'thái thụy'
  ],
  'Hà Nam': [
    'hà nam', 'ha nam', 'phủ lý', 'duy tiên', 'kim bảng', 'thanh liêm', 'bình lục', 'lý nhân'
  ],
  'Ninh Bình': [
    'ninh bình', 'ninh binh', 'tam điệp', 'hoa lư', 'gia viễn', 'nho quan', 'yên khánh', 'kim sơn', 'yên mô'
  ],
  'Vĩnh Phúc': [
    'vĩnh phúc', 'vinh phuc', 'vĩnh yên', 'phúc yên', 'bình xuyên', 'lập thạch', 'sông lô', 'tam dương', 'tam đảo', 'vĩnh tường', 'yên lạc'
  ],
  'Phú Thọ': [
    'phú thọ', 'phu tho', 'việt trì', 'thị xã phú thọ', 'lâm thao', 'phù ninh', 'tam nông', 'thanh thủy', 'thanh ba', 'hạ hòa', 'cẩm khê', 'đoan hùng', 'thanh sơn', 'yên lập', 'tân sơn'
  ],
  'Bắc Giang': [
    'bắc giang', 'bac giang', 'việt yên', 'hiệp hòa', 'lạng giang', 'lục nam', 'lục ngạn', 'tân yên', 'yên dũng', 'yên thế', 'sơn động'
  ],
  'Thái Nguyên': [
    'thái nguyên', 'thai nguyen', 'sông công', 'phổ yên', 'đại từ', 'định hóa', 'đồng hỷ', 'phú bình', 'phú lương', 'võ nhai'
  ],
  'Hòa Bình': [
    'hòa bình', 'hoa binh', 'lương sơn', 'cao phong', 'đà bắc', 'kim bôi', 'lạc sơn', 'lạc thủy', 'mai châu', 'tân lạc', 'yên thủy'
  ],
  'Sơn La': [
    'sơn la', 'son la', 'mộc châu', 'thuận châu', 'mường la', 'yên châu', 'sông mã', 'mai sơn', 'phù yên', 'bắc yên', 'vân hồ', 'quỳnh nhai', 'sốp cộp'
  ],
  'Lào Cai': [
    'lào cai', 'lao cai', 'sa pa', 'sapa', 'bát xát', 'bảo thắng', 'bảo yên', 'bắc hà', 'mường khương', 'si ma cai', 'văn bàn'
  ],
  'Yên Bái': [
    'yên bái', 'yen bai', 'nghĩa lộ', 'lục yên', 'mù cang chải', 'trấn yên', 'trạm tấu', 'văn chấn', 'văn yên', 'yên bình'
  ],
  'Tuyên Quang': [
    'tuyên quang', 'tuyen quang', 'chiêm hóa', 'hàm yên', 'lâm bình', 'na hang', 'sơn dương', 'yên sơn'
  ],
  'Hà Giang': [
    'hà giang', 'ha giang', 'bắc mê', 'bắc quang', 'đồng văn', 'hoàng su phì', 'mèo vạc', 'quản bạ', 'quang bình', 'vị xuyên', 'xín mần'
  ],
  'Lạng Sơn': [
    'lạng sơn', 'lang son', 'bắc sơn', 'bình gia', 'cao lộc', 'chi lăng', 'đình lập', 'hữu lũng', 'lộc bình', 'tràng định', 'văn lãng', 'văn quan'
  ]
};

// Từ điển Cụm Khu Công Nghiệp trọng điểm (Cơ khí & Chế tạo SGM)
export const INDUSTRIAL_ZONES = [
  { name: 'KCN VSIP 1 (Bình Dương)', aliases: ['vsip 1', 'vsip i', 'kcn vsip 1', 'kcn vsip thuận an'] },
  { name: 'KCN VSIP 2 (Bình Dương)', aliases: ['vsip 2', 'vsip ii', 'kcn vsip 2', 'vsip bến cát'] },
  { name: 'KCN Sóng Thần (Dĩ An)', aliases: ['sóng thần', 'song than', 'kcn sóng thần 1', 'kcn sóng thần 2'] },
  { name: 'KCN Tân Bình (TP.HCM)', aliases: ['kcn tân bình', 'kcn tan binh'] },
  { name: 'KCN Tân Tạo (Bình Tân)', aliases: ['kcn tân tạo', 'kcn tan tao'] },
  { name: 'KCN Hiệp Phước (Nhà Bè)', aliases: ['kcn hiệp phước', 'kcn hiep phuoc'] },
  { name: 'KCN Vĩnh Lộc (Bình Chánh)', aliases: ['kcn vĩnh lộc', 'kcn vinh loc'] },
  { name: 'KCN Tây Bắc Củ Chi', aliases: ['kcn tây bắc củ chi', 'tây bắc củ chi'] },
  { name: 'KCN Amata (Biên Hòa)', aliases: ['amata', 'kcn amata', 'khu công nghiệp amata'] },
  { name: 'KCN Nhơn Trạch (Đồng Nai)', aliases: ['nhơn trạch', 'kcn nhơn trạch 1', 'kcn nhơn trạch 2', 'kcn nhơn trạch 3'] },
  { name: 'KCN Long Thành (Đồng Nai)', aliases: ['kcn long thành', 'kcn long thanh'] },
  { name: 'KCN Tân Đức (Đức Hòa - Long An)', aliases: ['kcn tân đức', 'tân đức đức hòa', 'tan duc'] },
  { name: 'KCN Hải Sơn (Long An)', aliases: ['kcn hải sơn', 'hải sơn đức hòa'] },
  { name: 'KCN Long Hậu (Cần Giuộc)', aliases: ['kcn long hậu', 'kcn long hau'] }
];

// Danh mục Quận/Huyện/Thị Xã trọng điểm
export const DISTRICT_MAP: Record<string, string[]> = {
  // TP.HCM
  'Quận 1': ['quận 1', 'q1', 'q.1'],
  'Quận 3': ['quận 3', 'q3', 'q.3'],
  'Quận 5': ['quận 5', 'q5', 'q.5'],
  'Quận 6': ['quận 6', 'q6', 'q.6'],
  'Quận 7': ['quận 7', 'q7', 'q.7'],
  'Quận 8': ['quận 8', 'q8', 'q.8'],
  'Quận 10': ['quận 10', 'q10', 'q.10'],
  'Quận 11': ['quận 11', 'q11', 'q.11'],
  'Quận 12': ['quận 12', 'q12', 'q.12'],
  'Bình Tân': ['bình tân', 'binh tan', 'phú lâm', 'an lạc'],
  'Tân Bình': ['tân bình', 'tan binh'],
  'Tân Phú': ['tân phú', 'tan phu'],
  'Gò Vấp': ['gò vấp', 'go vap'],
  'Bình Thạnh': ['bình thạnh', 'binh thanh'],
  'Phú Nhuận': ['phú nhuận', 'phu nhuan'],
  'TP Thủ Đức': ['thủ đức', 'thu duc', 'tp thủ đức', 'thảo điền'],
  'Bình Chánh': ['bình chánh', 'binh chanh'],
  'Hóc Môn': ['hóc môn', 'hoc mon'],
  'Củ Chi': ['củ chi', 'cu chi'],
  'Nhà Bè': ['nhà bè', 'nha be'],
  'Cần Giờ': ['cần giờ', 'can gio'],
  // Bình Dương
  'TP Thủ Dầu Một': ['thủ dầu một', 'thu dau mot'],
  'TP Thuận An': ['thuận an', 'thuan an'],
  'TP Dĩ An': ['dĩ an', 'di an'],
  'TP Bến Cát': ['bến cát', 'ben cat'],
  'TP Tân Uyên': ['tân uyên', 'tan uyen'],
  'Huyện Bàu Bàng': ['bàu bàng', 'bau bang'],
  // Đồng Nai
  'TP Biên Hòa': ['biên hòa', 'bien hoa'],
  'TP Long Khánh': ['long khánh', 'long khanh'],
  'Huyện Nhơn Trạch': ['nhơn trạch', 'nhon trach'],
  'Huyện Long Thành': ['long thành', 'long thanh'],
  'Huyện Trảng Bom': ['trảng bom', 'trang bom'],
  // Long An
  'Huyện Đức Hòa': ['đức hòa', 'duc hoa'],
  'Huyện Bến Lức': ['bến lức', 'ben luc'],
  'Huyện Cần Giuộc': ['cần giuộc', 'can giuoc'],
  'Huyện Cần Đước': ['cần đước', 'can duoc'],
  'TP Tân An': ['tân an', 'tan an'],
  // Vĩnh Long
  'Huyện Long Hồ': ['long hồ', 'long ho', 'huyện long hồ', 'xã long hồ', 'tt long hồ'],
  'TX Bình Minh': ['bình minh', 'binh minh', 'thị xã bình minh'],
  'Huyện Mang Thít': ['mang thít', 'mang thit'],
  'Huyện Tam Bình': ['tam bình', 'tam binh'],
  'Huyện Trà Ôn': ['trà ôn', 'tra on'],
  'Huyện Vũng Liêm': ['vũng liêm', 'vung liem']
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

  // 4. Khớp bao hàm
  const partial = provinceList.find(p => {
    const pNorm = normalizeVietnameseString(p);
    return pNorm.includes(nonAccentTarget) || nonAccentTarget.includes(pNorm);
  });
  if (partial) return partial;

  return targetCanonicalName;
}

/**
 * Kiểm tra xem một từ khóa có bị rơi vào bẫy tên đường (Street Collision) hay không.
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
 */
export function detectProvinceFromAddress(address: string, provinceList: string[] = []): string | null {
  if (!address || typeof address !== 'string') return null;
  const trimmed = address.trim();
  if (trimmed.length < 2) return null;

  // 1. Phân rã chuỗi địa chỉ thành các phân đoạn (Segments)
  const rawSegments = trimmed
    .split(/[,;\-\n\t]+/)
    .map(s => s.trim())
    .filter(Boolean);

  // 2. ƯU TIÊN 1: Quét từ phân đoạn cuối cùng ngược về trước (Right-to-Left)
  for (let i = rawSegments.length - 1; i >= Math.max(0, rawSegments.length - 3); i--) {
    const segment = rawSegments[i];
    const normSegment = normalizeVietnameseString(segment);

    for (const [canonicalName, aliases] of Object.entries(PROVINCE_ALIASES)) {
      for (const alias of aliases) {
        const normAlias = normalizeVietnameseString(alias);
        if (normSegment === normAlias || normSegment.endsWith(` ${normAlias}`) || normSegment.startsWith(`${normAlias} `)) {
          if (isStreetNameCollision(segment, alias) && i < rawSegments.length - 1) {
            continue;
          }
          return findCanonicalProvince(canonicalName, provinceList);
        }
      }
    }
  }

  // 3. ƯU TIÊN 2: Quét toàn bộ chuỗi địa chỉ tìm các alias đặc thù với độ ưu tiên dài nhất
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
    const nonStreetMatches = candidateMatches.filter(m => !m.isStreet);
    const validMatches = nonStreetMatches.length > 0 ? nonStreetMatches : candidateMatches;

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

/**
 * Nhận diện cấp Quận/Huyện/Thị xã từ chuỗi địa chỉ
 */
export function detectDistrictFromAddress(address: string): string | null {
  if (!address || typeof address !== 'string') return null;
  const normAddr = normalizeVietnameseString(address);

  for (const [districtName, aliases] of Object.entries(DISTRICT_MAP)) {
    for (const alias of aliases) {
      const normAlias = normalizeVietnameseString(alias);
      const regex = new RegExp(`\\b${normAlias}\\b`, 'i');
      if (regex.test(normAddr) && !isStreetNameCollision(address, alias)) {
        return districtName;
      }
    }
  }
  return null;
}

/**
 * Nhận diện Cụm Khu Công Nghiệp trọng điểm từ chuỗi địa chỉ
 */
export function detectIndustrialZone(address: string): string | null {
  if (!address || typeof address !== 'string') return null;
  const normAddr = normalizeVietnameseString(address);

  for (const zone of INDUSTRIAL_ZONES) {
    for (const alias of zone.aliases) {
      const normAlias = normalizeVietnameseString(alias);
      if (normAddr.includes(normAlias)) {
        return zone.name;
      }
    }
  }
  return null;
}

export type LogisticsRegion = 'Đông Nam Bộ' | 'Tây Nam Bộ' | 'Tây Nguyên' | 'Duyên Hải Miền Trung' | 'Bắc Bộ' | 'Toàn Quốc';

/**
 * Phân vùng logistics và tuyến vận chuyển
 */
export function resolveLogisticsRegion(provinceName: string | null): LogisticsRegion {
  if (!provinceName) return 'Toàn Quốc';
  const norm = normalizeVietnameseString(provinceName);

  if (['ho chi minh', 'binh duong', 'dong nai', 'ba ria', 'vung tau', 'tay ninh', 'binh phuoc'].some(k => norm.includes(k))) {
    return 'Đông Nam Bộ';
  }
  if (['long an', 'tien giang', 'ben tre', 'vinh long', 'tra vinh', 'hau giang', 'soc trang', 'dong thap', 'an giang', 'kien giang', 'bac lieu', 'ca mau', 'can tho'].some(k => norm.includes(k))) {
    return 'Tây Nam Bộ';
  }
  if (['dak lak', 'daklak', 'gia lai', 'kon tum', 'dak nong', 'lam dong'].some(k => norm.includes(k))) {
    return 'Tây Nguyên';
  }
  if (['da nang', 'quang nam', 'quang ngai', 'binh dinh', 'phu yen', 'khanh hoa', 'ninh thuan', 'binh thuan', 'hue', 'quang tri', 'quang binh', 'ha tinh', 'nghe an', 'thanh hoa'].some(k => norm.includes(k))) {
    return 'Duyên Hải Miền Trung';
  }
  if (['ha noi', 'hai phong', 'quang ninh', 'bac ninh', 'bac giang', 'hung yen', 'hai duong', 'nam dinh', 'thai binh', 'ninh binh', 'vinh phuc', 'phu tho', 'thai nguyen'].some(k => norm.includes(k))) {
    return 'Bắc Bộ';
  }
  return 'Toàn Quốc';
}

export interface LogisticsCarrierSuggestion {
  carrierName: string;
  hotline: string;
  depotHcm: string;
  notes: string;
}

/**
 * Gợi ý Chành xe vận chuyển máy móc chuyên tuyến cơ khí SGM
 */
export function suggestLogisticsCarriers(region: LogisticsRegion): LogisticsCarrierSuggestion[] {
  switch (region) {
    case 'Đông Nam Bộ':
      return [
        { carrierName: 'Đội Xe Tải & Cẩu SGM Nội Thành', hotline: '0903.000.xxx (Nội bộ SGM)', depotHcm: 'Xưởng SGM Q.Bình Tân', notes: 'Giao trực tiếp trong ngày bằng xe tải/cẩu SGM' },
        { carrierName: 'Chành Xe Vận Tải Trọng Tấn', hotline: '0945.74.74.77', depotHcm: 'Bãi xe Trọng Tấn Q.12', notes: 'Chuyên cẩu máy nặng, xe sàn thấp' }
      ];
    case 'Tây Nam Bộ':
      return [
        { carrierName: 'Chành Xe Tô Châu (Miền Tây)', hotline: '0898.800.700', depotHcm: 'Trạm Lê Hồng Phong Q.10 & Bình Tân', notes: 'Tuyến phủ 13 tỉnh Miền Tây, giao nhanh 24h' },
        { carrierName: 'Vận Tải Phương Trang FUTA Express', hotline: '1900.6767', depotHcm: 'Bến xe Miền Tây', notes: 'Giao tận nơi máy vừa và nhỏ' },
        { carrierName: 'Chành Xe Trọng Tấn Miền Tây', hotline: '0913.95.95.85', depotHcm: 'Kho Bãi Q.12', notes: 'Chuyên máy chế tạo nặng từ 1-5 tấn' }
      ];
    case 'Tây Nguyên':
      return [
        { carrierName: 'Vận Tải Phượng Hoàng (Tây Nguyên)', hotline: '1900.9369', depotHcm: 'QL1A Q.Bình Tân', notes: 'Chuyên tuyến Đắk Lắk, Gia Lai, Kon Tum, Lâm Đồng' },
        { carrierName: 'Chành Xe Trọng Tấn Tây Nguyên', hotline: '0945.74.74.77', depotHcm: 'Bãi xe Q.12', notes: 'Hỗ trợ xe cẩu tự hành hạ máy tại vườn/xưởng' }
      ];
    case 'Duyên Hải Miền Trung':
      return [
        { carrierName: 'Vận Tải Á Châu (Bắc Nam)', hotline: '1900.1733', depotHcm: 'Bãi xe Á Châu Q.12', notes: 'Chuyên tuyến Đà Nẵng, Bình Định, Khánh Hòa' },
        { carrierName: 'Chành Xe Trọng Tấn Miền Trung', hotline: '0912.79.79.49', depotHcm: 'Bãi xe Q.12', notes: 'Ghép hàng hoặc bao nguyên chuyến xe tải lớn' }
      ];
    case 'Bắc Bộ':
      return [
        { carrierName: 'Vận Tải Đường Sắt Bắc Nam (Ga Sóng Thần)', hotline: '0903.xxx.xxx', depotHcm: 'Ga Sóng Thần (Bình Dương)', notes: 'Chi phí tối ưu cho máy móc siêu trường siêu trọng' },
        { carrierName: 'Vận Tải Á Châu Bắc Nam Express', hotline: '1900.1733', depotHcm: 'Bãi xe Á Châu Q.12', notes: 'Xe tải thùng kín chạy liên tục 48h tới Hà Nội' }
      ];
    default:
      return [
        { carrierName: 'Chành Xe Vận Tải Trọng Tấn (Toàn Quốc)', hotline: '0945.74.74.77', depotHcm: 'Bãi xe Q.12', notes: 'Mạng lưới 63 tỉnh thành' }
      ];
  }
}

export interface ParsedAddressInfo {
  province: string | null;
  district: string | null;
  industrialZone: string | null;
  logisticsRegion: LogisticsRegion;
  suggestedCarriers: LogisticsCarrierSuggestion[];
}

/**
 * Hàm phân tích toàn diện chuỗi địa chỉ
 */
export function parseVietnamAddressComplete(address: string, provinceList: string[] = []): ParsedAddressInfo {
  const province = detectProvinceFromAddress(address, provinceList);
  const district = detectDistrictFromAddress(address);
  const industrialZone = detectIndustrialZone(address);
  const logisticsRegion = resolveLogisticsRegion(province);
  const suggestedCarriers = suggestLogisticsCarriers(logisticsRegion);

  return {
    province,
    district,
    industrialZone,
    logisticsRegion,
    suggestedCarriers
  };
}
