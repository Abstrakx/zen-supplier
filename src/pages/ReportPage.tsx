import React, { useState, useEffect, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  BarChart3,
  TrendingUp,
  Calendar,
  Search,
  ChevronRight,
  X,
  DollarSign,
  Briefcase,
  ChefHat,
  Layers,
} from "lucide-react";
import type { InvoiceReport, Kitchen } from "../types";

export const ReportPage: React.FC = () => {
  const [reports, setReports] = useState<InvoiceReport[]>([]);
  const [kitchens, setKitchens] = useState<Kitchen[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedKitchenId, setSelectedKitchenId] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    loadReports();
  }, [selectedKitchenId]);

  const loadInitialData = async () => {
    try {
      const k = await invoke<Kitchen[]>("get_kitchens");
      setKitchens(k);
      await loadReports();
    } catch (e) {
      console.error(e);
    }
  };

  const loadReports = async () => {
    setLoading(true);
    try {
      const result = await invoke<InvoiceReport[]>("get_invoice_report", {
        kitchenId: selectedKitchenId,
        dateFrom: dateFrom || null,
        dateTo: dateTo || null,
      });
      setReports(result);
      // Deselect if current selected is no longer in the list
      if (selectedReportId && !result.find(r => r.invoice_id === selectedReportId)) {
        setSelectedReportId(null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const selectedReport = useMemo(() => 
    reports.find(r => r.invoice_id === selectedReportId)
  , [reports, selectedReportId]);

  const groupedReports = useMemo(() => {
    const groups: Map<string, InvoiceReport[]> = new Map();
    reports.forEach((r) => {
      const key = r.daily_order_id;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(r);
    });
    // Sort groups by date descending
    return Array.from(groups.values()).sort((a, b) =>
      b[0].invoice_date.localeCompare(a[0].invoice_date)
    );
  }, [reports]);

  const stats = useMemo(() => {
    const totalInv = reports.reduce((acc, r) => acc + r.grand_total_invoice, 0);
    const totalModal = reports.reduce((acc, r) => acc + r.grand_total_modal, 0);
    const totalProfit = totalInv - totalModal;

    return [
      {
        label: "Total Invoice (Omzet)",
        value: `Rp ${totalInv.toLocaleString("id-ID")}`,
        icon: TrendingUp,
        color: "text-blue-600",
        bg: "bg-blue-100",
      },
      {
        label: "Total Modal (Pasar)",
        value: `Rp ${totalModal.toLocaleString("id-ID")}`,
        icon: Briefcase,
        color: "text-amber-600",
        bg: "bg-amber-100",
      },
      {
        label: "Total Keuntungan",
        value: `Rp ${totalProfit.toLocaleString("id-ID")}`,
        icon: DollarSign,
        color: "text-emerald-600",
        bg: "bg-emerald-100",
      },
    ];
  }, [reports]);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50 text-slate-900 font-sans">
      {/* Header */}
      <div className="px-8 py-6 border-b border-slate-200 bg-white flex items-center justify-between shadow-sm z-20">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-linear-to-br from-indigo-500 to-blue-600 rounded-2xl shadow-lg shadow-indigo-500/20">
            <BarChart3 size={20} className="text-white" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">
              Analisis Margin & Profit
            </h2>
            <p className="text-xs text-slate-500 font-medium tracking-wide">
              Laporan keuntungan per invoice dan detail bahan
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
          <div className="flex items-center gap-2 px-3 border-r border-slate-200">
            <Calendar size={14} className="text-slate-400" />
            <input
              type="date"
              className="bg-transparent border-none outline-none text-xs font-bold text-slate-700"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 px-3">
            <input
              type="date"
              className="bg-transparent border-none outline-none text-xs font-bold text-slate-700"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
          <button
            onClick={loadReports}
            className="bg-white hover:bg-slate-50 text-slate-800 px-4 py-1.5 rounded-xl text-[10px] font-black shadow-sm border border-slate-200 transition-all flex items-center gap-2 uppercase tracking-widest"
          >
            <Search size={12} /> Filter
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Sub-header with Dapur Tabs */}
        <div className="px-8 py-4 bg-white/60 backdrop-blur-md border-b border-slate-200 flex items-center gap-3 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setSelectedKitchenId(null)}
            className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shrink-0 ${
              selectedKitchenId === null
                ? "bg-slate-800 text-white shadow-lg shadow-slate-800/20"
                : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            }`}
          >
            Semua Dapur
          </button>
          {kitchens.map((k) => (
            <button
              key={k.id}
              onClick={() => setSelectedKitchenId(k.id)}
              className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shrink-0 flex items-center gap-2 ${
                selectedKitchenId === k.id
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                  : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              }`}
            >
              <ChefHat size={12} />
              {k.name}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Main List Section */}
          <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-500 ${selectedReportId ? 'pr-0' : ''}`}>
            <div className="p-8 space-y-12 overflow-y-auto h-full">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {stats.map((s, i) => (
                  <div
                    key={i}
                    className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between hover:shadow-md transition-all group"
                  >
                    <div>
                      <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1.5">
                        {s.label}
                      </p>
                      <h3 className={`text-2xl font-black ${s.color}`}>
                        {s.value}
                      </h3>
                    </div>
                    <div className={`p-4 ${s.bg} ${s.color} rounded-2xl group-hover:scale-110 transition-transform`}>
                      <s.icon size={24} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Grouped Invoice List */}
              <div className="space-y-10">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Layers size={14} /> Laporan Terkelompok Per PO
                </h3>
                
                {loading ? (
                  <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
                    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-xs font-bold uppercase tracking-widest">Memuat Laporan...</p>
                  </div>
                ) : groupedReports.length === 0 ? (
                  <div className="py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200 text-center">
                    <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Tidak ada data invoice ditemukan</p>
                  </div>
                ) : (
                  <div className="space-y-12">
                    {groupedReports.map((group, gIdx) => (
                      <div key={gIdx} className="space-y-4">
                        {/* Group Header */}
                        <div className="flex items-center justify-between border-l-4 border-blue-500 pl-4 py-1">
                          <div>
                            <div className="flex items-center gap-3">
                              <h4 className="font-black text-slate-800 uppercase text-sm tracking-tight">
                                {group[0].kitchen_name}
                              </h4>
                              <div className="flex gap-1.5">
                                {group.map(r => (
                                  <span key={r.invoice_id} className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                                    r.invoice_number.startsWith('ZS') 
                                      ? 'bg-amber-100 text-amber-700' 
                                      : 'bg-purple-100 text-purple-700'
                                  }`}>
                                    {r.invoice_number}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <p className="text-[10px] text-slate-400 font-bold flex items-center gap-1.5 mt-0.5 uppercase tracking-widest">
                              <Calendar size={10} /> {group[0].invoice_date}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Combined Profit</p>
                            <p className="text-sm font-black text-emerald-600">
                              Rp {group.reduce((acc, r) => acc + r.grand_total_keuntungan, 0).toLocaleString("id-ID")}
                            </p>
                          </div>
                        </div>

                        {/* Invoice Cards Grid (Max 2 Columns) */}
                        <div className={`grid gap-4 ${selectedReportId ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
                          {group.map((r) => (
                            <div
                              key={r.invoice_id}
                              onClick={() => setSelectedReportId(r.invoice_id)}
                              className={`bg-white p-5 rounded-3xl border transition-all cursor-pointer group flex flex-col justify-between ${
                                selectedReportId === r.invoice_id
                                  ? "border-blue-500 ring-4 ring-blue-500/10 shadow-lg"
                                  : "border-slate-200 hover:border-blue-300 hover:shadow-md"
                              }`}
                            >
                              <div>
                                <div className="flex items-start justify-between mb-3">
                                  <div className="bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
                                    <p className="text-[10px] font-black text-slate-800 tracking-tight">
                                      {r.invoice_number}
                                    </p>
                                  </div>
                                  {r.status === "draft" ? (
                                    <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider">
                                      Draft
                                    </span>
                                  ) : (
                                    <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wider">
                                      Final
                                    </span>
                                  )}
                                </div>
                                <h4 className="font-black text-slate-700 text-xs mb-1 uppercase tracking-tight opacity-70">
                                  {r.invoice_type === 'operational' ? 'Operational Supplies' : 'Bahan Dapur Utama'}
                                </h4>
                              </div>

                              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                                <div>
                                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Profit</p>
                                  <p className={`font-black text-sm ${r.grand_total_keuntungan >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                    Rp {r.grand_total_keuntungan.toLocaleString("id-ID")}
                                  </p>
                                </div>
                                <div className="flex items-center gap-1 text-blue-600 font-black text-[10px] uppercase tracking-widest group-hover:gap-2 transition-all">
                                  Detail <ChevronRight size={12} />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Detail Slide-in Panel */}
          <div 
            className={`fixed top-0 right-0 h-full bg-white shadow-2xl border-l border-slate-200 z-50 transition-all duration-500 transform ease-in-out ${
              selectedReportId ? 'translate-x-0 w-[65%]' : 'translate-x-full w-0'
            }`}
          >
            {selectedReport && (
              <div className="flex flex-col h-full overflow-hidden">
                {/* Panel Header */}
                <div className="px-8 py-6 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={() => setSelectedReportId(null)}
                      className="p-2 hover:bg-slate-200 rounded-xl text-slate-400 transition-all"
                    >
                      <X size={20} />
                    </button>
                    <div>
                      <h3 className="font-black text-slate-800 uppercase tracking-tight text-lg">
                        Detail Analisis Invoice
                      </h3>
                      <div className="flex items-center gap-3">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          {selectedReport.invoice_number}
                        </p>
                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                          selectedReport.status === 'draft' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {selectedReport.status}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tanggal</p>
                    <p className="font-black text-slate-800">{selectedReport.invoice_date}</p>
                  </div>
                </div>

                {/* Detailed Table */}
                <div className="flex-1 overflow-auto p-8">
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-w-[1200px]">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="px-3 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest w-10 text-center">No</th>
                          <th className="px-3 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Nama Barang</th>
                          <th className="px-3 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest w-20 text-center">Satuan</th>
                          <th className="px-3 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest w-20 text-center">Jenis</th>
                          <th className="px-3 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest w-16 text-right">QTY</th>
                          <th className="px-3 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest w-24 text-right">Harga (Modal)</th>
                          <th className="px-3 py-3 text-[9px] font-black w-24 text-right bg-blue-50/50 text-blue-700 uppercase tracking-widest">Harga (Jual)</th>
                          <th className="px-3 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest w-24 text-right">Untung/Pcs</th>
                          <th className="px-3 py-3 text-[9px] font-black w-28 text-right bg-amber-50/30 text-amber-600 uppercase tracking-widest">Total Modal</th>
                          <th className="px-3 py-3 text-[9px] font-black w-28 text-right bg-blue-50/30 text-blue-600 uppercase tracking-widest">Total Ke Dapur</th>
                          <th className="px-3 py-3 text-[9px] font-black w-28 text-right bg-emerald-50 text-emerald-700 uppercase tracking-widest">Untung/Bahan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedReport.items.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-3 py-4 text-center text-slate-400 font-bold text-xs">{idx + 1}</td>
                            <td className="px-3 py-4 font-bold text-slate-800 text-xs">{item.product_name}</td>
                            <td className="px-3 py-4 text-center">
                              <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[9px] font-black uppercase">
                                {item.unit}
                              </span>
                            </td>
                            <td className="px-3 py-4 text-center">
                              <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                                item.jenis === 'operational' ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-blue-600'
                              }`}>
                                {item.jenis === 'operational' ? 'OPS' : 'DAPUR'}
                              </span>
                            </td>
                            <td className="px-3 py-4 text-right font-black text-slate-800 text-xs">{item.quantity}</td>
                            <td className="px-3 py-4 text-right text-slate-500 font-medium text-[11px]">
                              {item.harga.toLocaleString("id-ID")}
                            </td>
                            <td className="px-3 py-4 text-right font-black text-blue-600 bg-blue-50/5 text-[11px]">
                              {item.jual.toLocaleString("id-ID")}
                            </td>
                            <td className={`px-3 py-4 text-right font-bold text-[11px] ${item.keuntungan_per_pcs >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                              {item.keuntungan_per_pcs.toLocaleString("id-ID")}
                            </td>
                            <td className="px-3 py-4 text-right font-black text-amber-600 bg-amber-50/10 text-xs">
                              {item.total_modal.toLocaleString("id-ID")}
                            </td>
                            <td className="px-3 py-4 text-right font-black text-blue-700 bg-blue-50/10 text-xs">
                              {item.total_invoice.toLocaleString("id-ID")}
                            </td>
                            <td className="px-3 py-4 text-right font-black text-emerald-700 bg-emerald-50/30 text-xs">
                              {item.keuntungan_per_bahan.toLocaleString("id-ID")}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-slate-800 text-white font-black text-xs uppercase tracking-tight">
                        <tr>
                          <td colSpan={8} className="px-6 py-5 text-right tracking-widest text-[10px]">Grand Total</td>
                          <td className="px-3 py-5 text-right border-l border-slate-700">
                            Rp {selectedReport.grand_total_modal.toLocaleString("id-ID")}
                          </td>
                          <td className="px-3 py-5 text-right border-l border-slate-700">
                            Rp {selectedReport.grand_total_invoice.toLocaleString("id-ID")}
                          </td>
                          <td className="px-3 py-5 text-right border-l border-slate-700 bg-emerald-600">
                            Rp {selectedReport.grand_total_keuntungan.toLocaleString("id-ID")}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                {/* Footer Stats inside Panel */}
                <div className="px-8 py-6 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-12">
                  <div className="text-right">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Modal Akhir</p>
                    <p className="text-lg font-black text-slate-800">Rp {selectedReport.grand_total_modal.toLocaleString("id-ID")}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Bersih Diterima</p>
                    <p className="text-2xl font-black text-emerald-600">Rp {selectedReport.grand_total_keuntungan.toLocaleString("id-ID")}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
