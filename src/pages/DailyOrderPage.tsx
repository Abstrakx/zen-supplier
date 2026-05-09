import React, { useState, useEffect, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  Plus,
  Calendar,
  ClipboardList,
  ChevronRight,
  X,
  Building2,
  Trash2,
  LayoutGrid,
} from "lucide-react";
import type { DailyOrder, Kitchen } from "../types";
import Swal from "sweetalert2";
import { AggregatePOModal } from "../components/AggregatePOModal";

interface Props {
  onOpenDetail: (orderId: string) => void;
}

const statusConfig: Record<string, { label: string; bg: string; text: string; border: string }> = {
  draft: { label: "DRAFT", bg: "bg-slate-50", text: "text-slate-400", border: "border-slate-200" },
  ordered: { label: "ORDERED", bg: "bg-blue-50", text: "text-blue-600", border: "border-blue-100" },
  approved: { label: "APPROVED", bg: "bg-emerald-50", text: "text-emerald-600", border: "border-emerald-100" },
  done: { label: "SELESAI", bg: "bg-slate-100", text: "text-slate-400", border: "border-slate-200" },
};

export const DailyOrderPage: React.FC<Props> = ({ onOpenDetail }) => {
  const [orders, setOrders] = useState<DailyOrder[]>([]);
  const [kitchens, setKitchens] = useState<Kitchen[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedAggregateDate, setSelectedAggregateDate] = useState<string | null>(null);
  const [newDate, setNewDate] = useState(
    new Date().toLocaleDateString("sv-SE"),
  );
  const [selectedKitchenId, setSelectedKitchenId] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [ordersData, kitchensData] = await Promise.all([
        invoke<DailyOrder[]>("get_daily_orders", {
          dateFrom: null,
          dateTo: null,
        }),
        invoke<Kitchen[]>("get_kitchens"),
      ]);
      setOrders(ordersData);
      setKitchens(kitchensData);
      if (kitchensData.length > 0 && !selectedKitchenId) {
        setSelectedKitchenId(kitchensData[0].id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Grouping orders by date
  const groupedOrders = useMemo(() => {
    const groups: Record<string, DailyOrder[]> = {};
    orders.forEach(o => {
      if (!groups[o.order_date]) groups[o.order_date] = [];
      groups[o.order_date].push(o);
    });
    // Sort dates descending
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [orders]);

  const deleteOrder = async (e: React.MouseEvent, orderId: string) => {
    e.stopPropagation();
    const result = await Swal.fire({
      title: "Hapus Purchase Order?",
      text: "Seluruh data item dalam PO ini akan ikut terhapus.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonText: "Batal",
      confirmButtonText: "Ya, Hapus",
    });

    if (!result.isConfirmed) return;

    try {
      await invoke("delete_daily_order", { orderId });
      Swal.fire("Berhasil", "Purchase Order telah dihapus.", "success");
      loadData();
    } catch (e) {
      Swal.fire("Gagal", String(e), "error");
    }
  };

  const createOrder = async () => {
    if (!newDate || !selectedKitchenId) {
      Swal.fire("Gagal", "Harap pilih tanggal dan dapur.", "error");
      return;
    }
    try {
      const order = await invoke<DailyOrder>("create_daily_order", {
        payload: { order_date: newDate, kitchen_id: selectedKitchenId },
      });
      setShowCreate(false);

      Swal.fire({
        title: "PO Berhasil Dibuat!",
        text: order.po_number || "PO baru telah dibuat",
        icon: "success",
        confirmButtonColor: "#2563eb",
        timer: 1500,
        timerProgressBar: true,
        customClass: {
          popup: "rounded-3xl border-0 shadow-2xl",
        },
      });

      loadData();
      onOpenDetail(order.id);
    } catch (e) {
      Swal.fire({
        title: "Gagal!",
        text: String(e),
        icon: "error",
        confirmButtonColor: "#ef4444",
      });
    }
  };

  const getProgress = (o: DailyOrder) =>
    o.item_count > 0 ? Math.round((o.checked_count / o.item_count) * 100) : 0;

  const getStatusBadge = (status: string) => {
    const cfg = statusConfig[status] || statusConfig.draft;
    return (
      <span
        className={`text-[9px] font-extrabold px-2.5 py-1 rounded-lg uppercase tracking-widest border ${cfg.bg} ${cfg.text} ${cfg.border}`}
      >
        {cfg.label}
      </span>
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50 text-slate-900">
      {/* Header */}
      <div className="px-8 py-6 border-b border-slate-200 bg-white flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 rounded-xl border border-blue-100 shadow-sm">
            <ClipboardList size={20} className="text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-800 uppercase tracking-tight">
              Purchase Order Harian
            </h2>
            <p className="text-xs text-slate-500 font-medium tracking-wide">
              Kelola daftar belanja harian untuk dapur MBG
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl text-xs font-extrabold shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2 uppercase tracking-widest active:scale-95"
        >
          <Plus size={16} /> BUAT PO BARU
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-7xl mx-auto space-y-12">
          {loading && (
            <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-50">
              <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs font-extrabold uppercase tracking-widest text-slate-400">
                Memuat Data PO...
              </p>
            </div>
          )}

          {!loading && groupedOrders.length === 0 && (
            <div className="text-center py-24 bg-white rounded-3xl border-2 border-dashed border-slate-200">
              <div className="w-20 h-20 mx-auto rounded-3xl bg-blue-50 flex items-center justify-center text-blue-600 mb-6 border border-blue-100">
                <ClipboardList size={32} />
              </div>
              <h3 className="text-xl font-extrabold text-slate-800 uppercase tracking-tight">
                Daftar PO Masih Kosong
              </h3>
              <p className="text-sm text-slate-500 mt-2 font-medium">
                Anda belum memiliki riwayat Purchase Order. Klik tombol di atas
                untuk membuat PO baru.
              </p>
            </div>
          )}

          {!loading && groupedOrders.map(([date, dateOrders]: [string, DailyOrder[]]) => (
            <div key={date} className="space-y-6">
              {/* Date Header / Big Card Container */}
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center gap-3">
                  <div className="bg-white px-4 py-2 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-2">
                    <Calendar size={16} className="text-blue-600" />
                    <span className="text-sm font-black text-slate-800 uppercase tracking-widest">
                      {new Date(date).toLocaleDateString("id-ID", { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                  </div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                    {dateOrders.length} PO AKTIF
                  </span>
                </div>

                <button
                  onClick={() => setSelectedAggregateDate(date)}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-500/20 active:scale-95"
                >
                  <LayoutGrid size={14} /> Lihat Rekap Belanja
                </button>
              </div>

              {/* Grid of PO Cards for this date */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {dateOrders.map((o: DailyOrder) => (
                  <div
                    key={o.id}
                    onClick={() => onOpenDetail(o.id)}
                    className={`bg-white p-6 rounded-4xl border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all text-left flex flex-col justify-between group cursor-pointer relative overflow-hidden ${o.status === "done" ? "opacity-60 grayscale-50" : ""}`}
                  >
                    {/* Kitchen Tag */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-100 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 transition-all shadow-xs">
                          <Building2 size={18} />
                        </div>
                        <div>
                          <h4 className="font-black text-slate-800 uppercase tracking-tight group-hover:text-blue-600 transition-colors">
                            {o.kitchen_name || "Internal"}
                          </h4>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{o.po_number || "NO NUMBER"}</p>
                        </div>
                      </div>
                      {getStatusBadge(o.status)}
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        <span className="flex items-center gap-1.5"><ClipboardList size={12} /> {o.item_count} ITEMS</span>
                        <span className={getProgress(o) === 100 ? "text-emerald-500" : "text-blue-500"}>{getProgress(o)}% CHECKED</span>
                      </div>

                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-50">
                        <div
                          className={`h-full rounded-full transition-all duration-700 shadow-sm ${getProgress(o) === 100 ? "bg-emerald-500" : "bg-blue-600"}`}
                          style={{ width: `${getProgress(o)}%` }}
                        />
                      </div>
                    </div>

                    <div className="mt-6 flex items-center justify-between pt-4 border-t border-slate-50">
                      <button
                        onClick={(e) => deleteOrder(e, o.id)}
                        className="p-2 rounded-xl bg-white border border-slate-100 text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all active:scale-95 shadow-xs"
                      >
                        <Trash2 size={14} />
                      </button>
                      <div className="flex items-center gap-1 text-[10px] font-black text-blue-600 uppercase tracking-widest group-hover:gap-2 transition-all">
                        Detail <ChevronRight size={14} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col">
            <div className="px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-extrabold text-slate-800 uppercase tracking-tight">
                Buat PO Baru
              </h3>
              <button
                onClick={() => setShowCreate(false)}
                className="p-2 hover:bg-slate-200 rounded-xl text-slate-400 transition-all"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-8 space-y-6">
              <div>
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5 block">
                  Tanggal Operasional *
                </label>
                <div className="relative">
                  <Calendar
                    size={16}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                  />
                  <input
                    type="date"
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-blue-500 font-semibold text-slate-800 transition-all focus:ring-4 focus:ring-blue-500/10"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5 block">
                  Pilih Dapur (SPPG) *
                </label>
                <div className="relative">
                  <Building2
                    size={16}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                  />
                  <select
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-blue-500 font-semibold text-slate-800 transition-all focus:ring-4 focus:ring-blue-500/10 appearance-none"
                    value={selectedKitchenId}
                    onChange={(e) => setSelectedKitchenId(e.target.value)}
                  >
                    <option value="">-- Pilih Dapur --</option>
                    {kitchens.map(k => (
                      <option key={k.id} value={k.id}>{k.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="px-8 py-6 bg-slate-50/50 border-t border-slate-100 flex justify-end gap-3">
              <button
                onClick={() => setShowCreate(false)}
                className="px-6 py-2 text-slate-400 font-extrabold text-xs uppercase tracking-widest hover:text-slate-800 transition-all"
              >
                Batal
              </button>
              <button
                onClick={createOrder}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-2xl font-extrabold text-xs shadow-lg shadow-blue-500/30 active:scale-95 transition-all uppercase tracking-widest"
              >
                Simpan PO
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Aggregate Modal */}
      {selectedAggregateDate && (
        <AggregatePOModal
          date={selectedAggregateDate}
          onClose={() => setSelectedAggregateDate(null)}
        />
      )}
    </div>
  );
};
