import React, { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  Users,
  ChefHat,
  Truck,
  Plus,
  Edit2,
  Trash2,
  AlertCircle,
  Store as StoreIcon,
} from "lucide-react";
import type { Kitchen, Supplier, Store } from "../types";
import { SupplierModal } from "../components/SupplierModal";
import { KitchenModal } from "../components/KitchenModal";
import { StoreModal } from "../components/StoreModal";
import Swal from "sweetalert2";

export const ConnectionPage: React.FC = () => {
  const [kitchens, setKitchens] = useState<Kitchen[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  type TabType = "kitchens" | "suppliers" | "stores";
  const [activeTab, setActiveTab] = useState<TabType>("kitchens");

  // Modal states
  const [kitchenModal, setKitchenModal] = useState(false);
  const [supplierModal, setSupplierModal] = useState(false);
  const [storeModal, setStoreModal] = useState(false);
  const [editKitchen, setEditKitchen] = useState<Kitchen | null>(null);
  const [editSupplier, setEditSupplier] = useState<Supplier | null>(null);
  const [editStore, setEditStore] = useState<Store | null>(null);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const [k, s, st] = await Promise.all([
        invoke<Kitchen[]>("get_kitchens"),
        invoke<Supplier[]>("get_suppliers"),
        invoke<Store[]>("get_stores"),
      ]);
      setKitchens(k);
      setSuppliers(s);
      setStores(st);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  // Kitchen CRUD
  const openKitchenModal = (k?: Kitchen) => {
    setEditKitchen(k || null);
    setKitchenModal(true);
  };

  const deleteKitchen = async (k: Kitchen) => {
    const result = await Swal.fire({
      title: "Hapus dapur?",
      text: `Apakah Anda yakin ingin menghapus "${k.name}"?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonText: "Batal",
      confirmButtonText: "Ya, Hapus",
    });
    if (!result.isConfirmed) return;

    try {
      await invoke("delete_kitchen", { kitchenId: k.id });
      loadAll();
      Swal.fire("Berhasil", "Dapur telah dihapus", "success");
    } catch (e) {
      Swal.fire("Gagal", String(e), "error");
    }
  };

  // Supplier CRUD
  const openSupplierModal = (s?: Supplier) => {
    setEditSupplier(s || null);
    setSupplierModal(true);
  };

  const deleteSupplier = async (s: Supplier) => {
    const result = await Swal.fire({
      title: "Hapus supplier?",
      text: `Apakah Anda yakin ingin menghapus "${s.name}"?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonText: "Batal",
      confirmButtonText: "Ya, Hapus",
    });
    if (!result.isConfirmed) return;

    try {
      await invoke("delete_supplier", { supplierId: s.id });
      loadAll();
      Swal.fire("Berhasil", "Supplier telah dihapus", "success");
    } catch (e) {
      Swal.fire("Gagal", String(e), "error");
    }
  };

  // Store CRUD
  const openStoreModal = (s?: Store) => {
    setEditStore(s || null);
    setStoreModal(true);
  };

  const deleteStore = async (s: Store) => {
    const result = await Swal.fire({
      title: "Hapus toko?",
      text: `Apakah Anda yakin ingin menghapus "${s.name}"?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonText: "Batal",
      confirmButtonText: "Ya, Hapus",
    });
    if (!result.isConfirmed) return;

    try {
      await invoke("delete_store", { id: s.id });
      loadAll();
      Swal.fire("Berhasil", "Toko telah dihapus", "success");
    } catch (e) {
      Swal.fire("Gagal", String(e), "error");
    }
  };

  const internalCount = suppliers.filter((s) => s.is_internal).length;
  const externalCount = suppliers.filter((s) => !s.is_internal).length;

  const stats = [
    {
      label: "Dapur Dikelola",
      count: kitchens.length,
      icon: ChefHat,
      color: "text-blue-600",
      bg: "bg-blue-100",
    },
    {
      label: "Supplier Internal",
      count: internalCount,
      icon: Truck,
      color: "text-emerald-600",
      bg: "bg-emerald-100",
    },
    {
      label: "Supplier External",
      count: externalCount,
      icon: Truck,
      color: "text-amber-600",
      bg: "bg-amber-100",
    },
    {
      label: "Master Toko",
      count: stores.length,
      icon: StoreIcon,
      color: "text-violet-600",
      bg: "bg-violet-100",
    },
  ];

  const tabs = [
    { id: "kitchens" as TabType, label: "Dapur / SPPG" },
    { id: "suppliers" as TabType, label: "Supplier" },
    { id: "stores" as TabType, label: "Toko" },
  ];

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50 text-slate-900 font-sans">
      {/* Header */}
      <div className="px-8 py-6 border-b border-slate-200 bg-white flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-100 rounded-xl">
            <Users size={20} className="text-slate-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">
              Koneksi & Entitas
            </h2>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">
              Kelola dapur, supplier, dan mitra bisnis
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {activeTab === "kitchens" ? (
            <button
              onClick={() => openKitchenModal()}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2"
            >
              <Plus size={16} /> Tambah Dapur
            </button>
          ) : activeTab === "suppliers" ? (
            <button
              onClick={() => openSupplierModal()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2"
            >
              <Plus size={16} /> Tambah Supplier
            </button>
          ) : (
            <button
              onClick={() => openStoreModal()}
              className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg shadow-violet-500/20 transition-all flex items-center gap-2"
            >
              <Plus size={16} /> Tambah Toko
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8 space-y-8">
        {error && (
          <div className="bg-red-50 border border-red-200 p-4 rounded-xl flex items-center gap-3 text-red-600">
            <AlertCircle size={20} />
            <div>
              <p className="font-bold">Gagal mengambil data</p>
              <p className="text-sm opacity-80">{error}</p>
            </div>
            <button
              onClick={loadAll}
              className="ml-auto bg-red-600 text-white px-3 py-1 rounded-lg text-xs font-bold"
            >
              Coba Lagi
            </button>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {stats.map((s, i) => (
            <div
              key={i}
              className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between hover:shadow-md transition-all"
            >
              <div>
                <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">
                  {s.label}
                </p>
                <h3 className="text-3xl font-black text-slate-800">
                  {s.count}
                </h3>
              </div>
              <div className={`p-4 ${s.bg} ${s.color} rounded-2xl`}>
                <s.icon size={24} />
              </div>
            </div>
          ))}
        </div>

        {/* Tabs & Content Container */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex gap-1">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all
                  ${activeTab === t.id ? "bg-white text-blue-600 shadow-sm border border-slate-200" : "text-slate-500 hover:text-slate-800 hover:bg-white/50"}`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="p-0 overflow-x-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-sm font-medium">Memuat data...</p>
              </div>
            ) : activeTab === "kitchens" ? (
              kitchens.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                  <div className="w-20 h-20 rounded-3xl bg-blue-50 text-blue-600 flex items-center justify-center mb-6 border border-blue-100">
                    <ChefHat size={32} />
                  </div>
                  <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">
                    Belum Ada Dapur
                  </h3>
                  <p className="text-sm text-slate-500 mt-2 font-medium max-w-xs">
                    Silakan tambahkan data dapur atau SPPG MBG untuk memulai operasional.
                  </p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Kode
                      </th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Nama Dapur
                      </th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Alamat
                      </th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        PIC
                      </th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
                        Aksi
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {kitchens.map((k) => (
                      <tr
                        key={k.id}
                        className="hover:bg-slate-50/50 transition-colors"
                      >
                        <td className="px-6 py-4 font-mono font-bold text-blue-600">
                          {k.code}
                        </td>
                        <td className="px-6 py-4 font-bold text-slate-800">
                          {k.name}
                        </td>
                        <td className="px-6 py-4 text-slate-500 text-sm max-w-[300px] truncate">
                          {k.address || "-"}
                        </td>
                        <td className="px-6 py-4 text-slate-600 font-medium">
                          {k.pic_name || "-"}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-center gap-2">
                            <button
                              onClick={() => openKitchenModal(k)}
                              className="p-2 hover:bg-blue-50 rounded-lg text-slate-400 hover:text-blue-600 transition-colors"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => deleteKitchen(k)}
                              className="p-2 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-600 transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            ) : activeTab === "suppliers" ? (
              suppliers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                  <div className="w-20 h-20 rounded-3xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-6 border border-emerald-100">
                    <Truck size={32} />
                  </div>
                  <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">
                    Belum Ada Supplier
                  </h3>
                  <p className="text-sm text-slate-500 mt-2 font-medium max-w-xs">
                    Kelola data pemasok barang baik internal maupun mitra eksternal.
                  </p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Kode
                      </th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Nama Supplier
                      </th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Kategori
                      </th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
                        Aksi
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {suppliers.map((s) => (
                      <tr
                        key={s.id}
                        className="hover:bg-slate-50/50 transition-colors"
                      >
                        <td className="px-6 py-4 font-mono font-bold text-emerald-600">
                          {s.code}
                        </td>
                        <td className="px-6 py-4 font-bold text-slate-800">
                          {s.name}
                        </td>
                        <td className="px-6 py-4 text-slate-600 font-medium">
                          {s.is_internal ? "Internal" : "External"}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-center gap-2">
                            <button
                              onClick={() => openSupplierModal(s)}
                              className="p-2 hover:bg-blue-50 rounded-lg text-slate-400 hover:text-blue-600 transition-colors"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => deleteSupplier(s)}
                              className="p-2 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-600 transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            ) : stores.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="w-20 h-20 rounded-3xl bg-violet-50 text-violet-600 flex items-center justify-center mb-6 border border-violet-100">
                  <StoreIcon size={32} />
                </div>
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">
                  Belum Ada Toko
                </h3>
                <p className="text-sm text-slate-500 mt-2 font-medium max-w-xs">
                  Daftarkan unit toko atau mitra bisnis yang menerima pengiriman barang.
                </p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Kode
                    </th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Nama Toko
                    </th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Alamat
                    </th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      PIC
                    </th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {stores.map((st) => (
                    <tr
                      key={st.id}
                      className="hover:bg-slate-50/50 transition-colors"
                    >
                      <td className="px-6 py-4 font-mono font-bold text-violet-600">
                        {st.code || "-"}
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-800">
                        {st.name}
                      </td>
                      <td className="px-6 py-4 text-slate-500 text-sm max-w-[300px] truncate">
                        {st.address || "-"}
                      </td>
                      <td className="px-6 py-4 text-slate-600 font-medium">
                        {st.pic_name || "-"}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => openStoreModal(st)}
                            className="p-2 hover:bg-blue-50 rounded-lg text-slate-400 hover:text-blue-600 transition-colors"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => deleteStore(st)}
                            className="p-2 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-600 transition-colors"
                          >
                            <Trash2 size={14} />
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

      {/* Kitchen Modal */}
      <KitchenModal
        isOpen={kitchenModal}
        onClose={() => setKitchenModal(false)}
        initialData={editKitchen}
        onSuccess={() => {
          loadAll();
          setKitchenModal(false);
        }}
      />

      {/* Store Modal */}
      <StoreModal
        isOpen={storeModal}
        onClose={() => setStoreModal(false)}
        initialData={editStore}
        onSuccess={() => {
          loadAll();
          setStoreModal(false);
        }}
      />

      {/* Supplier Modal */}
      <SupplierModal
        isOpen={supplierModal}
        onClose={() => setSupplierModal(false)}
        initialData={editSupplier}
        onSuccess={() => {
          loadAll();
          setSupplierModal(false);
        }}
      />
    </div>
  );
};
