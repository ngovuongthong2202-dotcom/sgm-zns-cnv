import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/src/design-system/Button';
import { Search, Plus, Package, Loader2, RefreshCw } from 'lucide-react';
import { ProductItem } from '@/src/domain/schema/product.schema';

interface ErpItem {
  item_code: string;
  name: string;
  display_unit: string;
}

interface ProductCatalogPickerProps {
  onSelect: (item: ProductItem) => void;
  category?: 'Máy' | 'Vật tư' | 'Dịch vụ';
}

export function ProductCatalogPicker({ onSelect }: ProductCatalogPickerProps) {
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState<ErpItem[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Close when click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Fetch items from ERP backend proxy
  const fetchItems = useCallback(async (query: string = '', isManualRefresh: boolean = false) => {
    if (isManualRefresh) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      if (isManualRefresh) {
        await fetch('/api/items/refresh', { method: 'POST' }).catch(() => {});
      }

      const params = new URLSearchParams();
      if (query.trim()) params.append('q', query.trim());
      params.append('limit', '50');

      const res = await fetch(`/api/items?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setItems(json.data);
          setTotal(json.total || json.data.length);
        }
      }
    } catch (err) {
      console.error('Failed to fetch ERP items:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Fetch initial when opened
  useEffect(() => {
    if (isOpen && items.length === 0) {
      fetchItems('');
    }
  }, [isOpen, items.length, fetchItems]);

  // Debounced search
  const handleSearchChange = (val: string) => {
    setSearch(val);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      fetchItems(val);
    }, 250);
  };

  const handleSelectItem = (p: ErpItem) => {
    onSelect({
      id: crypto.randomUUID(),
      productId: p.item_code,
      item_code: p.item_code,
      productName: p.name,
      unit: p.display_unit || 'Cái',
      quantity: 1,
      price: 0,
      total: 0
    });
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={containerRef}>
      <Button 
        variant="ghost" 
        size="sm" 
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="text-xs font-bold text-blue-800 bg-blue-50 hover:bg-blue-100 flex items-center gap-1.5 h-8 border border-blue-200/60 shadow-xs"
      >
        <Package size={14} className="text-blue-600" /> Thư viện SP
      </Button>
      
      {isOpen && (
        <div className="absolute top-10 right-0 w-[480px] max-w-[95vw] bg-white border border-slate-200 rounded-xl shadow-2xl z-[70] overflow-hidden flex flex-col max-h-[460px] animate-in fade-in zoom-in-95 duration-100 ring-1 ring-slate-900/10">
          {/* Header search bar */}
          <div className="p-3 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
            <Search className="text-slate-400 shrink-0" size={16} />
            <input 
              autoFocus
              type="text"
              className="w-full text-sm outline-none bg-transparent font-medium placeholder:text-slate-400"
              placeholder="Tìm theo Mã VT hoặc Tên VT (86.000+ vật tư)..."
              value={search}
              onChange={e => handleSearchChange(e.target.value)}
            />
            {loading && <Loader2 size={16} className="animate-spin text-blue-600 shrink-0" />}
            <button
              type="button"
              title="Làm mới danh mục từ ERP"
              onClick={() => fetchItems(search, true)}
              disabled={isRefreshing}
              className="p-1 hover:bg-slate-200 rounded text-slate-500 hover:text-slate-800 transition-colors shrink-0"
            >
              <RefreshCw size={14} className={isRefreshing ? 'animate-spin text-blue-600' : ''} />
            </button>
          </div>

          {/* Subheader info bar */}
          <div className="px-3 py-1.5 bg-slate-100/70 border-b border-slate-100 text-3xs text-slate-500 font-semibold flex items-center justify-between">
            <span>
              {search.trim() ? `KẾT QUẢ TÌM KIẾM (${total.toLocaleString('vi-VN')} MỤC)` : `DANH MỤC ERP (${total.toLocaleString('vi-VN')} VẬT TƯ)`}
            </span>
            <span className="text-slate-400">Click hoặc bấm (+) để thêm</span>
          </div>

          {/* List items with 3 core fields: Mã VT, Tên VT, ĐVT */}
          <div className="overflow-y-auto flex-1 p-2 space-y-1 divide-y divide-slate-50">
            {loading && items.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
                <Loader2 size={24} className="animate-spin text-blue-500" />
                <span className="text-xs">Đang tải danh mục vật tư ERP...</span>
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-10 text-sm text-slate-500 italic">
                Không tìm thấy vật tư nào khớp với từ khóa "{search}"
              </div>
            ) : (
              items.map((p, idx) => (
                <div 
                  key={`${p.item_code}-${idx}`} 
                  onClick={() => handleSelectItem(p)}
                  className="flex items-center justify-between p-2 hover:bg-blue-50/60 rounded-lg group border border-transparent hover:border-blue-100 transition-colors cursor-pointer pt-2"
                >
                  <div className="flex-1 pr-2 min-w-0">
                    {/* Tên VT */}
                    <div className="font-semibold text-slate-800 text-xs leading-snug group-hover:text-blue-700 break-words">
                      {p.name}
                    </div>
                    {/* Mã VT & ĐVT */}
                    <div className="text-2xs text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
                      <span className="font-mono bg-slate-100 group-hover:bg-blue-100/70 px-1.5 py-0.5 rounded text-slate-700 font-bold border border-slate-200/60">
                        Mã VT: {p.item_code}
                      </span>
                      <span className="bg-emerald-50 text-emerald-700 border border-emerald-200/60 px-1.5 py-0.5 rounded font-medium">
                        ĐVT: {p.display_unit || 'Cái'}
                      </span>
                    </div>
                  </div>
                  
                  {/* Select button */}
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    type="button"
                    className="text-blue-600 hover:bg-blue-100/80 h-7 w-7 p-0 shrink-0 rounded-md transition-all shadow-2xs border border-transparent group-hover:border-blue-200" 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectItem(p);
                    }}
                  >
                    <Plus size={15} />
                  </Button>
                </div>
              ))
            )}
          </div>

          {/* Footer bar */}
          <div className="p-2 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-2xs text-slate-500">
            <span>Hiển thị tối đa 50 kết quả đầu</span>
            <Button variant="ghost" size="xs" type="button" onClick={() => setIsOpen(false)} className="text-xs font-medium">
              Đóng
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
