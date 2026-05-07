import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Plus, Calendar, ClipboardList, ChevronRight, X, Clock } from 'lucide-react';
import type { DailyOrder } from '../types';

interface Props {
  onOpenDetail: (orderId: string) => void;
}

export const DailyOrderPage: React.FC<Props> = ({ onOpenDetail }) => {
  const [orders, setOrders] = useState<DailyOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newDate, setNewDate] = useState(new Date().toLocaleDateString('sv-SE'));
  const [newTitle, setNewTitle] = useState('');

  useEffect(() => { loadOrders(); }, []);

  const loadOrders = async () => {
    try {
      const data = await invoke<DailyOrder[]>('get_daily_orders', { dateFrom: null, dateTo: null });
      setOrders(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const createOrder = async () => {
    if (!newDate) return;
    try {
      const order = await invoke<DailyOrder>('create_daily_order', {
        payload: { order_date: newDate, title: newTitle || null }
      });
      setShowCreate(false);
      setNewTitle('');
      loadOrders();
      onOpenDetail(order.id);
    } catch (e) { alert(String(e)); }
  };

  const getProgress = (o: DailyOrder) => o.item_count > 0 ? Math.round((o.checked_count / o.item_count) * 100) : 0;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50 text-slate-900 font-sans">
      {/* Header */}
      <div className="px-8 py-6 border-b border-slate-200 bg-white flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 rounded-xl border border-blue-100 shadow-sm"><ClipboardList size={20} className="text-blue-600" /></div>
          <div>
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Purchase Order Harian</h2>
            <p className="text-xs text-slate-500 font-medium tracking-wide">Kelola daftar belanja harian untuk dapur MBG</p>
          </div>
        </div>
        <button onClick={() => setShowCreate(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl text-xs font-black shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2 uppercase tracking-widest">
          <Plus size={16} /> BUAT PO BARU
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-4xl mx-auto space-y-4">
          {loading && (
            <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-50">
              <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs font-black uppercase tracking-widest text-slate-400">Memuat Data PO...</p>
            </div>
          )}

          {!loading && orders.map(o => (
            <button key={o.id} onClick={() => onOpenDetail(o.id)}
              className="w-full bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all text-left flex items-center gap-6 group">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 flex flex-col items-center justify-center border border-slate-200 group-hover:bg-blue-600 group-hover:border-blue-600 transition-all shadow-sm">
                <span className="text-[10px] font-black text-slate-400 group-hover:text-blue-200 uppercase tracking-tighter">{new Date(o.order_date).toLocaleDateString('id-ID', { month: 'short' })}</span>
                <span className="text-lg font-black text-slate-800 group-hover:text-white leading-tight">{new Date(o.order_date).getDate()}</span>
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-black text-slate-800 truncate tracking-tight">{o.title || `Pesanan Tanggal ${o.order_date}`}</h3>
                  <span className={`text-[9px] font-black px-2.5 py-1 rounded-lg uppercase tracking-widest border ${o.status === 'draft' ? 'bg-slate-50 text-slate-400 border-slate-200' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                    {o.status}
                  </span>
                </div>
                
                <div className="flex items-center gap-4 mt-2 text-xs font-bold text-slate-400 uppercase tracking-tighter">
                  <div className="flex items-center gap-1.5"><Clock size={12} /> {o.order_date}</div>
                  <div className="flex items-center gap-1.5"><ClipboardList size={12} /> {o.item_count} ITEMS</div>
                  <div className="flex items-center gap-1.5 text-blue-600">{getProgress(o)}% CHECKED</div>
                </div>

                <div className="mt-4 h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-50">
                  <div className="h-full bg-linear-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-700 shadow-sm" style={{ width: `${getProgress(o)}%` }} />
                </div>
              </div>
              
              <div className="p-3 rounded-2xl bg-slate-50 group-hover:bg-blue-50 transition-colors">
                <ChevronRight size={20} className="text-slate-300 group-hover:text-blue-600 transition-all" />
              </div>
            </button>
          ))}

          {!loading && orders.length === 0 && (
            <div className="text-center py-24 bg-white rounded-3xl border-2 border-dashed border-slate-200">
              <div className="w-20 h-20 mx-auto rounded-3xl bg-blue-50 flex items-center justify-center text-blue-600 mb-6 border border-blue-100">
                <ClipboardList size={32} />
              </div>
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Daftar PO Masih Kosong</h3>
              <p className="text-sm text-slate-500 mt-2 font-medium">Anda belum memiliki riwayat Purchase Order. Klik tombol di atas untuk membuat PO baru.</p>
            </div>
          )}
        </div>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col">
            <div className="px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-black text-slate-800 uppercase tracking-tight">Buat PO Baru</h3>
              <button onClick={() => setShowCreate(false)} className="p-2 hover:bg-slate-200 rounded-xl text-slate-400 transition-all"><X size={20} /></button>
            </div>
            <div className="p-8 space-y-6">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Tanggal Operasional *</label>
                <div className="relative">
                  <Calendar size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input type="date" className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-blue-500 font-bold text-slate-800" value={newDate} onChange={e => setNewDate(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Nama / Label PO (Opsional)</label>
                <input className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-blue-500 font-bold text-slate-800 placeholder:text-slate-300 placeholder:font-normal" value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Misal: PO MBG Kertonatan / Pagi" />
              </div>
            </div>
            <div className="px-8 py-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50">
              <button onClick={() => setShowCreate(false)} className="px-6 py-2 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:text-slate-800 transition-all">Batal</button>
              <button onClick={createOrder} className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-black text-xs shadow-lg shadow-blue-500/30 hover:bg-blue-700 active:scale-95 transition-all">GENERATE PO</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
