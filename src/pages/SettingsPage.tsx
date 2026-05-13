import React, { useState } from "react";
import {
  Settings,
  Database,
  UploadCloud,
  ChevronRight,
  ShieldAlert,
  Trash2,
  AlertCircle,
  FileSpreadsheet,
} from "lucide-react";
import { invoke } from "@tauri-apps/api/core";

type TabType = "import" | "system";

interface NavItem {
  id: TabType;
  label: string;
  icon: React.ElementType;
  desc: string;
}

const navItems: NavItem[] = [
  {
    id: "import",
    label: "Import Data",
    icon: UploadCloud,
    desc: "Import katalog produk dari file CSV",
  },
  {
    id: "system",
    label: "System & Security",
    icon: ShieldAlert,
    desc: "Pemeliharaan & reset database",
  },
];

export const SettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>("import");

  const renderContent = () => {
    switch (activeTab) {
      case "import":
        return <ImportSettings />;
      case "system":
        return <SystemSettings />;
      default:
        return <ImportSettings />;
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50 font-sans text-slate-900">
      <div className="flex flex-1 overflow-hidden">
        {/* --- SIDEBAR NAVIGATION --- */}
        <aside className="w-80 bg-white border-r border-slate-200 flex flex-col shrink-0">
          <div className="p-8 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                <Settings size={20} />
              </div>
              <h1 className="text-xl font-black text-slate-800 tracking-tight">Settings</h1>
            </div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
              Konfigurasi Sistem
            </p>
          </div>

          <nav className="flex-1 p-4 space-y-2 overflow-y-auto mt-4">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all duration-200 group text-left ${
                  activeTab === item.id
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30"
                    : "bg-white hover:bg-slate-50 text-slate-600 border border-transparent"
                }`}
              >
                <div
                  className={`p-2.5 rounded-xl transition-colors ${
                    activeTab === item.id
                      ? "bg-white/20"
                      : "bg-slate-100 text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-600"
                  }`}
                >
                  <item.icon size={20} />
                </div>
                <div className="flex-1">
                  <div className="font-bold text-sm leading-tight">
                    {item.label}
                  </div>
                  <div
                    className={`text-[10px] mt-0.5 font-medium ${
                      activeTab === item.id ? "text-blue-100" : "text-slate-400"
                    }`}
                  >
                    {item.desc}
                  </div>
                </div>
                {activeTab === item.id && (
                  <ChevronRight size={16} className="text-white/70" />
                )}
              </button>
            ))}
          </nav>

          <div className="p-6 border-t border-slate-100 text-[10px] text-slate-400 font-bold text-center uppercase tracking-widest">
            Zen Supplier v1.0
          </div>
        </aside>

        {/* --- CONTENT AREA --- */}
        <main className="flex-1 overflow-y-auto bg-slate-50/30">
          <div className="max-w-4xl mx-auto p-12">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
};

const ImportSettings: React.FC = () => {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-2xl font-black text-slate-800 tracking-tight">Import Data</h2>
        <p className="text-slate-500 font-medium mt-1">
          Migrasikan data katalog produk Anda ke dalam sistem
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm group hover:border-blue-200 transition-all">
          <div className="flex items-start gap-6">
            <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl group-hover:scale-110 transition-transform">
              <FileSpreadsheet size={32} />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-slate-800">Katalog Produk</h3>
              <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                Import massal data produk, kategori, dan unit dasar. Format file yang didukung adalah .csv.
              </p>
              
              <div className="mt-8 p-6 border-2 border-dashed border-slate-100 rounded-2xl flex flex-col items-center justify-center gap-3 bg-slate-50/50">
                <UploadCloud size={24} className="text-slate-300" />
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Klik atau seret file ke sini</p>
                <input type="file" className="hidden" id="file-import" />
                <label 
                  htmlFor="file-import"
                  className="cursor-pointer bg-white border border-slate-200 px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all shadow-sm"
                >
                  Pilih File
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-amber-50 rounded-2xl p-6 flex items-start gap-4 border border-amber-100">
          <AlertCircle className="text-amber-600 shrink-0" size={20} />
          <div>
            <h4 className="text-sm font-bold text-amber-900">Petunjuk Penting</h4>
            <ul className="text-xs text-amber-800/80 mt-2 space-y-1 list-disc list-inside font-medium">
              <li>Gunakan template CSV yang sudah disediakan</li>
              <li>Pastikan kolom Nama Produk dan Unit Dasar tidak kosong</li>
              <li>Sistem akan menduplikasi jika nama produk sudah ada</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

const SystemSettings: React.FC = () => {
  const [resetLoading, setResetLoading] = useState(false);

  const handleReset = async () => {
    if (
      !confirm(
        "PERINGATAN KRITIS: Seluruh data (koneksi, katalog, order, invoice) akan DIHAPUS PERMANEN. Lanjutkan?",
      )
    ) return;

    setResetLoading(true);
    try {
      await invoke("reset_database");
      alert(
        "Database telah direset. Silakan RESTART aplikasi untuk memuat skema baru.",
      );
    } catch (e) {
      alert("Gagal mereset database: " + String(e));
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-2xl font-black text-slate-800 tracking-tight">System & Security</h2>
        <p className="text-slate-500 font-medium mt-1">
          Manajemen akses tingkat lanjut dan pembersihan data
        </p>
      </div>

      <div className="space-y-6">
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between gap-8">
            <div className="flex items-center gap-4 text-slate-800">
              <div className="p-3 bg-red-50 text-red-600 rounded-xl">
                <Database size={24} />
              </div>
              <div>
                <h3 className="font-bold">Maintenance Database</h3>
                <p className="text-xs text-slate-500 mt-1">Hapus seluruh data untuk memulai dari awal (Development Only)</p>
              </div>
            </div>
            <button
              onClick={handleReset}
              disabled={resetLoading}
              className="bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white px-6 py-3 rounded-2xl text-sm font-bold shadow-lg shadow-red-200 transition-all flex items-center gap-2"
            >
              {resetLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <Trash2 size={16} />
              )}
              Reset Database
            </button>
          </div>
        </div>

        <div className="p-8 rounded-3xl bg-slate-900 text-white overflow-hidden relative group">
            <div className="relative z-10">
                <div className="flex items-center gap-2 text-blue-400 mb-2">
                    <ShieldAlert size={16} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Security Advisory</span>
                </div>
                <h3 className="text-lg font-bold mb-2">Pencadangan Data Otomatis</h3>
                <p className="text-sm text-slate-400 max-w-md leading-relaxed">
                    Sistem ini berjalan secara lokal (SQLite). Sangat disarankan untuk melakukan backup file database secara berkala untuk menghindari kehilangan data akibat kerusakan hardware.
                </p>
            </div>
            <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-700">
                <ShieldAlert size={160} />
            </div>
        </div>
      </div>
    </div>
  );
};
