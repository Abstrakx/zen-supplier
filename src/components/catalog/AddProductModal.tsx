import React, { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { X, Save, Box, Tags, Store, FileText, AlertCircle, Plus, Trash2 } from 'lucide-react';
import type { AddProductPayload, Supplier, UnitConversionPayload } from '../../types';

interface AddProductModalProps {
  onClose: () => void;
  onSuccess: () => void;
  suppliers: Supplier[];
}

export const AddProductModal: React.FC<AddProductModalProps> = ({ onClose, onSuccess, suppliers }) => {
  const [activeTab, setActiveTab] = useState<'basic' | 'units' | 'pricing' | 'supplier'>('basic');
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState<AddProductPayload>({
    name: '',
    base_unit: 'Kg',
    buy_price: 0,
    sell_price: 0,
    supplier_id: null,
    units: [],
  });

  const handleAddUnit = () => {
    setFormData({
      ...formData,
      units: [...formData.units, { custom_unit_name: '', conversion_rate: 1, is_nominal: false }]
    });
  };

  const handleUpdateUnit = (index: number, field: keyof UnitConversionPayload, value: string | number | boolean | null) => {
    const newUnits = [...formData.units];
    newUnits[index] = { ...newUnits[index], [field]: value };
    if (field === 'is_nominal' && value === true) {
      newUnits[index].conversion_rate = null;
    }
    setFormData({ ...formData, units: newUnits });
  };

  const handleRemoveUnit = (index: number) => {
    const newUnits = [...formData.units];
    newUnits.splice(index, 1);
    setFormData({ ...formData, units: newUnits });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await invoke('add_product', {
        payload: {
          ...formData,
          buy_price: Number(formData.buy_price),
          sell_price: Number(formData.sell_price),
          supplier_id: formData.supplier_id ? Number(formData.supplier_id) : null,
          units: formData.units.map((u: UnitConversionPayload) => ({
            ...u,
            conversion_rate: u.is_nominal ? null : Number(u.conversion_rate)
          }))
        }
      });
      onSuccess();
    } catch (err) {
      console.error(err);
      alert('Gagal menyimpan produk');
    } finally {
      setLoading(false);
    }
  };

  const isLoss = Number(formData.buy_price) > Number(formData.sell_price) && Number(formData.sell_price) > 0;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col h-[85vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-800/30 rounded-t-2xl">
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <FileText className="text-blue-400" />
            Registrasi Produk Baru
          </h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-100 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar Tabs */}
          <div className="w-64 bg-slate-800/20 border-r border-slate-800 p-4 space-y-2 overflow-y-auto">
            <button 
              type="button"
              onClick={() => setActiveTab('basic')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${activeTab === 'basic' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
            >
              <FileText size={18} /> Informasi Dasar
            </button>
            <button 
              type="button"
              onClick={() => setActiveTab('units')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${activeTab === 'units' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
            >
              <Box size={18} /> Konversi Satuan
            </button>
            <button 
              type="button"
              onClick={() => setActiveTab('pricing')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${activeTab === 'pricing' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
            >
              <Tags size={18} /> Harga (Jual/Beli)
            </button>
            <button 
              type="button"
              onClick={() => setActiveTab('supplier')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${activeTab === 'supplier' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
            >
              <Store size={18} /> Supplier Utama
            </button>
          </div>

          {/* Form Content */}
          <div className="flex-1 overflow-y-auto p-8 relative">
            <form id="productForm" onSubmit={handleSubmit}>
              
              {/* Tab: Basic Info */}
              <div className={activeTab === 'basic' ? 'block' : 'hidden'}>
                <h3 className="text-lg font-semibold text-slate-100 mb-6">Informasi Dasar</h3>
                <div className="space-y-5 max-w-lg">
                  <div>
                    <label className="form-label">Nama Barang <span className="text-red-400">*</span></label>
                    <input 
                      type="text" 
                      className="form-input" 
                      required 
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      placeholder="Misal: Lengkuas, Bawang Merah Super"
                    />
                  </div>
                  <div>
                    <label className="form-label">Satuan Dasar <span className="text-red-400">*</span></label>
                    <select 
                      className="form-input" 
                      value={formData.base_unit}
                      onChange={(e) => setFormData({...formData, base_unit: e.target.value})}
                    >
                      <option value="Kg">Kg</option>
                      <option value="Gram">Gram</option>
                      <option value="Pcs">Pcs</option>
                      <option value="Ikat">Ikat</option>
                      <option value="Box">Box</option>
                    </select>
                    <p className="text-xs text-slate-500 mt-2">Satuan dasar adalah ukuran paling kecil yang digunakan untuk mencatat stok (Ledger).</p>
                  </div>
                </div>
              </div>

              {/* Tab: Units */}
              <div className={activeTab === 'units' ? 'block' : 'hidden'}>
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-100">Konversi Satuan (Opsional)</h3>
                    <p className="text-sm text-slate-400">Tambahkan satuan kustom atau satuan bayangan (nominal) untuk mempermudah Dapur order.</p>
                  </div>
                  <button type="button" onClick={handleAddUnit} className="btn bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700">
                    <Plus size={16} /> Tambah Satuan
                  </button>
                </div>
                
                {formData.units.length === 0 ? (
                  <div className="border-2 border-dashed border-slate-800 rounded-xl p-10 text-center flex flex-col items-center justify-center text-slate-500">
                    <Box size={48} className="mb-4 opacity-20" />
                    <p>Belum ada satuan kustom.</p>
                    <p className="text-sm">Gunakan fitur ini jika dapur bisa memesan barang ini dalam kemasan lain (misal Box, Pack) atau satuan bayangan (Rp 8000/pcs).</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {formData.units.map((unit: UnitConversionPayload, idx: number) => (
                      <div key={idx} className="bg-slate-800/40 border border-slate-700/50 p-4 rounded-xl flex items-start gap-4">
                        <div className="flex-1 space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="form-label text-xs">Nama Satuan (Custom)</label>
                              <input 
                                type="text" 
                                required
                                className="form-input py-2" 
                                placeholder="Misal: Pcs (8k) atau Box"
                                value={unit.custom_unit_name}
                                onChange={(e) => handleUpdateUnit(idx, 'custom_unit_name', e.target.value)}
                              />
                            </div>
                            <div className="flex items-center mt-6">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input 
                                  type="checkbox" 
                                  className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-blue-500 focus:ring-blue-500 focus:ring-offset-slate-900"
                                  checked={unit.is_nominal}
                                  onChange={(e) => handleUpdateUnit(idx, 'is_nominal', e.target.checked)}
                                />
                                <span className="text-sm text-slate-300">Ini Satuan Bayangan / Nominal</span>
                              </label>
                            </div>
                          </div>
                          {!unit.is_nominal && (
                            <div className="grid grid-cols-2 gap-4 items-center bg-slate-900/50 p-3 rounded-lg border border-slate-800">
                              <div className="text-sm text-slate-400">Setara dengan berapa {formData.base_unit}?</div>
                              <div className="flex items-center gap-2">
                                <span>1 {unit.custom_unit_name || '...'} =</span>
                                <input 
                                  type="number" 
                                  step="0.01"
                                  min="0.01"
                                  required
                                  className="form-input py-1.5 w-24 text-center"
                                  value={unit.conversion_rate || ''}
                                  onChange={(e) => handleUpdateUnit(idx, 'conversion_rate', e.target.value)}
                                />
                                <span>{formData.base_unit}</span>
                              </div>
                            </div>
                          )}
                          {unit.is_nominal && (
                            <div className="bg-blue-500/10 border border-blue-500/20 p-3 rounded-lg text-sm text-blue-400 flex gap-2">
                              <AlertCircle size={16} className="mt-0.5 shrink-0" />
                              <p>Satuan nominal tidak dikonversi ke gramase saat di daftar belanja agregat. Tetap muncul terpisah, misal: "Lengkuas (8000) 1 Pcs".</p>
                            </div>
                          )}
                        </div>
                        <button type="button" onClick={() => handleRemoveUnit(idx)} className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Tab: Pricing */}
              <div className={activeTab === 'pricing' ? 'block' : 'hidden'}>
                <h3 className="text-lg font-semibold text-slate-100 mb-6">Harga (Modal & Jual)</h3>
                <div className="grid grid-cols-2 gap-6 max-w-2xl">
                  <div className="bg-slate-800/40 p-5 rounded-xl border border-slate-700/50">
                    <label className="form-label font-bold text-slate-200">Harga Beli / Modal Pasar</label>
                    <p className="text-xs text-slate-400 mb-4">Estimasi harga saat ini per 1 {formData.base_unit}</p>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">Rp</span>
                      <input 
                        type="number" 
                        required min="0"
                        className="form-input pl-10 py-3 text-lg"
                        value={formData.buy_price}
                        onChange={(e) => setFormData({...formData, buy_price: Number(e.target.value)})}
                      />
                    </div>
                  </div>
                  
                  <div className="bg-slate-800/40 p-5 rounded-xl border border-slate-700/50">
                    <label className="form-label font-bold text-slate-200">Harga Jual Katalog (Dapur)</label>
                    <p className="text-xs text-slate-400 mb-4">Harga paten (fixed) untuk dikirim ke Dapur</p>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">Rp</span>
                      <input 
                        type="number" 
                        required min="0"
                        className="form-input pl-10 py-3 text-lg"
                        value={formData.sell_price}
                        onChange={(e) => setFormData({...formData, sell_price: Number(e.target.value)})}
                      />
                    </div>
                  </div>
                </div>

                {isLoss && (
                  <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 text-red-400 max-w-2xl">
                    <AlertCircle className="shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold">Peringatan: Harga Jual Terlalu Rendah</h4>
                      <p className="text-sm opacity-90 mt-1">Sistem mendeteksi bahwa Harga Jual Katalog (Rp {formData.sell_price.toLocaleString('id-ID')}) lebih kecil dari Harga Modal (Rp {formData.buy_price.toLocaleString('id-ID')}). Anda akan mencatat kerugian untuk setiap transaksi barang ini.</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Tab: Supplier */}
              <div className={activeTab === 'supplier' ? 'block' : 'hidden'}>
                <h3 className="text-lg font-semibold text-slate-100 mb-6">Supplier Utama</h3>
                <div className="max-w-lg space-y-4">
                  <p className="text-sm text-slate-400">Pilih supplier atau pasar langganan untuk mempermudah klasifikasi (Misal: Bawang Merah Jenis A beda dengan Jenis B).</p>
                  
                  <div className="mt-4">
                    <label className="form-label">Pilih Supplier</label>
                    <select 
                      className="form-input py-3"
                      value={formData.supplier_id || ''}
                      onChange={(e) => setFormData({...formData, supplier_id: e.target.value ? Number(e.target.value) : null})}
                    >
                      <option value="">-- Tidak ada supplier khusus --</option>
                      {suppliers.map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                      ))}
                    </select>
                  </div>
                  
                  {formData.supplier_id && (
                    <div className="mt-4 p-4 bg-slate-800/50 border border-slate-700/50 rounded-xl">
                      <div className="flex items-start gap-3">
                        <Store className="text-slate-400 mt-1" size={20} />
                        <div>
                          <p className="font-semibold text-slate-200">
                            {suppliers.find(s => String(s.id) === String(formData.supplier_id))?.name}
                          </p>
                          <p className="text-sm text-slate-400 mt-1">
                            {suppliers.find(s => String(s.id) === String(formData.supplier_id))?.address || 'Tidak ada data alamat'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900 flex justify-end gap-3 rounded-b-2xl">
          <button type="button" onClick={onClose} className="btn btn-secondary">
            Batal
          </button>
          <button 
            type="submit" 
            form="productForm" 
            disabled={loading}
            className="btn btn-primary min-w-[140px]"
          >
            {loading ? 'Menyimpan...' : (
              <>
                <Save size={18} /> Simpan Produk
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};

