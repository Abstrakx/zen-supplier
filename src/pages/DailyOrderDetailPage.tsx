import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { ArrowLeft, Plus, Trash2, X, Save, ShoppingCart, Check, Info, TrendingDown } from 'lucide-react';
import type { DailyOrderDetail, Kitchen, Supplier, Product, ItemCategory } from '../types';

interface Props {
  orderId: string;
  onBack: () => void;
}

export const DailyOrderDetailPage: React.FC<Props> = ({ orderId, onBack }) => {
  const [detail, setDetail] = useState<DailyOrderDetail | null>(null);
  const [kitchens, setKitchens] = useState<Kitchen[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterKitchen, setFilterKitchen] = useState<string>('all');

  // Add item modal
  const [showAdd, setShowAdd] = useState(false);
  const [fKitchen, setFKitchen] = useState('');
  const [fProduct, setFProduct] = useState('');
  const [fQty, setFQty] = useState(1);
  const [fUnit, setFUnit] = useState('Kg');
  const [fCategory, setFCategory] = useState<ItemCategory>('internal');
  const [fSupplier, setFSupplier] = useState('');
  const [fSupplierName, setFSupplierName] = useState('');
  const [fBuy, setFBuy] = useState(0);
  const [fSell, setFSell] = useState(0);
  const [fNotes, setFNotes] = useState('');

  useEffect(() => { loadAll(); }, [orderId]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [d, k, s, p] = await Promise.all([
        invoke<DailyOrderDetail>('get_daily_order_detail', { orderId }),
        invoke<Kitchen[]>('get_kitchens'),
        invoke<Supplier[]>('get_suppliers'),
        invoke<Product[]>('get_products'),
      ]);
      setDetail(d);
      setKitchens(k);
      setSuppliers(s);
      setProducts(p);
      if (k.length > 0 && !fKitchen) setFKitchen(k[0].id);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const toggleCheck = async (itemId: string) => {
    try {
      await invoke('toggle_item_checklist', { itemId });
      loadAll();
    } catch (e) { console.error(e); }
  };

  const deleteItem = async (itemId: string) => {
    if (!confirm('Hapus item ini?')) return;
    try {
      await invoke('delete_order_item', { itemId });
      loadAll();
    } catch (e) { alert(String(e)); }
  };

  const addItem = async () => {
    if (!fKitchen || !fProduct.trim()) return;
    const sup = suppliers.find(s => s.id === fSupplier);
    try {
      await invoke('add_order_item', {
        payload: {
          daily_order_id: orderId,
          kitchen_id: fKitchen,
          product_id: null,
          product_name: fProduct,
          quantity: fQty,
          unit: fUnit,
          unit_id: null,
          category: fCategory,
          supplier_id: fSupplier || null,
          supplier_name: sup?.name || fSupplierName || null,
          notes: fNotes || null,
          buy_price: fBuy > 0 ? fBuy : null,
          sell_price: fSell > 0 ? fSell : null,
        }
      });
      setShowAdd(false);
      setFProduct(''); setFQty(1); setFUnit('Kg'); setFNotes(''); setFBuy(0); setFSell(0);
      loadAll();
    } catch (e) { alert(String(e)); }
  };

  const filteredItems = detail?.items.filter(i => filterKitchen === 'all' || i.kitchen_id === filterKitchen) || [];

  const getCategoryStyles = (cat: string) => {
    switch (cat) {
      case 'internal': return 'bg-slate-50 border-l-4 border-l-slate-400';
      case 'external': return 'bg-amber-50 border-l-4 border-l-amber-400';
      case 'operational': return 'bg-emerald-50 border-l-4 border-l-emerald-400';
      default: return 'border-l-4 border-l-transparent';
    }
  };

  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case 'internal': return <span className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded text-[9px] font-black uppercase">Internal</span>;
      case 'external': return <span className="px-2 py-0.5 bg-amber-200 text-amber-800 rounded text-[9px] font-black uppercase">External</span>;
      case 'operational': return <span className="px-2 py-0.5 bg-emerald-200 text-emerald-800 rounded text-[9px] font-black uppercase">Ops</span>;
      default: return null;
    }
  };

  if (loading || !detail) return <div className="flex-1 flex items-center justify-center text-slate-400 bg-slate-50 font-bold">Memuat Detail PO...</div>;

  const progress = detail.order.item_count > 0 ? Math.round((detail.order.checked_count / detail.order.item_count) * 100) : 0;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50 text-slate-900 font-sans">
      {/* Header */}
      <div className="px-8 py-4 border-b border-slate-200 bg-white flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-800 transition-all border border-transparent hover:border-slate-200 shadow-xs"><ArrowLeft size={18} /></button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">{detail.order.title || `PO ${detail.order.order_date}`}</h2>
              {detail.order.checked_count === detail.order.item_count && detail.order.item_count > 0 && (
                <div className="bg-emerald-100 text-emerald-600 p-0.5 rounded-full"><Check size={12} strokeWidth={4} /></div>
              )}
            </div>
            <div className="flex items-center gap-3 mt-0.5">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{detail.order.order_date}</span>
              <span className="text-slate-300">•</span>
              <span className="text-[10px] text-blue-600 font-black uppercase tracking-widest">{detail.order.checked_count}/{detail.order.item_count} ITEMS COMPLETE</span>
            </div>
          </div>
        </div>
        <button onClick={() => setShowAdd(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl text-xs font-black shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2">
          <Plus size={14} /> TAMBAH ITEM
        </button>
      </div>

      {/* Progress & Quick Filter */}
      <div className="px-8 py-3 border-b border-slate-200 bg-white/50 flex items-center gap-6">
        <div className="flex-1 flex flex-col gap-1.5">
          <div className="flex justify-between items-center text-[9px] font-black text-slate-400 tracking-tighter uppercase">
            <span>Progress Checklist</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 bg-slate-200 rounded-full overflow-hidden shadow-inner border border-slate-100">
            <div className="h-full bg-linear-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-700 ease-out shadow-sm" style={{ width: `${progress}%` }} />
          </div>
        </div>
        <div className="flex items-center gap-1 bg-slate-200/50 p-1 rounded-xl border border-slate-200">
          <button onClick={() => setFilterKitchen('all')}
            className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${filterKitchen === 'all' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
            Semua
          </button>
          {kitchens.map(k => (
            <button key={k.id} onClick={() => setFilterKitchen(k.id)}
              className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${filterKitchen === k.id ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
              {k.code}
            </button>
          ))}
        </div>
      </div>

      {/* Items Table Container */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="w-14 text-center px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">✓</th>
                <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Supplier / Source</th>
                <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nama Produk</th>
                <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Qty</th>
                <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Unit</th>
                <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Dapur</th>
                <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipe</th>
                <th className="text-center w-20 px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Opsi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.map(item => (
                <tr key={item.id} className={`${getCategoryStyles(item.category)} ${item.is_checked ? 'opacity-40 grayscale-sm' : ''} hover:brightness-95 transition-all`}>
                  <td className="text-center px-4 py-4">
                    <div
                      onClick={() => toggleCheck(item.id)}
                      className={`mx-auto w-6 h-6 rounded-lg border-2 flex items-center justify-center cursor-pointer transition-all ${item.is_checked ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300 hover:border-blue-400 bg-white'}`}
                    >
                      {item.is_checked && <Check size={14} strokeWidth={4} />}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{item.supplier_name || '-'}</div>
                    {item.notes && <div className="text-[9px] text-blue-500 font-bold mt-0.5 flex items-center gap-1"><Info size={8} /> {item.notes}</div>}
                  </td>
                  <td className={`px-4 py-4 font-black ${item.is_checked ? 'line-through text-slate-400' : 'text-slate-800'}`}>{item.product_name}</td>
                  <td className="px-4 py-4 text-right font-black text-slate-800">{item.quantity}</td>
                  <td className="px-4 py-4 text-[11px] font-bold text-slate-400 uppercase">{item.unit}</td>
                  <td className="px-4 py-4 text-[11px] font-black text-blue-600 font-mono uppercase">{item.kitchen_name || '-'}</td>
                  <td className="px-4 py-4">{getCategoryBadge(item.category)}</td>
                  <td className="px-4 py-4 text-center">
                    <button onClick={() => deleteItem(item.id)} className="p-2 hover:bg-red-100 rounded-lg text-slate-300 hover:text-red-500 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-32 text-slate-400 bg-slate-50/20">
                    <div className="flex flex-col items-center gap-3">
                      <ShoppingCart size={48} className="opacity-10 text-slate-900" />
                      <p className="text-sm font-bold opacity-30">Belum ada item untuk dapur ini.</p>
                      <button onClick={() => setShowAdd(true)} className="text-[10px] font-black text-blue-600 underline">KLIK UNTUK TAMBAH</button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend Footer */}
      <div className="px-8 py-3 border-t border-slate-200 bg-white flex items-center gap-6 text-[9px] font-black text-slate-400 uppercase tracking-widest shadow-inner">
        <span className="flex items-center gap-2"><span className="w-4 h-2 rounded bg-slate-200 border border-slate-300"></span> Internal</span>
        <span className="flex items-center gap-2"><span className="w-4 h-2 rounded bg-amber-200 border border-amber-300"></span> External</span>
        <span className="flex items-center gap-2"><span className="w-4 h-2 rounded bg-emerald-200 border border-emerald-300"></span> Operasional</span>
      </div>

      {/* Add Item Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="font-black text-slate-800 uppercase tracking-tight">Tambah Item PO</h3>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Masukkan detail produk dan target dapur</p>
              </div>
              <button onClick={() => setShowAdd(false)} className="p-2 hover:bg-slate-200 rounded-xl text-slate-400 transition-all"><X size={20} /></button>
            </div>

            <div className="p-8 space-y-5 overflow-y-auto">
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Target Dapur *</label>
                  <select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-blue-500 font-bold text-slate-700" value={fKitchen} onChange={e => setFKitchen(e.target.value)}>
                    {kitchens.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Kategori Item *</label>
                  <select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-blue-500 font-bold text-slate-700" value={fCategory} onChange={e => setFCategory(e.target.value as ItemCategory)}>
                    <option value="internal">Internal (Kita Kirim)</option>
                    <option value="external">External (Supplier Luar)</option>
                    <option value="operational">Operasional</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Nama Produk *</label>
                <input className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-blue-500 font-black text-slate-800 placeholder:text-slate-300 placeholder:font-normal" value={fProduct} onChange={e => setFProduct(e.target.value)} placeholder="Misal: Beras Premium, Minyak Goreng..." list="products-list" />
                <datalist id="products-list">
                  {products.map(p => <option key={p.id} value={p.name} />)}
                </datalist>
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Jumlah / Qty *</label>
                  <input type="number" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-blue-500 font-black text-slate-800" value={fQty} onChange={e => setFQty(Number(e.target.value))} min={0.1} step={0.1} />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Satuan</label>
                  <input className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-blue-500 font-bold text-slate-700" value={fUnit} onChange={e => setFUnit(e.target.value)} placeholder="Kg, Pcs, Sak..." />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Supplier / PO Source</label>
                <select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-blue-500 font-bold text-slate-700" value={fSupplier} onChange={e => { setFSupplier(e.target.value); setFSupplierName(suppliers.find(s => s.id === e.target.value)?.name || ''); }}>
                  <option value="">-- Pilih Supplier --</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Harga Beli</label><input type="number" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-emerald-500 font-bold text-slate-700" value={fBuy} onChange={e => setFBuy(Number(e.target.value))} min={0} /></div>
                <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Harga Jual ke Dapur</label><input type="number" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-blue-500 font-bold text-slate-700" value={fSell} onChange={e => setFSell(Number(e.target.value))} min={0} /></div>
              </div>

              {fBuy > 0 && fSell > 0 && fSell < fBuy && (
                <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-[10px] font-black flex items-center gap-2 uppercase tracking-tight">
                  <TrendingDown size={14} /> Peringatan: Harga jual lebih rendah dari harga beli! Margin Minus.
                </div>
              )}

              <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Catatan Tambahan</label><input className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-blue-500 font-medium text-slate-600" value={fNotes} onChange={e => setFNotes(e.target.value)} placeholder="Misal: Barang titipan, Kualitas super..." /></div>
            </div>

            <div className="px-8 py-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50">
              <button onClick={() => setShowAdd(false)} className="px-6 py-2 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:text-slate-800 transition-all">Batal</button>
              <button onClick={addItem} className="bg-blue-600 text-white px-10 py-3 rounded-2xl font-black text-xs shadow-lg shadow-blue-500/30 hover:bg-blue-700 active:scale-95 transition-all flex items-center gap-2"><Save size={14} /> SIMPAN ITEM</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
