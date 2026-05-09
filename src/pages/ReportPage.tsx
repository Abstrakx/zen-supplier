import React, { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Calendar,
  Search,
} from "lucide-react";
import type { MarginItem } from "../types";

export const ReportPage: React.FC = () => {
  const [data, setData] = useState<MarginItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    loadReport();
  }, []);

  const loadReport = async () => {
    setLoading(true);
    try {
      const result = await invoke<MarginItem[]>("get_margin_report", {
        dateFrom: dateFrom || null,
        dateTo: dateTo || null,
      });
      setData(result);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const totalProfit = data.reduce((acc, d) => acc + d.total_profit, 0);
  const warningCount = data.filter((d) => d.margin < 0).length;
  const totalRevenue = data.reduce(
    (acc, d) => acc + d.sell_price * d.quantity,
    0,
  );

  const stats = [
    {
      label: "Total Omzet",
      value: `Rp ${totalRevenue.toLocaleString("id-ID")}`,
      icon: TrendingUp,
      color: "text-blue-600",
      bg: "bg-blue-100",
    },
    {
      label: "Total Profit",
      value: `Rp ${totalProfit.toLocaleString("id-ID")}`,
      icon: TrendingUp,
      color: "text-emerald-600",
      bg: "bg-emerald-100",
    },
    {
      label: "Item Rugi",
      value: `${warningCount} Item`,
      icon: TrendingDown,
      color: warningCount > 0 ? "text-red-600" : "text-slate-400",
      bg: warningCount > 0 ? "bg-red-100" : "bg-slate-100",
    },
  ];

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50 text-slate-900 font-sans">
      {/* Header */}
      <div className="px-8 py-6 border-b border-slate-200 bg-white flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-50 rounded-xl">
            <BarChart3 size={20} className="text-indigo-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">
              Laporan Analisis Margin
            </h2>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">
              Perbandingan Harga Beli vs Harga Jual Dapur
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
          <div className="flex items-center gap-2 px-3">
            <Calendar size={14} className="text-slate-400" />
            <input
              type="date"
              className="bg-transparent border-none outline-none text-xs font-bold text-slate-700"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
          <span className="text-slate-300 text-[10px] font-black">TO</span>
          <div className="flex items-center gap-2 px-3">
            <input
              type="date"
              className="bg-transparent border-none outline-none text-xs font-bold text-slate-700"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
          <button
            onClick={loadReport}
            className="bg-white hover:bg-slate-50 text-slate-800 px-4 py-1.5 rounded-xl text-xs font-black shadow-sm border border-slate-200 transition-all flex items-center gap-2"
          >
            <Search size={12} /> FILTER
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8 space-y-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {stats.map((s, i) => (
            <div
              key={i}
              className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between hover:shadow-md transition-all"
            >
              <div>
                <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">
                  {s.label}
                </p>
                <h3
                  className={`text-2xl font-black ${s.label === "Item Rugi" && warningCount > 0 ? "text-red-600" : "text-slate-800"}`}
                >
                  {s.value}
                </h3>
              </div>
              <div className={`p-4 ${s.bg} ${s.color} rounded-2xl`}>
                <s.icon size={24} />
              </div>
            </div>
          ))}
        </div>

        {/* Table Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Tanggal
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Produk
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Dapur
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">
                    QTY
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">
                    H. Beli
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">
                    H. Jual
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">
                    Margin
                  </th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">
                    Profit
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.map((d, i) => (
                  <tr
                    key={i}
                    className={`hover:bg-slate-50/50 transition-colors ${d.margin < 0 ? "bg-red-50/30" : ""}`}
                  >
                    <td className="px-6 py-4 text-xs font-bold text-slate-400 font-mono">
                      {d.order_date}
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-800">
                      {d.product_name}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500 font-medium">
                      {d.kitchen_name || "-"}
                    </td>
                    <td className="px-6 py-4 text-right font-black text-slate-800">
                      {d.quantity}{" "}
                      <span className="text-[10px] text-slate-400 font-bold ml-1">
                        {d.unit}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-slate-500 font-medium text-sm">
                      Rp {d.buy_price.toLocaleString("id-ID")}
                    </td>
                    <td className="px-6 py-4 text-right text-slate-500 font-medium text-sm">
                      Rp {d.sell_price.toLocaleString("id-ID")}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div
                        className={`font-black ${d.margin >= 0 ? "text-emerald-600" : "text-red-600"}`}
                      >
                        Rp {d.margin.toLocaleString("id-ID")}
                      </div>
                      <div
                        className={`text-[10px] font-bold ${d.margin_percent >= 0 ? "text-emerald-500" : "text-red-500"}`}
                      >
                        {d.margin_percent.toFixed(1)}%
                      </div>
                    </td>
                    <td
                      className={`px-6 py-4 text-right font-black ${d.total_profit >= 0 ? "text-emerald-700" : "text-red-700"}`}
                    >
                      Rp {d.total_profit.toLocaleString("id-ID")}
                    </td>
                  </tr>
                ))}
                {data.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      className="text-center py-24 text-slate-400 font-medium italic"
                    >
                      {loading
                        ? "Sedang memuat laporan..."
                        : "Belum ada data laporan margin pada periode ini."}
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
