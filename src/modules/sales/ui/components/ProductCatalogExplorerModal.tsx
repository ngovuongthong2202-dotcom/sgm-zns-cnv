import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  Search, Plus, Package, Loader2, RefreshCw, X, ShoppingCart, Trash2, 
  Check, Sparkles, AlertCircle, ArrowRight, Minus, Tag, Hash, FilePlus,
  Percent, ShieldCheck, Calendar, StickyNote, Wrench, ChevronRight
} from 'lucide-react';
import { Button } from '@/src/design-system/Button';
import { ProductItem } from '@/src/domain/schema/product.schema';
import { computeLineItem } from '@/src/domain/pricing/quotation-pricing';
import { notify } from '@/src/shared/utils/notify';
import { detectItemType } from '@/src/widgets/product-list-input/useProductItemSemantic';

export interface ErpCatalogItem {
  item_code: string;
  name: string;
  display_unit: string;
  category?: string;
  default_price?: number;
}

export interface BasketItem extends ProductItem {
  stagedKey: string;
}

interface ProductCatalogExplorerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddItems: (items: ProductItem[]) => void;
  initialCategory?: 'Máy' | 'Vật tư' | 'Dịch vụ';
  defaultVatRate?: number;
  baseDateForBaoHanh?: string;
}

function calculateWarrantyExpiry(baseDate: string, days: number): string {
  try {
    if (!days || days <= 0) return '';
    const d = new Date(baseDate || new Date().toISOString().split('T')[0]);
    if (isNaN(d.getTime())) return '';
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  } catch {
    return '';
  }
}

