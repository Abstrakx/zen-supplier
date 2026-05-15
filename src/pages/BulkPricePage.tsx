import React, { useState, useEffect, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  Tag,
  Search,
  Save,
  AlertCircle,
  RefreshCw,
  Clock,
  Edit3,
  Layers,
  ArrowRight,
  Info,
  X,
  CheckCircle2,
} from "lucide-react";
import type { Product, BulkPriceRow, BulkPriceUpdateItem } from "../types";
import Swal from "sweetalert2";

export const BulkPricePage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [rows, setRows] = useState<BulkPriceRow[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const data = await invoke<Product[]>("get_products");
      setProducts(data);
      
      const initialRows: BulkPriceRow[] = [];
      data.forEach(p => {
        p.units.forEach(u => {
          initialRows.push({
            product_id: p.id,
            product_name: p.name,
            unit_id: u.id,
            unit_name: u.unit_name,
            current_buy: u.latest_buy_price || 0,
            new_buy: u.latest_buy_price || 0,
            current_sell: u.latest_sell_price || 0,
            new_sell: u.latest_sell_price || 0,
            isDirtyBuy: false,
            isDirtySell: false,
            isPending: false
          });
        });
      });
      setRows(initialRows);
    } catch (e) {
      console.error(e);
      Swal.fire("Gagal", "Gagal memuat katalog produk", "error");
    } finally {
      setLoading(false);
    }
  };

  const handlePriceChange = (unitId: string, type: 'buy' | 'sell', val: string) => {
    const num = parseFloat(val) || 0;
    setRows(prev => {
      const updated = prev.map(r => {
        if (r.unit_id === unitId) {
          if (type === 'buy') {
            return { ...r, new_buy: num, isDirtyBuy: num !== r.current_buy };
          } else {
            return { ...r, new_sell: num, isDirtySell: num !== r.current_sell };
          }
        }
        return r;
      });

      // Handle inheritance if base unit changed
      const currentUnit = updated.find(u => u.unit_id === unitId);
      const product = products.find(p => p.id === currentUnit?.product_id);
      const baseUnit = product?.units.find(u => u.is_base_unit);

      if (baseUnit && unitId === baseUnit.id) {
        return updated.map(r => {
          if (r.product_id === product?.id && r.unit_id !== baseUnit.id) {
            const unit = product?.units.find(u => u.id === r.unit_id);
            if (unit && unit.conversion_to_base > 1) {
              // If it's an inherited unit, we could auto-update here, 
              // but user said show "inheritance" info, so maybe just update if it's currently matching?
              // For now let's just keep them independent but show the calculated hint in UI.
            }
          }
          return r;
        });
      }

      return updated;
    });
  };

  const categories = ["all", "dapur", "operational"];

  const productList = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = selectedCategory === "all" || p.item_type === selectedCategory;
      return matchesSearch && matchesType;
    });
  }, [products, searchTerm, selectedCategory]);

  const getProductDirtyCount = (productId: string) => {
    return rows.filter(r => r.product_id === productId && (r.isDirtyBuy || r.isDirtySell)).length;
  };

  const dirtyCount = rows.filter(r => r.isDirtyBuy || r.isDirtySell).length;

  const handleSubmit = async () => {
    const updates: BulkPriceUpdateItem[] = [];
    rows.forEach(r => {
      if (r.isDirtyBuy) {
        updates.push({
          product_id: r.product_id,
          product_name: r.product_name,
          unit_id: r.unit_id,
          unit_name: r.unit_name,
          price_type: "buy",
          old_price: r.current_buy,
          new_price: r.new_buy!,
        });
      }
      if (r.isDirtySell) {
        updates.push({
          product_id: r.product_id,
          product_name: r.product_name,
          unit_id: r.unit_id,
          unit_name: r.unit_name,
          price_type: "sell",
          old_price: r.current_sell,
          new_price: r.new_sell!,
        });
      }
    });

    if (updates.length === 0) return;

    const result = await Swal.fire({
      title: "Simpan Perubahan?",
      text: `Anda akan memperbarui ${updates.length} harga produk. Perubahan akan dicatat untuk direview.`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Ya, Simpan",
      confirmButtonColor: "#f59e0b",
    });

    if (result.isConfirmed) {
      setSubmitting(true);
      try {
        await invoke("bulk_update_prices", { payload: updates });
        await Swal.fire({
          icon: "success",
          title: "Berhasil",
          text: "Harga telah diperbarui",
          timer: 2000,
          showConfirmButton: false,
        });
        loadProducts();
      } catch (e) {
        Swal.fire("Gagal", String(e), "error");
      } finally {
        setSubmitting(false);
      }
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50 text-slate-900 font-sans">
      {/* Header */}
      <div className="px-8 py-6 border-b border-slate-200 bg-white flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-2.5 bg-orange-100 text-orange-600 rounded-2xl shadow-sm">
            <Tag size={22} />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-800 tracking-tight uppercase">
              Update Harga Katalog
            </h2>
            <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest mt-0.5">
              Kelola harga beli & jual per produk
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {dirtyCount > 0 && (
            <div className="px-4 py-2 bg-orange-50 border border-orange-100 rounded-xl flex items-center gap-2 animate-pulse">
              <AlertCircle size={14} className="text-orange-500" />
              <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest">
                {dirtyCount} Perubahan Pending
              </span>
            </div>
          )}
          <button
            onClick={handleSubmit}
            disabled={dirtyCount === 0 || submitting}
            className={`px-6 py-2.5 rounded-2xl text-xs font-black shadow-lg transition-all flex items-center gap-2 uppercase tracking-widest active:scale-95
              ${dirtyCount === 0 || submitting 
                ? "bg-slate-100 text-slate-400 cursor-not-allowed" 
                : "bg-orange-500 hover:bg-orange-600 text-white shadow-orange-500/20"}`}
          >
            {submitting ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
            Simpan Semua
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8 space-y-6">
        {/* Filters */}
        <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[300px]">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama produk..."
              className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all font-bold"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all whitespace-nowrap
                  ${selectedCategory === cat 
                    ? "bg-orange-500 text-white border-orange-500 shadow-md shadow-orange-500/20" 
                    : "bg-white text-slate-400 border-slate-200 hover:border-orange-200 hover:text-slate-600"}`}
              >
                {cat === "all" ? "Semua" : cat === "dapur" ? "Bahan Dapur" : "Operasional"}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="py-24 flex flex-col items-center gap-4 text-slate-400">
            <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs font-black uppercase tracking-widest">Memuat Katalog...</p>
          </div>
        ) : productList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center bg-white rounded-[40px] border-2 border-dashed border-slate-100 shadow-sm">
            <div className="w-24 h-24 rounded-[32px] bg-slate-50 text-slate-300 flex items-center justify-center mb-6 border border-slate-100 shadow-inner">
              <Search size={40} />
            </div>
            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">
              Produk Tidak Ditemukan
            </h3>
            <p className="text-sm text-slate-400 mt-2 font-medium max-w-xs leading-relaxed">
              Coba gunakan kata kunci lain atau ubah filter kategori untuk menemukan produk.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {productList.map(p => {
              const pRows = rows.filter(r => r.product_id === p.id);
              const baseRow = pRows.find(r => p.units.find(u => u.id === r.unit_id)?.is_base_unit);
              const pDirtyCount = getProductDirtyCount(p.id);

              return (
                <div 
                  key={p.id}
                  onClick={() => setEditingProduct(p)}
                  className={`bg-white rounded-[32px] border-2 p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group relative overflow-hidden
                    ${pDirtyCount > 0 ? "border-orange-200 bg-orange-50/10" : "border-slate-100"}`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1 block">
                        {p.item_type === "dapur" ? "Bahan Dapur" : "Operasional"}
                      </span>
                      <h3 className="text-lg font-black text-slate-800 leading-tight group-hover:text-orange-600 transition-colors">
                        {p.name}
                      </h3>
                    </div>
                    {pDirtyCount > 0 ? (
                      <div className="px-2.5 py-1 bg-orange-500 text-white rounded-lg text-[8px] font-black uppercase tracking-widest shadow-lg shadow-orange-500/20 flex items-center gap-1">
                        <Clock size={10} /> {pDirtyCount} DIUBAH
                      </div>
                    ) : (
                      <div className="p-2 bg-slate-50 text-slate-300 rounded-xl group-hover:bg-orange-50 group-hover:text-orange-400 transition-all">
                        <Edit3 size={16} />
                      </div>
                    )}
                  </div>

                  <div className="space-y-3 mt-6">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 font-bold uppercase tracking-widest">Base Unit</span>
                      <span className="font-black text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md text-[10px]">
                        {p.base_unit}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                        <span className="text-[8px] font-black text-slate-400 uppercase block mb-1">Harga Beli</span>
                        <span className="text-sm font-black text-blue-600 tabular-nums">
                          Rp {(baseRow?.new_buy || 0).toLocaleString("id-ID")}
                        </span>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                        <span className="text-[8px] font-black text-slate-400 uppercase block mb-1">Harga Jual</span>
                        <span className="text-sm font-black text-emerald-600 tabular-nums">
                          Rp {(baseRow?.new_sell || 0).toLocaleString("id-ID")}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-1 text-slate-400">
                      <Layers size={12} />
                      <span className="text-[9px] font-black uppercase tracking-wider">{p.units.length} Unit</span>
                    </div>
                    <div className="flex items-center gap-1 text-orange-500 opacity-0 group-hover:opacity-100 transition-all font-black text-[9px] uppercase tracking-widest">
                      Detail Harga <ArrowRight size={10} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Price Edit Modal */}
      {editingProduct && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] w-full max-w-5xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-10 py-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-white rounded-2xl border-2 border-orange-100 shadow-sm flex items-center justify-center text-orange-500">
                  <Edit3 size={28} />
                </div>
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-1 block">
                    {editingProduct.item_type === "dapur" ? "Bahan Dapur" : "Operasional"}
                  </span>
                  <h3 className="text-2xl font-black text-slate-800 tracking-tight">
                    {editingProduct.name}
                  </h3>
                </div>
              </div>
              <button 
                onClick={() => setEditingProduct(null)}
                className="w-12 h-12 flex items-center justify-center hover:bg-slate-200 rounded-2xl text-slate-400 transition-all"
              >
                <X size={24} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-10">
              <div className="mb-8 p-4 bg-blue-50 border border-blue-100 rounded-2xl flex items-start gap-3">
                <Info size={18} className="text-blue-500 mt-0.5" />
                <p className="text-xs text-blue-700 font-medium leading-relaxed">
                  Gunakan tabel di bawah untuk mengatur harga setiap satuan. Unit dengan konversi lebih besar dari 1 adalah satuan turunan dari <b>{editingProduct.base_unit}</b>.
                </p>
              </div>

              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="pb-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Satuan & Konversi</th>
                    <th className="pb-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                    <th className="pb-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Harga Beli (Modal)</th>
                    <th className="pb-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Harga Jual (Dapur)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {editingProduct.units.sort((a, _b) => (a.is_base_unit ? -1 : 1)).map(unit => {
                    const row = rows.find(r => r.unit_id === unit.id);
                    if (!row) return null;

                    const baseUnit = editingProduct.units.find(u => u.is_base_unit);
                    const baseRow = rows.find(r => r.unit_id === baseUnit?.id);
                    
                    // Inheritance check
                    const inheritedBuy = (baseRow?.new_buy || 0) * unit.conversion_to_base;
                    const inheritedSell = (baseRow?.new_sell || 0) * unit.conversion_to_base;
                    const isAutoBuy = !unit.is_base_unit && row.new_buy === inheritedBuy;
                    const isAutoSell = !unit.is_base_unit && row.new_sell === inheritedSell;

                    return (
                      <tr key={unit.id} className={`group ${unit.is_base_unit ? "bg-orange-50/30" : ""}`}>
                        <td className="py-6 px-4">
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <span className="font-black text-slate-800 uppercase tracking-tight">{unit.unit_name}</span>
                              {unit.is_base_unit && (
                                <span className="px-2 py-0.5 bg-orange-100 text-orange-600 text-[8px] font-black rounded uppercase">Base Unit</span>
                              )}
                            </div>
                            {!unit.is_base_unit && (
                              <span className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wider">
                                1 {unit.unit_name} = {unit.conversion_to_base} {editingProduct.base_unit}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-6 px-4">
                           <div className="flex flex-wrap gap-2">
                             {isAutoBuy && isAutoSell ? (
                               <span className="px-2 py-1 bg-emerald-50 text-emerald-600 text-[9px] font-black rounded-lg uppercase tracking-widest flex items-center gap-1 border border-emerald-100">
                                 <CheckCircle2 size={10} /> Auto Inheritance
                               </span>
                             ) : !unit.is_base_unit && (
                               <span className="px-2 py-1 bg-purple-50 text-purple-600 text-[9px] font-black rounded-lg uppercase tracking-widest flex items-center gap-1 border border-purple-100">
                                 <Layers size={10} /> Custom Price
                               </span>
                             )}
                           </div>
                        </td>
                        <td className="py-6 px-4">
                          <div className="flex flex-col items-end gap-2">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-black text-slate-300">Rp</span>
                              <input 
                                type="number"
                                className={`w-36 text-right py-2 px-4 rounded-xl font-black text-sm outline-none transition-all
                                  ${row.isDirtyBuy ? "bg-white border-2 border-orange-400 shadow-sm text-orange-600" : "bg-slate-50 border border-slate-200 text-slate-700 focus:bg-white focus:border-orange-500"}`}
                                value={row.new_buy || ""}
                                onChange={(e) => handlePriceChange(unit.id, 'buy', e.target.value)}
                              />
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-[9px] font-bold text-slate-400 uppercase tabular-nums">
                                Current: Rp {(row.current_buy || 0).toLocaleString("id-ID")}
                              </span>
                              {!unit.is_base_unit && !isAutoBuy && (
                                <button 
                                  onClick={() => handlePriceChange(unit.id, 'buy', inheritedBuy.toString())}
                                  className="text-[9px] font-black text-blue-500 uppercase hover:underline"
                                >
                                  Reset to Auto
                                </button>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-6 px-4">
                          <div className="flex flex-col items-end gap-2">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-black text-slate-300">Rp</span>
                              <input 
                                type="number"
                                className={`w-36 text-right py-2 px-4 rounded-xl font-black text-sm outline-none transition-all
                                  ${row.isDirtySell ? "bg-white border-2 border-orange-400 shadow-sm text-orange-600" : "bg-slate-50 border border-slate-200 text-slate-700 focus:bg-white focus:border-orange-500"}`}
                                value={row.new_sell || ""}
                                onChange={(e) => handlePriceChange(unit.id, 'sell', e.target.value)}
                              />
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-[9px] font-bold text-slate-400 uppercase tabular-nums">
                                Current: Rp {(row.current_sell || 0).toLocaleString("id-ID")}
                              </span>
                              {!unit.is_base_unit && !isAutoSell && (
                                <button 
                                  onClick={() => handlePriceChange(unit.id, 'sell', inheritedSell.toString())}
                                  className="text-[9px] font-black text-blue-500 uppercase hover:underline"
                                >
                                  Reset to Auto
                                </button>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div className="px-10 py-8 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-4">
              <button 
                onClick={() => setEditingProduct(null)}
                className="px-10 py-3 bg-white border-2 border-slate-200 rounded-2xl text-xs font-black text-slate-400 uppercase tracking-widest hover:border-slate-300 hover:text-slate-600 transition-all active:scale-95"
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Info Legend */}
      <div className="px-12 py-4 bg-white border-t border-slate-100 flex items-center gap-8 print:hidden overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-4 h-4 bg-orange-500 rounded-md shadow-lg shadow-orange-500/20"></div>
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Pending Perubahan</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-4 h-4 bg-emerald-100 border border-emerald-200 rounded-md"></div>
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Auto Inheritance</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-4 h-4 bg-purple-100 border border-purple-200 rounded-md"></div>
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Custom Override</span>
        </div>
        <div className="ml-auto text-[10px] text-slate-300 font-bold italic whitespace-nowrap">
           * Harga jual akan masuk ke riwayat pergerakan harga per unit.
        </div>
      </div>
    </div>
  );
};
