import React, { useState } from 'react';
import { AdvancedFilterModal } from './AdvancedFilterModal';
import { Button } from '../Button';

export default {
  title: 'Design System/DataView/AdvancedFilterModal',
  component: AdvancedFilterModal,
};

export const Default = () => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="p-12">
      <Button variant="ghost" onClick={() => setIsOpen(true)} className="px-4 py-2 bg-blue-600 text-white rounded">Mở Modal</Button>
      <AdvancedFilterModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        availableColumns={[
          { id: 'name', label: 'Tên KH' },
          { id: 'status', label: 'Trạng thái' }
        ]}
        filters={[]}
        onApply={(filters) => { console.log(filters); setIsOpen(false); }}
      />
    </div>
  );
};
