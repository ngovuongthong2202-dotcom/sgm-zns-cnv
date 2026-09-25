import 'tsconfig-paths/register';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';
import { join } from 'path';
import * as fs from 'fs';

// Load .env
dotenv.config({ path: join(process.cwd(), '.env') });

const serviceAccountConfig = process.env.FIREBASE_SERVICE_ACCOUNT;

if (!serviceAccountConfig) {
  console.error("Missing FIREBASE_SERVICE_ACCOUNT in .env");
  process.exit(1);
}

// ... (in the appropriate spot after credentials)
let credentialData;
try {
  credentialData = JSON.parse(serviceAccountConfig);
 
} catch {
  credentialData = JSON.parse(Buffer.from(serviceAccountConfig, 'base64').toString('utf8'));
}

const app = initializeApp({
  credential: cert(credentialData)
});

let databaseId = '(default)';
try {
  const configPath = join(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    if (config.firestoreDatabaseId) databaseId = config.firestoreDatabaseId;
  }
// eslint-disable-next-line no-empty
} catch {}

const db = getFirestore(app, databaseId);

const SEED = [
  {
    templateKey: 'CUSTOMER_PRE_QUOTE',
    label: 'Tin nhắn giới thiệu (trước báo giá)',
    entityType: 'CUSTOMER',
    variables: [
      { name: 'customer_name', label: 'Tên KH', sourceField: 'tenKhachHang', sourceEntity: 'SELF' },
      { name: 'phone', label: 'SĐT', sourceField: 'sdt', sourceEntity: 'SELF' },
    ],
  },
  {
    templateKey: 'BAOGIA',
    label: 'Tin nhắn báo giá',
    entityType: 'QUOTATION',
    variables: [
      { name: 'customer_name', label: 'Tên KH', sourceField: 'tenKhachHang', sourceEntity: 'SELF' },
      { name: 'so_phieu_bao_gia', label: 'Số phiếu BG', sourceField: 'soPhieuBaoGia', sourceEntity: 'SELF' },
      { name: 'ngay_bao_gia', label: 'Ngày BG', sourceField: 'ngayBaoGia', format: 'date', sourceEntity: 'SELF' },
      { name: 'ngay_het_han', label: 'Ngày hết hạn', sourceField: 'ngayHetHan', format: 'date', sourceEntity: 'SELF' },
      { name: 'sl_may', label: 'SL máy', sourceField: 'slMay', format: 'number', sourceEntity: 'SELF' },
      { name: 'nguoi_phu_trach', label: 'Người PT', sourceField: 'nguoiPhuTrach', sourceEntity: 'SELF' },
    ],
  },
  {
    templateKey: 'HOPDONG_SIGN_ZNS',
    label: 'Tin nhắn ký hợp đồng',
    entityType: 'CONTRACT',
    variables: [
      { name: 'customer_name', label: 'Tên KH', sourceField: 'tenKhachHang', sourceEntity: 'SELF' },
      { name: 'phone', label: 'SĐT', sourceField: 'sdt', sourceEntity: 'SELF' },
      { name: 'order_code', label: 'Mã HĐ (order_code)', sourceField: 'soHopDong', sourceEntity: 'SELF' },
      { name: 'So_don_hang', label: 'Số đơn hàng', sourceField: 'soDonHang', sourceEntity: 'SELF' },
      { name: 'ngay_ky', label: 'Ngày ký', sourceField: 'ngayKy', format: 'date', sourceEntity: 'SELF' },
      { name: 'so_ngay', label: 'Số ngày hoàn thành', sourceField: 'soNgayDuKienHoanThanh', format: 'number', sourceEntity: 'SELF' },
      { name: 'so_phieu', label: 'Số phiếu BG nguồn', sourceField: 'soPhieuBaoGia', sourceEntity: 'SELF' },
      { name: 'nhan_vien', label: 'Nhân viên PT', sourceField: 'nguoiPhuTrach', sourceEntity: 'SELF' },
    ],
  },
  {
    templateKey: 'THANH_TOAN_TAT_TOAN',
    label: 'Tin nhắn thanh toán — Tất toán',
    entityType: 'PAYMENT',
    paymentSubtype: 'TAT_TOAN',
    variables: [
      { name: 'customer_name', label: 'Tên KH', sourceField: 'tenKhachHang', sourceEntity: 'SELF' },
      { name: 'phone', label: 'SĐT', sourceField: 'sdt', sourceEntity: 'SELF' },
      { name: 'so_don_hang', label: 'Số đơn hàng', sourceField: 'soDonHang', sourceEntity: 'SELF' },
      { name: 'so_hop_dong', label: 'Số HĐ', sourceField: 'soHopDong', sourceEntity: 'SELF' },
      { name: 'ngay_thanh_toan', label: 'Ngày TT', sourceField: 'ngayThanhToan', format: 'date', sourceEntity: 'SELF' },
    ],
  },
  {
    templateKey: 'THANH_TOAN_CONG_NO',
    label: 'Tin nhắn thanh toán — Công nợ',
    entityType: 'PAYMENT',
    paymentSubtype: 'CONG_NO',
    variables: [
      { name: 'customer_name', label: 'Tên KH', sourceField: 'tenKhachHang', sourceEntity: 'SELF' },
      { name: 'phone', label: 'SĐT', sourceField: 'sdt', sourceEntity: 'SELF' },
      { name: 'order_code', label: 'Mã HĐ', sourceField: 'soHopDong', sourceEntity: 'SELF' },
      { name: 'time', label: 'Thời điểm ghi nhận', sourceField: 'ngayThanhToan', format: 'date', sourceEntity: 'SELF' },
      { name: 'so_luong', label: 'Số lượng máy', sourceField: 'slMay', format: 'number', sourceEntity: 'SELF' },
    ],
  },
  {
    templateKey: 'GIAOHANG_ZNS',
    label: 'Tin nhắn giao hàng',
    entityType: 'DELIVERY',
    variables: [
      { name: 'customer_name', label: 'Tên KH', sourceField: 'tenKhachHang', sourceEntity: 'SELF' },
      { name: 'phone', label: 'SĐT', sourceField: 'sdt', sourceEntity: 'SELF' },
      { name: 'So_hop_dong', label: 'Số HĐ', sourceField: 'soHopDong', sourceEntity: 'SELF' },
      { name: 'So_don_hang', label: 'Số đơn hàng', sourceField: 'soDonHang', sourceEntity: 'SELF' },
      { name: 'so_phieu_xuat', label: 'Số phiếu xuất', sourceField: 'soPhieuXuat', sourceEntity: 'SELF' },
      { name: 'ngay_giao_may', label: 'Ngày giao', sourceField: 'ngayGiaoMay', format: 'date', sourceEntity: 'SELF' },
      { name: 'danh_sach_ma_may', label: 'Danh sách mã máy', sourceField: 'danhSachMaMay', sourceEntity: 'SELF' },
      { name: 'so_luong', label: 'Số lượng', sourceField: 'slMay', format: 'number', sourceEntity: 'SELF' },
      { name: 'dvt', label: 'ĐVT', sourceField: 'dvt', sourceEntity: 'SELF' },
    ],
  },
];

const force = process.argv.includes('--force');

async function seed() {
  const batch = db.batch();
  for (const tpl of SEED) {
    const ref = db.collection('znsTemplates').doc(tpl.templateKey);
    const doc = await ref.get();
    if (!doc.exists || doc.data()?.version === 0 || force) {
      batch.set(ref, {
         ...tpl,
         version: doc.exists ? (doc.data()?.version || 0) + 1 : 1,
         isActive: true,
         createdAt: doc.exists ? doc.data()?.createdAt : new Date().toISOString(),
         updatedAt: new Date().toISOString(),
         updatedBy: 'SYSTEM'
      }, { merge: true });
      console.log(`Seeded ${tpl.templateKey}`);
    } else {
      console.log(`Skipped ${tpl.templateKey} (already exists and version > 0)`);
    }
  }
  await batch.commit();
  console.log('Done!');
  process.exit(0);
}

seed().catch(console.error);
