import React, { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Truck, Printer, Eye, FileText, Search, X } from "lucide-react";
import type { DeliveryNote, DeliveryNoteDetail } from "../types";
import Swal from "sweetalert2";

export const DeliveryNotePage: React.FC = () => {
  const [notes, setNotes] = useState<DeliveryNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNote, setSelectedNote] = useState<DeliveryNoteDetail | null>(
    null,
  );
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadNotes();
  }, []);

  const loadNotes = async () => {
    try {
      const data = await invoke<DeliveryNote[]>("get_delivery_notes", {
        dailyOrderId: null,
      });
      setNotes(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const finalizeDelivery = async (noteId: string) => {
    const result = await Swal.fire({
      title: "Selesaikan Surat Jalan?",
      text: "SJ akan ditandai selesai dan Invoice akan dibuat otomatis.",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#10b981",
      cancelButtonText: "Batal",
      confirmButtonText: "Ya, Selesai",
    });

    if (!result.isConfirmed) return;

    try {
      await invoke("finalize_delivery_note", { noteId });
      Swal.fire("Berhasil", "SJ Selesai. Silakan cek menu Invoice.", "success");
      loadNotes();
    } catch (e) {
      Swal.fire("Gagal", String(e), "error");
    }
  };

  const viewDetail = async (noteId: string) => {
    try {
      const detail = await invoke<DeliveryNoteDetail>(
        "get_delivery_note_detail",
        { noteId },
      );
      setSelectedNote(detail);
    } catch (e) {
      Swal.fire("Gagal", String(e), "error");
    }
  };

  const filteredNotes = notes.filter(
    (n) =>
      n.delivery_number.toLowerCase().includes(search.toLowerCase()) ||
      (n.kitchen_name || "").toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50 text-slate-900 font-sans">
      {/* Header */}
      <div className="px-8 py-6 border-b border-slate-200 bg-white flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-50 rounded-xl border border-emerald-100 shadow-sm">
            <Truck size={20} className="text-emerald-600" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">
              Surat Jalan (Logistik)
            </h2>
            <p className="text-xs text-slate-500 font-medium tracking-wide">
              Dokumen bukti pengiriman barang ke dapur MBG
            </p>
          </div>
        </div>
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
            placeholder="Cari No. SJ atau Nama Dapur..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        {notes.length === 0 && !loading && (
          <div className="text-center py-24 bg-white rounded-3xl border-2 border-dashed border-slate-200">
            <div className="w-20 h-20 mx-auto rounded-3xl bg-emerald-50 flex items-center justify-center text-emerald-600 mb-6 border border-emerald-100">
              <FileText size={32} />
            </div>
            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">
              Belum Ada Surat Jalan
            </h3>
            <p className="text-sm text-slate-500 mt-2 font-medium">
              Surat jalan akan digenerate otomatis saat PO Harian diproses.
            </p>
          </div>
        )}

        <div className="max-w-7xl mx-auto space-y-4">
          {filteredNotes.map((n) => (
            <div
              key={n.id}
              className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-6">
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-100 group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-sm shrink-0">
                  <FileText size={22} strokeWidth={2.5} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-slate-800 text-lg tracking-tight">
                      {n.delivery_number}
                    </h3>
                    <span className="text-[10px] font-black bg-slate-100 text-slate-400 px-2 py-0.5 rounded uppercase tracking-widest">
                      {n.delivery_date}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-1.5 text-xs font-bold text-slate-400 uppercase tracking-tighter">
                    <span className="text-blue-600 font-black">
                      {n.kitchen_name}
                    </span>
                    <span className="text-slate-200">•</span>
                    <span>{n.item_count} ITEMS DALAM SJ</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => viewDetail(n.id)}
                  className="bg-slate-50 hover:bg-slate-100 text-slate-800 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-slate-200 flex items-center gap-2"
                >
                  <Eye size={14} /> LIHAT
                </button>
                {n.status === "draft" && (
                  <button
                    onClick={() => finalizeDelivery(n.id)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 transition-all border border-emerald-500 flex items-center gap-2"
                  >
                    SELESAI
                  </button>
                )}
              </div>
            </div>
          ))}
          {filteredNotes.length === 0 && notes.length > 0 && (
            <div className="text-center py-10 text-slate-400 font-bold uppercase tracking-widest text-[10px]">
              Pencarian tidak ditemukan
            </div>
          )}
        </div>
      </div>

      {/* Print Preview Modal */}
      {selectedNote && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl no-print">
            <div className="px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-black text-slate-800 uppercase tracking-tight">
                Preview Surat Jalan
              </h3>
              <button
                onClick={() => setSelectedNote(null)}
                className="p-2 hover:bg-slate-200 rounded-xl text-slate-400 transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8">
              {/* Paper Layout */}
              <div className="bg-white border-2 border-slate-200 p-10 rounded shadow-sm text-black font-mono relative">
                <div className="text-center mb-8 border-b-2 border-black pb-4">
                  <h1 className="text-2xl font-black tracking-tighter">
                    ZEN SUPPLIER
                  </h1>
                  <p className="text-xs uppercase font-bold tracking-widest text-gray-500">
                    Logistics & Supply Management
                  </p>
                  <div className="mt-4 bg-black text-white inline-block px-4 py-1 text-sm font-black">
                    SURAT JALAN
                  </div>
                  <p className="text-sm font-bold mt-2">
                    NO: {selectedNote.note.delivery_number}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-8 text-xs mb-8">
                  <div>
                    <p className="text-gray-400 uppercase font-black text-[9px]">
                      TANGGAL KIRIM
                    </p>
                    <p className="font-bold text-sm">
                      {selectedNote.note.delivery_date}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-400 uppercase font-black text-[9px]">
                      TUJUAN PENGIRIMAN
                    </p>
                    <p className="font-bold text-sm uppercase">
                      {selectedNote.note.kitchen_name}
                    </p>
                  </div>
                </div>

                <table className="w-full border-collapse border border-black text-[11px]">
                  <thead>
                    <tr className="bg-gray-50 uppercase font-black">
                      <th className="border border-black px-3 py-3 w-10 text-center">
                        #
                      </th>
                      <th className="border border-black px-4 py-3 text-left">
                        NAMA BARANG / ITEM
                      </th>
                      <th className="border border-black px-4 py-3 w-20 text-right">
                        QTY
                      </th>
                      <th className="border border-black px-4 py-3 w-20 text-center">
                        UNIT
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedNote.items.map((item, i) => (
                      <tr key={item.id} className="border-b border-gray-200">
                        <td className="border-x border-black px-3 py-3 text-center font-bold text-gray-400">
                          {i + 1}
                        </td>
                        <td className="border-x border-black px-4 py-3 font-bold">
                          {item.product_name}
                        </td>
                        <td className="border-x border-black px-4 py-3 text-right font-black text-sm">
                          {item.quantity}
                        </td>
                        <td className="border-x border-black px-4 py-3 text-center uppercase font-bold">
                          {item.unit}
                        </td>
                      </tr>
                    ))}
                    {/* Fill empty rows to make it look like a real form */}
                    {[...Array(Math.max(0, 5 - selectedNote.items.length))].map(
                      (_, i) => (
                        <tr key={i} className="border-b border-gray-100">
                          <td className="border-x border-black px-3 py-4 text-center"></td>
                          <td className="border-x border-black px-4 py-4"></td>
                          <td className="border-x border-black px-4 py-4 text-right"></td>
                          <td className="border-x border-black px-4 py-4 text-center"></td>
                        </tr>
                      ),
                    )}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td
                        colSpan={4}
                        className="border border-black px-4 py-2 bg-gray-50 text-[9px] font-black uppercase text-gray-400 italic"
                      >
                        * Barang telah diperiksa dan diterima dalam kondisi baik
                      </td>
                    </tr>
                  </tfoot>
                </table>

                <div className="grid grid-cols-2 gap-16 mt-16 text-center text-[10px] font-black uppercase">
                  <div>
                    <p className="mb-16">DIBUAT OLEH (ADM),</p>
                    <div className="w-32 h-px bg-black mx-auto"></div>
                    <p className="mt-2 text-gray-400">ZEN SUPPLIER TEAM</p>
                  </div>
                  <div>
                    <p className="mb-16">DITERIMA OLEH (KITCHEN),</p>
                    <div className="w-32 h-px bg-black mx-auto"></div>
                    <p className="mt-2 text-gray-400">
                      TANDA TANGAN & NAMA TERANG
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-8 py-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50">
              <button
                onClick={() => setSelectedNote(null)}
                className="px-6 py-2 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:text-slate-800 transition-all"
              >
                Tutup
              </button>
              <button
                onClick={() => window.print()}
                className="bg-emerald-600 text-white px-8 py-3 rounded-2xl font-black text-xs shadow-lg shadow-emerald-500/30 hover:bg-emerald-700 active:scale-95 transition-all flex items-center gap-2 uppercase tracking-widest"
              >
                <Printer size={14} /> Print Sekarang
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden Print Container */}
      <div className="hidden print:block fixed inset-0 bg-white z-9999">
        {selectedNote && (
          <div className="p-8 text-black font-mono">
            <div className="text-center mb-8 border-b-2 border-black pb-4">
              <h1 className="text-2xl font-black tracking-tighter">
                ZEN SUPPLIER
              </h1>
              <p className="text-sm font-bold mt-1 uppercase">SURAT JALAN</p>
              <p className="text-sm font-bold">
                NO: {selectedNote.note.delivery_number}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-8 text-sm mb-8 font-bold">
              <div>TANGGAL: {selectedNote.note.delivery_date}</div>
              <div className="text-right uppercase">
                TUJUAN: {selectedNote.note.kitchen_name}
              </div>
            </div>
            <table className="w-full border-collapse border border-black text-sm">
              <thead>
                <tr className="bg-gray-100 uppercase">
                  <th className="border border-black px-3 py-2 w-12">#</th>
                  <th className="border border-black px-3 py-2 text-left">
                    ITEM
                  </th>
                  <th className="border border-black px-3 py-2 w-24 text-right">
                    QTY
                  </th>
                  <th className="border border-black px-3 py-2 w-20">UNIT</th>
                </tr>
              </thead>
              <tbody>
                {selectedNote.items.map((item, i) => (
                  <tr key={item.id}>
                    <td className="border border-black px-3 py-2 text-center">
                      {i + 1}
                    </td>
                    <td className="border border-black px-3 py-2 font-bold">
                      {item.product_name}
                    </td>
                    <td className="border border-black px-3 py-2 text-right font-black">
                      {item.quantity}
                    </td>
                    <td className="border border-black px-3 py-2 text-center uppercase">
                      {item.unit}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="grid grid-cols-2 gap-16 mt-20 text-center text-xs font-bold uppercase">
              <div>
                <p className="mb-16">PENGIRIM,</p>
                <p>(________________)</p>
              </div>
              <div>
                <p className="mb-16">PENERIMA,</p>
                <p>(________________)</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
