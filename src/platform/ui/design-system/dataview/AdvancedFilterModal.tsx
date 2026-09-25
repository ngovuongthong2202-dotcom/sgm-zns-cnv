import React, { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { ColumnFiltersState } from '@tanstack/react-table';
import { Button } from '../Button';

interface AdvancedFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableColumns: { id: string; label: string }[];
  filters: ColumnFiltersState;
  onApply: (filters: ColumnFiltersState) => void;
}

export function AdvancedFilterModal({ isOpen, onClose, availableColumns, filters, onApply }: AdvancedFilterModalProps) {
  const [localFilters, setLocalFilters] = useState<ColumnFiltersState>(filters);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-in zoom-in-95">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <h2 className="text-lg font-semibold text-slate-800">Advanced Filters</h2>
          <Button aria-label="Đóng" variant="ghost" onClick={onClose} className="p-1 hover:bg-slate-200 rounded-md text-slate-500 transition-colors">
            <X className="w-5 h-5" />
          </Button>
        </div>
        
        <div className="p-6 flex-1 overflow-y-auto space-y-4">
          {localFilters.map((filter, index) => (
            <div key={index} className="flex gap-2 items-start bg-slate-50 p-3 rounded-lg border border-slate-100">
              <div className="flex-1 space-y-2">
                <select 
                  className="w-full text-sm border-slate-200 rounded-md shadow-sm bg-white"
                  value={filter.id}
                  onChange={(e) => {
                    const newFilters = [...localFilters];
                    newFilters[index].id = e.target.value;
                    setLocalFilters(newFilters);
                  }}
                >
                  <option value="" disabled>Select field...</option>
                  {availableColumns.map(c => (
                     <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
                <div className="flex gap-2">
                   <select className="w-1/3 text-sm border-slate-200 rounded-md shadow-sm bg-white">
                      <option value="contains">Contains</option>
                      <option value="equals">Equals</option>
                      <option value="startsWith">Starts With</option>
                      <option value="endsWith">Ends With</option>
                      <option value="isEmpty">Is Empty</option>
                   </select>
                   <input aria-label="Trường nhập" 
                     type="text" 
                     className="flex-1 text-sm border-slate-200 rounded-md shadow-sm"
                     value={filter.value as string || ''}
                     onChange={(e) => {
                       const newFilters = [...localFilters];
                       newFilters[index].value = e.target.value;
                       setLocalFilters(newFilters);
                     }}
                     placeholder="Value..."
                   />
                </div>
              </div>
              <Button aria-label="Xóa bộ lọc" variant="ghost" className="p-1.5 text-red-700 hover:bg-red-50 rounded-md mt-0.5"
                onClick={() => setLocalFilters(localFilters.filter((_, i) => i !== index))}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}

          <Button variant="ghost" className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 px-2 py-1 rounded hover:bg-blue-50 transition-colors"
            onClick={() => setLocalFilters([...localFilters, { id: availableColumns[0]?.id || '', value: '' }])}
          >
            <Plus className="w-4 h-4" /> Add Filter
          </Button>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
          <Button variant="ghost" onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Cancel
          </Button>
          <Button variant="ghost" onClick={() => {
               onApply(localFilters.filter(f => f.id));
               onClose();
            }}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm"
          >
            Apply Filters
          </Button>
        </div>
      </div>
    </div>
  );
}
