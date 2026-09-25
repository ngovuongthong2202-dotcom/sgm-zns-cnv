import React, { useState } from 'react';
import { ProductCatalog } from '@/src/domain/schema/product-catalog.schema';
import { Button } from '@/src/design-system/Button';
import { Search, Plus, Package } from 'lucide-react';
import { ProductItem } from '@/src/domain/schema/product.schema';
import { useRealtimeCollection } from '@/src/data/realtime-store';
import { formatCurrency } from '@/src/shared/utils/formatCurrency';

interface ProductCatalogPickerProps {
   onSelect: (item: ProductItem) => void;
   category?: 'Máy' | 'Vật tư' | 'Dịch vụ';
}

export function ProductCatalogPicker({ onSelect, category }: ProductCatalogPickerProps) {
    const [search, setSearch] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    
    // Fetch generic catalog
    const { data: catalogAll } = useRealtimeCollection<ProductCatalog>('productCatalog');
    const catalog = catalogAll.filter(c => c.isActive !== false);

    const filtered = catalog.filter(c => {
       if (category && c.category !== category) return false;
       if (!search) return true;
       return c.productCode?.toLowerCase().includes(search.toLowerCase()) || c.productName?.toLowerCase().includes(search.toLowerCase());
    });

    return (
       <div className="relative">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setIsOpen(!isOpen)}
            className="text-xs font-bold text-blue-800 bg-blue-50 hover:bg-blue-100 flex items-center gap-1 h-8"
          >
             <Package size={14} /> Thư viện SP
          </Button>
          
          {isOpen && (
             <div className="absolute top-10 right-0 w-[400px] max-w-[100vw] bg-white border border-slate-200 rounded-xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-[400px]">
                 <div className="p-3 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
                    <Search className="text-slate-400" size={16} />
                    <input 
                      autoFocus
                      type="text"
                      className="w-full text-sm outline-none bg-transparent"
                      placeholder="Tìm mã hoặc tên sản phẩm gốc..."
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                    />
                 </div>
                 <div className="overflow-y-auto flex-1 p-2 space-y-1">
                    {filtered.length === 0 && (
                       <div className="text-center py-6 text-sm text-slate-500 italic">Không tìm thấy sản phẩm</div>
                    )}
                    {filtered.map(p => (
                       <div key={p.id} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded-lg group border border-transparent hover:border-slate-100">
                          <div>
                             <div className="font-bold text-slate-800 text-sm flex items-center gap-2">
                               {p.productName}
                               <span className="text-2xs bg-slate-200 px-1.5 py-0.5 rounded text-slate-600 uppercase">{p.productCode}</span>
                             </div>
                             <div className="text-xs text-slate-500 mt-1 flex gap-3">
                               <span>Danh mục: {p.category}</span>
                               <span>ĐVT: {p.unit}</span>
                               <span className="font-medium text-emerald-700">{formatCurrency(p.basePrice)}</span>
                             </div>
                          </div>
                          <Button size="sm" variant="ghost" className="opacity-0 group-hover:opacity-100 text-blue-600 hover:bg-blue-50 h-8 w-8 p-0 shrink-0" onClick={() => {
                             onSelect({
                                id: crypto.randomUUID(),
                                productId: p.productCode,
                                productName: p.productName,
                                quantity: 1,
                                price: p.basePrice,
                                total: p.basePrice,
                                unit: p.unit,
                                soNgayBaoHanh: p.warrantyDays
                             });
                             setIsOpen(false);
                          }}>
                             <Plus size={16} />
                          </Button>
                       </div>
                    ))}
                 </div>
                 <div className="p-2 border-t border-slate-100 bg-slate-50 flex justify-between">
                    <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)} className="text-xs">Đóng</Button>
                 </div>
             </div>
          )}
       </div>
    );
}
