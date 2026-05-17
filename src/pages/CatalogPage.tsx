import React, { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  PackageSearch,
  Plus,
  TrendingUp,
  TrendingDown,
  Search,
  Package,
  ChevronRight,
  Layers,
  Tag,
  Printer,
} from "lucide-react";
import type { Product, Supplier, NavPage } from "../types";

interface CatalogPageProps {
  onNavigate: (page: NavPage) => void;
  onViewProduct: (productId: string) => void;
}

export const CatalogPage: React.FC<CatalogPageProps> = ({ onNavigate, onViewProduct }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [printMode, setPrintMode] = useState<"internal" | "dapur" | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const handleAfterPrint = () => setPrintMode(null);
    window.addEventListener("afterprint", handleAfterPrint);
    return () => window.removeEventListener("afterprint", handleAfterPrint);
  }, []);

  const loadData = async () => {
    try {
      const [prods, supps] = await Promise.all([
        invoke<Product[]>("get_products"),
        invoke<Supplier[]>("get_suppliers"),
      ]);
      setProducts(prods);
      setSuppliers(supps);
    } catch (e) {
      console.error(e);
    }
  };

  const getSupplier = (id: string | null) => suppliers.find((s) => s.id === id);

  const filtered = products.filter((p) => {
    const l = search.toLowerCase();
    const matchSearch =
      p.name.toLowerCase().includes(l) ||
      (p.neto && p.neto.toLowerCase().includes(l)) ||
      (p.base_unit && p.base_unit.toLowerCase().includes(l)) ||
      (p.category && p.category.toLowerCase().includes(l));

    const isOps = p.item_type === "operational";
    const matchType = filterType === "all" || (isOps ? "operational" : (p.item_type || "dapur")) === filterType;

    return matchSearch && matchType;
  });

  const dapurCount = products.filter((p) => (p.item_type || "dapur") === "dapur").length;
  const opsCount = products.filter((p) => (p.item_type || "dapur") === "operational").length;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden print:h-auto print:overflow-visible bg-slate-50 text-slate-900 font-sans relative">
      {/* Screen View */}
      <div className="flex-1 flex flex-col h-full overflow-hidden no-print">
        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-linear-to-br from-purple-500 to-indigo-600 rounded-2xl shadow-lg shadow-purple-500/20">
                <PackageSearch size={20} className="text-white" />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">
                  Katalog Master Produk
                </h2>
                <p className="text-xs text-slate-500 font-medium tracking-wide">
                  {products.length} produk terdaftar · {dapurCount} dapur · {opsCount} operasional
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setPrintMode("internal");
                  setTimeout(() => window.print(), 100);
                }}
                className="bg-slate-800 hover:bg-black text-white px-5 py-2.5 rounded-xl text-[10px] font-black shadow-lg shadow-slate-500/20 transition-all flex items-center gap-2 uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98]"
              >
                <Printer size={14} /> Print Internal
              </button>
              <button
                onClick={() => {
                  setPrintMode("dapur");
                  setTimeout(() => window.print(), 100);
                }}
                className="bg-amber-600 hover:bg-amber-700 text-white px-5 py-2.5 rounded-xl text-[10px] font-black shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2 uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98]"
              >
                <Printer size={14} /> Print Dapur
              </button>
              <button
                onClick={() => onNavigate("product-registration")}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl text-xs font-black shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2 uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98]"
              >
                <Plus size={16} /> TAMBAH PRODUK
              </button>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="px-8 py-4 bg-white/60 backdrop-blur-sm border-b border-slate-200 flex items-center gap-4">
          <div className="relative flex-1 max-w-md group">
            <Search
              size={16}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors"
            />
            <input
              className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 font-bold text-slate-700 text-sm shadow-sm transition-all"
              placeholder="Cari produk, kategori, satuan..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
            {[
              { key: "all", label: "Semua" },
              { key: "dapur", label: "Dapur" },
              { key: "operational", label: "Ops" },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilterType(tab.key)}
                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${filterType === tab.key
                  ? "bg-white text-slate-800 shadow-sm"
                  : "text-slate-400 hover:text-slate-600"
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Product Cards Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="p-5 bg-slate-100 rounded-3xl mb-5">
                <Package size={40} className="text-slate-300" />
              </div>
              <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest mb-2">
                {products.length === 0
                  ? "Katalog Masih Kosong"
                  : "Produk Tidak Ditemukan"}
              </h3>
              <p className="text-xs text-slate-400 font-medium">
                {products.length === 0
                  ? "Tambahkan produk pertama Anda untuk memulai."
                  : "Coba ubah kata kunci pencarian Anda."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map((p) => {
                const margin =
                  p.latest_buy_price && p.latest_sell_price
                    ? p.latest_sell_price - p.latest_buy_price
                    : null;
                const marginPercent =
                  margin !== null && p.latest_buy_price
                    ? (margin / p.latest_buy_price) * 100
                    : null;
                const supplier = getSupplier(p.supplier_id);
                const derivedUnits = p.units.filter((u) => !u.is_base_unit);

                return (
                  <div
                    key={p.id}
                    onClick={() => onViewProduct(p.id)}
                    className="group bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg hover:border-blue-200 cursor-pointer transition-all duration-200 hover:-translate-y-0.5 overflow-hidden"
                  >
                    {/* Card Header */}
                    <div className="px-5 pt-5 pb-3">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-black text-slate-800 text-sm truncate leading-tight">
                            {p.name}
                            {p.neto && (
                              <span className="text-blue-500 font-bold ml-1">@{p.neto}</span>
                            )}
                          </h3>
                          {supplier && (
                            <p className="text-[10px] font-bold text-slate-400 truncate mt-0.5">
                              {supplier.name}
                              {supplier.is_internal ? (
                                <span className="ml-1.5 text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase">
                                  Internal
                                </span>
                              ) : (
                                <span className="ml-1.5 text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase">
                                  Eksternal
                                </span>
                              )}
                            </p>
                          )}
                        </div>
                        <ChevronRight
                          size={16}
                          className="text-slate-300 group-hover:text-blue-500 transition-colors shrink-0 mt-0.5"
                        />
                      </div>

                      {/* Tags */}
                      <div className="flex flex-wrap items-center gap-1.5 mb-4">
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-md text-[9px] font-black uppercase tracking-wider">
                          {p.base_unit}
                        </span>
                        {p.category && (
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md text-[9px] font-black uppercase tracking-wider flex items-center gap-1">
                            <Tag size={8} /> {p.category}
                          </span>
                        )}
                        {(p.item_type || "dapur") === "operational" && (
                          <span className="px-2 py-0.5 bg-orange-50 text-orange-600 rounded-md text-[9px] font-black uppercase tracking-wider">
                            OPS
                          </span>
                        )}
                        {derivedUnits.length > 0 && (
                          <span className="px-2 py-0.5 bg-violet-50 text-violet-500 rounded-md text-[9px] font-black uppercase tracking-wider flex items-center gap-1">
                            <Layers size={8} /> {derivedUnits.length} satuan
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Price Section */}
                    <div className="px-5 pb-4">
                      <div className="flex items-stretch gap-2">
                        {/* Buy Price */}
                        <div className="flex-1 bg-slate-50 rounded-xl p-3">
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">
                            Beli
                          </p>
                          <p className="font-black text-slate-700 text-xs">
                            {p.latest_buy_price
                              ? `Rp ${p.latest_buy_price.toLocaleString("id-ID")}`
                              : "—"}
                          </p>
                        </div>

                        {/* Sell Price */}
                        <div className="flex-1 bg-slate-50 rounded-xl p-3">
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">
                            Jual
                          </p>
                          <p className="font-black text-slate-700 text-xs">
                            {p.latest_sell_price
                              ? `Rp ${p.latest_sell_price.toLocaleString("id-ID")}`
                              : "—"}
                          </p>
                        </div>

                        {/* Margin */}
                        <div
                          className={`flex-1 rounded-xl p-3 ${margin === null
                            ? "bg-slate-50"
                            : margin >= 0
                              ? "bg-emerald-50"
                              : "bg-red-50"
                            }`}
                        >
                          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">
                            Margin
                          </p>
                          {margin !== null ? (
                            <div className="flex items-center gap-1">
                              {margin >= 0 ? (
                                <TrendingUp size={10} className="text-emerald-600" />
                              ) : (
                                <TrendingDown size={10} className="text-red-600" />
                              )}
                              <span
                                className={`font-black text-xs ${margin >= 0 ? "text-emerald-700" : "text-red-700"
                                  }`}
                              >
                                {marginPercent !== null ? `${marginPercent.toFixed(1)}%` : "—"}
                              </span>
                            </div>
                          ) : (
                            <p className="font-black text-slate-400 text-xs">—</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Conversion Footer */}
                    {derivedUnits.length > 0 && (
                      <div className="px-5 pb-4">
                        <div className="flex flex-wrap gap-1.5">
                          {derivedUnits.map((u) => (
                            <span
                              key={u.id}
                              className="text-[9px] font-bold text-slate-500 bg-slate-50 border border-slate-100 px-2 py-1 rounded-lg"
                            >
                              1 {u.unit_name} = {u.conversion_to_base} {p.base_unit}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Print Templates */}
      {printMode && (
        <div className="hidden print:block bg-white p-8 text-black font-sans">
          {/* Print Header */}
          <div className="text-center mb-8 border-b-2 border-black pb-6">
            <h1 className="text-3xl font-black tracking-tighter">ZEN SUPPLIER</h1>
            <p className="text-[10px] uppercase font-bold tracking-[0.3em] text-gray-500 mt-1">
              {printMode === "internal" ? "DAFTAR HARGA INTERNAL (KONFIDENSIAL)" : "DAFTAR HARGA KATALOG"}
            </p>
            <div className="flex justify-between items-end mt-6 text-[10px] font-bold">
              <p>TANGGAL CETAK: {new Date().toLocaleDateString("id-ID", { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
              <p>FILTER: {filterType.toUpperCase()} {search ? `| CARI: "${search}"` : ""}</p>
            </div>
          </div>

          <table className="w-full border-collapse border border-black text-[10px]">
            <thead>
              <tr className="bg-gray-100 uppercase font-black">
                <th className="border border-black p-2 text-center w-8">#</th>
                <th className="border border-black p-2 text-left">PRODUK</th>
                <th className="border border-black p-2 text-center w-16">SATUAN</th>
                {printMode === "internal" && (
                  <>
                    <th className="border border-black p-2 text-left w-32">SUPPLIER</th>
                    <th className="border border-black p-2 text-right w-20">H. BELI</th>
                  </>
                )}
                <th className="border border-black p-2 text-right w-20">H. JUAL</th>
                {printMode === "internal" && (
                  <>
                    <th className="border border-black p-2 text-right w-16">MARGIN</th>
                    <th className="border border-black p-2 text-left">CATATAN REVISI</th>
                  </>
                )}
                {printMode === "dapur" && (
                  <th className="border border-black p-2 text-left">SATUAN LAINNYA</th>
                )}
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, idx) => {
                const supplier = getSupplier(p.supplier_id);
                const margin = (p.latest_buy_price && p.latest_sell_price) ? (p.latest_sell_price - p.latest_buy_price) : null;
                const marginPercent = (margin !== null && p.latest_buy_price) ? (margin / p.latest_buy_price) * 100 : null;

                return (
                  <React.Fragment key={p.id}>
                    <tr className="border-b border-black print:break-inside-avoid">
                      <td className="border border-black p-2 text-center">{idx + 1}</td>
                      <td className="border border-black p-2 font-bold">
                        {p.name} {p.neto && <span className="opacity-50 text-[8px]">@{p.neto}</span>}
                        {printMode === "internal" && (
                          <div className="text-[8px] opacity-40 uppercase tracking-tighter mt-0.5">
                            ID: {p.id.slice(0, 8)} | CAT: {p.category || "-"} | TYPE: {p.item_type || "dapur"}
                          </div>
                        )}
                      </td>
                      <td className="border border-black p-2 text-center font-bold">{p.base_unit}</td>
                      {printMode === "internal" && (
                        <>
                          <td className="border border-black p-2 italic opacity-70">
                            {supplier?.name || "-"}
                          </td>
                          <td className="border border-black p-2 text-right">
                            Rp. {p.latest_buy_price?.toLocaleString("id-ID") || "-"}
                          </td>
                        </>
                      )}
                      <td className="border border-black p-2 text-right font-black">
                        Rp. {p.latest_sell_price?.toLocaleString("id-ID") || "-"}
                      </td>
                      {printMode === "internal" && (
                        <>
                          <td className={`border border-black p-2 text-right font-bold ${margin && margin < 0 ? 'text-red-600' : ''}`}>
                            {marginPercent !== null ? `${marginPercent.toFixed(1)}%` : "-"}
                          </td>
                          <td className="border border-black p-2 w-32"></td>
                        </>
                      )}
                      {printMode === "dapur" && (
                        <td className="border border-black p-2">
                          <div className="flex flex-wrap gap-x-3 gap-y-1">
                            {p.units.filter(u => !u.is_base_unit).map(u => (
                              <div key={u.id} className="whitespace-nowrap">
                                <span className="font-bold">{u.unit_name}</span>:
                                <span className="ml-1">Rp {u.latest_sell_price?.toLocaleString("id-ID") || (p.latest_sell_price ? (p.latest_sell_price * u.conversion_to_base).toLocaleString("id-ID") : "-")}</span>
                              </div>
                            ))}
                          </div>
                        </td>
                      )}
                    </tr>
                    {/* Unit Breakdown for Internal Print */}
                    {printMode === "internal" && p.units.filter(u => !u.is_base_unit).map(u => (
                      <tr key={u.id} className="bg-gray-50/50 text-[8px] print:break-inside-avoid">
                        <td className="border border-black"></td>
                        <td className="border border-black p-1 pl-4 italic" colSpan={2}>
                          ↳ Satuan: {u.unit_name} (Konversi: {u.conversion_to_base} {p.base_unit})
                        </td>
                        <td className="border border-black"></td>
                        <td className="border border-black p-1 text-right opacity-60">
                          Rp. {u.latest_buy_price?.toLocaleString("id-ID") || "-"}
                        </td>
                        <td className="border border-black p-1 text-right font-bold">
                          Rp. {u.latest_sell_price?.toLocaleString("id-ID") || "-"}
                        </td>
                        <td className="border border-black"></td>
                        <td className="border border-black"></td>
                      </tr>
                    ))}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>

          {printMode === "internal" && (
            <div className="mt-8 text-[8px] text-gray-400 italic">
              * Dokumen ini rahasia. Digunakan khusus untuk tim operasional supplier. Kolom revisi digunakan untuk pencatatan perubahan harga manual sebelum diinput ke sistem.
            </div>
          )}

        </div>
      )}
    </div>
  );
};
