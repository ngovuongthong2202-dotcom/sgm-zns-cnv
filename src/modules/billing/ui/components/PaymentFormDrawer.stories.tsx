import type { Meta, StoryObj } from '@storybook/react';
import { PaymentFormDrawer } from './PaymentFormDrawer';
import { ToastProvider } from '@/src/design-system/ToastProvider';

const meta: Meta<typeof PaymentFormDrawer> = {
  title: 'Features/Payments/PaymentFormDrawer',
  component: PaymentFormDrawer,
  decorators: [
    (Story) => (
      <>
        <ToastProvider />
        <div className="w-full h-screen bg-slate-100 p-4">
          <Story />
        </div>
      </>
    ),
  ],
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof PaymentFormDrawer>;

export const Default: Story = {
  args: {
    payment: null as any,
    payments: [],
    contracts: [
      { id: 'c1', soHopDong: 'HD-2023-001', tenKhachHang: 'Công ty ABC', loai: 'Bán máy' },
      { id: 'c2', soHopDong: 'HD-2023-002', tenKhachHang: 'Công ty XYZ', loai: 'Cho thuê' }
    ] as any[],
    quotations: [],
    nguoiPhuTrachList: ['Nguyễn Văn A', 'Trần Thị B'],
    phuongThucThanhToanList: ['Chuyển khoản', 'Tiền mặt', 'Quẹt thẻ'],
    tinhTrangThanhToanList: ['Tất toán', 'Công nợ', 'Miễn phí'],
    onClose: () => console.log('Close clicked'),
    onSave: async (data: any) => { console.log('Save data:', data) }, 
  },
};

export const EditingStatus: Story = {
  args: {
    ...Default.args,
    payment: {
      id: 'p1',
      paymentId: 'TT-CN-001',
      contractId: 'c1',
      soTien: 15000000,
      tinhTrangThanhToan: 'Công nợ',
      phuongThucThanhToan: 'Chuyển khoản',
      nguoiPhuTrach: 'Nguyễn Văn A',
      tenKhachHang: 'Công ty ABC',
      sdt: '0901234567'
    } as any
  }
};
