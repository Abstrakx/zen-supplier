import React, { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  Settings,
  ChefHat,
  Truck,
  Plus,
  Edit2,
  Trash2,
  X,
  Save,
  AlertCircle,
} from "lucide-react";
import type { Kitchen, Supplier } from "../types";
import { SupplierModal } from "../components/SupplierModal";


export const SettingsPage: React.FC = () => {
  const [kitchens, setKitchens] = useState<Kitchen[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  type TabType = "kitchens" | "suppliers";
  const [activeTab, setActiveTab] = useState<TabType>("kitchens");

  // Modal states
  const [kitchenModal, setKitchenModal] = useState(false);
  const [supplierModal, setSupplierModal] = useState(false);
  const [editKitchen, setEditKitchen] = useState<Kitchen | null>(null);
  const [editSupplier, setEditSupplier] = useState<Supplier | null>(null);

  // Kitchen form
  const [kName, setKName] = useState("");
  const [kCode, setKCode] = useState("");
  const [kAddress, setKAddress] = useState("");
  const [kPic, setKPic] = useState("");
  const [kPhone, setKPhone] = useState("");

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log("Fetching data from Rust backend...");
      const [k, s] = await Promise.all([
        invoke<Kitchen[]>("get_kitchens"),
        invoke<Supplier[]>("get_suppliers"),
      ]);
      console.log("KITCHENS RECEIVED:", k);
      console.log("SUPPLIERS RECEIVED:", s);
      setKitchens(k);
      setSuppliers(s);
    } catch (e) {
      console.error("FETCH ERROR:", e);
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  // Kitchen CRUD
  const openKitchenModal = (k?: Kitchen) => {
    if (k) {
      setEditKitchen(k);
      setKName(k.name);
      setKCode(k.code);
      setKAddress(k.address || "");
      setKPic(k.pic_name || "");
      setKPhone(k.pic_phone || "");
    } else {
      setEditKitchen(null);
      setKName("");
      setKCode("");
      setKAddress("");
      setKPic("");
      setKPhone("");
    }
    setKitchenModal(true);
  };

  const saveKitchen = async () => {
    if (!kName.trim() || !kCode.trim()) return;
    try {
      if (editKitchen) {
        await invoke("update_kitchen", {
          payload: {
            id: editKitchen.id,
            name: kName,
            code: kCode,
            address: kAddress || null,
            pic_name: kPic || null,
            pic_phone: kPhone || null,
            is_active: true,
          },
        });
      } else {
        await invoke("create_kitchen", {
          payload: {
            name: kName,
            code: kCode,
            address: kAddress || null,
            pic_name: kPic || null,
            pic_phone: kPhone || null,
          },
        });
      }
      setKitchenModal(false);
      loadAll();
    } catch (e) {
      alert(String(e));
    }
  };

  const deleteKitchen = async (k: Kitchen) => {
    if (!confirm(`Hapus dapur "${k.name}"?`)) return;
    try {
      await invoke("delete_kitchen", { kitchenId: k.id });
      loadAll();
    } catch (e) {
      alert(String(e));
    }
  };

  // Supplier CRUD
  const openSupplierModal = (s?: Supplier) => {
    setEditSupplier(s || null);
    setSupplierModal(true);
  };


  const deleteSupplier = async (s: Supplier) => {
    if (!confirm(`Hapus supplier "${s.name}"?`)) return;
    try {
      await invoke("delete_supplier", { supplierId: s.id });
      loadAll();
    } catch (e) {
      alert(String(e));
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
  ];

  const tabs = [
    { id: "kitchens" as TabType, label: "Dapur / SPPG" },
    { id: "suppliers" as TabType, label: "Master Supplier" },
  ];

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50 text-slate-900 font-sans">
      {/* Header */}
      <div className="px-8 py-6 border-b border-slate-200 bg-white flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-100 rounded-xl">
            <Settings size={20} className="text-slate-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">
              Pengaturan Master
            </h2>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">
              Kelola dapur, supplier, dan konfigurasi sistem
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
          ) : (
            <button
              onClick={() => openSupplierModal()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2"
            >
              <Plus size={16} /> Tambah Supplier
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
          {/* Internal Tabs */}
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
                  {kitchens.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="text-center py-20 text-slate-400 font-medium"
                      >
                        Belum ada dapur. Klik tombol tambah untuk memulai.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
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
                      Telepon
                    </th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      Status / Tipe
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
                      <td className="px-6 py-4 font-mono font-bold text-slate-600">
                        {s.code}
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-800">
                        {s.name}
                      </td>
                      <td className="px-6 py-4 text-slate-500 font-medium">
                        {s.phone || "-"}
                      </td>
                      <td className="px-6 py-4">
                        {s.is_internal ? (
                          <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-black uppercase tracking-wider">
                            Internal
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-lg text-[10px] font-black uppercase tracking-wider">
                            External
                          </span>
                        )}
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
                  {suppliers.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="text-center py-20 text-slate-400 font-medium"
                      >
                        Belum ada supplier. Klik tombol tambah untuk memulai.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Database Management Section */}
        <div className="bg-red-50/30 rounded-2xl border border-red-100 p-8 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-red-800 flex items-center gap-2">
              <Trash2 size={18} />
              Reset Database (Development Only)
            </h3>
            <p className="text-sm text-red-600/70 font-medium mt-1">
              Menghapus seluruh data dan memuat ulang skema database. Gunakan
              fitur ini jika ada error kolom tidak ditemukan.
            </p>
          </div>
          <button
            onClick={async () => {
              if (
                confirm(
                  "PERINGATAN: Seluruh data (dapur, supplier, produk, order) akan DIHAPUS PERMANEN. Lanjutkan?",
                )
              ) {
                try {
                  await invoke("reset_database");
                  alert(
                    "Database telah direset. Silakan RESTART aplikasi untuk memuat skema baru.",
                  );
                } catch (e) {
                  alert("Gagal mereset database: " + String(e));
                }
              }
            }}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-red-500/20 transition-all flex items-center gap-2"
          >
            <Trash2 size={16} /> Reset Sekarang
          </button>
        </div>
      </div>

      {/* Kitchen Modal */}
      {kitchenModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <ChefHat size={18} className="text-blue-600" />
                {editKitchen ? "Edit Dapur" : "Tambah Dapur"}
              </h3>
              <button
                onClick={() => setKitchenModal(false)}
                className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">
                    Nama Dapur *
                  </label>
                  <input
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 transition-all"
                    value={kName}
                    onChange={(e) => setKName(e.target.value)}
                    placeholder="SPPG Kertonatan 2"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">
                    Kode *
                  </label>
                  <input
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 transition-all"
                    value={kCode}
                    onChange={(e) => setKCode(e.target.value)}
                    placeholder="KRTN2"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">
                  Alamat
                </label>
                <input
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 transition-all"
                  value={kAddress}
                  onChange={(e) => setKAddress(e.target.value)}
                  placeholder="Jl. Diponegoro No.2..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">
                    PIC
                  </label>
                  <input
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 transition-all"
                    value={kPic}
                    onChange={(e) => setKPic(e.target.value)}
                    placeholder="Nama PIC"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">
                    No. HP PIC
                  </label>
                  <input
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 transition-all"
                    value={kPhone}
                    onChange={(e) => setKPhone(e.target.value)}
                    placeholder="08xxx"
                  />
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2 bg-slate-50/50">
              <button
                onClick={() => setKitchenModal(false)}
                className="px-4 py-2 text-slate-500 font-bold hover:text-slate-800 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={saveKitchen}
                className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all flex items-center gap-2"
              >
                <Save size={14} /> Simpan
              </button>
            </div>
          </div>
        </div>
      )}

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
