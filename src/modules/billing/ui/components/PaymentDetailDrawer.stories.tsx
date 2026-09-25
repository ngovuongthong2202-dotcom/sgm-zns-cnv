import type { Meta, StoryObj } from '@storybook/react';
import { PaymentDetailDrawer } from './PaymentDetailDrawer';

const mockPayment = {
  id: 'p1',
  paymentId: 'TT-2023-001',
  contractId: 'c1',
  soHopDong: 'HD-ABC-01',
  tenKhachHang: 'Công ty Cổ phần Vận tải biển Sài Gòn',
  soTien: 154000000,
  tinhTrangThanhToan: 'Công nợ',
  phuongThucThanhToan: 'Chuyển khoản',
  ngayThanhToan: '2023-10-15',
  ngayDenHan: '2023-11-15',
  nguoiPhuTrach: 'Nguyễn Văn A',
  sdt: '0901234567',
  ghiChu: 'Khách hàng hẹn thứ 6 tuần sau thanh toán dứt điểm.',
  trangThaiGuiTinThanhToan: 'ĐÃ GỬI',
  createdAt: '2023-10-15T08:30:00Z',
  updatedAt: '2023-10-15T08:30:00Z'
} as any;

const meta: Meta<typeof PaymentDetailDrawer> = {
  title: 'Features/Payments/PaymentDetailDrawer',
  component: PaymentDetailDrawer,
  parameters: { layout: 'fullscreen' },
  decorators: [(Story) => <div className="h-screen bg-slate-100"><Story /></div>],
};

export default meta;
type Story = StoryObj<typeof PaymentDetailDrawer>;

export const Default: Story = {
  args: {
    isOpen: true,
    onClose: () => console.log('Closed'),
    onEdit: () => console.log('Edit clicked'),
    payment: mockPayment
  },
};

export const PaidStatus: Story = {
  args: {
    ...Default.args,
    payment: {
      ...mockPayment,
      tinhTrangThanhToan: 'Tất toán',
      trangThaiGuiTinThanhToan: 'Không'
    }
  }
};
