import React from 'react';
import { PaymentRecordDrawer } from './PaymentRecordDrawer';
import { Toaster } from 'react-hot-toast';

export default {
  title: 'Features/Payments/PaymentRecordDrawer',
  component: PaymentRecordDrawer,
};

const mockPayment = {
  id: '1',
  paymentId: 'TT-CNO-001',
  contractId: 'c1',
  soHopDong: 'HD-2023-01',
  tenKhachHang: 'Công ty ABC',
  soTien: 15500000,
  tinhTrangThanhToan: 'Công nợ',
  phuongThucThanhToan: 'Chuyển khoản',
  ngayThanhToan: '2023-10-01',
  ngayDenHan: '2023-11-01',
  createdAt: new Date().toISOString(),
  trangThaiGuiTinThanhToan: 'CHƯA GỬI',
};

export const ViewMode = () => {
  return (
    <>
      <Toaster />
      <div className="h-screen bg-slate-100 flex items-center justify-center">
        <PaymentRecordDrawer 
           isOpen={true} 
           onClose={() => console.log('Close')} 
           payment={mockPayment as any}
           onSave={async (d) => console.log(d)}
        />
      </div>
    </>
  );
};

export const NewMode = () => {
  return (
    <>
      <Toaster />
      <div className="h-screen bg-slate-100 flex items-center justify-center">
        <PaymentRecordDrawer 
           isOpen={true} 
           onClose={() => console.log('Close')} 
           payment={null}
           onSave={async (d) => console.log(d)}
        />
      </div>
    </>
  );
};
