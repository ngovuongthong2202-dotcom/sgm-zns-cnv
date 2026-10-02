import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  Search, Plus, Package, Loader2, RefreshCw, X, ShoppingCart, Trash2, 
  Check, Layers, Sparkles, AlertCircle, ArrowRight, CornerDownLeft, 
  Minus, Tag, Hash, FilePlus
} from 'lucide-react';
import { Button } from '@/src/design-system/Button';
import { ProductItem } from '@/src/domain/schema/product.schema';
import { notify } from '@/src/shared/utils/notify';

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
}

export function ProductCatalogExplorerModal({
  isOpen,
  onClose,
  onAddItems,
  initialCategory,
  defaultVatRate = 8
}: ProductCatalogExplorerModalProps) {
  const [activeTab, setActiveTab] = useState<'ALL' | 'Máy' | 'Vật tư' | 'Dịch vụ'>(
    initialCategory || 'ALL'
  );
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<ErpCatalogItem[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);

  // Staging Basket
  const [basket, setBasket] = useState<BasketItem[]>([]);

  // Ad-hoc custom material creation drawer/form
  const [showCustomModal, setShowCustomModal] = useState<boolean>(false);
  const [customName, setCustomName] = useState('');
  const [customCode, setCustomCode] = useState('');
  const [customUnit, setCustomUnit] = useState('Cái');
  const [customPrice, setCustomPrice] = useState<number>(0);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const listContainerRef = useRef<HTMLDivElement>(null);

  // Sync initial tab when opening
  useEffect(() => {
    if (isOpen) {
      if (initialCategory) setActiveTab(initialCategory);
      setTimeout(() => {
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }, 100);
    } else {
      setBasket([]);
      setSearch('');
      setSelectedIndex(-1);
    }
  }, [isOpen, initialCategory]);

  // Fetch Items from ERP API
  const fetchItems = useCallback(async (query: string = '', catFilter: string = activeTab, isManual: boolean = false) => {
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
      if (catFilter && catFilter !== 'ALL') params.append('category', catFilter);
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
  }, [activeTab]);

  useEffect(() => {
    if (isOpen) {
      fetchItems(search, activeTab);
    }
  }, [isOpen, activeTab, fetchItems]);

  const handleSearchChange = (val: string) => {
    setSearch(val);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      fetchItems(val, activeTab);
    }, 200);
  };

  // Add item from catalog to staging basket
  const handleAddToBasket = useCallback((erpItem: ErpCatalogItem) => {
    setBasket((prev) => {
      const existingIdx = prev.findIndex((b) => b.productId === erpItem.item_code);
      if (existingIdx >= 0) {
        // Increment quantity if already in basket
        const updated = [...prev];
        const cur = updated[existingIdx];
        const newQty = (cur.quantity || 1) + 1;
        const price = cur.price || 0;
        const subtotal = price * newQty;
        const vatPct = cur.vatPct !== undefined ? cur.vatPct : defaultVatRate;
        const vatAmount = Math.round(subtotal * (vatPct / 100));
        updated[existingIdx] = {
          ...cur,
          quantity: newQty,
          subtotalBeforeTax: subtotal,
          vatAmount,
          subtotalAfterTax: subtotal + vatAmount,
          total: subtotal + vatAmount
        };
        return updated;
      }

      // Add new basket entry
      const initialPrice = erpItem.default_price || 0;
      const initialQty = 1;
      const subtotal = initialPrice * initialQty;
      const vatAmount = Math.round(subtotal * (defaultVatRate / 100));

      const newEntry: BasketItem = {
        stagedKey: `${erpItem.item_code}_${Date.now()}`,
        id: crypto.randomUUID(),
        productId: erpItem.item_code,
        item_code: erpItem.item_code,
        productName: erpItem.name,
        unit: erpItem.display_unit || 'Cái',
        quantity: initialQty,
        price: initialPrice,
        vatPct: defaultVatRate,
        subtotalBeforeTax: subtotal,
        vatAmount,
        subtotalAfterTax: subtotal + vatAmount,
        total: subtotal + vatAmount,
        itemType: activeTab === 'Máy' ? 'MACHINE' : (activeTab === 'Dịch vụ' ? 'SERVICE' : 'MATERIAL')
      };
      return [...prev, newEntry];
    });
  }, [defaultVatRate, activeTab]);

  // Remove single item from basket
  const handleRemoveFromBasket = (stagedKey: string) => {
    setBasket((prev) => prev.filter((b) => b.stagedKey !== stagedKey));
  };

  // Update basket item fields
  const handleUpdateBasketItem = (stagedKey: string, updates: Partial<BasketItem>) => {
    setBasket((prev) =>
      prev.map((item) => {
        if (item.stagedKey !== stagedKey) return item;
        const merged = { ...item, ...updates };
        const qty = Math.max(0, Number(merged.quantity) || 0);
        const price = Math.max(0, Number(merged.price) || 0);
        const subtotal = qty * price;
        const vatPct = merged.vatPct !== undefined ? Number(merged.vatPct) : defaultVatRate;
        const vatAmount = Math.round(subtotal * (vatPct / 100));
        return {
          ...merged,
          quantity: qty,
          price,
          vatPct,
          subtotalBeforeTax: subtotal,
          vatAmount,
          subtotalAfterTax: subtotal + vatAmount,
          total: subtotal + vatAmount
        };
      })
    );
  };

  // Create custom non-catalog item into basket
  const handleAddCustomItem = () => {
    if (!customName.trim()) {
      notify.warning('Vui lòng nhập tên vật tư / sản phẩm');
      return;
    }
    const code = customCode.trim() || `VT-${Date.now().toString().slice(-5)}`;
    const newItem: ErpCatalogItem = {
      item_code: code,
      name: customName.trim(),
      display_unit: customUnit.trim() || 'Cái',
      default_price: customPrice || 0
    };
    handleAddToBasket(newItem);
    setCustomName('');
    setCustomCode('');
    setCustomPrice(0);
    setShowCustomModal(false);
    notify.success(`Đã thêm "${newItem.name}" vào giỏ hàng`);
  };

  // Commit all items from basket into Quotation
  const handleCommitAll = () => {
    if (basket.length === 0) {
      notify.warning('Chưa có sản phẩm nào trong giỏ hàng');
      return;
    }
    onAddItems(basket);
    notify.success(`Đã thêm ${basket.length} sản phẩm từ thư viện vào báo giá`);
    onClose();
  };

  // Keyboard navigation
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
        // If focus is in search input and enter is pressed, add currently selected item
        if (document.activeElement === searchInputRef.current) {
          e.preventDefault();
          handleAddToBasket(items[selectedIndex]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, items, selectedIndex, handleAddToBasket, handleCommitAll, onClose, showCustomModal]);

  // Basket totals
  const basketAggs = useMemo(() => {
    const totalQty = basket.reduce((acc, it) => acc + (it.quantity || 0), 0);
    const subtotal = basket.reduce((acc, it) => acc + (it.subtotalBeforeTax || 0), 0);
    const vat = basket.reduce((acc, it) => acc + (it.vatAmount || 0), 0);
    const total = subtotal + vat;
    return { totalQty, subtotal, vat, total };
  }, [basket]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="relative w-full max-w-5xl h-[90vh] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-label="Thư viện sản phẩm & vật tư ERP"
      >
        {/* Top Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
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
              </div>
              <p className="text-2xs text-slate-400">
                Tìm kiếm thông minh, hỗ trợ chọn nhiều món cùng lúc và gán số lượng/đơn giá tức thời
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

        {/* Modal Body: Split Dual Pane */}
        <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden bg-slate-50">
          {/* Left Pane (Catalog Browser - 58%) */}
          <div className="flex-[3] flex flex-col min-w-0 border-r border-slate-200 bg-white">
            {/* Search & Filter Toolbar */}
            <div className="p-4 border-b border-slate-100 bg-white space-y-3 shrink-0">
              {/* Category Filter Pills */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
                  {(['ALL', 'Máy', 'Vật tư', 'Dịch vụ'] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setActiveTab(tab)}
                      className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                        activeTab === tab
                          ? 'bg-white text-blue-700 shadow-xs border border-slate-200/80 font-bold'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                      }`}
                    >
                      {tab === 'ALL' ? 'Tất cả' : tab}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => fetchItems(search, activeTab, true)}
                  disabled={isRefreshing}
                  className="px-2.5 py-1 text-2xs font-semibold rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Tải lại danh mục từ máy chủ ERP"
                >
                  <RefreshCw size={12} className={isRefreshing ? 'animate-spin text-blue-600' : ''} />
                  Làm mới ERP
                </button>
              </div>

              {/* Search input with keyboard hint */}
              <div className="relative flex items-center">
                <Search className="absolute left-3 text-slate-400 pointer-events-none" size={16} />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="Nhập tên vật tư, quy cách hoặc mã ERP (VD: Mực in, Dây curoa, Lõi lọc...)..."
                  className="w-full h-10 pl-9 pr-20 text-sm font-medium bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                />
                <div className="absolute right-2.5 flex items-center gap-1 text-3xs text-slate-400 font-mono">
                  {loading ? (
                    <Loader2 size={16} className="animate-spin text-blue-600" />
                  ) : search ? (
                    <button
                      type="button"
                      onClick={() => {
                        setSearch('');
                        fetchItems('', activeTab);
                        searchInputRef.current?.focus();
                      }}
                      className="p-1 hover:bg-slate-200 rounded text-slate-500 cursor-pointer"
                    >
                      <X size={12} />
                    </button>
                  ) : (
                    <span className="px-1.5 py-0.5 rounded bg-slate-200/80 border border-slate-300/60 font-semibold">
                      Enter để chọn
                    </span>
                  )}
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
                  <span className="text-xs font-medium">Đang tra cứu danh mục vật tư ERP...</span>
                </div>
              ) : items.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center text-slate-400 gap-3 px-4 text-center">
                  <AlertCircle size={32} className="text-slate-300" />
                  <div>
                    <p className="text-sm font-semibold text-slate-700">
                      Không tìm thấy mặt hàng nào khớp với "{search}"
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Bạn có thể thử tìm với từ khóa ngắn hơn hoặc tạo nhanh vật tư ngoài danh mục.
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

                  return (
                    <div
                      key={`${item.item_code}-${index}`}
                      onClick={() => {
                        setSelectedIndex(index);
                        handleAddToBasket(item);
                      }}
                      className={`group flex items-center justify-between p-3 rounded-xl transition-all cursor-pointer border ${
                        isSelected
                          ? 'bg-blue-50/70 border-blue-200 shadow-2xs'
                          : 'border-transparent hover:bg-slate-50 hover:border-slate-200'
                      }`}
                    >
                      <div className="flex-1 pr-3 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-2xs font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 group-hover:bg-blue-100 group-hover:text-blue-800 transition-colors">
                            {item.item_code}
                          </span>
                          <span className="text-3xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            ĐVT: {item.display_unit || 'Cái'}
                          </span>
                        </div>
                        <h4 className="text-xs sm:text-sm font-semibold text-slate-800 mt-1.5 leading-snug group-hover:text-blue-700 transition-colors">
                          {item.name}
                        </h4>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {isInBasket ? (
                          <div className="flex items-center gap-1.5 bg-blue-600 text-white px-2.5 py-1 rounded-lg text-2xs font-bold shadow-xs">
                            <Check size={12} />
                            <span>Đã chọn ({basketItem?.quantity || 1})</span>
                          </div>
                        ) : (
                          <Button
                            type="button"
                            size="xs"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddToBasket(item);
                            }}
                            className="text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-600 hover:text-white border border-blue-200 transition-all rounded-lg px-2.5 py-1 flex items-center gap-1 shadow-2xs"
                          >
                            <Plus size={13} /> Chọn
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* List Footer Info */}
            <div className="px-4 py-2 bg-slate-100/70 border-t border-slate-200 text-3xs text-slate-500 font-semibold flex items-center justify-between shrink-0">
              <span>Hiển thị tối đa 80 kết quả tìm kiếm đầu tiên</span>
              <span className="text-slate-400">Ấn [Enter] hoặc nhấp chuột để đưa vào giỏ</span>
            </div>
          </div>

          {/* Right Pane (Staging Basket - 42%) */}
          <div className="flex-[2] flex flex-col min-w-0 bg-slate-50">
            {/* Basket Header */}
            <div className="p-4 border-b border-slate-200 bg-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <ShoppingCart size={16} className="text-blue-600" />
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Mặt Hàng Đã Chọn ({basket.length})
                </h3>
              </div>
              {basket.length > 0 && (
                <button
                  type="button"
                  onClick={() => setBasket([])}
                  className="text-3xs font-semibold text-rose-600 hover:text-rose-700 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 size={12} /> Xóa tất cả
                </button>
              )}
            </div>

            {/* Basket Items List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin">
              {basket.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-3 px-6 text-center">
                  <div className="h-12 w-12 rounded-full bg-slate-200/60 flex items-center justify-center text-slate-400">
                    <ShoppingCart size={24} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-700">Giỏ chọn hàng đang trống</p>
                    <p className="text-3xs text-slate-500 mt-1 max-w-[220px]">
                      Nhấp vào bất kỳ mặt hàng nào ở cột danh mục bên trái để thêm vào đây trước khi chèn vào báo giá.
                    </p>
                  </div>
                </div>
              ) : (
                basket.map((item, idx) => (
                  <div
                    key={item.stagedKey}
                    className="p-3 bg-white rounded-xl border border-slate-200/90 shadow-2xs hover:border-slate-300 transition-all space-y-2.5"
                  >
                    {/* Item Top Info */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono text-3xs font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                            {item.productId || item.item_code}
                          </span>
                          <span className="text-3xs font-medium text-slate-500">
                            ĐVT: {item.unit || 'Cái'}
                          </span>
                        </div>
                        <h5 className="text-xs font-bold text-slate-800 leading-snug mt-1">
                          {item.productName}
                        </h5>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveFromBasket(item.stagedKey)}
                        className="text-slate-400 hover:text-rose-600 p-1 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer shrink-0"
                        title="Bỏ mặt hàng này"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    {/* Inline Form: Quantity, Price, VAT */}
                    <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-100">
                      {/* Quantity with quick buttons */}
                      <div className="space-y-1">
                        <label className="text-3xs font-bold text-slate-500 block uppercase">
                          Số lượng
                        </label>
                        <div className="flex items-center border border-slate-200 rounded-lg bg-slate-50 overflow-hidden">
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateBasketItem(item.stagedKey, {
                                quantity: Math.max(1, (item.quantity || 1) - 1)
                              })
                            }
                            className="px-1.5 py-1 text-slate-500 hover:bg-slate-200 text-xs transition-colors"
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
                            className="w-full text-center text-xs font-bold bg-transparent outline-none py-1 text-slate-800"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateBasketItem(item.stagedKey, {
                                quantity: (item.quantity || 1) + 1
                              })
                            }
                            className="px-1.5 py-1 text-slate-500 hover:bg-slate-200 text-xs transition-colors"
                          >
                            <Plus size={11} />
                          </button>
                        </div>
                      </div>

                      {/* Unit Price */}
                      <div className="space-y-1">
                        <label className="text-3xs font-bold text-slate-500 block uppercase">
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
                      </div>

                      {/* VAT % Selector */}
                      <div className="space-y-1">
                        <label className="text-3xs font-bold text-slate-500 block uppercase">
                          VAT %
                        </label>
                        <select
                          value={item.vatPct ?? defaultVatRate}
                          onChange={(e) =>
                            handleUpdateBasketItem(item.stagedKey, {
                              vatPct: Number(e.target.value)
                            })
                          }
                          className="w-full h-7 px-1 text-xs font-bold text-center border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:border-blue-500 outline-none"
                        >
                          <option value="0">0%</option>
                          <option value="5">5%</option>
                          <option value="8">8%</option>
                          <option value="10">10%</option>
                        </select>
                      </div>
                    </div>

                    {/* Subtotal preview */}
                    <div className="flex items-center justify-between text-3xs font-semibold text-slate-500 pt-1">
                      <span>Thành tiền trước thuế:</span>
                      <span className="font-mono text-slate-700 font-bold">
                        {new Intl.NumberFormat('vi-VN').format(item.subtotalBeforeTax || 0)} ₫
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Basket Financial Summary Bar */}
            {basket.length > 0 && (
              <div className="p-3.5 bg-white border-t border-slate-200 shrink-0 space-y-1.5 shadow-xs">
                <div className="flex items-center justify-between text-2xs text-slate-600">
                  <span>Tổng số lượng:</span>
                  <span className="font-bold text-slate-800">{basketAggs.totalQty} món</span>
                </div>
                <div className="flex items-center justify-between text-2xs text-slate-600">
                  <span>Tiền hàng trước thuế:</span>
                  <span className="font-mono font-bold text-slate-800">
                    {new Intl.NumberFormat('vi-VN').format(basketAggs.subtotal)} ₫
                  </span>
                </div>
                <div className="flex items-center justify-between text-2xs text-slate-600">
                  <span>Tiền thuế VAT:</span>
                  <span className="font-mono font-bold text-sky-700">
                    {new Intl.NumberFormat('vi-VN').format(basketAggs.vat)} ₫
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs font-bold text-slate-900 pt-1 border-t border-slate-100">
                  <span>Tổng cộng thanh toán:</span>
                  <span className="font-mono font-bold text-emerald-700 text-sm">
                    {new Intl.NumberFormat('vi-VN').format(basketAggs.total)} ₫
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Bottom Footer Actions */}
        <div className="px-6 py-3.5 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 text-2xs text-slate-500 font-medium">
            <span className="hidden sm:inline">Phím tắt:</span>
            <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
              Esc: Đóng
            </span>
            <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
              Ctrl+Enter: Chèn ngay
            </span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="text-xs font-semibold text-slate-600 hover:text-slate-800 px-4 h-9"
            >
              Hủy bỏ (Esc)
            </Button>
            <Button
              type="button"
              variant="accent"
              onClick={handleCommitAll}
              disabled={basket.length === 0}
              className="text-xs font-bold px-5 h-9 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md flex items-center gap-2 transition-all disabled:opacity-50"
            >
              <Check size={16} />
              Chèn {basket.length > 0 ? `${basket.length} sản phẩm` : ''} vào Báo Giá
            </Button>
          </div>
        </div>

        {/* Submodal: Ad-hoc Custom Item Form */}
        {showCustomModal && (
          <div className="absolute inset-0 z-50 bg-slate-950/60 backdrop-blur-2xs flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-2xl p-5 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <FilePlus size={16} className="text-blue-600" />
                  Thêm Vật Tư / Sản Phẩm Ngoài Danh Mục
                </h4>
                <button
                  type="button"
                  onClick={() => setShowCustomModal(false)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-2xs font-bold text-slate-600 uppercase">
                    Tên sản phẩm / vật tư <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    autoFocus
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="VD: Dây nguồn chuyển đổi 24V..."
                    className="w-full h-8 px-3 text-xs border border-slate-200 rounded-lg outline-none focus:border-blue-500 font-medium"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-2xs font-bold text-slate-600 uppercase">
                      Mã tham chiếu (tùy chọn)
                    </label>
                    <input
                      type="text"
                      value={customCode}
                      onChange={(e) => setCustomCode(e.target.value)}
                      placeholder="Tự sinh nếu trống"
                      className="w-full h-8 px-3 text-xs border border-slate-200 rounded-lg outline-none focus:border-blue-500 font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-2xs font-bold text-slate-600 uppercase">
                      Đơn vị tính (ĐVT)
                    </label>
                    <input
                      type="text"
                      value={customUnit}
                      onChange={(e) => setCustomUnit(e.target.value)}
                      placeholder="Cái, Bộ, Mét, Gói..."
                      className="w-full h-8 px-3 text-xs border border-slate-200 rounded-lg outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-2xs font-bold text-slate-600 uppercase">
                    Đơn giá dự kiến (₫)
                  </label>
                  <input
                    type="text"
                    value={customPrice ? new Intl.NumberFormat('vi-VN').format(customPrice) : ''}
                    placeholder="0"
                    onChange={(e) => {
                      const val = parseInt(e.target.value.replace(/\D/g, ''), 10) || 0;
                      setCustomPrice(val);
                    }}
                    className="w-full h-8 px-3 text-xs border border-slate-200 rounded-lg outline-none focus:border-blue-500 font-mono font-bold text-right"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  size="xs"
                  variant="ghost"
                  type="button"
                  onClick={() => setShowCustomModal(false)}
                >
                  Hủy
                </Button>
                <Button
                  size="xs"
                  variant="accent"
                  type="button"
                  onClick={handleAddCustomItem}
                  className="bg-blue-600 text-white font-bold px-3 py-1.5"
                >
                  + Đưa vào giỏ hàng
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
