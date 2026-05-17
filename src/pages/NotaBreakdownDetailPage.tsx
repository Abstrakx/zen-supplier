import React, { useState, useEffect, useRef, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Printer,
  Search,
  Store,
  ChefHat,
  Pencil,
  PlusCircle,
  Sparkles,
  Check,
  ShoppingBag,
  Tag,
} from "lucide-react";
import type {
  NotaBreakdownDetail,
  NotaSection,
  NotaItem,
  Store as StoreType,
  Kitchen,
  Product,
  ProductUnit
} from "../types";
import { CurrencyInput } from "../components/CurrencyInput";
import Swal from "sweetalert2";

interface Props {
  notaId: string;
  onBack: () => void;
}

export const NotaBreakdownDetailPage: React.FC<Props> = ({ notaId, onBack }) => {
  const [detail, setDetail] = useState<NotaBreakdownDetail | null>(null);
  const [stores, setStores] = useState<StoreType[]>([]);
  const [kitchens, setKitchens] = useState<Kitchen[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isStoreDropdownOpen, setIsStoreDropdownOpen] = useState(false);
  const [sectionToPrint, setSectionToPrint] = useState<string | null>(null);

  useEffect(() => {
    loadAll();
  }, [notaId]);

  const selectedStore = useMemo(() => {
    return stores.find(s => s.id === detail?.nota.store_id);
  }, [stores, detail?.nota.store_id]);

  const printSingleSection = (sectionId: string) => {
    setSectionToPrint(sectionId);
    setTimeout(() => {
      window.print();
      setSectionToPrint(null);
    }, 100);
  };

  const loadAll = async () => {
    setLoading(true);
    try {
      const [d, s, k, p] = await Promise.all([
        invoke<NotaBreakdownDetail>("get_nota_breakdown_detail", { notaId }),
        invoke<StoreType[]>("get_stores"),
        invoke<Kitchen[]>("get_kitchens"),
        invoke<Product[]>("get_products"),
      ]);
      setDetail(d);
      setStores(s);
      setKitchens(k);
      setProducts(p);
    } catch (e) {
      console.error(e);
      Swal.fire("Gagal", "Gagal memuat detail nota", "error");
    } finally {
      setLoading(false);
    }
  };

  const addSection = async () => {
    try {
      await invoke("add_nota_section", {
        payload: {
          nota_id: notaId,
          dapur_id: null,
          dapur_name: null,
          section_label: `SPPG ${detail?.sections.length ? detail.sections.length + 1 : 1}`,
        }
      });
      loadAll();
    } catch (e) {
      Swal.fire("Gagal", String(e), "error");
    }
  };

  const updateNota = async (payload: any) => {
    try {
      await invoke("update_nota_breakdown", {
        notaId,
        payload: {
          nota_number: detail?.nota.nota_number,
          purchase_date: detail?.nota.purchase_date,
          store_id: detail?.nota.store_id,
          store_name: detail?.nota.store_name,
          notes: detail?.nota.notes,
          ...payload
        }
      });
      loadAll();
    } catch (e) {
      console.error(e);
    }
  };

  const finalize = async () => {
    const result = await Swal.fire({
      title: "Selesaikan Nota?",
      text: "Setelah diselesaikan, status akan menjadi DONE.",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Ya, Selesai",
    });
    if (!result.isConfirmed) return;

    try {
      await invoke("finalize_nota", { notaId });
      Swal.fire("Berhasil", "Nota telah diselesaikan", "success");
      loadAll();
    } catch (e) {
      Swal.fire("Gagal", String(e), "error");
    }
  };

  if (loading || !detail) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-400 bg-slate-50 font-semibold">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-violet-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-extrabold uppercase tracking-widest">Memuat Detail Nota...</p>
        </div>
      </div>
    );
  }

  const grandTotal = detail.items.reduce((sum, item) => sum + (item.subtotal || 0), 0);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50 text-slate-900">
      {/* Header */}
      <div className="px-8 py-4 border-b border-slate-200 bg-white flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-800 transition-all border border-transparent hover:border-slate-200 shadow-xs"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-extrabold text-slate-800 uppercase tracking-tight">
                {detail.nota.nota_number}
              </h2>
              <span
                className={`text-[9px] font-extrabold px-2.5 py-1 rounded-lg uppercase tracking-widest border 
                  ${detail.nota.status === 'done' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}
              >
                {detail.nota.status}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-0.5">
              <div className="flex items-center gap-1 group">
                <Store size={10} className="text-slate-400 group-hover:text-violet-500 transition-colors" />

                {detail.nota.status === "done" ? (
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    {detail.nota.store_name || "Tanpa Toko"}
                  </div>
                ) : (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsStoreDropdownOpen(!isStoreDropdownOpen)}
                      className="text-[10px] font-bold text-slate-500 bg-transparent outline-none cursor-pointer hover:text-violet-600 transition-colors uppercase tracking-widest flex items-center gap-1"
                    >
                      {detail.nota.store_name || "Tanpa Toko"}
                      <svg className={`w-3 h-3 transition-transform ${isStoreDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {isStoreDropdownOpen && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setIsStoreDropdownOpen(false)}
                        />

                        <div className="absolute left-0 top-full mt-1 z-20 min-w-[140px] bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden">
                          <div
                            className="px-3 py-2 text-xs font-medium text-slate-600 hover:bg-violet-50 hover:text-violet-600 cursor-pointer transition-colors"
                            onClick={() => {
                              updateNota({ store_id: null, store_name: null });
                              setIsStoreDropdownOpen(false);
                            }}
                          >
                            Tanpa Toko...
                          </div>
                          {stores.map(st => (
                            <div
                              key={st.id}
                              className="px-3 py-2 text-xs font-medium text-slate-600 hover:bg-violet-50 hover:text-violet-600 cursor-pointer transition-colors"
                              onClick={() => {
                                updateNota({ store_id: st.id, store_name: st.name });
                                setIsStoreDropdownOpen(false);
                              }}
                            >
                              {st.name}
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
              <span className="text-slate-300">•</span>
              <span className="text-[10px] text-violet-600 font-extrabold uppercase tracking-widest">
                {detail.nota.purchase_date}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={addSection}
            className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-5 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 uppercase tracking-widest border border-slate-200 print:hidden"
          >
            <PlusCircle size={14} /> TAMBAH SPPG
          </button>
          <button
            onClick={() => {
              setSectionToPrint(null);
              setTimeout(() => window.print(), 100);
            }}
            className="bg-slate-800 hover:bg-slate-900 text-white px-5 py-2 rounded-xl text-xs font-extrabold shadow-lg shadow-slate-500/20 transition-all flex items-center gap-2 uppercase tracking-widest active:scale-95 print:hidden"
          >
            <Printer size={14} /> PRINT SEMUA
          </button>
          {detail.nota.status === "draft" && (
            <button
              onClick={finalize}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-xl text-xs font-extrabold shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2 uppercase tracking-widest active:scale-95 print:hidden"
            >
              <Check size={14} /> SELESAI
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-7xl mx-auto space-y-8 pb-32">
          {detail.sections.length === 0 && (
            <div className="text-center py-24 bg-white rounded-[32px] border-2 border-dashed border-slate-200 shadow-sm">
              <ShoppingBag size={48} className="mx-auto text-slate-200 mb-4" />
              <p className="text-sm font-extrabold text-slate-400 uppercase tracking-widest">
                Belum ada SPPG di breakdown ini
              </p>
              <p className="text-xs text-slate-300 mt-2 font-medium">
                Klik "Tambah SPPG" untuk mulai memecah nota.
              </p>
            </div>
          )}

          {detail.sections.map((section) => (
            <NotaSectionCard
              key={section.id}
              section={section}
              items={detail.items.filter(i => i.section_id === section.id)}
              kitchens={kitchens}
              products={products}
              onReload={loadAll}
              onPrint={() => printSingleSection(section.id)}
              isFinalized={detail.nota.status === "done"}
            />
          ))}
        </div>
      </div>

      {/* Sticky Bottom Summary Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-12 py-6 flex items-center justify-between shadow-[0_-10px_30px_rgba(0,0,0,0.03)] z-20 print:hidden ml-64">
        <div className="flex items-center gap-6">
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Total Nota Breakdown</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-800">Rp {grandTotal.toLocaleString("id-ID")}</span>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                {detail.items.length} ITEM TOTAL
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-slate-50 border border-slate-100 rounded-xl">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Jumlah SPPG: </span>
            <span className="text-sm font-black text-slate-700 ml-1">{detail.sections.length}</span>
          </div>
        </div>
      </div>

      {/* Printable Area (Thermal Layout) */}
      <div className="hidden print:block fixed inset-0 bg-white z-9999 p-4 text-black overflow-y-auto">
        <style>
          {`
            @media print {
              @page { size: 58mm auto; margin: 0; }
              body { font-family: 'Courier New', Courier, monospace; font-size: 8pt; line-height: 1.2; color: #000; }
              .thermal-nota { width: 58mm; margin: 0 auto; padding: 3mm 0; page-break-after: always; }
              .thermal-header { text-align: center; margin-bottom: 3mm; border-bottom: 1px dashed #000; padding-bottom: 3mm; }
              .thermal-store-name { font-size: 11pt; font-weight: 900; margin-bottom: 0.5mm; text-transform: uppercase; }
              .thermal-store-info { font-size: 7pt; color: #333; }
              .thermal-doc-title { font-size: 9pt; font-weight: bold; margin: 2mm 0; text-decoration: underline; }
              
              .thermal-info-grid { font-size: 7pt; margin-bottom: 2mm; border-bottom: 1px dashed #000; padding-bottom: 2mm; }
              .thermal-info-row { display: flex; justify-content: space-between; margin-bottom: 0.5mm; }
              
              .thermal-item { margin-bottom: 2mm; }
              .thermal-item-name { font-weight: bold; font-size: 8pt; text-transform: uppercase; }
              .thermal-item-detail { display: flex; justify-content: space-between; font-size: 7pt; color: #444; }
              
              .thermal-totals { border-top: 1px dashed #000; margin-top: 2mm; padding-top: 2mm; }
              .thermal-total-row { display: flex; justify-content: space-between; font-weight: 900; font-size: 10pt; }
              
              .thermal-footer { text-align: center; font-size: 7pt; margin-top: 5mm; padding-top: 3mm; border-top: 1px dashed #000; }
            }
          `}
        </style>

        {detail.sections
          .filter(s => !sectionToPrint || s.id === sectionToPrint)
          .map((section) => {
            const sectionItems = detail.items.filter(i => i.section_id === section.id);
            if (sectionItems.length === 0) return null;
            const sectionTotal = sectionItems.reduce((s, i) => s + (i.subtotal || 0), 0);

            return (
              <div key={section.id} className="thermal-nota">
                <div className="thermal-header">
                  <div className="thermal-store-name">{selectedStore?.name || "ZEN SUPPLIER"}</div>
                  <div className="thermal-store-info">
                    {selectedStore?.address && <div>{selectedStore.address}</div>}
                    {selectedStore?.pic_phone && <div>Telp: {selectedStore.pic_phone}</div>}
                  </div>
                </div>

                <div className="text-center">
                  <div className="thermal-doc-title">BUKTI PENYERAHAN BARANG</div>
                </div>

                <div className="thermal-info-grid">
                  <div className="thermal-info-row">
                    <span>No. Nota:</span>
                    <span style={{ fontWeight: 'bold' }}>{detail.nota.nota_number}</span>
                  </div>
                  <div className="thermal-info-row">
                    <span>Tanggal:</span>
                    <span>{detail.nota.purchase_date}</span>
                  </div>
                  <div className="thermal-info-row">
                    <span>SPPG:</span>
                    <span style={{ fontWeight: 'bold' }}>{section.dapur_name || section.section_label}</span>
                  </div>
                </div>

                <div className="thermal-items">
                  {sectionItems.map((item, idx) => (
                    <div key={idx} className="thermal-item">
                      <div className="thermal-item-name">{item.product_name}</div>
                      <div className="thermal-item-detail">
                        <span>{item.quantity} {item.unit} x {(item.buy_price || 0).toLocaleString("id-ID")}</span>
                        <span style={{ fontWeight: 'bold', color: '#000' }}>{(item.subtotal || 0).toLocaleString("id-ID")}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="thermal-totals">
                  <div className="thermal-total-row">
                    <span>TOTAL</span>
                    <span>Rp {sectionTotal.toLocaleString("id-ID")}</span>
                  </div>
                </div>

              </div>
            );
          })}
      </div>
    </div>
  );
};

// ═══ SECTION CARD COMPONENT ═══

interface SectionCardProps {
  section: NotaSection;
  items: NotaItem[];
  kitchens: Kitchen[];
  products: Product[];
  onReload: () => void;
  onPrint: () => void;
  isFinalized: boolean;
}

const NotaSectionCard: React.FC<SectionCardProps> = ({
  section,
  items,
  kitchens,
  products,
  onReload,
  onPrint,
  isFinalized
}) => {
  const [label, setLabel] = useState(section.section_label);
  const [isEditingLabel, setIsEditingLabel] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filteredProducts = useMemo(() => {
    if (!searchTerm) return [];
    const l = searchTerm.toLowerCase();
    return products.filter(p => p.name.toLowerCase().includes(l)).slice(0, 6);
  }, [searchTerm, products]);

  const handleUpdateSection = async (payload: any) => {
    try {
      await invoke("update_nota_section", {
        id: section.id,
        payload: {
          nota_id: section.nota_id,
          dapur_id: section.dapur_id,
          dapur_name: section.dapur_name,
          section_label: label,
          ...payload
        }
      });
      onReload();
    } catch (e) {
      console.error(e);
    }
  };

  const deleteSection = async () => {
    const result = await Swal.fire({
      title: "Hapus Section?",
      text: "Semua item dalam SPPG ini akan ikut terhapus.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      confirmButtonText: "Ya, Hapus",
    });
    if (!result.isConfirmed) return;
    try {
      await invoke("delete_nota_section", { sectionId: section.id });
      onReload();
    } catch (e) {
      Swal.fire("Gagal", String(e), "error");
    }
  };

  const addItemFromCatalog = async (p: Product, u: ProductUnit) => {
    try {
      await invoke("add_nota_item", {
        payload: {
          nota_id: section.nota_id,
          section_id: section.id,
          product_name: p.name,
          quantity: 1,
          unit: u.unit_name,
          buy_price: u.latest_buy_price || 0,
          notes: null,
          product_id: p.id,
          unit_id: u.id
        }
      });
      setSearchTerm("");
      setShowDropdown(false);
      onReload();
    } catch (e) {
      Swal.fire("Gagal", String(e), "error");
    }
  };

  const addFreetextItem = async () => {
    if (!searchTerm.trim()) return;
    try {
      await invoke("add_nota_item", {
        payload: {
          nota_id: section.nota_id,
          section_id: section.id,
          product_name: searchTerm.trim(),
          quantity: 1,
          unit: "KG",
          buy_price: 0,
          notes: null,
        }
      });
      setSearchTerm("");
      setShowDropdown(false);
      onReload();
    } catch (e) {
      Swal.fire("Gagal", String(e), "error");
    }
  };

  const sectionTotal = items.reduce((s, i) => s + (i.subtotal || 0), 0);

  return (
    <section className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-visible">
      <div className="px-8 py-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-violet-100 text-violet-600 rounded-xl shadow-xs">
            <ChefHat size={18} />
          </div>
          <div className="flex flex-col">
            {isEditingLabel ? (
              <input
                className="py-0.5 px-2 bg-white border border-violet-300 rounded-lg outline-none font-black text-slate-800 text-sm focus:ring-2 focus:ring-violet-500/20"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                onBlur={() => { setIsEditingLabel(false); handleUpdateSection({ section_label: label }); }}
                onKeyDown={(e) => e.key === "Enter" && (e.target as any).blur()}
                autoFocus
              />
            ) : (
              <div className="flex items-center gap-2 group">
                <h3 onClick={() => !isFinalized && setIsEditingLabel(true)} className="font-black text-slate-800 text-sm uppercase tracking-tight cursor-pointer">
                  {section.section_label}
                </h3>
                <Pencil size={12} className="text-slate-300 group-hover:text-violet-500 opacity-0 group-hover:opacity-100 transition-all" />
              </div>
            )}

            <div className="flex items-center gap-2 mt-1">
              <select
                className="text-[10px] font-bold text-slate-500 bg-transparent outline-none cursor-pointer hover:text-violet-600 transition-colors uppercase tracking-widest"
                value={section.dapur_id || ""}
                onChange={(e) => {
                  const d = kitchens.find(k => k.id === e.target.value);
                  handleUpdateSection({ dapur_id: e.target.value || null, dapur_name: d?.name || null });
                }}
                disabled={isFinalized}
              >
                <option value="">Pilih Dapur...</option>
                {kitchens.map(k => (
                  <option key={k.id} value={k.id}>{k.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative" ref={searchRef}>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari produk di katalog..."
                className="pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs text-slate-700 focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 outline-none transition w-64 font-bold disabled:opacity-50"
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setShowDropdown(true); }}
                disabled={isFinalized}
              />
            </div>

            {showDropdown && searchTerm && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden">
                {filteredProducts.map(p => (
                  <div key={p.id} className="border-b border-slate-50 last:border-0">
                    <div className="px-4 py-3 bg-slate-50/50 flex items-center justify-between border-b border-slate-100/50">
                      <div>
                        <p className="font-black text-slate-800 text-xs uppercase tracking-tight">{p.name}</p>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{p.category || "No Category"}</p>
                      </div>
                      <Tag size={12} className="text-slate-300" />
                    </div>
                    <div className="grid grid-cols-2 gap-1 p-1 bg-white">
                      {p.units.map(u => (
                        <button
                          key={u.id}
                          onClick={() => addItemFromCatalog(p, u)}
                          className="px-3 py-2 hover:bg-violet-50 rounded-lg flex items-center justify-between group transition-all text-left"
                        >
                          <div>
                            <p className="font-bold text-slate-600 text-[10px] group-hover:text-violet-700 transition-colors uppercase">{u.unit_name}</p>
                            <p className="text-[9px] text-slate-400">Rp {(u.latest_buy_price || 0).toLocaleString("id-ID")}</p>
                          </div>
                          <Plus size={10} className="text-slate-300 group-hover:text-violet-500" />
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                {!filteredProducts.some(p => p.name.toLowerCase() === searchTerm.toLowerCase()) && (
                  <div onClick={addFreetextItem} className="px-4 py-3 hover:bg-amber-50 cursor-pointer flex items-center gap-3 group transition-colors">
                    <Sparkles size={14} className="text-amber-500" />
                    <p className="font-bold text-slate-700 text-xs group-hover:text-amber-700">Tambah "{searchTerm}"</p>
                  </div>
                )}
              </div>
            )}
          </div>

          <button
            onClick={onPrint}
            className="p-2.5 text-slate-300 hover:text-violet-500 hover:bg-violet-50 rounded-xl transition-all"
            title="Print SPPG Ini"
          >
            <Printer size={16} />
          </button>
          {!isFinalized && (
            <button
              onClick={deleteSection}
              className="p-2.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50/30 border-b border-slate-100">
            <tr>
              <th className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Produk</th>
              <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center w-24">Qty</th>
              <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center w-24">Satuan</th>
              <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right w-32">Harga Beli</th>
              <th className="px-6 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right w-32">Subtotal</th>
              <th className="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center w-16">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((item) => (
              <NotaItemRow
                key={item.id}
                item={item}
                products={products}
                onReload={onReload}
                isFinalized={isFinalized}
              />
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={6} className="py-12 text-center">
                  <p className="text-xs font-bold text-slate-300 uppercase tracking-widest">Belum ada item dalam SPPG ini</p>
                </td>
              </tr>
            )}
          </tbody>
          {items.length > 0 && (
            <tfoot className="bg-slate-50/30 border-t border-slate-100">
              <tr>
                <td colSpan={4} className="px-8 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Total SPPG</td>
                <td className="px-6 py-4 text-right font-black text-slate-800 tracking-tight">Rp {sectionTotal.toLocaleString("id-ID")}</td>
                <td></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </section>
  );
};

// ═══ ITEM ROW COMPONENT ═══

interface ItemRowProps {
  item: NotaItem;
  products: Product[];
  onReload: () => void;
  isFinalized: boolean;
}

const NotaItemRow: React.FC<ItemRowProps> = ({ item, products, onReload, isFinalized }) => {
  const [qty, setQty] = useState(item.quantity.toString());
  const [price, setPrice] = useState((item.buy_price || 0).toString());
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    setQty(item.quantity.toString());
    setPrice((item.buy_price || 0).toString());
  }, [item.quantity, item.buy_price]);

  const handleUpdate = async (updates?: any) => {
    try {
      await invoke("update_nota_item", {
        itemId: item.id,
        payload: {
          nota_id: item.nota_id,
          section_id: item.section_id,
          product_name: item.product_name,
          quantity: parseFloat(updates?.quantity || qty) || 0,
          unit: updates?.unit || item.unit,
          buy_price: parseFloat(updates?.buy_price || price) || 0,
          notes: item.notes,
          product_id: item.product_id,
          unit_id: updates?.unit_id || item.unit_id,
        }
      });
      setIsDirty(false);
      onReload();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async () => {
    try {
      await invoke("delete_nota_item", { itemId: item.id });
      onReload();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <tr className="group hover:bg-slate-50/50 transition-colors">
      <td className="px-8 py-4">
        <span className="font-bold text-slate-700 text-sm">{item.product_name}</span>
      </td>
      <td className="px-6 py-4">
        <input
          type="number"
          className="w-16 mx-auto text-center py-1 bg-transparent border-b border-transparent group-hover:border-slate-200 focus:border-violet-500 outline-none font-black text-slate-700 disabled:opacity-50"
          value={qty}
          onChange={(e) => { setQty(e.target.value); setIsDirty(true); }}
          onBlur={() => isDirty && handleUpdate()}
          disabled={isFinalized}
        />
      </td>
      <td className="px-6 py-4">
        {item.product_id ? (
          <select
            className="w-full text-center py-1 bg-transparent border-b border-transparent group-hover:border-slate-200 focus:border-violet-500 outline-none font-bold text-slate-500 uppercase text-[10px] disabled:opacity-50 cursor-pointer"
            value={item.unit_id || ""}
            onChange={(e) => {
              const u = products.find(p => p.id === item.product_id)?.units.find(u => u.id === e.target.value);
              if (u) {
                const newPrice = u.latest_buy_price || 0;
                setPrice(newPrice.toString());
                handleUpdate({
                  unit: u.unit_name,
                  unit_id: u.id,
                  buy_price: newPrice
                });
              }
            }}
            disabled={isFinalized}
          >
            {products.find(p => p.id === item.product_id)?.units.map(u => (
              <option key={u.id} value={u.id}>{u.unit_name}</option>
            ))}
          </select>
        ) : (
          <input
            className="w-16 mx-auto text-center py-1 bg-transparent border-b border-transparent group-hover:border-slate-200 focus:border-violet-500 outline-none font-bold text-slate-500 uppercase text-xs disabled:opacity-50"
            value={item.unit}
            onChange={(e) => handleUpdate({ unit: e.target.value })}
            disabled={isFinalized}
          />
        )}
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center justify-end">
          <CurrencyInput
            value={price === "" ? "" : parseFloat(price)}
            onChange={(val) => {
              const strVal = val === "" ? "" : val.toString();
              setPrice(strVal);
              setIsDirty(true);
            }}
            onBlur={() => isDirty && handleUpdate()}
            prefix="Rp"
            className="w-32 text-right py-1 bg-transparent border-b border-transparent group-hover:border-slate-200 focus:border-violet-500 outline-none font-bold text-slate-700 disabled:opacity-50 text-sm"
            disabled={isFinalized}
          />
        </div>
      </td>
      <td className="px-6 py-4 text-right font-bold text-slate-600 tabular-nums">
        Rp {(item.subtotal || 0).toLocaleString("id-ID")}
      </td>
      <td className="px-8 py-4">
        {!isFinalized && (
          <button onClick={handleDelete} className="p-2 text-slate-300 hover:text-red-500 transition-colors mx-auto block opacity-0 group-hover:opacity-100">
            <Trash2 size={14} />
          </button>
        )}
      </td>
    </tr>
  );
};
