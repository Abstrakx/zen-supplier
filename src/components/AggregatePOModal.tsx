import React, { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { X, Printer, Package, Truck, LayoutGrid } from "lucide-react";
import type { AggregateItem } from "../types";
import Swal from "sweetalert2";

interface Props {
  date: string;
  onClose: () => void;
}

export const AggregatePOModal: React.FC<Props> = ({ date, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AggregateItem[]>([]);
  const [view, setView] = useState<"aggregate" | "logistics">("aggregate");

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

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-5xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col no-print">
        {/* Header */}
        <div className="px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
              <LayoutGrid size={20} />
            </div>
            <div>
              <h3 className="font-black text-slate-800 uppercase tracking-tight">Rekap Belanja & Logistik</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{date}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                onClick={() => setView("aggregate")}
                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${view === "aggregate" ? "bg-white text-blue-600 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
              >
                <Package size={14} /> Agregat Belanja
              </button>
              <button
                onClick={() => setView("logistics")}
                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${view === "logistics" ? "bg-white text-blue-600 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
              >
                <Truck size={14} /> Distribusi Dapur
              </button>
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
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Menghitung Agregat...</p>
            </div>
          ) : data.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200">
              <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Tidak ada data untuk tanggal ini</p>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Produk</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Total Qty</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Satuan</th>
                    {view === "logistics" && (
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Detail Distribusi</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.map((item, idx) => (
                    <tr key={idx} className={`transition-colors ${item.is_external ? "bg-amber-50 hover:bg-amber-100/50" : "hover:bg-slate-50/50"}`}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="font-black text-slate-800 text-sm uppercase tracking-tight">{item.product_name}</div>
                          {item.is_external && (
                            <span className="text-[8px] bg-amber-200 text-amber-700 px-1.5 py-0.5 rounded-md font-black uppercase tracking-tighter">EXTERNAL</span>
                          )}
                        </div>
                        <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{item.category}</div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="font-black text-blue-600 text-lg">{item.total_quantity}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-[10px] font-black text-slate-400 uppercase">{item.unit}</span>
                      </td>
                      {view === "logistics" && (
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-2">
                            {item.distributions.map((d, didx) => (
                              <div key={didx} className="flex items-center gap-1.5 bg-slate-100 px-2 py-1 rounded-lg border border-slate-200">
                                <span className="text-[9px] font-black text-slate-600 uppercase">{d.kitchen_name}:</span>
                                <span className="text-[9px] font-black text-blue-600">{d.quantity}</span>
                              </div>
                            ))}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
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

      {/* Printable Area */}
      <div className="hidden print:block fixed inset-0 bg-white z-9999 p-10 text-black overflow-y-auto">
        <div className="text-center mb-8 border-b-4 border-slate-900 pb-6">
          <h1 className="text-3xl font-black uppercase tracking-tighter">ZEN SUPPLIER</h1>
          <h2 className="text-xl font-black uppercase tracking-widest text-slate-500 mt-1">
            {view === "aggregate" ? "Rekap Belanja Agregat" : "Rekap Distribusi Dapur"}
          </h2>
          <p className="text-sm font-bold mt-2 uppercase">Tanggal: {date}</p>
        </div>

        <table className="w-full border-collapse border-2 border-slate-900 text-sm">
          <thead>
            <tr className="bg-slate-100">
              <th className="border-2 border-slate-900 px-4 py-3 text-left font-black uppercase">Produk</th>
              <th className="border-2 border-slate-900 px-4 py-3 text-right font-black uppercase">Total</th>
              <th className="border-2 border-slate-900 px-4 py-3 text-left font-black uppercase">Satuan</th>
              {view === "logistics" && (
                <th className="border-2 border-slate-900 px-4 py-3 text-left font-black uppercase">Distribusi</th>
              )}
              <th className="border-2 border-slate-900 px-2 py-3 w-10">✓</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item, idx) => (
              <tr key={idx} className={item.is_external ? "bg-amber-50" : ""}>
                <td className="border-2 border-slate-900 px-4 py-3 font-black uppercase">
                  {item.product_name}
                  {item.is_external && (
                    <span className="ml-2 text-[8px] border border-slate-900 px-1">EXT</span>
                  )}
                </td>
                <td className="border-2 border-slate-900 px-4 py-3 text-right font-black text-lg">{item.total_quantity}</td>
                <td className="border-2 border-slate-900 px-4 py-3 font-bold uppercase">{item.unit}</td>
                {view === "logistics" && (
                  <td className="border-2 border-slate-900 px-4 py-3">
                    <div className="space-y-1">
                      {item.distributions.map((d, didx) => (
                        <div key={didx} className="flex justify-between text-[10px] font-bold">
                          <span>{d.kitchen_name}:</span>
                          <span>{d.quantity}</span>
                        </div>
                      ))}
                    </div>
                  </td>
                )}
                <td className="border-2 border-slate-900 px-2 py-3"></td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-12 grid grid-cols-3 gap-8 text-center text-[10px] font-black uppercase">
          <div>
            <p className="mb-20">DISIAPKAN OLEH,</p>
            <div className="w-32 h-px bg-slate-900 mx-auto"></div>
            <p className="mt-2">TIM LOGISTIK</p>
          </div>
          <div>
            <p className="mb-20">DIVERIFIKASI OLEH,</p>
            <div className="w-32 h-px bg-slate-900 mx-auto"></div>
            <p className="mt-2">KASIR / FINANCE</p>
          </div>
          <div>
            <p className="mb-20">DISETUJUI OLEH,</p>
            <div className="w-32 h-px bg-slate-900 mx-auto"></div>
            <p className="mt-2">KEPALA GUDANG</p>
          </div>
        </div>
      </div>
    </div>
  );
};
