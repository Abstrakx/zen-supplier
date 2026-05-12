import React, { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  ArrowLeft,
  Edit,
  Trash2,
  Package,
  Boxes,
  Calendar,
  Activity,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Info,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { Product, PriceRecord, Supplier } from "../types";
import Swal from "sweetalert2";

interface ProductDetailPageProps {
  productId: string;
  onBack: () => void;
  onEditProduct: (product: Product) => void;
}

export const ProductDetailPage: React.FC<ProductDetailPageProps> = ({
  productId,
  onBack,
  onEditProduct,
}) => {
  const [product, setProduct] = useState<Product | null>(null);
  const [history, setHistory] = useState<PriceRecord[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [productId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [allProducts, allHistory, allSuppliers] = await Promise.all([
        invoke<Product[]>("get_products"),
        invoke<PriceRecord[]>("get_price_history", { productId }),
        invoke<Supplier[]>("get_suppliers"),
      ]);

      const found = allProducts.find((p) => p.id === productId);
      if (found) {
        setProduct(found);
      }
      setHistory(allHistory);
      setSuppliers(allSuppliers);
    } catch (e) {
      console.error(e);
      Swal.fire("Error", "Gagal memuat detail produk", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    const result = await Swal.fire({
      title: "Hapus Produk?",
      text: "Data produk dan riwayat harga akan dihapus permanen.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Ya, Hapus!",
      cancelButtonText: "Batal",
    });

    if (result.isConfirmed) {
      try {
        await invoke("delete_product", { productId });
        Swal.fire("Berhasil", "Produk telah dihapus", "success");
        onBack();
      } catch (e) {
        Swal.fire("Gagal", String(e), "error");
      }
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Memuat Detail...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-50 p-8 text-center">
        <Package size={48} className="text-slate-200 mb-4" />
        <h2 className="text-xl font-black text-slate-800">Produk Tidak Ditemukan</h2>
        <button onClick={onBack} className="mt-4 text-blue-600 font-bold hover:underline">Kembali ke Katalog</button>
      </div>
    );
  }

  const supplier = suppliers.find((s) => s.id === product.supplier_id);

  // Group history for charts
  const getChartData = (unitId: string) => {
    // 1. Filter by unit_id
    const filtered = history.filter((h) => h.unit_id === unitId);

    // 2. Group by date
    const groups: Record<string, { date: string, buy?: number, sell?: number }> = {};

    filtered.forEach(h => {
      const dateStr = h.recorded_at ? h.recorded_at : "N/A";
      if (!groups[dateStr]) {
        groups[dateStr] = { date: dateStr };
      }
      if (h.price_type === "buy") groups[dateStr].buy = h.price;
      if (h.price_type === "sell") groups[dateStr].sell = h.price;
    });

    // 3. Convert to array and sort by date ASC
    return Object.values(groups)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-20); // Show last 20 dates
  };

  // Helper to get latest price for a unit in the strategy table
  const getLatestPrice = (unitId: string, type: "buy" | "sell") => {
    const found = history.find((h) => h.unit_id === unitId && h.price_type === type);
    return found ? found.price : null;
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50 text-slate-900 font-sans">
      {/* Header */}
      <div className="px-8 py-4 border-b border-slate-200 bg-white flex items-center justify-between shadow-sm shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-800 transition-all border border-transparent hover:border-slate-200 shadow-xs"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
              <span>Katalog Produk</span>
              <ChevronRight size={10} />
              <span className="text-blue-600">Spesifikasi Produk</span>
            </div>
            <h2 className="text-xl font-black text-slate-800 tracking-tight mt-0.5 uppercase">
              {product.name} {product.neto && <span className="text-blue-600">@{product.neto}</span>}
            </h2>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => onEditProduct(product)}
            className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 rounded-xl text-[10px] font-black text-slate-700 hover:bg-slate-50 transition-all shadow-sm uppercase tracking-widest"
          >
            <Edit size={14} className="text-blue-500" /> EDIT DATA
          </button>
          <button
            onClick={handleDelete}
            className="flex items-center gap-2 px-5 py-2.5 bg-red-500 text-white rounded-xl text-[10px] font-black hover:bg-red-600 transition-all shadow-lg shadow-slate-900/10 uppercase tracking-widest"
          >
            <Trash2 size={14} /> HAPUS PRODUK
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8 space-y-8">
        {/* Basic Info Grid */}
        <div className="grid grid-cols-12 gap-8">
          {/* Main Info */}
          <div className="col-span-8 bg-white rounded-3xl border border-slate-200 shadow-sm p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                <Info size={18} />
              </div>
              <h3 className="font-black text-slate-800 uppercase tracking-tight text-sm">Informasi Dasar</h3>
            </div>

            <div className="grid grid-cols-2 gap-y-8 gap-x-12">
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nama Produk</p>
                <p className="font-bold text-slate-800">{product.name}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kategori Utama</p>
                <p className="font-bold text-slate-800 uppercase tracking-tight">{product.category || "-"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Neto / Berat Bersih</p>
                <p className="font-bold text-slate-800">{product.neto || "-"} <span className="text-slate-400 text-xs font-medium ml-1">{product.base_unit}</span></p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Satuan Penjualan Dasar</p>
                <p className="font-bold text-slate-800 uppercase tracking-tight">{product.base_unit}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Supplier Utama</p>
                <div className="flex items-center gap-2">
                  <p className="font-bold text-blue-600">{supplier?.name || "-"}</p>
                  {supplier && (
                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest ${supplier.is_internal ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-amber-50 text-amber-600 border border-amber-100'}`}>
                      {supplier.is_internal ? 'INTERNAL' : 'EKSTERNAL'}
                    </span>
                  )}
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipe Item</p>
                <p className="font-bold text-slate-800 uppercase tracking-tight">{product.item_type === 'operational' ? 'Operasional' : 'Bahan Dapur'}</p>
              </div>
            </div>
          </div>

          {/* Metrics Column */}
          <div className="col-span-4 bg-white rounded-3xl border border-slate-200 shadow-sm p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                <Activity size={18} />
              </div>
              <h3 className="font-black text-slate-800 uppercase tracking-tight text-sm">Status & Metrik</h3>
            </div>

            <div className="space-y-6">
              <div className="flex items-center justify-between py-3 border-b border-slate-50">
                <span className="text-xs font-bold text-slate-500">Status Aktif</span>
                <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-widest ${product.is_active ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                  {product.is_active ? 'Tersedia' : 'Nonaktif'}
                </span>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-slate-50">
                <span className="text-xs font-bold text-slate-500">Jumlah Satuan</span>
                <span className="text-sm font-black text-slate-800">{product.units.length} Opsi</span>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-slate-50">
                <span className="text-xs font-bold text-slate-500">Kategori</span>
                <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-2.5 py-1 rounded-lg uppercase tracking-widest">{product.item_type || 'Dapur'}</span>
              </div>
              <div className="flex items-center justify-between py-3">
                <div className="flex items-center gap-2 text-slate-300">
                  <Calendar size={14} />
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-tighter">Terdaftar</span>
                </div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{product.created_at?.split(' ')[0] || '-'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Pricing Strategy Table */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-8 py-5 border-b border-slate-100 flex items-center gap-3">
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
              <Boxes size={18} />
            </div>
            <h3 className="font-black text-slate-800 uppercase tracking-tight text-sm">Strategi Harga Per Satuan</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50/50">
                <tr>
                  <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Satuan</th>
                  <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Harga Beli (IDR)</th>
                  <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Harga Jual (IDR)</th>
                  <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Estimasi Margin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {product.units.map((u) => {
                  const buy = getLatestPrice(u.id, "buy") || (u.is_base_unit ? product.latest_buy_price : null);
                  const sell = getLatestPrice(u.id, "sell") || (u.is_base_unit ? product.latest_sell_price : null);
                  const margin = buy && sell ? sell - buy : null;
                  const marginPct = buy && sell ? (margin! / buy) * 100 : null;

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/30 transition-colors">
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-3">
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-widest ${u.is_base_unit ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' : 'bg-slate-100 text-slate-400'}`}>
                            {u.unit_name}
                          </span>
                          {!u.is_base_unit && (
                            <span className="text-[10px] font-bold text-slate-300 italic">1 {u.unit_name} = {u.conversion_to_base} {product.base_unit}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-8 py-5 text-right font-black text-slate-700">
                        {buy ? `Rp ${buy.toLocaleString("id-ID")}` : '-'}
                      </td>
                      <td className="px-8 py-5 text-right font-black text-blue-600">
                        {sell ? `Rp ${sell.toLocaleString("id-ID")}` : '-'}
                      </td>
                      <td className="px-8 py-5 text-right">
                        {margin !== null ? (
                          <div className={`flex flex-col items-end ${margin >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            <div className="flex items-center gap-1 font-black text-xs">
                              {margin >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                              Rp {margin.toLocaleString("id-ID")}
                            </div>
                            <span className="text-[10px] font-bold opacity-60">{marginPct?.toFixed(1)}%</span>
                          </div>
                        ) : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Charts Section */}
        <div className="space-y-8 pb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Activity size={18} />
            </div>
            <h3 className="font-black text-slate-800 uppercase tracking-tight text-sm">Tren Harga — 6 Bulan Terakhir</h3>
          </div>

          <div className="grid grid-cols-1 gap-8">
            {product.units.map((u) => {
              const data = getChartData(u.id);

              if (data.length < 2) {
                return (
                  <div key={u.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 text-center">
                    <div className="p-3 bg-slate-50 text-slate-400 rounded-2xl w-fit mx-auto mb-4">
                      <TrendingUp size={24} />
                    </div>
                    <h4 className="font-black text-slate-800 text-xs uppercase tracking-widest mb-2">
                      Satuan: <span className="text-blue-600">{u.unit_name}</span>
                    </h4>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      Belum ada riwayat perubahan harga. Data saat ini adalah harga terbaru.
                    </p>
                  </div>
                );
              }

              return (
                <div key={u.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8">
                  <div className="flex items-center justify-between mb-8">
                    <h4 className="font-black text-slate-800 text-xs uppercase tracking-widest">
                      Harga Per Satuan: <span className="text-blue-600">{u.unit_name}</span>
                    </h4>
                    <div className="flex gap-4">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Harga Beli</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Harga Jual</span>
                      </div>
                    </div>
                  </div>

                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis
                          dataKey="date"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                          dy={10}
                          tickFormatter={(val) => val.split(" ")[0] || val}
                        />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                          tickFormatter={(val) => `Rp ${val / 1000}k`}
                        />
                        <Tooltip
                          contentStyle={{
                            borderRadius: '16px',
                            border: 'none',
                            boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                            fontSize: '12px',
                            fontWeight: 700
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="buy"
                          stroke="#3b82f6"
                          strokeWidth={3}
                          dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }}
                          activeDot={{ r: 6, strokeWidth: 0 }}
                          name="Harga Beli"
                          connectNulls
                        />
                        <Line
                          type="monotone"
                          dataKey="sell"
                          stroke="#10b981"
                          strokeWidth={3}
                          dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }}
                          activeDot={{ r: 6, strokeWidth: 0 }}
                          name="Harga Jual"
                          connectNulls
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              );
            })}

          </div>
        </div>
      </div>
    </div>
  );
};
