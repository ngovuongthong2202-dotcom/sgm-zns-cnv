import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Package, Search, RefreshCw, Loader2, ChevronLeft, ChevronRight, Database, ExternalLink } from 'lucide-react';
import { Button } from '@/src/design-system/Button';
import { notify } from '@/src/shared/utils/notify';

interface ErpItem {
  item_code: string;
  name: string;
  display_unit: string;
}

export default function ProductCatalogPage() {
  const [items, setItems] = useState<ErpItem[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchItems = useCallback(async (q: string = '', pageNum: number = 1, forceRefresh: boolean = false) => {
    if (forceRefresh) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      if (forceRefresh) {
        await fetch('/api/items/refresh', { method: 'POST' }).catch(() => {});
      }

      const params = new URLSearchParams();
      if (q.trim()) params.append('q', q.trim());
      params.append('page', String(pageNum));
      params.append('limit', '50');

      const res = await fetch(`/api/items?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setItems(json.data);
          setTotal(json.total || 0);
          setPage(json.page || 1);
          setTotalPages(json.totalPages || 1);
        }
      } else {
        notify.error('Không thể kết nối máy chủ ERP để tải danh mục vật tư');
      }
    } catch (e) {
      console.error('Error fetching ERP catalog:', e);
      notify.error('Lỗi khi tải dữ liệu từ ERP');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchItems('', 1);
  }, [fetchItems]);

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPage(1);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      fetchItems(val, 1);
    }, 300);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    setPage(newPage);
    fetchItems(search, newPage);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 h-full flex flex-col overflow-hidden">
      {/* Top Header */}
      <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 bg-slate-50/50">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
              <Package size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                Thư viện Sản phẩm & Vật tư ERP
                <span className="text-2xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  {total > 0 ? `${total.toLocaleString('vi-VN')} vật tư` : 'Đang kết nối...'}
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5 font-medium">
                <Database size={12} className="text-slate-400" />
                Dữ liệu đồng bộ trực tiếp từ máy chủ ERP SGM (https://sgm.vnaisoft.com/api/public/items)
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Tìm theo Mã VT hoặc Tên VT (có dấu / không dấu)..." 
              value={search}
              onChange={e => handleSearchChange(e.target.value)}
              className="pl-9 pr-8 py-2 h-9 w-72 sm:w-80 text-xs border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all font-medium"
            />
            {loading && (
              <Loader2 size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 animate-spin text-blue-600" />
            )}
          </div>

          <Button 
            variant="secondary" 
            onClick={() => fetchItems(search, page, true)} 
            disabled={isRefreshing}
            className="h-9 font-semibold text-xs shadow-xs flex items-center gap-1.5"
          >
            <RefreshCw size={13} className={isRefreshing ? 'animate-spin text-blue-600' : ''} />
            <span>{isRefreshing ? 'Đang đồng bộ...' : 'Đồng bộ từ ERP'}</span>
          </Button>
        </div>
      </div>

      {/* Main Table List */}
      <div className="flex-1 overflow-auto bg-white">
        {loading && items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-20 gap-3 text-slate-500">
            <Loader2 size={32} className="text-blue-600 animate-spin" />
            <span className="text-sm font-medium">Đang tải dữ liệu thư viện vật tư từ máy chủ ERP...</span>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-20 bg-white">
            <Package size={40} className="mx-auto text-slate-300 mb-3" />
            <h3 className="text-sm font-bold text-slate-800">Không tìm thấy vật tư nào</h3>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              {search.trim() ? `Không có kết quả phù hợp với từ khóa "${search}"` : 'Danh mục vật tư hiện đang trống.'}
            </p>
            {search && (
              <Button size="sm" variant="secondary" onClick={() => handleSearchChange('')}>
                Xóa từ khóa tìm kiếm
              </Button>
            )}
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-3xs font-bold text-slate-500 uppercase tracking-wider sticky top-0 z-10">
                <th className="py-3 px-4 w-16 text-center">STT</th>
                <th className="py-3 px-4 w-56">Mã Vật Tư / Sản Phẩm</th>
                <th className="py-3 px-4">Tên Sản Phẩm / Quy Cách Thiết Bị</th>
                <th className="py-3 px-4 w-32 text-center">Đơn Vị Tính</th>
                <th className="py-3 px-4 w-36 text-center">Nguồn Dữ Liệu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-700">
              {items.map((item, idx) => (
                <tr key={`${item.item_code}-${idx}`} className="hover:bg-blue-50/40 transition-colors">
                  <td className="py-3 px-4 text-center text-slate-400 font-mono text-2xs">
                    {(page - 1) * 50 + idx + 1}
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 font-mono text-xs font-bold text-blue-900 select-all">
                      {item.item_code}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-900 leading-relaxed">
                      {item.name}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="px-2.5 py-0.5 rounded-full text-2xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {item.display_unit || 'Cái'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="inline-flex items-center gap-1 text-3xs text-slate-500 font-semibold px-2 py-0.5 rounded bg-slate-100">
                      ERP Public API
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination Footer */}
      <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
        <div className="text-xs text-slate-500 font-medium">
          Hiển thị từ <strong className="text-slate-800 font-bold">{total > 0 ? (page - 1) * 50 + 1 : 0}</strong> đến{' '}
          <strong className="text-slate-800 font-bold">{Math.min(page * 50, total)}</strong> trong tổng số{' '}
          <strong className="text-blue-700 font-bold">{total.toLocaleString('vi-VN')}</strong> vật tư
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handlePageChange(page - 1)}
            disabled={page <= 1 || loading}
            className="flex items-center gap-1 px-3 py-1 text-xs"
          >
            <ChevronLeft size={14} /> Trước
          </Button>
          <span className="text-xs font-semibold text-slate-700 px-2">
            Trang {page} / {totalPages || 1}
          </span>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handlePageChange(page + 1)}
            disabled={page >= totalPages || loading}
            className="flex items-center gap-1 px-3 py-1 text-xs"
          >
            Sau <ChevronRight size={14} />
          </Button>
        </div>
      </div>
    </div>
  );
}
