import React, { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { X, Save, Truck } from "lucide-react";
import type { Supplier } from "../types";

interface SupplierModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (supplier: Supplier) => void;
  initialData?: Supplier | null;
}

export const SupplierModal: React.FC<SupplierModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialData,
}) => {
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [isInternal, setIsInternal] = useState(true);

  React.useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setPhone(initialData.phone || "");
      setAddress(initialData.address || "");
      setIsInternal(initialData.is_internal);
    } else {
      setName("");
      setPhone("");
      setAddress("");
      setIsInternal(true);
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!name.trim()) return;
    setLoading(true);
    try {
      if (initialData) {
        await invoke("update_supplier", {
          payload: {
            id: initialData.id,
            name,
            phone: phone || null,
            address: address || null,
            is_internal: isInternal,
            is_active: true,
          },
        });
        // For update, we might not get the full supplier back from the invoke,
        // so we can just pass back a placeholder or fetch again.
        // But SettingsPage calls loadAll anyway.
        onSuccess({ ...initialData, name, phone, address, is_internal: isInternal });
      } else {
        const supplier = await invoke<Supplier>("create_supplier", {
          payload: {
            name,
            phone: phone || null,
            address: address || null,
            is_internal: isInternal,
          },
        });
        onSuccess(supplier);
      }
      onClose();
    } catch (e) {
      alert(String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-100 flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h3 className="font-black text-slate-800 flex items-center gap-2 uppercase tracking-tight text-sm">
            <Truck size={18} className="text-emerald-600" />
            {initialData ? "Edit Data Supplier" : "Tambah Supplier Baru"}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 transition-all"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">
              Nama Supplier *
            </label>
            <input
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 transition-all font-bold text-slate-700"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="PO Zen, PO Anas..."
            />
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">
              No. Telepon
            </label>
            <input
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 transition-all font-bold text-slate-700"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="08xxx"
            />
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">
              Alamat
            </label>
            <input
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 transition-all font-bold text-slate-700"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Alamat supplier"
            />
          </div>

          {/* Internal/External Toggle */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-800">
                  Supplier Internal
                </p>
                <p className="text-[10px] text-slate-500 mt-1 uppercase font-bold tracking-wider">
                  {isInternal
                    ? "Kita beli & kirim sendiri → Surat Jalan ✅"
                    : "Supplier luar → Invoice Only 📄"}
                </p>
              </div>
              <button
                onClick={() => setIsInternal(!isInternal)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${isInternal ? "bg-blue-600" : "bg-slate-200"}`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform duration-200 ${isInternal ? "translate-x-6" : "translate-x-1"}`}
                />
              </button>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2 bg-slate-50/50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-500 font-bold hover:text-slate-800 transition-colors"
          >
            Batal
          </button>
          <button
            onClick={handleSave}
            disabled={loading || !name}
            className="bg-emerald-600 text-white px-6 py-2 rounded-xl font-bold shadow-lg shadow-emerald-500/20 hover:bg-emerald-700 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <Save size={14} />
            )}
            {initialData ? "Simpan Perubahan" : "Simpan Supplier"}
          </button>
        </div>
      </div>
    </div>
  );
};
