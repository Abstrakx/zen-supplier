import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Settings, ChefHat, Truck, Plus, Edit2, Trash2, X, Save } from 'lucide-react';
import type { Kitchen, Supplier } from '../types';

export const SettingsPage: React.FC = () => {
  const [kitchens, setKitchens] = useState<Kitchen[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [, setLoading] = useState(true);

  type TabType = 'kitchens' | 'suppliers_internal' | 'suppliers_external';
  const [activeTab, setActiveTab] = useState<TabType>('kitchens');

  // Modal states
  const [kitchenModal, setKitchenModal] = useState(false);
  const [supplierModal, setSupplierModal] = useState(false);
  const [editKitchen, setEditKitchen] = useState<Kitchen | null>(null);
  const [editSupplier, setEditSupplier] = useState<Supplier | null>(null);

  // Kitchen form
  const [kName, setKName] = useState('');
  const [kCode, setKCode] = useState('');
  const [kAddress, setKAddress] = useState('');
  const [kPic, setKPic] = useState('');
  const [kPhone, setKPhone] = useState('');

  // Supplier form
  const [sName, setSName] = useState('');
  const [sPhone, setSPhone] = useState('');
  const [sAddress, setSAddress] = useState('');
  const [sInternal, setSInternal] = useState(true);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [k, s] = await Promise.all([
        invoke<Kitchen[]>('get_kitchens'),
        invoke<Supplier[]>('get_suppliers'),
      ]);
      setKitchens(k);
      setSuppliers(s);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  // Kitchen CRUD
  const openKitchenModal = (k?: Kitchen) => {
    if (k) {
      setEditKitchen(k);
      setKName(k.name); setKCode(k.code); setKAddress(k.address || ''); setKPic(k.pic_name || ''); setKPhone(k.pic_phone || '');
    } else {
      setEditKitchen(null);
      setKName(''); setKCode(''); setKAddress(''); setKPic(''); setKPhone('');
    }
    setKitchenModal(true);
  };

  const saveKitchen = async () => {
    if (!kName.trim() || !kCode.trim()) return;
    try {
      if (editKitchen) {
        await invoke('update_kitchen', { payload: { id: editKitchen.id, name: kName, code: kCode, address: kAddress || null, pic_name: kPic || null, pic_phone: kPhone || null, is_active: true } });
      } else {
        await invoke('create_kitchen', { payload: { name: kName, code: kCode, address: kAddress || null, pic_name: kPic || null, pic_phone: kPhone || null } });
      }
      setKitchenModal(false);
      loadAll();
    } catch (e) { alert(String(e)); }
  };

  const deleteKitchen = async (k: Kitchen) => {
    if (!confirm(`Hapus dapur "${k.name}"?`)) return;
    try { await invoke('delete_kitchen', { kitchenId: k.id }); loadAll(); } catch (e) { alert(String(e)); }
  };

  // Supplier CRUD
  const openSupplierModal = (s?: Supplier) => {
    if (s) {
      setEditSupplier(s);
      setSName(s.name); setSPhone(s.phone || ''); setSAddress(s.address || ''); setSInternal(s.is_internal);
    } else {
      setEditSupplier(null);
      setSName(''); setSPhone(''); setSAddress(''); setSInternal(true);
    }
    setSupplierModal(true);
  };

  const saveSupplier = async () => {
    if (!sName.trim()) return;
    try {
      if (editSupplier) {
        await invoke('update_supplier', { payload: { id: editSupplier.id, name: sName, phone: sPhone || null, address: sAddress || null, is_internal: sInternal, is_active: true } });
      } else {
        await invoke('create_supplier', { payload: { name: sName, phone: sPhone || null, address: sAddress || null, is_internal: sInternal } });
      }
      setSupplierModal(false);
      loadAll();
    } catch (e) { alert(String(e)); }
  };

  const deleteSupplier = async (s: Supplier) => {
    if (!confirm(`Hapus supplier "${s.name}"?`)) return;
    try { await invoke('delete_supplier', { supplierId: s.id }); loadAll(); } catch (e) { alert(String(e)); }
  };

  const internalSuppliers = suppliers.filter(s => s.is_internal);
  const externalSuppliers = suppliers.filter(s => !s.is_internal);

  const stats = [
    { label: 'Dapur Dikelola', count: kitchens.length, icon: ChefHat, color: 'text-blue-600', bg: 'bg-blue-100' },
    { label: 'Supplier Internal', count: internalSuppliers.length, icon: Truck, color: 'text-emerald-600', bg: 'bg-emerald-100' },
    { label: 'Supplier External', count: externalSuppliers.length, icon: Truck, color: 'text-amber-600', bg: 'bg-amber-100' },
  ];

  const tabs = [
    { id: 'kitchens' as TabType, label: 'Dapur / SPPG' },
    { id: 'suppliers_internal' as TabType, label: 'Supplier Internal' },
    { id: 'suppliers_external' as TabType, label: 'Supplier External' },
  ];

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50 text-slate-900 font-sans">
      {/* Header */}
      <div className="px-8 py-6 border-b border-slate-200 bg-white flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-100 rounded-xl"><Settings size={20} className="text-slate-600" /></div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">Pengaturan Master</h2>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Kelola dapur, supplier, dan konfigurasi sistem</p>
          </div>
        </div>
        <div className="flex gap-2">
          {activeTab === 'kitchens' && (
            <button onClick={() => openKitchenModal()} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2">
              <Plus size={16} /> Tambah Dapur
            </button>
          )}
          {(activeTab === 'suppliers_internal' || activeTab === 'suppliers_external') && (
            <button onClick={() => openSupplierModal()} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2">
              <Plus size={16} /> Tambah Supplier
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8 space-y-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {stats.map((s, i) => (
            <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between hover:shadow-md transition-all">
              <div>
                <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">{s.label}</p>
                <h3 className="text-3xl font-black text-slate-800">{s.count}</h3>
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
            {tabs.map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all
                  ${activeTab === t.id ? 'bg-white text-blue-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'}`}>
                {t.label}
              </button>
            ))}
          </div>

          <div className="p-0 overflow-x-auto">
            {activeTab === 'kitchens' && (
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Kode</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nama Dapur</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Alamat</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">PIC</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {kitchens.map(k => (
                    <tr key={k.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-mono font-bold text-blue-600">{k.code}</td>
                      <td className="px-6 py-4 font-bold text-slate-800">{k.name}</td>
                      <td className="px-6 py-4 text-slate-500 text-sm max-w-[300px] truncate">{k.address || '-'}</td>
                      <td className="px-6 py-4 text-slate-600 font-medium">{k.pic_name || '-'}</td>
                      <td className="px-6 py-4">
                        <div className="flex justify-center gap-2">
                          <button onClick={() => openKitchenModal(k)} className="p-2 hover:bg-blue-50 rounded-lg text-slate-400 hover:text-blue-600 transition-colors"><Edit2 size={14} /></button>
                          <button onClick={() => deleteKitchen(k)} className="p-2 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-600 transition-colors"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {kitchens.length === 0 && (
                    <tr><td colSpan={5} className="text-center py-20 text-slate-400 font-medium">Belum ada dapur. Klik tombol tambah untuk memulai.</td></tr>
                  )}
                </tbody>
              </table>
            )}

            {activeTab === 'suppliers_internal' && (
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Kode</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nama</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Telepon</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipe</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {internalSuppliers.map(s => (
                    <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-mono font-bold text-emerald-600">{s.code}</td>
                      <td className="px-6 py-4 font-bold text-slate-800">{s.name}</td>
                      <td className="px-6 py-4 text-slate-500 font-medium">{s.phone || '-'}</td>
                      <td className="px-6 py-4"><span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-black uppercase tracking-wider">Internal</span></td>
                      <td className="px-6 py-4">
                        <div className="flex justify-center gap-2">
                          <button onClick={() => openSupplierModal(s)} className="p-2 hover:bg-blue-50 rounded-lg text-slate-400 hover:text-blue-600 transition-colors"><Edit2 size={14} /></button>
                          <button onClick={() => deleteSupplier(s)} className="p-2 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-600 transition-colors"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {internalSuppliers.length === 0 && (
                    <tr><td colSpan={5} className="text-center py-20 text-slate-400 font-medium">Belum ada supplier internal.</td></tr>
                  )}
                </tbody>
              </table>
            )}

            {activeTab === 'suppliers_external' && (
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Kode</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nama</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Telepon</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipe</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {externalSuppliers.map(s => (
                    <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-mono font-bold text-amber-600">{s.code}</td>
                      <td className="px-6 py-4 font-bold text-slate-800">{s.name}</td>
                      <td className="px-6 py-4 text-slate-500 font-medium">{s.phone || '-'}</td>
                      <td className="px-6 py-4"><span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-lg text-[10px] font-black uppercase tracking-wider">External</span></td>
                      <td className="px-6 py-4">
                        <div className="flex justify-center gap-2">
                          <button onClick={() => openSupplierModal(s)} className="p-2 hover:bg-blue-50 rounded-lg text-slate-400 hover:text-blue-600 transition-colors"><Edit2 size={14} /></button>
                          <button onClick={() => deleteSupplier(s)} className="p-2 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-600 transition-colors"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {externalSuppliers.length === 0 && (
                    <tr><td colSpan={5} className="text-center py-20 text-slate-400 font-medium">Belum ada supplier external.</td></tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Kitchen Modal */}
      {kitchenModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2"><ChefHat size={18} className="text-blue-600" />{editKitchen ? 'Edit Dapur' : 'Tambah Dapur'}</h3>
              <button onClick={() => setKitchenModal(false)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Nama Dapur *</label><input className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 transition-all" value={kName} onChange={e => setKName(e.target.value)} placeholder="SPPG Kertonatan 2" /></div>
                <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Kode *</label><input className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 transition-all" value={kCode} onChange={e => setKCode(e.target.value)} placeholder="KRTN2" /></div>
              </div>
              <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Alamat</label><input className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 transition-all" value={kAddress} onChange={e => setKAddress(e.target.value)} placeholder="Jl. Diponegoro No.2..." /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">PIC</label><input className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 transition-all" value={kPic} onChange={e => setKPic(e.target.value)} placeholder="Nama PIC" /></div>
                <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">No. HP PIC</label><input className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 transition-all" value={kPhone} onChange={e => setKPhone(e.target.value)} placeholder="08xxx" /></div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2 bg-slate-50/50">
              <button onClick={() => setKitchenModal(false)} className="px-4 py-2 text-slate-500 font-bold hover:text-slate-800 transition-colors">Batal</button>
              <button onClick={saveKitchen} className="bg-blue-600 text-white px-6 py-2 rounded-xl font-bold shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all flex items-center gap-2"><Save size={14} /> Simpan</button>
            </div>
          </div>
        </div>
      )}

      {/* Supplier Modal */}
      {supplierModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2"><Truck size={18} className="text-emerald-600" />{editSupplier ? 'Edit Supplier' : 'Tambah Supplier'}</h3>
              <button onClick={() => setSupplierModal(false)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Nama Supplier *</label><input className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 transition-all" value={sName} onChange={e => setSName(e.target.value)} placeholder="PO Zen, PO Anas..." /></div>
              <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">No. Telepon</label><input className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 transition-all" value={sPhone} onChange={e => setSPhone(e.target.value)} placeholder="08xxx" /></div>
              <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 block">Alamat</label><input className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 transition-all" value={sAddress} onChange={e => setSAddress(e.target.value)} placeholder="Alamat supplier" /></div>

              {/* Internal/External Toggle */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-slate-800">Supplier Internal</p>
                    <p className="text-[10px] text-slate-500 mt-1 uppercase font-bold tracking-wider">
                      {sInternal ? 'Kita beli & kirim sendiri → Surat Jalan ✅' : 'Supplier luar → Invoice Only 📄'}
                    </p>
                  </div>
                  <button
                    onClick={() => setSInternal(!sInternal)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${sInternal ? 'bg-blue-600' : 'bg-slate-200'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform duration-200 ${sInternal ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2 bg-slate-50/50">
              <button onClick={() => setSupplierModal(false)} className="px-4 py-2 text-slate-500 font-bold hover:text-slate-800 transition-colors">Batal</button>
              <button onClick={saveSupplier} className="bg-emerald-600 text-white px-6 py-2 rounded-xl font-bold shadow-lg shadow-emerald-500/20 hover:bg-emerald-700 transition-all flex items-center gap-2"><Save size={14} /> Simpan</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
