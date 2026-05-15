import React, { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  FileStack,
  Plus,
  Search,
  Calendar,
  Store,
  ChevronRight,
  Trash2,
  Filter,
  ArrowRight,
  FileText,
} from "lucide-react";
import type { NotaBreakdown, Store as StoreType } from "../types";
import Swal from "sweetalert2";

interface Props {
  onOpenDetail: (id: string) => void;
}

export const NotaBreakdownPage: React.FC<Props> = ({ onOpenDetail }) => {
  const [notus, setNotus] = useState<NotaBreakdown[]>([]);
  const [stores, setStores] = useState<StoreType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Create Form State
  const [newNotaNumber, setNewNotaNumber] = useState("");
  const [newPurchaseDate, setNewPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedStoreId, setSelectedStoreId] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [n, s] = await Promise.all([
        invoke<NotaBreakdown[]>("get_nota_breakdowns"),
        invoke<StoreType[]>("get_stores"),
      ]);
      setNotus(n);
      setStores(s);
    } catch (e) {
      console.error(e);
      Swal.fire("Gagal", "Gagal memuat data nota", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newNotaNumber || !newPurchaseDate || !selectedStoreId) {
      Swal.fire("Perhatian", "Mohon lengkapi data nota", "warning");
      return;
    }

    const store = stores.find(s => s.id === selectedStoreId);

    try {
      const created = await invoke<NotaBreakdown>("create_nota_breakdown", {
        payload: {
          nota_number: newNotaNumber,
          purchase_date: newPurchaseDate,
          store_id: selectedStoreId,
          store_name: store?.name || null,
          notes: null,
        }
      });
      setShowCreateModal(false);
      onOpenDetail(created.id);
    } catch (e) {
      Swal.fire("Gagal", String(e), "error");
    }
  };

  const handleDelete = async (id: string, num: string) => {
    const result = await Swal.fire({
      title: "Hapus Nota?",
      text: `Apakah Anda yakin ingin menghapus nota "${num}"? Semua data breakdown di dalamnya akan hilang.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      confirmButtonText: "Ya, Hapus",
      cancelButtonText: "Batal",
    });

    if (result.isConfirmed) {
      try {
        await invoke("delete_nota_breakdown", { notaId: id });
        loadData();
        Swal.fire("Terhapus", "Nota berhasil dihapus", "success");
      } catch (e) {
        Swal.fire("Gagal", String(e), "error");
      }
    }
  };

  const filtered = notus.filter(n =>
    n.nota_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (n.store_name || "").toLowerCase().includes(searchTerm.toLowerCase())
  );


  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50 text-slate-900 font-sans">
      {/* Header */}
      <div className="px-8 py-6 border-b border-slate-200 bg-white flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-2.5 bg-violet-100 text-violet-600 rounded-2xl shadow-sm">
            <FileStack size={22} />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-800 tracking-tight uppercase">
              Nota Breakdown
            </h2>
            <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest mt-0.5">
              Pecah nota belanja per SPPG/Dapur
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            setNewNotaNumber(`NB-${new Date().getTime().toString().slice(-6)}`);
            setShowCreateModal(true);
          }}
          className="bg-violet-600 hover:bg-violet-700 text-white px-6 py-2.5 rounded-2xl text-xs font-black shadow-lg shadow-violet-500/20 transition-all flex items-center gap-2 uppercase tracking-widest active:scale-95"
        >
          <Plus size={16} /> Buat Nota
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-8 space-y-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between group hover:border-violet-200 transition-all">
            <div>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Total Nota</p>
              <h3 className="text-3xl font-black text-slate-800">{notus.length}</h3>
            </div>
            <div className="p-4 bg-violet-50 text-violet-600 rounded-2xl group-hover:bg-violet-100 transition-colors">
              <FileText size={24} />
            </div>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between group hover:border-blue-200 transition-all">
            <div>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Toko Terdaftar</p>
              <h3 className="text-3xl font-black text-slate-800">{stores.length}</h3>
            </div>
            <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl group-hover:bg-blue-100 transition-colors">
              <Store size={24} />
            </div>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between group hover:border-amber-200 transition-all">
            <div>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Status Draft</p>
              <h3 className="text-3xl font-black text-amber-600">
                {notus.filter(n => n.status === "draft").length}
              </h3>
            </div>
            <div className="p-4 bg-amber-50 text-amber-600 rounded-2xl group-hover:bg-amber-100 transition-colors">
              <Calendar size={24} />
            </div>
          </div>
        </div>

        {/* List Section */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
            <div className="relative flex-1 max-w-md">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari nomor nota atau toko..."
                className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all font-medium"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-3">
              <button className="p-2.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all">
                <Filter size={18} />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="py-24 flex flex-col items-center gap-4 text-slate-400">
                <div className="w-10 h-10 border-4 border-violet-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-xs font-black uppercase tracking-widest">Memuat Nota...</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-24 text-center">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                  <FileStack size={32} className="text-slate-200" />
                </div>
                <p className="text-sm font-extrabold text-slate-400 uppercase tracking-widest">
                  Tidak ada nota ditemukan
                </p>
                <p className="text-xs text-slate-300 mt-1 font-medium">Coba gunakan kata kunci pencarian lain</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50/50 border-b border-slate-100">
                  <tr>
                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">No. Nota</th>
                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Toko</th>
                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tanggal</th>
                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Detail</th>
                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((n) => (
                    <tr
                      key={n.id}
                      className="group hover:bg-violet-50/30 transition-all cursor-pointer"
                      onClick={() => onOpenDetail(n.id)}
                    >
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-3">
                          <div className="font-black text-slate-800 text-sm tracking-tight">{n.nota_number}</div>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-2">
                          <Store size={14} className="text-slate-400" />
                          <span className="font-bold text-slate-600">{n.store_name || "-"}</span>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-2">
                          <Calendar size={14} className="text-slate-400" />
                          <span className="text-sm font-medium text-slate-600">{n.purchase_date}</span>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            {n.section_count} SPPG
                          </span>
                          <span className="text-xs font-bold text-violet-600">{n.item_count} Items</span>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border
                          ${n.status === 'done'
                            ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                            : 'bg-amber-50 text-amber-600 border-amber-100'}`}
                        >
                          {n.status}
                        </span>
                      </td>
                      <td className="px-8 py-5" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => onOpenDetail(n.id)}
                            className="p-2.5 bg-slate-50 text-slate-400 hover:text-violet-600 hover:bg-violet-100 rounded-xl transition-all"
                          >
                            <ArrowRight size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(n.id, n.nota_number)}
                            className="p-2.5 bg-slate-50 text-slate-400 hover:text-red-600 hover:bg-red-100 rounded-xl transition-all"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl border border-slate-100 animate-in fade-in zoom-in duration-200">
            <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <div>
                <h3 className="font-black text-slate-800 uppercase tracking-tight">Buat Nota Baru</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Input data pembelian utama</p>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-white rounded-xl text-slate-400 transition-all">
                <ChevronRight size={20} />
              </button>
            </div>

            <div className="p-8 space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block px-1">Nomor Nota</label>
                  <div className="relative">
                    <FileText size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all font-bold text-slate-700"
                      value={newNotaNumber}
                      onChange={(e) => setNewNotaNumber(e.target.value)}
                      placeholder="Contoh: NB-001"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block px-1">Toko / Store</label>
                  <div className="relative">
                    <Store size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <select
                      className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all font-bold text-slate-700 appearance-none"
                      value={selectedStoreId}
                      onChange={(e) => setSelectedStoreId(e.target.value)}
                    >
                      <option value="">Pilih Toko...</option>
                      {stores.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block px-1">Tanggal Pembelian</label>
                  <div className="relative">
                    <Calendar size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="date"
                      className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all font-bold text-slate-700"
                      value={newPurchaseDate}
                      onChange={(e) => setNewPurchaseDate(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="px-8 py-6 border-t border-slate-100 flex gap-3 bg-slate-50/50">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-3 text-slate-500 font-black uppercase tracking-widest text-[10px] hover:text-slate-800 transition-all"
              >
                Batal
              </button>
              <button
                onClick={handleCreate}
                className="flex-1 bg-violet-600 text-white px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-violet-500/20 hover:bg-violet-700 transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                Lanjutkan <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