export function ProductCatalogExplorerModal({
  isOpen,
  onClose,
  onAddItems,
  initialCategory,
  defaultVatRate = 8,
  baseDateForBaoHanh
}: ProductCatalogExplorerModalProps) {
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<ErpCatalogItem[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);

  // Staging Basket Workspace
  const [basket, setBasket] = useState<BasketItem[]>([]);

  // Bulk tools state
  const [bulkDiscountInput, setBulkDiscountInput] = useState<string>('');
  const [bulkWarrantyInput, setBulkWarrantyInput] = useState<string>('365');

  // Ad-hoc custom material creation drawer/form
  const [showCustomModal, setShowCustomModal] = useState<boolean>(false);
  const [customName, setCustomName] = useState('');
  const [customCode, setCustomCode] = useState('');
  const [customUnit, setCustomUnit] = useState('Cái');
  const [customPrice, setCustomPrice] = useState<number>(0);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const listContainerRef = useRef<HTMLDivElement>(null);

  const effectiveBaseDate = useMemo(() => {
    return baseDateForBaoHanh || new Date().toISOString().split('T')[0];
  }, [baseDateForBaoHanh]);

  // Sync when opening
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }, 100);
    } else {
      setBasket([]);
      setSearch('');
      setSelectedIndex(-1);
      setShowCustomModal(false);
    }
  }, [isOpen]);

  // Fetch Items from ERP API (No category tabs - direct omni-search across 86,000 items)
  const fetchItems = useCallback(async (query: string = '', isManual: boolean = false) => {
    if (isManual) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      if (isManual) {
        await fetch('/api/items/refresh', { method: 'POST' }).catch(() => {});
      }

      const params = new URLSearchParams();
      if (query.trim()) params.append('q', query.trim());
      params.append('limit', '80');

      const res = await fetch(`/api/items?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setItems(json.data);
          setTotalCount(json.total || json.data.length);
          setSelectedIndex(json.data.length > 0 ? 0 : -1);
        }
      }
    } catch (err) {
      console.error('[CatalogExplorer] Failed to fetch items:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchItems(search);
    }
  }, [isOpen, fetchItems]);

  const handleSearchChange = (val: string) => {
    setSearch(val);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      fetchItems(val);
    }, 200);
  };

  // Add item from catalog to staging basket with full financial & warranty defaults
  const handleAddToBasket = useCallback((erpItem: ErpCatalogItem) => {
    setBasket((prev) => {
      const existingIdx = prev.findIndex((b) => b.productId === erpItem.item_code);
      if (existingIdx >= 0) {
        // Increment quantity if already in basket
        const updated = [...prev];
        const cur = updated[existingIdx];
        const newQty = (cur.quantity || 1) + 1;
        const recomputed = computeLineItem({
          ...cur,
          quantity: newQty
        });
        updated[existingIdx] = {
          ...cur,
          ...recomputed,
          quantity: newQty
        };
        return updated;
      }

      // Add new basket entry with smart warranty and semantic type defaults
      const detectedType = detectItemType(erpItem.name, erpItem.display_unit);
      const isMachine = detectedType === 'MACHINE';
      const initialPrice = erpItem.default_price || 0;
      const initialQty = 1;
      const defaultDays = isMachine ? 365 : (detectedType === 'MATERIAL' ? 180 : 0);
      const defaultExpiry = defaultDays > 0 ? calculateWarrantyExpiry(effectiveBaseDate, defaultDays) : undefined;

      const rawEntry: ProductItem = {
        id: crypto.randomUUID(),
        productId: erpItem.item_code,
        item_code: erpItem.item_code,
        productName: erpItem.name,
        unit: erpItem.display_unit || 'Cái',
        quantity: initialQty,
        price: initialPrice,
        vatPct: defaultVatRate,
        discountPct: undefined,
        discountAmount: undefined,
        soNgayBaoHanh: defaultDays > 0 ? defaultDays : undefined,
        ngayHetHanBaoHanh: defaultExpiry,
        ghiChu: '',
        itemType: detectedType
      };

      const computed = computeLineItem(rawEntry);
      const newEntry: BasketItem = {
        ...rawEntry,
        ...computed,
        stagedKey: `${erpItem.item_code}_${Date.now()}`
      };

      return [...prev, newEntry];
    });
  }, [defaultVatRate, effectiveBaseDate]);

  // Remove single item from basket
  const handleRemoveFromBasket = (stagedKey: string) => {
    setBasket((prev) => prev.filter((b) => b.stagedKey !== stagedKey));
  };

  // Update specific fields of a basket item with bidirectional financial & warranty calculation
  const handleUpdateBasketItem = (stagedKey: string, updates: Partial<BasketItem>) => {
    setBasket((prev) =>
      prev.map((item) => {
        if (item.stagedKey !== stagedKey) return item;

        let merged: ProductItem = { ...item, ...updates };

        // Bidirectional Discount Handling
        const gross = (Number(merged.price) || 0) * (Number(merged.quantity) || 1);
        if ('discountPct' in updates) {
          const pct = updates.discountPct !== undefined && updates.discountPct !== null ? Number(updates.discountPct) : undefined;
          if (pct !== undefined && pct > 0 && gross > 0) {
            merged.discountAmount = Math.round(gross * (Math.min(100, pct) / 100));
            merged.discountType = 'PERCENT';
          } else {
            merged.discountAmount = 0;
            merged.discountPct = undefined;
          }
        } else if ('discountAmount' in updates) {
          const amt = Number(updates.discountAmount) || 0;
          if (amt > 0 && gross > 0) {
            merged.discountPct = parseFloat(((amt / gross) * 100).toFixed(2));
            merged.discountType = 'AMOUNT';
          } else {
            merged.discountPct = undefined;
            merged.discountAmount = undefined;
          }
        }

        // Auto calculate warranty expiry date if days updated
        if ('soNgayBaoHanh' in updates) {
          const days = Number(updates.soNgayBaoHanh) || 0;
          if (days > 0) {
            merged.ngayHetHanBaoHanh = calculateWarrantyExpiry(effectiveBaseDate, days);
          } else {
            merged.ngayHetHanBaoHanh = undefined;
          }
        }

        const computed = computeLineItem(merged);
        return {
          ...item,
          ...merged,
          ...computed
        };
      })
    );
  };

  // Bulk Apply Tools
  const handleBulkApplyVat = (rate: number) => {
    setBasket((prev) =>
      prev.map((item) => {
        const recomputed = computeLineItem({ ...item, vatPct: rate });
        return { ...item, ...recomputed, vatPct: rate };
      })
    );
    notify.success(`Đã áp dụng thuế VAT ${rate}% cho toàn bộ ${basket.length} sản phẩm`);
  };

  const handleBulkApplyDiscount = (pct: number) => {
    setBasket((prev) =>
      prev.map((item) => {
        const gross = (Number(item.price) || 0) * (Number(item.quantity) || 1);
        const amt = pct > 0 ? Math.round(gross * (Math.min(100, pct) / 100)) : undefined;
        const recomputed = computeLineItem({
          ...item,
          discountPct: pct > 0 ? pct : undefined,
          discountAmount: amt,
          discountType: 'PERCENT'
        });
        return { ...item, ...recomputed, discountPct: pct > 0 ? pct : undefined, discountAmount: amt };
      })
    );
    notify.success(`Đã áp dụng chiết khấu ${pct}% cho toàn bộ ${basket.length} sản phẩm`);
  };

  const handleBulkApplyWarranty = (days: number) => {
    const expiry = days > 0 ? calculateWarrantyExpiry(effectiveBaseDate, days) : undefined;
    setBasket((prev) =>
      prev.map((item) => ({
        ...item,
        soNgayBaoHanh: days > 0 ? days : undefined,
        ngayHetHanBaoHanh: expiry
      }))
    );
    notify.success(`Đã gán bảo hành ${days} ngày cho toàn bộ ${basket.length} sản phẩm`);
  };

  // Add Custom Item (Not in ERP catalog)
  const handleAddCustomMaterial = () => {
    const trimmedName = customName.trim();
    if (!trimmedName) {
      notify.warning('Vui lòng nhập tên vật tư / sản phẩm');
      return;
    }

    const code = customCode.trim().toUpperCase() || `VT-${Date.now().toString().slice(-6)}`;
    const detectedType = detectItemType(trimmedName, customUnit);
    const initialPrice = customPrice || 0;
    const initialQty = 1;
    const defaultDays = detectedType === 'MACHINE' ? 365 : (detectedType === 'MATERIAL' ? 180 : 0);
    const defaultExpiry = defaultDays > 0 ? calculateWarrantyExpiry(effectiveBaseDate, defaultDays) : undefined;

    const rawEntry: ProductItem = {
      id: crypto.randomUUID(),
      productId: code,
      item_code: code,
      productName: trimmedName,
      unit: customUnit || 'Cái',
      quantity: initialQty,
      price: initialPrice,
      vatPct: defaultVatRate,
      soNgayBaoHanh: defaultDays > 0 ? defaultDays : undefined,
      ngayHetHanBaoHanh: defaultExpiry,
      ghiChu: '',
      itemType: detectedType
    };

    const computed = computeLineItem(rawEntry);
    const newEntry: BasketItem = {
      ...rawEntry,
      ...computed,
      stagedKey: `custom_${Date.now()}`
    };

    setBasket((prev) => [...prev, newEntry]);
    setShowCustomModal(false);
    setCustomName('');
    setCustomCode('');
    setCustomPrice(0);
    notify.success(`Đã thêm "${trimmedName}" vào giỏ`);
  };

  // Commit items to outer Quotation Form
  const handleCommitAll = useCallback(() => {
    if (basket.length === 0) {
      notify.warning('Vui lòng chọn ít nhất một mặt hàng vào giỏ');
      return;
    }

    const cleanItems: ProductItem[] = basket.map(({ stagedKey, ...item }) => item);
    onAddItems(cleanItems);
    notify.success(`Đã chèn thành công ${cleanItems.length} sản phẩm vào Báo Giá`);
    onClose();
  }, [basket, onAddItems, onClose]);

  // Keyboard navigation & shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (items.length > 0 ? Math.min(items.length - 1, prev + 1) : -1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (items.length > 0 ? Math.max(0, prev - 1) : -1));
      } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleCommitAll();
      } else if (e.key === 'Enter' && selectedIndex >= 0 && selectedIndex < items.length && !showCustomModal) {
        if (document.activeElement === searchInputRef.current) {
          e.preventDefault();
          handleAddToBasket(items[selectedIndex]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, items, selectedIndex, handleAddToBasket, handleCommitAll, onClose, showCustomModal]);

  // Real-time Basket Financial Aggregations
  const basketAggs = useMemo(() => {
    const totalQty = basket.reduce((acc, it) => acc + (Number(it.quantity) || 0), 0);
    const totalGross = basket.reduce((acc, it) => acc + ((Number(it.price) || 0) * (Number(it.quantity) || 0)), 0);
    const totalDiscount = basket.reduce((acc, it) => acc + (Number(it.discountAmount) || 0), 0);
    const subtotalBeforeTax = Math.max(0, totalGross - totalDiscount);
    const totalVat = basket.reduce((acc, it) => acc + (Number(it.vatAmount) || 0), 0);
    const totalAfterTax = subtotalBeforeTax + totalVat;
    return { totalQty, totalGross, totalDiscount, subtotalBeforeTax, totalVat, totalAfterTax };
  }, [basket]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-2 sm:p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="relative w-full max-w-[1440px] h-[92vh] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-label="Thư viện sản phẩm & vật tư ERP"
      >
        {/* Top Header */}
        <div className="px-6 py-3.5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold">
              <Package size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-wide">
                  Thư Viện Sản Phẩm &amp; Vật Tư ERP
                </h2>
                <span className="px-2 py-0.5 text-3xs font-bold rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 font-mono">
                  {totalCount.toLocaleString('vi-VN')} mặt hàng
                </span>
                <span className="px-2 py-0.5 text-3xs font-semibold rounded bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 hidden sm:inline">
                  Tự động loại trừ mâu thuẫn 1T / 2T
                </span>
              </div>
              <p className="text-2xs text-slate-400">
                Tìm kiếm thông minh ngữ nghĩa, hỗ trợ gán đầy đủ % Chiết khấu, Tiền CK, Bảo hành và Hạn BH trước khi chèn vào báo giá
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowCustomModal(true)}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-blue-300 border border-slate-700 hover:border-slate-600 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <FilePlus size={14} /> + Thêm ngoài danh mục
            </button>
            <button
              type="button"
              onClick={onClose}
              className="h-8 w-8 rounded-lg bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 border border-slate-700 flex items-center justify-center transition-colors cursor-pointer"
              title="Đóng (Esc)"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Body: Split Dual Pane (38% Catalog Explorer | 62% Staging Studio) */}
        <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden bg-slate-50">
          
          {/* LEFT PANE: Catalog Explorer (38%) */}
          <div className="w-full md:w-[38%] lg:w-[36%] flex flex-col min-w-0 border-r border-slate-200 bg-white">
            {/* Search Toolbar (No Redundant Category Tabs) */}
            <div className="p-3.5 border-b border-slate-100 bg-white space-y-2 shrink-0">
              <div className="relative flex items-center">
                <Search className="absolute left-3 text-slate-400 pointer-events-none" size={16} />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="Nhập tên máy, quy cách, mã ERP (VD: may can ton 2 tang, lõi lọc, dây curoa)..."
                  className="w-full h-10 pl-9 pr-24 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all placeholder:text-slate-400"
                />
                <div className="absolute right-2 flex items-center gap-1">
                  {loading ? (
                    <Loader2 size={16} className="animate-spin text-blue-600" />
                  ) : search ? (
                    <button
                      type="button"
                      onClick={() => {
                        setSearch('');
                        fetchItems('');
                        searchInputRef.current?.focus();
                      }}
                      className="p-1 hover:bg-slate-200 rounded text-slate-500 cursor-pointer"
                      title="Xóa từ khóa"
                    >
                      <X size={12} />
                    </button>
                  ) : (
                    <span className="text-3xs text-slate-400 font-mono px-1.5 py-0.5 rounded bg-slate-200/70 border border-slate-300/50">
                      Enter để chọn
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => fetchItems(search, true)}
                    disabled={isRefreshing}
                    className="p-1 hover:bg-slate-200 rounded text-slate-500 cursor-pointer"
                    title="Đồng bộ danh mục ERP"
                  >
                    <RefreshCw size={13} className={isRefreshing ? 'animate-spin text-blue-600' : ''} />
                  </button>
                </div>
              </div>
            </div>

            {/* List Results (NO STOCK COLUMN) */}
            <div 
              ref={listContainerRef}
              className="flex-1 overflow-y-auto p-3 space-y-1.5 divide-y divide-slate-100 scrollbar-thin"
            >
              {loading && items.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-slate-400 gap-2">
                  <Loader2 size={28} className="animate-spin text-blue-600" />
                  <span className="text-xs font-medium">Đang tra cứu danh mục ERP...</span>
                </div>
              ) : items.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-slate-400 gap-3 px-4 text-center">
                  <AlertCircle size={32} className="text-slate-300" />
                  <div>
                    <p className="text-sm font-semibold text-slate-700">
                      Không tìm thấy mặt hàng nào khớp với "{search}"
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Thử từ khóa khác hoặc bấm bên dưới để tạo nhanh mặt hàng ngoài danh mục.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setCustomName(search);
                      setShowCustomModal(true);
                    }}
                    className="text-xs font-bold text-blue-600 bg-blue-50 border border-blue-200 hover:bg-blue-100"
                  >
                    + Tạo vật tư "{search}"
                  </Button>
                </div>
              ) : (
                items.map((item, index) => {
                  const isInBasket = basket.some((b) => b.productId === item.item_code);
                  const basketItem = basket.find((b) => b.productId === item.item_code);
                  const isSelected = index === selectedIndex;
                  const itemSemantic = detectItemType(item.name, item.display_unit);

                  return (
                    <div
                      key={`${item.item_code}-${index}`}
                      onClick={() => {
                        setSelectedIndex(index);
                        handleAddToBasket(item);
                      }}
                      className={`group flex items-center justify-between p-2.5 rounded-xl transition-all cursor-pointer border ${
                        isSelected
                          ? 'bg-blue-50/70 border-blue-200 shadow-2xs'
                          : 'border-transparent hover:bg-slate-50 hover:border-slate-200'
                      }`}
                    >
                      <div className="min-w-0 flex-1 pr-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono text-3xs font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 group-hover:bg-blue-100 group-hover:text-blue-800 transition-colors">
                            {item.item_code}
                          </span>
                          <span className={`text-3xs font-bold px-1.5 py-0.5 rounded ${
                            itemSemantic === 'MACHINE' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' :
                            itemSemantic === 'SERVICE' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                            {itemSemantic === 'MACHINE' ? 'Máy' : itemSemantic === 'SERVICE' ? 'Dịch vụ' : 'Vật tư'}
                          </span>
                          <span className="text-3xs font-medium text-slate-500">
                            ĐVT: {item.display_unit || 'Cái'}
                          </span>
                        </div>
                        <h4 className="text-xs font-semibold text-slate-800 leading-snug mt-1 group-hover:text-blue-700 transition-colors line-clamp-2">
                          {item.name}
                        </h4>
                      </div>

                      <div className="shrink-0 flex items-center gap-2">
                        {isInBasket ? (
                          <span className="inline-flex items-center gap-1 text-2xs font-bold px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <Check size={12} /> Đã chọn ({basketItem?.quantity || 1})
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddToBasket(item);
                            }}
                            className="h-7 w-7 rounded-lg bg-blue-50 text-blue-600 border border-blue-200/80 hover:bg-blue-600 hover:text-white flex items-center justify-center transition-colors shadow-2xs cursor-pointer"
                            title="Thêm vào giỏ"
                          >
                            <Plus size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* RIGHT PANE: Financial & Warranty Staging Studio (62%) */}
          <div className="w-full md:w-[62%] lg:w-[64%] flex flex-col min-w-0 bg-slate-50 border-t md:border-t-0">
            {/* Staging Studio Header & Bulk Action Toolbar */}
            <div className="p-3.5 border-b border-slate-200 bg-white space-y-2.5 shrink-0 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                    <ShoppingCart size={15} />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      Không Gian Tài Chính Đệm ({basket.length} mặt hàng)
                    </h3>
                  </div>
                </div>

                {basket.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setBasket([])}
                    className="text-3xs font-semibold text-rose-600 hover:text-rose-700 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 size={12} /> Xóa sạch giỏ
                  </button>
                )}
              </div>

              {/* Bulk Actions Quick Bar */}
              {basket.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-slate-100 text-3xs">
                  <span className="font-bold text-slate-500 uppercase tracking-wider">Áp dụng cả giỏ:</span>
                  
                  {/* VAT Bulk Buttons */}
                  <div className="inline-flex rounded-lg border border-slate-200 overflow-hidden bg-slate-50">
                    <button
                      type="button"
                      onClick={() => handleBulkApplyVat(0)}
                      className="px-2 py-0.5 font-bold hover:bg-blue-600 hover:text-white transition-colors text-slate-700 border-r border-slate-200"
                    >
                      VAT 0%
                    </button>
                    <button
                      type="button"
                      onClick={() => handleBulkApplyVat(8)}
                      className="px-2 py-0.5 font-bold hover:bg-blue-600 hover:text-white transition-colors text-slate-700 border-r border-slate-200"
                    >
                      VAT 8%
                    </button>
                    <button
                      type="button"
                      onClick={() => handleBulkApplyVat(10)}
                      className="px-2 py-0.5 font-bold hover:bg-blue-600 hover:text-white transition-colors text-slate-700"
                    >
                      VAT 10%
                    </button>
                  </div>

                  {/* Discount % Bulk Tool */}
                  <div className="inline-flex items-center gap-1 bg-amber-50/60 border border-amber-200 px-1.5 py-0.5 rounded-lg">
                    <Percent size={10} className="text-amber-600" />
                    <input
                      type="number"
                      placeholder="% CK"
                      value={bulkDiscountInput}
                      onChange={(e) => setBulkDiscountInput(e.target.value)}
                      className="w-10 text-center font-bold text-amber-800 bg-transparent outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const val = parseFloat(bulkDiscountInput) || 0;
                        handleBulkApplyDiscount(val);
                      }}
                      className="px-1.5 py-0.2 rounded bg-amber-600 text-white font-bold hover:bg-amber-700"
                    >
                      Áp
                    </button>
                  </div>

                  {/* Warranty Days Bulk Tool */}
                  <div className="inline-flex items-center gap-1 bg-blue-50/60 border border-blue-200 px-1.5 py-0.5 rounded-lg">
                    <ShieldCheck size={10} className="text-blue-600" />
                    <input
                      type="number"
                      placeholder="Ngày BH"
                      value={bulkWarrantyInput}
                      onChange={(e) => setBulkWarrantyInput(e.target.value)}
                      className="w-12 text-center font-bold text-blue-800 bg-transparent outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const val = parseInt(bulkWarrantyInput, 10) || 0;
                        handleBulkApplyWarranty(val);
                      }}
                      className="px-1.5 py-0.2 rounded bg-blue-600 text-white font-bold hover:bg-blue-700"
                    >
                      Gán BH
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Staging Studio Items List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2.5 scrollbar-thin">
              {basket.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-3 px-6 text-center">
                  <div className="h-14 w-14 rounded-full bg-slate-200/70 flex items-center justify-center text-slate-400">
                    <ShoppingCart size={28} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-700">Không gian đệm đang trống</p>
                    <p className="text-xs text-slate-500 mt-1 max-w-[320px]">
                      Nhấp vào mặt hàng ở cột danh mục bên trái để thêm vào đây. Tại đây bạn có thể cấu hình chi tiết % Chiết khấu, Tiền CK, Bảo hành và Ghi chú trước khi đưa vào báo giá.
                    </p>
                  </div>
                </div>
              ) : (
                basket.map((item, idx) => {
                  const gross = (Number(item.price) || 0) * (Number(item.quantity) || 1);
                  const isMachine = item.itemType === 'MACHINE';

                  return (
                    <div
                      key={item.stagedKey}
                      className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs hover:border-blue-200 hover:shadow-xs transition-all space-y-2.5"
                    >
                      {/* Top Item Summary Row */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono text-3xs font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                              #{idx + 1} | {item.productId || item.item_code}
                            </span>
                            <span className={`text-3xs font-bold px-1.5 py-0.5 rounded ${
                              item.itemType === 'MACHINE' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' :
                              item.itemType === 'SERVICE' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                              'bg-slate-100 text-slate-600'
                            }`}>
                              {item.itemType === 'MACHINE' ? 'Máy' : item.itemType === 'SERVICE' ? 'Dịch vụ' : 'Vật tư'}
                            </span>
                          </div>
                          <h4 className="text-xs font-bold text-slate-900 leading-snug mt-1">
                            {item.productName}
                          </h4>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveFromBasket(item.stagedKey)}
                          className="text-slate-400 hover:text-rose-600 p-1 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer shrink-0"
                          title="Bỏ mặt hàng này khỏi giỏ"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>

                      {/* Main Financial Grid (5 Columns) */}
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2 border-t border-slate-100">
                        {/* 1. SL & ĐVT */}
                        <div className="space-y-1">
                          <label className="text-3xs font-bold text-slate-500 uppercase block">
                            SL &amp; ĐVT
                          </label>
                          <div className="flex items-center gap-1">
                            <div className="flex items-center border border-slate-200 rounded-lg bg-slate-50 overflow-hidden flex-1">
                              <button
                                type="button"
                                onClick={() =>
                                  handleUpdateBasketItem(item.stagedKey, {
                                    quantity: Math.max(1, (Number(item.quantity) || 1) - 1)
                                  })
                                }
                                className="px-1.5 py-1 text-slate-500 hover:bg-slate-200 text-xs"
                              >
                                <Minus size={11} />
                              </button>
                              <input
                                type="number"
                                min="1"
                                value={item.quantity || 1}
                                onChange={(e) =>
                                  handleUpdateBasketItem(item.stagedKey, {
                                    quantity: Math.max(1, Number(e.target.value) || 1)
                                  })
                                }
                                className="w-full text-center text-xs font-bold bg-transparent outline-none py-1 text-slate-800 font-mono"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  handleUpdateBasketItem(item.stagedKey, {
                                    quantity: (Number(item.quantity) || 1) + 1
                                  })
                                }
                                className="px-1.5 py-1 text-slate-500 hover:bg-slate-200 text-xs"
                              >
                                <Plus size={11} />
                              </button>
                            </div>
                            <input
                              type="text"
                              value={item.unit || 'Cái'}
                              onChange={(e) => handleUpdateBasketItem(item.stagedKey, { unit: e.target.value })}
                              placeholder="ĐVT"
                              className="w-12 h-7 px-1 text-xs font-semibold text-center border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:border-blue-500 outline-none"
                              title="Đơn vị tính"
                            />
                          </div>
                        </div>

                        {/* 2. Đơn giá */}
                        <div className="space-y-1">
                          <label className="text-3xs font-bold text-slate-500 uppercase block">
                            Đơn giá (₫)
                          </label>
                          <input
                            type="text"
                            value={item.price ? new Intl.NumberFormat('vi-VN').format(item.price) : ''}
                            placeholder="0"
                            onChange={(e) => {
                              const raw = parseInt(e.target.value.replace(/\D/g, ''), 10) || 0;
                              handleUpdateBasketItem(item.stagedKey, { price: raw });
                            }}
                            className="w-full h-7 px-2 text-xs font-mono font-bold text-right border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:border-blue-500 outline-none"
                          />
                          <div className="text-right text-3xs text-slate-400 font-mono leading-none">
                            Tạm tính: {new Intl.NumberFormat('vi-VN').format(gross)} ₫
                          </div>
                        </div>

                        {/* 3. Chiết khấu 2 chiều (% hoặc Tiền) */}
                        <div className="space-y-1 bg-amber-50/20 p-1 rounded-lg border border-amber-100">
                          <label className="text-3xs font-bold text-amber-700 uppercase block">
                            Chiết khấu (% / Tiền)
                          </label>
                          <div className="flex items-center gap-1">
                            <div className="relative flex-1">
                              <input
                                type="number"
                                step="any"
                                min="0"
                                max="100"
                                placeholder="%"
                                value={item.discountPct ?? ''}
                                onChange={(e) => {
                                  const val = e.target.value === '' ? undefined : parseFloat(e.target.value);
                                  handleUpdateBasketItem(item.stagedKey, { discountPct: val });
                                }}
                                className="w-full h-7 px-1 text-xs font-mono font-bold text-center text-amber-800 border border-amber-200 rounded-lg bg-white focus:border-amber-500 outline-none"
                              />
                            </div>
                            <div className="relative flex-[1.4]">
                              <input
                                type="text"
                                placeholder="Trừ tiền"
                                value={item.discountAmount ? new Intl.NumberFormat('vi-VN').format(item.discountAmount) : ''}
                                onChange={(e) => {
                                  const raw = parseInt(e.target.value.replace(/\D/g, ''), 10) || 0;
                                  handleUpdateBasketItem(item.stagedKey, { discountAmount: raw || undefined });
                                }}
                                className="w-full h-7 px-1 text-xs font-mono font-bold text-right text-amber-800 border border-amber-200 rounded-lg bg-white focus:border-amber-500 outline-none"
                              />
                            </div>
                          </div>
                        </div>

                        {/* 4. Thuế VAT */}
                        <div className="space-y-1 bg-sky-50/20 p-1 rounded-lg border border-sky-100">
                          <label className="text-3xs font-bold text-sky-700 uppercase block">
                            Thuế VAT %
                          </label>
                          <select
                            value={item.vatPct ?? defaultVatRate}
                            onChange={(e) =>
                              handleUpdateBasketItem(item.stagedKey, {
                                vatPct: Number(e.target.value)
                              })
                            }
                            className="w-full h-7 px-1 text-xs font-bold text-center border border-sky-200 rounded-lg bg-white focus:border-sky-500 outline-none"
                          >
                            <option value="0">0%</option>
                            <option value="5">5%</option>
                            <option value="8">8%</option>
                            <option value="10">10%</option>
                          </select>
                          <div className="text-right text-3xs font-bold text-sky-700 font-mono leading-none">
                            +{new Intl.NumberFormat('vi-VN').format(item.vatAmount || 0)} ₫
                          </div>
                        </div>

                        {/* 5. Bảo hành & Hạn BH */}
                        <div className="space-y-1 bg-emerald-50/20 p-1 rounded-lg border border-emerald-100">
                          <label className="text-3xs font-bold text-emerald-700 uppercase block">
                            Bảo hành &amp; Hạn BH
                          </label>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              placeholder="Số ngày"
                              value={item.soNgayBaoHanh ?? ''}
                              onChange={(e) => {
                                const days = parseInt(e.target.value, 10);
                                handleUpdateBasketItem(item.stagedKey, {
                                  soNgayBaoHanh: isNaN(days) ? undefined : days
                                });
                              }}
                              className="w-14 h-7 text-xs font-mono font-bold text-center border border-emerald-200 rounded-lg bg-white focus:border-emerald-500 outline-none"
                              title="Số ngày bảo hành"
                            />
                            <div className="flex-1 text-3xs font-mono text-emerald-800 truncate" title={item.ngayHetHanBaoHanh || 'Chưa tính'}>
                              {item.ngayHetHanBaoHanh ? `Hạn: ${item.ngayHetHanBaoHanh}` : 'Không BH'}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Ghi chú & Thành tiền dòng hàng */}
                      <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs">
                        <div className="flex items-center gap-2 flex-1">
                          <StickyNote size={13} className="text-slate-400 shrink-0" />
                          <input
                            type="text"
                            placeholder="Ghi chú thêm cho sản phẩm (màu sắc, quy cách, nơi giao)..."
                            value={item.ghiChu || ''}
                            onChange={(e) => handleUpdateBasketItem(item.stagedKey, { ghiChu: e.target.value })}
                            className="w-full text-2xs italic text-slate-600 bg-transparent border-b border-dashed border-slate-200 focus:border-blue-400 outline-none py-0.5 placeholder:text-slate-300"
                          />
                        </div>

                        <div className="flex items-center gap-1 shrink-0 font-mono">
                          <span className="text-3xs font-bold text-slate-400 uppercase">Thành tiền:</span>
                          <span className="text-sm font-extrabold text-emerald-700">
                            {new Intl.NumberFormat('vi-VN').format(item.subtotalAfterTax || 0)} ₫
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Real-time Financial Summary Balance Bar */}
            {basket.length > 0 && (
              <div className="p-3.5 bg-white border-t border-slate-200 shrink-0 space-y-1.5 shadow-sm">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-2xs text-slate-600">
                  <div>
                    <span>Tổng số lượng: </span>
                    <span className="font-bold text-slate-800">{basketAggs.totalQty} món</span>
                  </div>
                  <div>
                    <span>Tiền trước CK: </span>
                    <span className="font-mono font-bold text-slate-800">
                      {new Intl.NumberFormat('vi-VN').format(basketAggs.totalGross)} ₫
                    </span>
                  </div>
                  <div>
                    <span>Tổng Chiết Khấu: </span>
                    <span className="font-mono font-bold text-amber-700">
                      -{new Intl.NumberFormat('vi-VN').format(basketAggs.totalDiscount)} ₫
                    </span>
                  </div>
                  <div>
                    <span>Tiền Thuế VAT: </span>
                    <span className="font-mono font-bold text-sky-700">
                      +{new Intl.NumberFormat('vi-VN').format(basketAggs.totalVat)} ₫
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                      Tổng Cộng Thanh Toán:
                    </span>
                    <span className="font-mono font-black text-emerald-700 text-base sm:text-lg">
                      {new Intl.NumberFormat('vi-VN').format(basketAggs.totalAfterTax)} ₫
                    </span>
                  </div>

                  <Button
                    type="button"
                    variant="accent"
                    size="sm"
                    onClick={handleCommitAll}
                    className="text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 flex items-center gap-1.5 px-4 py-2 rounded-xl shadow-md transition-all cursor-pointer"
                  >
                    <Check size={16} />
                    <span>Chèn {basket.length} mặt hàng vào Báo Giá</span>
                    <span className="text-3xs font-mono font-normal opacity-80">(Ctrl+Enter)</span>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Bottom Footer Actions */}
        <div className="px-6 py-2.5 bg-slate-100 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 text-3xs text-slate-500">
          <div className="flex items-center gap-3">
            <span>Phím tắt tiện ích:</span>
            <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200">
              Esc: Đóng
            </span>
            <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200">
              Enter: Chọn vào giỏ
            </span>
            <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200">
              Ctrl+Enter: Chèn ngay vào Báo Giá
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="xs"
              onClick={onClose}
              className="text-slate-600 hover:bg-slate-200"
            >
              Hủy bỏ
            </Button>
            {basket.length > 0 && (
              <Button
                type="button"
                variant="accent"
                size="xs"
                onClick={handleCommitAll}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
              >
                Chèn vào Báo Giá
              </Button>
            )}
          </div>
        </div>

        {/* Ad-Hoc Material Creation Modal Overlay */}
        {showCustomModal && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-2xs animate-in fade-in duration-150">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                  <FilePlus size={18} className="text-blue-600" />
                  <h4>Thêm Vật Tư / Sản Phẩm Ngoài Danh Mục ERP</h4>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCustomModal(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-2xs font-bold text-slate-700 block mb-1">
                    Tên vật tư / sản phẩm <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="VD: Dây curoa B68, Khung sườn máy..."
                    className="w-full h-9 px-3 text-xs border border-slate-200 rounded-xl focus:border-blue-500 outline-none"
                    autoFocus
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-2xs font-bold text-slate-700 block mb-1">
                      Mã vật tư (Tùy chọn)
                    </label>
                    <input
                      type="text"
                      value={customCode}
                      onChange={(e) => setCustomCode(e.target.value)}
                      placeholder="Tự sinh nếu trống"
                      className="w-full h-9 px-3 text-xs font-mono border border-slate-200 rounded-xl focus:border-blue-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-2xs font-bold text-slate-700 block mb-1">
                      Đơn vị tính
                    </label>
                    <input
                      type="text"
                      value={customUnit}
                      onChange={(e) => setCustomUnit(e.target.value)}
                      placeholder="Cái, Bộ, Mét..."
                      className="w-full h-9 px-3 text-xs border border-slate-200 rounded-xl focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-2xs font-bold text-slate-700 block mb-1">
                    Đơn giá dự kiến (₫)
                  </label>
                  <input
                    type="text"
                    value={customPrice ? new Intl.NumberFormat('vi-VN').format(customPrice) : ''}
                    placeholder="0"
                    onChange={(e) => {
                      const raw = parseInt(e.target.value.replace(/\D/g, ''), 10) || 0;
                      setCustomPrice(raw);
                    }}
                    className="w-full h-9 px-3 text-xs font-mono font-bold border border-slate-200 rounded-xl focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  size="sm"
                  variant="secondary"
                  type="button"
                  onClick={() => setShowCustomModal(false)}
                >
                  Hủy
                </Button>
                <Button
                  size="sm"
                  variant="accent"
                  type="button"
                  onClick={handleAddCustomMaterial}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
                >
                  + Thêm vào giỏ
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
