import React, { useState, useEffect } from 'react';
import { Button } from '@/src/design-system/Button';
import { Package, Sparkles } from 'lucide-react';
import { ProductItem } from '@/src/domain/schema/product.schema';
import { ProductCatalogExplorerModal } from './ProductCatalogExplorerModal';

interface ProductCatalogPickerProps {
  onSelect: (item: ProductItem) => void;
  onSelectMultiple?: (items: ProductItem[]) => void;
  category?: 'Máy' | 'Vật tư' | 'Dịch vụ';
  defaultVatRate?: number;
  baseDateForBaoHanh?: string;
}

export function ProductCatalogPicker({
  onSelect,
  onSelectMultiple,
  category,
  defaultVatRate = 8,
  baseDateForBaoHanh
}: ProductCatalogPickerProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Global F2 keyboard shortcut to open catalog modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2' && !isModalOpen) {
        // Prevent opening if user is typing in a non-body input unless it's form
        const target = e.target as HTMLElement;
        const tagName = target?.tagName?.toLowerCase();
        if (tagName !== 'input' && tagName !== 'textarea') {
          e.preventDefault();
          setIsModalOpen(true);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen]);

  const handleAddItems = (items: ProductItem[]) => {
    if (onSelectMultiple) {
      onSelectMultiple(items);
    } else {
      items.forEach((item) => onSelect(item));
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        type="button"
        onClick={() => setIsModalOpen(true)}
        className="text-xs font-bold text-blue-800 bg-blue-50 hover:bg-blue-100 flex items-center gap-1.5 h-8 border border-blue-200/80 shadow-xs rounded-lg transition-all hover:border-blue-300"
        title="Mở Thư viện Sản phẩm & Vật tư ERP (Phím tắt F2)"
      >
        <Package size={14} className="text-blue-600" />
        <span>Thư viện SP</span>
        <span className="text-3xs font-mono font-bold bg-blue-200/60 text-blue-900 px-1 py-0.2 rounded hidden sm:inline">
          F2
        </span>
      </Button>

      {isModalOpen && (
        <ProductCatalogExplorerModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onAddItems={handleAddItems}
          initialCategory={category}
          defaultVatRate={defaultVatRate}
          baseDateForBaoHanh={baseDateForBaoHanh}
        />
      )}
    </>
  );
}
