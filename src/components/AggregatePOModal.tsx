import React, { useState, useEffect, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { X, Printer, Truck } from "lucide-react";
import type { AggregateItem } from "../types";
import Swal from "sweetalert2";

interface Props {
  date: string;
  onClose: () => void;
}

export const AggregatePOModal: React.FC<Props> = ({ date, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AggregateItem[]>([]);

  useEffect(() => {
    loadData();
  }, [date]);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await invoke<AggregateItem[]>("get_aggregate_by_date", { orderDate: date });
      setData(res);
    } catch (e) {
      Swal.fire("Gagal", String(e), "error");
    } finally {
      setLoading(false);
    }
  };

  // Group data by category for better organization
  const groupedData = useMemo(() => {
    const groups: Record<string, AggregateItem[]> = {};
    data.forEach(item => {
      const cat = item.category || "UMUM";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    });
    return groups;
  }, [data]);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 print:bg-transparent print:backdrop-blur-none print:p-0 print:static print:block print:h-auto print:overflow-visible">
      <div className="bg-white w-full max-w-5xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col no-print">
        {/* Header */}
        <div className="px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
              <Truck size={20} />
            </div>
            <div>
              <h3 className="font-black text-slate-800 uppercase tracking-tight text-lg">Distribusi Dapur & Logistik</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{date}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-4 py-1.5 bg-blue-50 border border-blue-100 rounded-xl">
              <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Detail Distribusi</span>
            </div>

            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-200 rounded-xl text-slate-400 transition-all ml-2"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 bg-slate-50/30">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-50">
              <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Menghitung Distribusi...</p>
            </div>
          ) : data.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200">
              <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Tidak ada data distribusi untuk tanggal ini</p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedData).map(([category, items]) => (
                <div key={category} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                  <div className="px-6 py-3 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{category}</span>
                    <span className="text-[9px] font-bold text-slate-300">• {items.length} PRODUK</span>
                  </div>
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-white border-b border-slate-100">
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Produk</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right w-24">Total</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-24">Satuan</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Detail Distribusi Per Dapur</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {items.map((item, idx) => (
                        <tr key={idx} className={`transition-colors ${item.is_external ? "bg-amber-50/50 hover:bg-amber-100/50" : "hover:bg-slate-50/50"}`}>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <div className="font-black text-slate-800 text-sm uppercase tracking-tight">{item.product_name}</div>
                              {item.is_external && (
                                <span className="text-[8px] bg-amber-200 text-amber-700 px-1.5 py-0.5 rounded-md font-black uppercase tracking-tighter">EXT</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className="font-black text-blue-600 text-lg">{item.total_quantity}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-[10px] font-black text-slate-400 uppercase">{item.unit}</span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-wrap gap-2">
                              {item.distributions.map((d, didx) => (
                                <div key={didx} className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-lg border border-slate-200 shadow-sm">
                                  <span className="text-[9px] font-black text-slate-500 uppercase">{d.kitchen_name}:</span>
                                  <span className="text-[9px] font-black text-blue-600">{d.quantity}</span>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-5 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:text-slate-800 transition-all"
          >
            Tutup
          </button>
          <button
            onClick={() => window.print()}
            className="bg-slate-800 text-white px-8 py-3 rounded-2xl font-black text-xs shadow-lg shadow-slate-500/20 hover:bg-slate-900 active:scale-95 transition-all flex items-center gap-2 uppercase tracking-widest"
          >
            <Printer size={14} /> Cetak Rekapan
          </button>
        </div>
      </div>

      {/* Printable Area (Premium Style Inspired by DailyOrderDetailPage) */}
      <div className="hidden print:block bg-white text-black p-10">
        {/* Modern Split Header */}
        <div className="flex justify-between items-start mb-10 border-b-2 border-slate-900 pb-8">
          <div>
            <h1 className="text-4xl font-black uppercase tracking-tighter text-slate-900">
              DISTRIBUSI DAPUR
            </h1>
            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Periode</span>
                <span className="text-lg font-bold">{date}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Jenis Dokumen</span>
                <span className="text-sm font-bold uppercase bg-slate-100 px-2 py-1 rounded">Logistics Recap</span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Zen Supplier</h2>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">
              Management & Logistics System
            </p>
            <div className="mt-6 flex flex-col items-end gap-2">
              <div className="w-32 h-1 bg-slate-900"></div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">
                Generated: {new Date().toLocaleDateString('id-ID')} {new Date().toLocaleTimeString('id-ID')}
              </p>
            </div>
          </div>
        </div>

        {/* Content Table Grouped by Category */}
        {Object.entries(groupedData).map(([category, items]) => (
          <div key={category} className="mb-10 last:mb-0">
            <h3 className="text-sm font-black uppercase tracking-widest bg-slate-100 px-5 py-3 mb-4 border-l-4 border-slate-900 flex justify-between items-center">
              <span>{category}</span>
              <span className="text-[10px] text-slate-400 font-bold">{items.length} PRODUK</span>
            </h3>

            <table className="w-full border-collapse border border-slate-300 text-sm">
              <thead>
                <tr className="bg-slate-50">
                  <th className="border border-slate-300 px-4 py-3 text-left font-black uppercase text-[10px] tracking-widest w-12">No</th>
                  <th className="border border-slate-300 px-4 py-3 text-left font-black uppercase text-[10px] tracking-widest">Nama Produk</th>
                  <th className="border border-slate-300 px-4 py-3 text-right font-black uppercase text-[10px] tracking-widest w-20">Total</th>
                  <th className="border border-slate-300 px-4 py-3 text-left font-black uppercase text-[10px] tracking-widest w-20">Satuan</th>
                  <th className="border border-slate-300 px-4 py-3 text-left font-black uppercase text-[10px] tracking-widest">Detail Distribusi Per Dapur</th>
                  <th className="border border-slate-300 px-4 py-3 text-center text-[10px] font-black uppercase w-10">✓</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={idx} className={`border-b border-slate-200 print:break-inside-avoid ${item.is_external ? "bg-amber-50/30" : ""}`}>
                    <td className="border border-slate-300 px-4 py-3 text-center text-xs font-bold text-slate-400">{idx + 1}</td>
                    <td className="border border-slate-300 px-4 py-3 uppercase text-xs">
                      {item.product_name}
                      {item.is_external && <span className="ml-2 text-[8px] bg-white border border-slate-900 px-1">EXT</span>}
                    </td>
                    <td className="border border-slate-300 px-4 py-3 text-base text-blue-700 font-black">{item.total_quantity}</td>
                    <td className="border border-slate-300 px-4 py-3 font-bold uppercase text-[10px] text-slate-500">{item.unit}</td>
                    <td className="border border-slate-300 px-4 py-3">
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                        {item.distributions.map((d, didx) => (
                          <div key={didx} className="flex justify-between text-[8px] border-b border-slate-100 pb-0.5 last:border-0">
                            <span className="font-bold text-slate-600 uppercase">{d.kitchen_name}:</span>
                            <span className="font-black text-slate-900">{d.quantity}</span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="border border-slate-300 px-4 py-3">
                      <div className="w-5 h-5 border border-slate-300 mx-auto"></div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}

        <div className="mt-16 text-[8px] text-slate-300 text-center italic border-t border-slate-50 pt-4 uppercase tracking-tighter">
          Dokumen ini merupakan rekapan distribusi resmi Zen Supplier. Informasi yang tertera bersifat final untuk operasional harian.
        </div>
      </div>
    </div>
  );
};
