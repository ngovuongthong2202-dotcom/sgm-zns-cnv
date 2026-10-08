import React, { useState, useMemo } from 'react';
import { 
  Package, 
  Search, 
  ChevronDown, 
  ChevronUp, 
  Maximize2, 
  Minimize2, 
  Lock, 
  Wrench, 
  ShieldCheck 
} from 'lucide-react';
import { TrackingProductItem } from '../types';
import { formatCurrency } from '@/src/shared/utils/formatCurrency';

interface TrackingSpecsManifestProps {
  products: TrackingProductItem[];
  isUnlocked: boolean;
  totalValue?: number;
  subTotal?: number;
  vatAmount?: number;
}

export function TrackingSpecsManifest({
  products,
  isUnlocked,
  totalValue,
  subTotal,
  vatAmount
}: TrackingSpecsManifestProps) {
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | 'MACHINE' | 'MATERIAL' | 'SERVICE'>('ALL');
  const [manifestSearch, setManifestSearch] = useState('');
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  const toggleItemExpanded = (id: string) => {
    setExpandedItems(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const allExpanded = useMemo(() => {
    return products.length > 0 && products.every(p => expandedItems[p.id]);
  }, [products, expandedItems]);

  const toggleExpandAll = () => {
    if (allExpanded) {
      setExpandedItems({});
    } else {
      const all: Record<string, boolean> = {};
      products.forEach(p => { all[p.id] = true; });
      setExpandedItems(all);
    }
  };

  const categoryCounts = useMemo(() => {
    const counts = { ALL: products.length, MACHINE: 0, MATERIAL: 0, SERVICE: 0 };
    products.forEach(p => {
      if (p.itemType === 'MACHINE') counts.MACHINE++;
      else if (p.itemType === 'MATERIAL') counts.MATERIAL++;
      else if (p.itemType === 'SERVICE') counts.SERVICE++;
    });
    return counts;
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      if (selectedCategory !== 'ALL' && p.itemType !== selectedCategory) return false;
      if (manifestSearch.trim()) {
        const q = manifestSearch.toLowerCase();
        const matchName = p.name.toLowerCase().includes(q);
        const matchSpecs = (p.specifications || '').toLowerCase().includes(q);
        const matchSerials = (p.serials || []).some(s => s.toLowerCase().includes(q));
        if (!matchName && !matchSpecs && !matchSerials) return false;
      }
      return true;
    });
  }, [products, selectedCategory, manifestSearch]);

  const getSemanticBadge = (type: 'MACHINE' | 'MATERIAL' | 'SERVICE') => {
    switch (type) {
      case 'MACHINE':
        return {
          label: 'Máy móc/Thiết bị',
          badgeClass: 'bg-blue-50 text-blue-800 border-blue-200',
          icon: '⚙️'
        };
      case 'MATERIAL':
        return {
          label: 'Vật tư / Phụ tùng',
          badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
          icon: '📦'
        };
      case 'SERVICE':
        return {
          label: 'Dịch vụ / Nhân công',
          badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
          icon: '🛠️'
        };
      default:
        return {
          label: 'Thiết bị',
          badgeClass: 'bg-slate-50 text-slate-800 border-slate-200',
          icon: '⚙️'
        };
    }
  };

  return (
    <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3.5 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200/60 shadow-2xs">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-tight flex items-center gap-2">
              <span>Danh Mục Thiết Bị & Quy Cách Chế Tạo</span>
              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-2xs font-bold tabular-nums">
                {products.length} mục
              </span>
            </h3>
            <p className="text-2xs text-slate-500">
              Quy chuẩn công nghệ chế tạo theo tiêu chuẩn kỹ thuật Saigon Machine
            </p>
          </div>
        </div>

        {isUnlocked && totalValue !== undefined && totalValue > 0 && (
          <div className="text-right self-end sm:self-auto">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Tổng giá trị</span>
            <span className="text-xs sm:text-sm font-bold text-emerald-700 block tabular-nums">
              {formatCurrency(totalValue)}
            </span>
            {vatAmount !== undefined && vatAmount > 0 && (
              <span className="text-[10px] text-slate-500 font-medium block tabular-nums">
                (VAT: {formatCurrency(vatAmount)})
              </span>
            )}
          </div>
        )}
      </div>

      {/* Controls & Filter Pills */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 no-scrollbar">
            <button
              type="button"
              onClick={() => setSelectedCategory('ALL')}
              className={`px-3 py-1.5 rounded-xl text-2xs font-bold transition-all shrink-0 cursor-pointer ${
                selectedCategory === 'ALL'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Tất cả ({categoryCounts.ALL})
            </button>
            {categoryCounts.MACHINE > 0 && (
              <button
                type="button"
                onClick={() => setSelectedCategory('MACHINE')}
                className={`px-3 py-1.5 rounded-xl text-2xs font-bold transition-all shrink-0 cursor-pointer ${
                  selectedCategory === 'MACHINE'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
                }`}
              >
                ⚙️ Máy móc ({categoryCounts.MACHINE})
              </button>
            )}
            {categoryCounts.MATERIAL > 0 && (
              <button
                type="button"
                onClick={() => setSelectedCategory('MATERIAL')}
                className={`px-3 py-1.5 rounded-xl text-2xs font-bold transition-all shrink-0 cursor-pointer ${
                  selectedCategory === 'MATERIAL'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                }`}
              >
                📦 Vật tư / Phụ tùng ({categoryCounts.MATERIAL})
              </button>
            )}
            {categoryCounts.SERVICE > 0 && (
              <button
                type="button"
                onClick={() => setSelectedCategory('SERVICE')}
                className={`px-3 py-1.5 rounded-xl text-2xs font-bold transition-all shrink-0 cursor-pointer ${
                  selectedCategory === 'SERVICE'
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
                }`}
              >
                🛠️ Dịch vụ ({categoryCounts.SERVICE})
              </button>
            )}
          </div>

          {filteredProducts.length > 0 && (
            <button
              type="button"
              onClick={toggleExpandAll}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-2xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all cursor-pointer shrink-0 ml-auto"
            >
              {allExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              <span>{allExpanded ? 'Thu gọn tất cả' : 'Mở rộng tất cả'}</span>
            </button>
          )}
        </div>

        {products.length > 2 && (
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={manifestSearch}
              onChange={(e) => setManifestSearch(e.target.value)}
              placeholder="Tìm nhanh theo tên thiết bị, quy cách kỹ thuật, serial..."
              className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:border-emerald-500 focus:bg-white transition-all shadow-2xs"
            />
            {manifestSearch && (
              <button
                type="button"
                onClick={() => setManifestSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>
        )}
      </div>

      {/* MOBILE VIEW (< md): 2-Tier Spec Architecture */}
      <div className="md:hidden">
        {filteredProducts.length > 0 ? (
          <div className="divide-y divide-slate-100 border border-slate-200/90 rounded-2xl overflow-hidden bg-white shadow-2xs">
            {filteredProducts.map((p, idx) => {
              const sem = getSemanticBadge(p.itemType);
              const isExpanded = !!expandedItems[p.id];
              return (
                <div key={p.id || idx} className="transition-colors hover:bg-slate-50/70">
                  <div 
                    onClick={() => toggleItemExpanded(p.id)}
                    className="p-3 cursor-pointer select-none active:bg-slate-100/80 transition-colors"
                  >
                    {/* Tier 1: Full Uncut Title Header */}
                    <div className="flex items-start gap-2.5">
                      <span className="w-6 h-6 rounded-md bg-slate-100 text-slate-600 tabular-nums text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <h4 className="flex-1 font-bold text-slate-900 text-xs sm:text-sm leading-snug break-words">
                        {p.name}
                      </h4>
                    </div>

                    {/* Tier 2: Precision Data Ribbon + Price & Chevron */}
                    <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-slate-100/80 pl-8.5">
                      <div className="flex items-center gap-1.5 flex-wrap text-2xs text-slate-600">
                        <span className="font-bold text-slate-900 tabular-nums">
                          {p.quantity} {p.unit}
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${sem.badgeClass}`}>
                          {sem.icon} {sem.label}
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="text-slate-500 font-medium">
                          BH: {p.warranty || '12 tháng'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div>
                          {isUnlocked ? (
                            <span className="text-xs sm:text-sm font-bold tabular-nums text-emerald-700 block">
                              {formatCurrency(p.amount)}
                            </span>
                          ) : (
                            <span className="text-2xs text-slate-400 tabular-nums flex items-center gap-1">
                              <Lock className="w-3 h-3 text-slate-400" />
                              <span>••••••</span>
                            </span>
                          )}
                        </div>
                        <div className="text-slate-400 w-4 h-4 flex items-center justify-center">
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-slate-400" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Accordion Specs Drawer */}
                  {isExpanded && (
                    <div className="px-3 pb-3 pt-1 bg-slate-50/70 border-t border-slate-100 space-y-2 text-2xs">
                      <div className="p-2.5 rounded-xl bg-white border border-slate-200/90 flex flex-wrap items-center justify-between gap-2 text-2xs shadow-2xs">
                        <div className="flex items-center gap-2 flex-wrap text-slate-600">
                          <span><span className="text-slate-400">Đơn vị:</span> <strong className="text-slate-800">{p.unit}</strong></span>
                          <span className="text-slate-300">•</span>
                          <span><span className="text-slate-400">Số lượng:</span> <strong className="text-slate-900 tabular-nums font-bold">{p.quantity}</strong></span>
                          <span className="text-slate-300">•</span>
                          <span><span className="text-slate-400">Bảo hành:</span> <strong className="text-slate-800">{p.warranty || '12 tháng'}</strong></span>
                        </div>

                        {isUnlocked && (
                          <div className="tabular-nums text-right ml-auto text-2xs font-semibold">
                            {p.quantity > 1 ? (
                              <span>{formatCurrency(p.price)} × {p.quantity} = <strong className="text-emerald-700">{formatCurrency(p.amount)}</strong></span>
                            ) : (
                              <span className="text-emerald-700 font-bold">{formatCurrency(p.amount)}</span>
                            )}
                          </div>
                        )}
                      </div>

                      {p.specifications && (
                        <div className="p-3 rounded-xl bg-white border border-slate-200/90 text-slate-700 leading-relaxed shadow-2xs">
                          <div className="font-bold text-[10px] uppercase tracking-wider text-slate-500 flex items-center gap-1.5 mb-1.5">
                            <Wrench className="w-3.5 h-3.5 text-slate-400" />
                            <span>Quy Cách Kỹ Thuật Chi Tiết:</span>
                          </div>
                          <div className="whitespace-pre-wrap leading-relaxed text-slate-700 text-2xs">{p.specifications}</div>
                        </div>
                      )}

                      {p.serials && p.serials.length > 0 && (
                        <div className="p-2.5 rounded-xl bg-white border border-slate-200/90 flex items-center gap-2 flex-wrap shadow-2xs">
                          <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 shrink-0">Số Serial Máy:</span>
                          <div className="flex flex-wrap gap-1.5">
                            {p.serials.map((sn, sIdx) => (
                              <span key={sIdx} className="px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-2xs font-bold tabular-nums">
                                {sn}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-8 text-center text-slate-400 italic bg-slate-50 rounded-2xl border border-slate-100 text-xs">
            Không tìm thấy thiết bị phù hợp với bộ lọc tìm kiếm
          </div>
        )}
      </div>

      {/* DESKTOP VIEW (>= md) */}
      <div className="hidden md:block overflow-x-auto border border-slate-200/90 rounded-2xl">
        <table className="w-full text-xs text-left border-collapse min-w-[720px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold text-2xs uppercase">
              <th className="py-3 px-3.5 w-12 text-center">STT</th>
              <th className="py-3 px-3.5">Tên Sản Phẩm / Thiết Bị & Quy Cách</th>
              <th className="py-3 px-3.5 text-center w-20">ĐVT</th>
              <th className="py-3 px-3.5 text-right w-24">Số Lượng</th>
              <th className="py-3 px-3.5 w-48">Serial / Mã Máy</th>
              {isUnlocked && <th className="py-3 px-3.5 text-right w-36">Đơn Giá</th>}
              {isUnlocked && <th className="py-3 px-3.5 text-right w-40">Thành Tiền</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {filteredProducts.length > 0 ? (
              filteredProducts.map((p, idx) => {
                const sem = getSemanticBadge(p.itemType);
                return (
                  <tr key={p.id || idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-3.5 text-center text-slate-400 tabular-nums font-bold">{idx + 1}</td>
                    <td className="py-3.5 px-3.5">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-bold border ${sem.badgeClass}`}>
                          <span>{sem.icon}</span>
                          <span>{sem.label}</span>
                        </span>
                        <span className="font-bold text-slate-900 text-xs">{p.name}</span>
                      </div>
                      {p.specifications && (
                        <div className="text-2xs text-slate-500 pl-2 border-l-2 border-emerald-400/50 mt-1 leading-relaxed whitespace-pre-wrap">
                          {p.specifications}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-3.5 text-center text-slate-600 font-semibold">{p.unit}</td>
                    <td className="py-3.5 px-3.5 text-right tabular-nums font-bold text-slate-800">{p.quantity}</td>
                    <td className="py-3.5 px-3.5">
                      {p.serials && p.serials.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {p.serials.map((sn, sIdx) => (
                            <span key={sIdx} className="px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-2xs font-bold tabular-nums">
                              {sn}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-2xs text-slate-400 italic">Theo tiêu chuẩn xuất xưởng</span>
                      )}
                    </td>
                    {isUnlocked && (
                      <td className="py-3.5 px-3.5 text-right tabular-nums text-slate-700">
                        {formatCurrency(p.price)}
                      </td>
                    )}
                    {isUnlocked && (
                      <td className="py-3.5 px-3.5 text-right tabular-nums font-bold text-emerald-700">
                        {formatCurrency(p.amount)}
                      </td>
                    )}
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={isUnlocked ? 7 : 5} className="py-8 text-center text-slate-400 italic">
                  Không tìm thấy thiết bị phù hợp với bộ lọc tìm kiếm
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer statistics */}
      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-2xs text-slate-500 flex-wrap gap-2">
        <span>
          Đang hiển thị <strong className="text-slate-800 tabular-nums">{filteredProducts.length}</strong> / {products.length} mục • Tổng cộng <strong className="text-slate-800 tabular-nums">{filteredProducts.reduce((sum, p) => sum + p.quantity, 0)}</strong> thiết bị
        </span>
        {(manifestSearch || selectedCategory !== 'ALL') && (
          <button
            type="button"
            onClick={() => { setManifestSearch(''); setSelectedCategory('ALL'); }}
            className="text-emerald-700 hover:underline font-semibold cursor-pointer"
          >
            Xóa bộ lọc tìm kiếm
          </button>
        )}
      </div>
    </div>
  );
}
