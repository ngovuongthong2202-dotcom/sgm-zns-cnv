import React, { useState, useEffect } from 'react';
import { Package, Plus, Search, Trash2, Edit } from 'lucide-react';
import { Button } from '@/src/design-system/Button';
import { ProductCatalog } from '@/src/domain/schema/product-catalog.schema';
import { notify } from '@/src/shared/utils/notify';
import { formatCurrency } from '@/src/shared/utils/formatCurrency';
import { t } from '@/src/i18n/vi';
import { repositoryFactory } from '@/src/data/repositories';

const productRepo = repositoryFactory.get<ProductCatalog>('productCatalog');

export default function ProductCatalogPage() {
  const [items, setItems] = useState<ProductCatalog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchItems = async () => {
     try {
       const results = await productRepo.list({ sortField: 'productName', sortDirection: 'asc' });
       setItems(results);
     } catch (e) {
       console.error("Error fetching generic catalog", e);
     } finally {
       setLoading(false);
     }
  };

  useEffect(() => {
     fetchItems();
  }, []);

  const handleCreate = async () => {
      const code = window.prompt("Nhập mã sản phẩm mới:");
      if (!code) return;
      
      const name = window.prompt("Nhập tên sản phẩm mới:");
      if (!name) return;

      const price = window.prompt("Nhập đơn giá cơ sở (VNĐ):", "0");

      try {
         const newId = productRepo.generateId();
         const item: ProductCatalog = {
            productCode: code,
            productName: name,
            category: 'Máy',
            basePrice: parseInt(price?.replace(/\D/g, '') || "0", 10),
            unit: 'Thiết bị',
            isActive: true,
            createdAt: new Date().toISOString()
         };

         await productRepo.set(newId, item);
         notify.success('Đã thêm sản phẩm vào danh mục');
         fetchItems();
      } catch (e: any) {
         notify.error(e.message);
      }
  };

  const handleSwitchCategory = async (id: string, currentStatus: string) => {
     const next = currentStatus === 'Máy' ? 'Vật tư' : currentStatus === 'Vật tư' ? 'Dịch vụ' : 'Máy';
     try {
        await productRepo.update(id, { category: next });
        fetchItems();
     } catch (e) {
        console.error(e);
     }
  };

  const handleDelete = async (id: string) => {
      if (!window.confirm('Bạn có chắc muốn xóa sản phẩm này khỏi thư viện? Sản phẩm trong các báo giá cũ không bị ảnh hưởng.')) return;
      try {
         await productRepo.hardDelete(id); 
         notify.success('Đã xóa');
         fetchItems();
      } catch (e: any) {
         notify.error(e.message);
      }
  };

  const filtered = items.filter(x => 
      !search || x.productName.toLowerCase().includes(search.toLowerCase()) || x.productCode.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="bg-white rounded-xl shadow-[0_1px_2px_rgba(15,23,42,0.03)] border border-slate-200 h-full flex flex-col">
      <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
            <Package size={16} className="text-blue-600" />
            Thư viện Sản phẩm & Bảng giá
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Quản lý template sản phẩm để chọn nhanh khi tạo báo giá
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
             <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
             <input 
                type="text" 
                placeholder="Tìm sản phẩm..." 
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8 pr-4 py-1.5 h-9 w-64 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-500 transition-colors"
             />
          </div>
          <Button variant="primary" onClick={handleCreate} className="h-9 font-medium text-xs shadow-sm"><Plus size={14} className="mr-1.5" /> Thêm SP mới</Button>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-6 bg-slate-50/50">
        {loading ? (
             <div className="flex items-center justify-center h-full">
                <div className="w-8 h-8 rounded-full border-4 border-slate-200 border-t-blue-600 animate-spin"></div>
             </div>
        ) : filtered.length === 0 ? (
             <div className="text-center py-20 bg-white border border-dashed border-slate-200 rounded-xl">
                 <Package size={32} className="mx-auto text-slate-300 mb-3" />
                 <h3 className="text-sm font-bold text-slate-700">{t('empty.noProducts')}</h3>
                 <p className="text-xs text-slate-500 mt-1 mb-4">Thêm sản phẩm vào thư viện để lập báo giá nhanh hơn.</p>
                 <Button onClick={handleCreate} size="sm" variant="secondary">Tạo sản phẩm mẫu</Button>
             </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map(item => (
                    <div key={item.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:border-blue-200 transition-all group">
                       <div className="flex items-start justify-between">
                          <div className="font-bold text-slate-800 text-sm leading-tight pr-2">
                             {item.productName}
                             <div className="text-2xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded uppercase font-mono inline-block ml-2 align-middle">{item.productCode}</div>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="xs" 
                            iconOnly 
                            aria-label={`Xóa sản phẩm ${item.productName}`}
                            onClick={() => handleDelete(item.id!)} 
                            className="w-6 h-6 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded cursor-pointer shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                             <Trash2 size={12} />
                          </Button>
                       </div>
                       
                       <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-3 text-xs">
                          <div>
                             <div className="text-slate-400 mb-1 text-2xs uppercase font-bold tracking-wider">Phân loại</div>
                             <div className="font-medium text-blue-700 bg-blue-50 inline-flex px-1.5 py-0.5 rounded cursor-pointer hover:bg-blue-100 transition-colors select-none" onClick={() => handleSwitchCategory(item.id!, item.category)}>
                                {item.category}
                             </div>
                          </div>
                          <div>
                             <div className="text-slate-400 mb-1 text-2xs uppercase font-bold tracking-wider">Đơn giá cơ sở</div>
                             <div className="font-mono font-bold text-slate-700">{formatCurrency(item.basePrice || 0)}</div>
                          </div>
                          <div>
                             <div className="text-slate-400 mb-1 text-2xs uppercase font-bold tracking-wider">Đơn vị tính</div>
                             <div className="font-medium text-slate-700 cursor-pointer" onClick={() => {
                                 const nx = window.prompt("Nhập ĐVT:", item.unit);
                                 if (nx) productRepo.update(item.id!, { unit: nx }).then(fetchItems);
                             }}>
                                {item.unit || <span className="text-slate-300 italic">Trống</span>} <Edit size={10} className="inline opacity-50 ml-1" />
                             </div>
                          </div>
                       </div>
                    </div>
                ))}
            </div>
        )}
      </div>
    </div>
  );
}
