import React, { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  PackageSearch,
  Plus,
  Trash2,
  TrendingUp,
  TrendingDown,
  Search,
} from "lucide-react";
import type { Product, NavPage } from "../types";

interface CatalogPageProps {
  onNavigate: (page: NavPage) => void;
}

export const CatalogPage: React.FC<CatalogPageProps> = ({ onNavigate }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const data = await invoke<Product[]>("get_products");
      setProducts(data);
    } catch (e) {
      console.error(e);
    }
  };

  const deleteProduct = async (p: Product) => {
    if (!confirm(`Hapus produk "${p.name}"?`)) return;
    try {
      await invoke("delete_product", { productId: p.id });
      loadProducts();
    } catch (e) {
      alert(String(e));
    }
  };

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50 text-slate-900 font-sans">
      {/* Header */}
      <div className="px-8 py-6 border-b border-slate-200 bg-white flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-50 rounded-xl border border-purple-100 shadow-sm">
            <PackageSearch size={20} className="text-purple-600" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">
              Katalog Master Produk
            </h2>
            <p className="text-xs text-slate-500 font-medium tracking-wide">
              Total {products.length} produk terdaftar dalam sistem
            </p>
          </div>
        </div>
        <button
          onClick={() => onNavigate("product-registration")}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl text-xs font-black shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2 uppercase tracking-widest"
        >
          <Plus size={16} /> TAMBAH PRODUK
        </button>
      </div>

      {/* Toolbar */}
      <div className="px-8 py-4 bg-white/50 border-b border-slate-200 flex items-center justify-between">
        <div className="relative w-full max-w-md group">
          <Search
            size={16}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors"
          />
          <input
            className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl outline-none focus:border-blue-500 font-bold text-slate-700 text-sm shadow-sm transition-all"
            placeholder="Cari nama produk..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Nama Produk
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Satuan
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Kategori
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Konversi
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">
                    Harga Beli
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">
                    Harga Jual
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">
                    Margin
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
                    Opsi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((p) => {
                  const margin =
                    p.latest_buy_price && p.latest_sell_price
                      ? p.latest_sell_price - p.latest_buy_price
                      : null;
                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-slate-50/50 transition-colors"
                    >
                      <td className="px-6 py-4 font-bold text-slate-800">
                        {p.name}
                      </td>
                      <td className="px-6 py-4 font-bold text-blue-600 text-[11px] uppercase tracking-wider">
                        {p.base_unit}
                      </td>
                      <td className="px-6 py-4 text-xs font-black text-slate-400 uppercase">
                        {p.category || "-"}
                      </td>
                      <td className="px-6 py-4 text-[10px] font-bold text-slate-500 italic">
                        {p.units
                          .filter((u) => !u.is_base_unit)
                          .map(
                            (u) => `${u.unit_name} (${u.conversion_to_base})`,
                          )
                          .join(", ") || "-"}
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-slate-600 text-sm">
                        {p.latest_buy_price
                          ? `Rp ${p.latest_buy_price.toLocaleString("id-ID")}`
                          : "-"}
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-slate-600 text-sm">
                        {p.latest_sell_price
                          ? `Rp ${p.latest_sell_price.toLocaleString("id-ID")}`
                          : "-"}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {margin !== null ? (
                          <div
                            className={`flex flex-col items-end font-black text-[11px] ${margin >= 0 ? "text-emerald-600" : "text-red-600"}`}
                          >
                            <div className="flex items-center gap-1">
                              {margin >= 0 ? (
                                <TrendingUp size={10} />
                              ) : (
                                <TrendingDown size={10} />
                              )}
                              Rp {margin.toLocaleString("id-ID")}
                            </div>
                            <span className="text-[9px] opacity-70">
                              {(
                                (margin / (p.latest_buy_price || 1)) *
                                100
                              ).toFixed(1)}
                              %
                            </span>
                          </div>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => deleteProduct(p)}
                          className="p-2 hover:bg-red-50 rounded-lg text-slate-300 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="text-center py-24 text-slate-400 font-medium italic"
                    >
                      {products.length === 0
                        ? "Katalog produk masih kosong. Tambahkan produk pertama Anda."
                        : "Pencarian tidak menemukan produk yang cocok."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
