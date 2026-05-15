import React, { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { X, Save, ChefHat } from "lucide-react";
import type { Kitchen } from "../types";
import Swal from "sweetalert2";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: Kitchen | null;
}

export const KitchenModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onSuccess,
  initialData,
}) => {
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [address, setAddress] = useState("");
  const [pic, setPic] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setCode(initialData.code);
      setAddress(initialData.address || "");
      setPic(initialData.pic_name || "");
      setPhone(initialData.pic_phone || "");
    } else {
      setName("");
      setCode("");
      setAddress("");
      setPic("");
      setPhone("");
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!name.trim() || !code.trim()) {
      Swal.fire("Perhatian", "Nama dan kode harus diisi", "warning");
      return;
    }

    setLoading(true);
    try {
      if (initialData) {
        await invoke("update_kitchen", {
          payload: {
            id: initialData.id,
            name,
            code,
            address: address || null,
            pic_name: pic || null,
            pic_phone: phone || null,
            is_active: true,
          },
        });
      } else {
        await invoke("create_kitchen", {
          payload: {
            name,
            code,
            address: address || null,
            pic_name: pic || null,
            pic_phone: phone || null,
          },
        });
      }
      onSuccess();
      onClose();
      Swal.fire({
        icon: "success",
        title: "Berhasil",
        text: `Dapur ${initialData ? "diperbarui" : "ditambahkan"}`,
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (e) {
      Swal.fire("Gagal", String(e), "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h3 className="font-black text-slate-800 flex items-center gap-2 uppercase tracking-tight text-sm">
            <ChefHat size={18} className="text-blue-600" />
            {initialData ? "Edit Data Dapur" : "Tambah Dapur Baru"}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 transition-all"
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
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 transition-all font-bold text-slate-700"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="SPPG Kertonatan 2"
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">
                Kode *
              </label>
              <input
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 transition-all font-bold text-slate-700"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="KRTN2"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">
              Alamat
            </label>
            <input
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 transition-all font-bold text-slate-700"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Jl. Diponegoro No.2..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">
                PIC
              </label>
              <input
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 transition-all font-bold text-slate-700"
                value={pic}
                onChange={(e) => setPic(e.target.value)}
                placeholder="Nama PIC"
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">
                No. HP PIC
              </label>
              <input
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 transition-all font-bold text-slate-700"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="08xxx"
              />
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
            disabled={loading}
            className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <Save size={14} />
            )}
            Simpan
          </button>
        </div>
      </div>
    </div>
  );
};
