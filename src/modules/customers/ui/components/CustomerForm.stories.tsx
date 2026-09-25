import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';
import { CustomerForm } from './CustomerFormModal';

const meta: Meta<typeof CustomerForm> = {
  title: 'Features/Customers/CustomerForm',
  component: CustomerForm,
  parameters: {
    layout: 'padded',
  },
  args: {
    // generateMaKh: () => 'KH0001',
    nguoiPhuTrachList: ['Nguyen Van A', 'Tran Thi B'],
    loaiKhachHangList: ['VIP', 'Standard', 'Wholesale'],
    hideShell: true,
  },
};

export default meta;
type Story = StoryObj<typeof CustomerForm>;

export const Default: Story = {
  render: (args) => {
    const [isDirty, setIsDirty] = useState(false);
    return (
      <div className="w-full max-w-2xl mx-auto h-[600px] overflow-auto border border-slate-200 shadow-sm relative relative bg-slate-50">
        <div className="p-4 bg-white border-b flex justify-between items-center sticky top-0 z-50">
            <h3 className="font-bold">Form Shell Test</h3>
            <span className={`text-2xs px-2 py-1 rounded ${isDirty ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'}`}>
                {isDirty ? 'Dirty (Unsaved Changes)' : 'Pristine'}
            </span>
        </div>
        <CustomerForm {...args} onDirtyChange={setIsDirty} />
      </div>
    );
  },
};
