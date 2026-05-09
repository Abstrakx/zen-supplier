import React, { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  ClipboardList,
  Truck,
  Receipt,
  PackageSearch,
  TrendingUp,
  Calendar,
  ChevronRight,
} from "lucide-react";
import type { NavPage, DailySummary } from "../types";

interface Props {
  onNavigate: (page: NavPage) => void;
}

export const DashboardPage: React.FC<Props> = ({ onNavigate }) => {
  const [summaries, setSummaries] = useState<DailySummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const data = await invoke<DailySummary[]>("get_daily_summary");
      setSummaries(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const today = summaries[0];
  const todayDate = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const quickActions = [
    {
      icon: ClipboardList,
      label: "PO Harian",
      desc: "Buat & kelola Purchase Order",
      page: "daily-orders" as NavPage,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      icon: Truck,
      label: "Surat Jalan",
      desc: "Generate surat pengiriman",
      page: "delivery-notes" as NavPage,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      icon: Receipt,
      label: "Invoice",
      desc: "Buat invoice harian & ops",
      page: "invoices" as NavPage,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
    {
      icon: PackageSearch,
      label: "Katalog",
      desc: "Master produk & harga",
      page: "catalog" as NavPage,
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
  ];

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-slate-50 text-slate-900 font-sans">
      {/* Header Section */}
      <div className="px-8 py-10 bg-white border-b border-slate-200 shadow-sm relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-slate-400 text-[10px] font-black uppercase tracking-widest mb-3">
            <Calendar size={12} />
            <span>{todayDate}</span>
          </div>
          <h1 className="text-4xl font-black text-slate-800 tracking-tight">
            Selamat Datang 👋
          </h1>
          <p className="text-slate-500 mt-1 font-medium">
            Dashboard ringkasan operasional ZEN SUPPLIER
          </p>
        </div>
        {/* Subtle background decoration */}
        <div className="absolute right-0 top-0 w-64 h-64 bg-blue-50 rounded-full blur-3xl -mr-20 -mt-20 opacity-50"></div>
      </div>

      <div className="flex-1 p-8 space-y-8">
        {/* Quick Actions Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {quickActions.map((action) => (
            <button
              key={action.page}
              onClick={() => onNavigate(action.page)}
              className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all text-left group flex flex-col h-full"
            >
              <div
                className={`inline-flex p-4 rounded-2xl ${action.bg} ${action.color} mb-5 group-hover:scale-110 transition-transform`}
              >
                <action.icon size={24} strokeWidth={2.5} />
              </div>
              <h3 className="font-black text-slate-800 text-lg">
                {action.label}
              </h3>
              <p className="text-xs text-slate-500 mt-2 font-medium leading-relaxed flex-1">
                {action.desc}
              </p>
              <div className="mt-6 flex items-center gap-2 text-[10px] font-black text-slate-300 group-hover:text-slate-900 transition-colors uppercase tracking-widest">
                BUKA MENU{" "}
                <ChevronRight
                  size={12}
                  className="group-hover:translate-x-1 transition-transform"
                />
              </div>
            </button>
          ))}
        </div>

        {/* Real-time Insights */}
        {today && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Total Item Checklist
                </p>
                <div className="text-blue-600 bg-blue-50 px-2 py-1 rounded text-[10px] font-black">
                  {Math.round(
                    (today.total_checked / (today.total_items || 1)) * 100,
                  )}
                  %
                </div>
              </div>
              <p className="text-4xl font-black text-slate-800">
                {today.total_items}
              </p>
              <div className="mt-4 h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                <div
                  className="h-full bg-linear-to-r from-blue-500 to-indigo-500 rounded-full shadow-sm"
                  style={{
                    width: `${today.total_items > 0 ? (today.total_checked / today.total_items) * 100 : 0}%`,
                  }}
                />
              </div>
              <p className="text-xs text-slate-500 mt-3 font-bold uppercase tracking-tight">
                {today.total_checked} DARI {today.total_items} TELAH DIPROSES
              </p>
            </div>

            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">
                Estimasi Omzet Hari Ini
              </p>
              <p className="text-4xl font-black text-slate-800 tracking-tight">
                Rp {today.total_revenue.toLocaleString("id-ID")}
              </p>
              <div className="mt-6 flex items-center gap-2">
                <div className="flex -space-x-2">
                  {[...Array(Math.min(today.kitchen_count, 3))].map((_, i) => (
                    <div
                      key={i}
                      className="w-6 h-6 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-[10px] font-black"
                    >
                      D
                    </div>
                  ))}
                </div>
                <p className="text-xs text-slate-500 font-bold uppercase ml-1">
                  {today.kitchen_count} DAPUR AKTIF
                </p>
              </div>
            </div>

            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">
                Estimasi Profit (Margin)
              </p>
              <p
                className={`text-4xl font-black tracking-tight ${today.total_profit >= 0 ? "text-emerald-600" : "text-red-600"}`}
              >
                Rp {today.total_profit.toLocaleString("id-ID")}
              </p>
              <div className="mt-6 flex items-center gap-2">
                <TrendingUp
                  size={16}
                  className={
                    today.total_profit >= 0
                      ? "text-emerald-500"
                      : "text-red-500"
                  }
                />
                <p className="text-xs text-slate-500 font-bold uppercase">
                  PROFITABILITAS HARIAN
                </p>
              </div>
            </div>
          </div>
        )}

        {/* History Section */}
        {summaries.length > 0 && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
              <h2 className="font-black text-slate-800 text-sm uppercase tracking-widest">
                Riwayat Operasional 7 Hari Terakhir
              </h2>
              <button className="text-[10px] font-black text-blue-600 hover:underline">
                LIHAT SEMUA
              </button>
            </div>
            <div className="divide-y divide-slate-100">
              {summaries.slice(0, 7).map((s, i) => (
                <div
                  key={i}
                  className="px-8 py-5 flex items-center justify-between hover:bg-slate-50/50 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-5">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 flex flex-col items-center justify-center border border-slate-200 group-hover:bg-blue-600 group-hover:border-blue-600 transition-all">
                      <span
                        className={`text-xs font-black ${"group-hover:text-white text-slate-500"}`}
                      >
                        {new Date(s.order_date).getDate()}
                      </span>
                      <span
                        className={`text-[8px] font-black uppercase ${"group-hover:text-blue-200 text-slate-400"}`}
                      >
                        {new Date(s.order_date).toLocaleDateString("id-ID", {
                          month: "short",
                        })}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-800">
                        {s.order_date}
                      </p>
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-tighter mt-0.5">
                        {s.total_items} items • {s.kitchen_count} dapur
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-slate-800">
                      Rp {s.total_revenue.toLocaleString("id-ID")}
                    </p>
                    <p
                      className={`text-[10px] font-black uppercase tracking-widest ${s.total_profit >= 0 ? "text-emerald-500" : "text-red-500"}`}
                    >
                      {s.total_profit >= 0 ? "PROFIT" : "LOSS"} Rp{" "}
                      {Math.abs(s.total_profit).toLocaleString("id-ID")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!loading && summaries.length === 0 && (
          <div className="bg-white p-16 rounded-3xl border-2 border-dashed border-slate-200 text-center">
            <div className="w-20 h-20 mx-auto rounded-3xl bg-blue-50 flex items-center justify-center text-blue-600 mb-6">
              <ClipboardList size={32} />
            </div>
            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">
              Belum Ada Data Operasional
            </h3>
            <p className="text-sm text-slate-500 mt-2 max-w-sm mx-auto font-medium">
              Lengkapi master data di Pengaturan untuk mulai membuat Purchase
              Order harian.
            </p>
            <button
              onClick={() => onNavigate("settings")}
              className="mt-8 bg-slate-900 hover:bg-black text-white px-8 py-3 rounded-2xl font-black text-xs shadow-lg transition-all active:scale-95 uppercase tracking-widest"
            >
              Setup Master Data
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
