import React, { useState, useEffect, useRef, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  ShoppingCart,
  Check,
  Search,
  PlusCircle,
  FileText,
  Send,
  Sparkles,
  Pencil,
  Printer,
  RefreshCw,
} from "lucide-react";
import type {
  DailyOrderDetail,
  Product,
  PoSection,
  OrderItem,
  Supplier,
} from "../types";
import Swal from "sweetalert2";

interface Props {
  orderId: string;
  onBack: () => void;
}

export const DailyOrderDetailPage: React.FC<Props> = ({ orderId, onBack }) => {
  const [detail, setDetail] = useState<DailyOrderDetail | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAll();
  }, [orderId]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [d, p, s] = await Promise.all([
        invoke<DailyOrderDetail>("get_daily_order_detail", { orderId }),
        invoke<Product[]>("get_products"),
        invoke<Supplier[]>("get_suppliers"),
      ]);
      setDetail(d);
      setProducts(p);
      setSuppliers(s);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const addSection = async () => {
    try {
      await invoke("create_po_section", {
        payload: { daily_order_id: orderId, section_name: null },
      });
      loadAll();
    } catch (e) {
      Swal.fire("Gagal", String(e), "error");
    }
  };

  const updateSectionName = async (sectionId: string, name: string) => {
    try {
      await invoke("update_po_section", {
        payload: { id: sectionId, section_name: name },
      });
    } catch (e) {
      console.error(e);
    }
  };

  const deleteSection = async (sectionId: string) => {
    const result = await Swal.fire({
      title: "Hapus Section?",
      text: "Semua item dalam section ini akan ikut terhapus.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonText: "Batal",
      confirmButtonText: "Ya, Hapus",
    });
    if (!result.isConfirmed) return;
    try {
      await invoke("delete_po_section", { sectionId });
      loadAll();
    } catch (e) {
      Swal.fire("Gagal", String(e), "error");
    }
  };

  const forwardToDelivery = async () => {
    const result = await Swal.fire({
      title: "Teruskan ke Surat Jalan?",
      text: "Status PO akan berubah menjadi ORDERED dan draft Surat Jalan akan dibuat.",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#2563eb",
      cancelButtonText: "Batal",
      confirmButtonText: "Ya, Teruskan",
    });
    if (!result.isConfirmed) return;
    try {
      await invoke("forward_po_to_delivery", { orderId });
      Swal.fire({
        title: "Berhasil!",
        text: "PO telah diteruskan ke Surat Jalan.",
        icon: "success",
        confirmButtonColor: "#2563eb",
        timer: 1500,
        timerProgressBar: true,
      });
      loadAll();
    } catch (e) {
      Swal.fire("Gagal", String(e), "error");
    }
  };

  const syncToDelivery = async () => {
    const result = await Swal.fire({
      title: "Update Surat Jalan?",
      text: "Data di SJ akan diperbarui sesuai dengan PO saat ini.",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#f59e0b",
      cancelButtonText: "Batal",
      confirmButtonText: "Ya, Update",
    });
    if (!result.isConfirmed) return;
    try {
      await invoke("sync_po_to_delivery", { orderId });
      Swal.fire("Berhasil!", "Surat Jalan telah di-update.", "success");
      loadAll();
    } catch (e) {
      Swal.fire("Gagal", String(e), "error");
    }
  };

  const deleteItem = async (itemId: string) => {
    try {
      await invoke("delete_order_item", { itemId });
      loadAll();
    } catch (e) {
      Swal.fire("Gagal", String(e), "error");
    }
  };

  const toggleCheck = async (itemId: string) => {
    try {
      await invoke("toggle_item_checklist", { itemId });
      loadAll();
    } catch (e) {
      console.error(e);
    }
  };

  if (loading || !detail)
    return (
      <div className="flex-1 flex items-center justify-center text-slate-400 bg-slate-50 font-semibold">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-extrabold uppercase tracking-widest">Memuat Detail PO...</p>
        </div>
      </div>
    );

  const statusColors: Record<string, string> = {
    draft: "bg-slate-100 text-slate-500 border-slate-200",
    ordered: "bg-blue-50 text-blue-600 border-blue-100",
    approved: "bg-emerald-50 text-emerald-600 border-emerald-100",
    done: "bg-slate-100 text-slate-400 border-slate-200",
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden print:h-auto print:overflow-visible bg-slate-50 text-slate-900">
      {/* Header */}
      <div className="px-8 py-4 border-b border-slate-200 bg-white flex items-center justify-between shadow-sm print:hidden">
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
                {detail.order.title || `PO ${detail.order.order_date}`}
              </h2>
              <span
                className={`text-[9px] font-extrabold px-2.5 py-1 rounded-lg uppercase tracking-widest border ${statusColors[detail.order.status] || statusColors.draft}`}
              >
                {detail.order.status}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-0.5">
              {detail.order.po_number && (
                <span className="text-[10px] font-bold text-slate-400 tracking-wide font-mono flex items-center gap-1">
                  <FileText size={10} /> {detail.order.po_number}
                </span>
              )}
              <span className="text-slate-300">•</span>
              <span className="text-[10px] text-blue-600 font-extrabold uppercase tracking-widest">
                {detail.order.item_count} ITEMS
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={addSection}
            className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-5 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 uppercase tracking-widest border border-slate-200 print:hidden"
          >
            <PlusCircle size={14} /> TAMBAH PO
          </button>
          <button
            onClick={() => window.print()}
            className="bg-slate-800 hover:bg-slate-900 text-white px-5 py-2 rounded-xl text-xs font-extrabold shadow-lg shadow-slate-500/20 transition-all flex items-center gap-2 uppercase tracking-widest active:scale-95 print:hidden"
          >
            <Printer size={14} /> PRINT
          </button>
          {detail.order.status === "draft" && (
            <button
              onClick={forwardToDelivery}
              className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl text-xs font-extrabold shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2 uppercase tracking-widest active:scale-95 print:hidden"
            >
              <Send size={14} /> TERUSKAN KE SJ
            </button>
          )}
          {(detail.order.status === "ordered" || detail.order.status === "done") && (
            <button
              onClick={syncToDelivery}
              className="bg-amber-500 hover:bg-amber-600 text-white px-5 py-2 rounded-xl text-xs font-extrabold shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2 uppercase tracking-widest active:scale-95 print:hidden"
            >
              <RefreshCw size={14} /> UPDATE SJ
            </button>
          )}
        </div>
      </div>

      {/* Printable Area (Hidden in UI, Shown on Print) */}
      <div className="hidden print:block bg-white text-black p-10">
        <div className="flex justify-between items-start mb-10 border-b-2 border-slate-900 pb-6">
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tighter text-slate-900">
              Purchase Order
            </h1>
            <div className="mt-2 space-y-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nomor Surat</p>
              <p className="text-lg font-mono font-bold text-slate-800">
                {detail.order.po_number || "Draft PO"}
              </p>
            </div>
          </div>
          <div className="text-right">
            <h2 className="text-xl font-black text-slate-900 uppercase">Zen Supplier</h2>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
              Supplier Bahan Masak & Operasional
            </p>
            <div className="mt-4 flex flex-col items-end gap-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Tanggal Order</span>
                <span className="text-sm font-bold">{detail.order.order_date}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Unit Dapur</span>
                <span className="text-sm font-bold uppercase">{detail.order.kitchen_name || "Internal"}</span>
              </div>
            </div>
          </div>
        </div>

        {detail.sections.map((section) => {
          const sectionItems = detail.items.filter((i) => i.po_section_id === section.id);
          if (sectionItems.length === 0) return null;
          return (
            <div key={section.id} className="mb-8 last:mb-0">
              <h3 className="text-sm font-black uppercase tracking-widest bg-slate-100 px-4 py-2 mb-4 border-l-4 border-slate-900">
                {section.section_name}
              </h3>
              <table className="w-full border-collapse border border-slate-200">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="border border-slate-200 px-4 py-2 text-left text-[10px] font-black uppercase w-12">No</th>
                    <th className="border border-slate-200 px-4 py-2 text-left text-[10px] font-black uppercase">Nama Produk</th>
                    <th className="border border-slate-200 px-4 py-2 text-right text-[10px] font-black uppercase w-16">Qty</th>
                    <th className="border border-slate-200 px-4 py-2 text-left text-[10px] font-black uppercase w-16">Satuan</th>
                    <th className="border border-slate-200 px-4 py-2 text-left text-[10px] font-black uppercase">PO/Supplier</th>
                    <th className="border border-slate-200 px-4 py-2 text-left text-[10px] font-black uppercase">Catatan</th>
                    <th className="border border-slate-200 px-4 py-2 text-center text-[10px] font-black uppercase w-10">✓</th>
                  </tr>
                </thead>
                <tbody>
                  {sectionItems.map((item, idx) => {
                    const itemSupplier = suppliers.find(s => s.id === item.supplier_id);
                    const isExternal = itemSupplier && !itemSupplier.is_internal;
                    return (
                      <tr key={item.id} className={`border-b border-slate-100 print:break-inside-avoid ${isExternal ? "bg-amber-50" : ""}`}>
                        <td className="border border-slate-200 px-4 py-2 text-xs text-center">{idx + 1}</td>
                        <td className="border border-slate-200 px-4 py-2 text-xs uppercase">
                          {item.product_name}
                          {isExternal && (
                            <span className="ml-2 text-[8px] border border-slate-900 px-1">EXT</span>
                          )}
                        </td>
                        <td className="border border-slate-200 px-4 py-2 text-xs text-right">{item.quantity}</td>
                        <td className="border border-slate-200 px-4 py-2 text-xs text-center uppercase">{item.unit}</td>
                        <td className="border border-slate-200 px-4 py-2 text-[10px] uppercase">{item.supplier_name || "-"}</td>
                        <td className="border border-slate-200 px-4 py-2 text-[10px] text-slate-500 italic">{item.notes || " "}</td>
                        <td className="border border-slate-200 px-4 py-2 text-center">
                          <div className="w-4 h-4 border border-slate-400 mx-auto"></div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })}

        <div className="mt-12 text-[9px] text-slate-400 italic text-center border-t border-slate-100 pt-4">
          Dokumen ini digenerate secara otomatis oleh sistem Zen Supplier Management pada {new Date().toLocaleString('id-ID')}.
        </div>

      </div>

      {/* Sections */}
      <div className="flex-1 overflow-y-auto p-8 print:hidden">
        <div className="max-w-7xl mx-auto space-y-8">
          {detail.sections.length === 0 && (
            <div className="text-center py-24 bg-white rounded-3xl border-2 border-dashed border-slate-200">
              <ShoppingCart size={48} className="mx-auto text-slate-200 mb-4" />
              <p className="text-sm font-extrabold text-slate-400 uppercase tracking-widest">
                Tidak ada section PO
              </p>
              <p className="text-xs text-slate-300 mt-2">
                Klik "Tambah PO" untuk menambahkan section.
              </p>
            </div>
          )}

          {detail.sections.map((section) => (
            <SectionCard
              key={section.id}
              section={section}
              items={detail.items.filter(
                (i) => i.po_section_id === section.id,
              )}
              products={products}
              suppliers={suppliers}
              kitchenId={detail.order.kitchen_id || ""}
              orderId={orderId}
              onUpdateName={updateSectionName}
              onDeleteSection={deleteSection}
              onDeleteItem={deleteItem}
              onToggleCheck={toggleCheck}
              onReload={loadAll}
            />
          ))}

          {/* Unsectioned items (legacy/backward compat) */}
          {detail.items.filter((i) => !i.po_section_id).length > 0 && (
            <SectionCard
              section={{
                id: "__unsectioned__",
                daily_order_id: orderId,
                section_name: "Tanpa Section",
                sort_order: 999,
              }}
              items={detail.items.filter((i) => !i.po_section_id)}
              products={products}
              suppliers={suppliers}
              kitchenId={detail.order.kitchen_id || ""}
              orderId={orderId}
              onUpdateName={() => { }}
              onDeleteSection={() => { }}
              onDeleteItem={deleteItem}
              onToggleCheck={toggleCheck}
              onReload={loadAll}
              isLegacy
            />
          )}
        </div>
      </div>
    </div>
  );
};

// ═══ SECTION CARD COMPONENT ═══

interface SectionCardProps {
  section: PoSection;
  items: OrderItem[];
  products: Product[];
  suppliers: Supplier[];
  kitchenId: string;
  orderId: string;
  onUpdateName: (id: string, name: string) => void;
  onDeleteSection: (id: string) => void;
  onDeleteItem: (id: string) => void;
  onToggleCheck: (id: string) => void;
  onReload: () => void;
  isLegacy?: boolean;
}

const SectionCard: React.FC<SectionCardProps> = ({
  section,
  items,
  products,
  suppliers,
  kitchenId,
  orderId,
  onUpdateName,
  onDeleteSection,
  onDeleteItem,
  onToggleCheck,
  onReload,
  isLegacy,
}) => {
  const [sectionName, setSectionName] = useState(section.section_name);
  const [isEditingName, setIsEditingName] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
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
    return products
      .filter(
        (p) =>
          p.name.toLowerCase().includes(l) ||
          (p.neto && p.neto.toLowerCase().includes(l)) ||
          (p.base_unit && p.base_unit.toLowerCase().includes(l)),
      )
      .slice(0, 6);
  }, [searchTerm, products]);

  const handleSaveName = () => {
    if (sectionName.trim()) {
      onUpdateName(section.id, sectionName.trim());
    }
    setIsEditingName(false);
  };

  const addItemFromCatalog = async (product: Product) => {
    try {
      const supplier = suppliers.find(s => s.id === product.supplier_id);
      await invoke("add_order_item", {
        payload: {
          daily_order_id: orderId,
          kitchen_id: kitchenId,
          product_id: product.id,
          product_name: product.neto ? `${product.name} @${product.neto}` : product.name,
          quantity: 1,
          unit: product.base_unit,
          unit_id: null,
          category: "internal",
          supplier_id: product.supplier_id || null,
          supplier_name: supplier?.name || null,
          notes: null,
          buy_price: product.latest_buy_price || null,
          sell_price: product.latest_sell_price || null,
          po_section_id: section.id === "__unsectioned__" ? null : section.id,
          is_new_product: false,
        },
      });
      setSearchTerm("");
      setShowDropdown(false);
      onReload();
    } catch (e) {
      Swal.fire("Gagal", String(e), "error");
    }
  };

  const addNewItem = async () => {
    if (!searchTerm.trim()) return;
    try {
      await invoke("add_order_item", {
        payload: {
          daily_order_id: orderId,
          kitchen_id: kitchenId,
          product_id: null,
          product_name: searchTerm.trim(),
          quantity: 1,
          unit: "KG",
          unit_id: null,
          category: "internal",
          supplier_id: null,
          supplier_name: null,
          notes: null,
          buy_price: null,
          sell_price: null,
          po_section_id: section.id === "__unsectioned__" ? null : section.id,
          is_new_product: true,
        },
      });
      setSearchTerm("");
      setShowDropdown(false);
      onReload();
    } catch (e) {
      Swal.fire("Gagal", String(e), "error");
    }
  };

  return (
    <section className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-visible">
      {/* Section Header */}
      <div className="px-8 py-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-blue-100 text-blue-600 rounded-lg">
            <FileText size={16} />
          </div>
          {isEditingName && !isLegacy ? (
            <input
              className="py-1 px-3 bg-white border border-blue-300 rounded-xl outline-none font-extrabold text-slate-800 text-sm focus:ring-2 focus:ring-blue-500/20"
              value={sectionName}
              onChange={(e) => setSectionName(e.target.value)}
              onBlur={handleSaveName}
              onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
              autoFocus
            />
          ) : (
            <button
              onClick={() => !isLegacy && setIsEditingName(true)}
              className="flex items-center gap-2 group"
            >
              <h3 className="font-extrabold text-slate-800 text-sm uppercase tracking-tight">
                {sectionName}
              </h3>
              {!isLegacy && (
                <Pencil
                  size={12}
                  className="text-slate-300 group-hover:text-blue-500 transition-colors"
                />
              )}
            </button>
          )}
          <span className="text-[9px] font-extrabold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md uppercase tracking-widest">
            {items.length} item
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative" ref={searchRef}>
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
              <input
                type="text"
                placeholder="Cari produk..."
                className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition w-64 font-semibold"
                value={searchTerm}
                onChange={(e) => {
                  const formatted = e.target.value.replace(
                    /\w\S*/g,
                    (txt) => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase()
                  );
                  setSearchTerm(formatted);
                  setShowDropdown(true);
                }}
                onFocus={() => searchTerm && setShowDropdown(true)}
              />
            </div>

            {showDropdown && searchTerm && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden max-h-80 overflow-y-auto">
                {filteredProducts.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => addItemFromCatalog(p)}
                    className="flex items-center justify-between px-5 py-3 hover:bg-blue-50 cursor-pointer border-b border-slate-50 last:border-0 group transition-colors"
                  >
                    <div>
                      <p className="font-semibold text-slate-800 text-sm group-hover:text-blue-700 transition-colors">
                        {p.name} {p.neto ? <span className="text-blue-600 opacity-80">@{p.neto}</span> : ""}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {p.base_unit} • {p.category || "Umum"}
                      </p>
                    </div>
                    <span className="flex items-center gap-1 text-xs font-semibold text-slate-400 group-hover:text-blue-600 bg-slate-100 group-hover:bg-blue-100 rounded-lg px-2.5 py-1 transition-all">
                      <Plus size={11} /> Tambah
                    </span>
                  </div>
                ))}

                {/* Add New Product Option */}
                {!filteredProducts.some(
                  (p) => p.name.toLowerCase() === searchTerm.toLowerCase()
                ) && (
                    <div
                      onClick={addNewItem}
                      className="flex items-center justify-between px-5 py-3 hover:bg-amber-50 cursor-pointer border-t border-slate-100 group transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Sparkles size={14} className="text-amber-500" />
                        <div>
                          <p className="font-semibold text-slate-700 text-sm group-hover:text-amber-700 transition-colors">
                            Tambah "{searchTerm}" sebagai item baru
                          </p>
                          <p className="text-[10px] text-amber-500 mt-0.5">
                            Produk baru — akan ditandai untuk ditambahkan ke katalog
                          </p>
                        </div>
                      </div>
                      <span className="flex items-center gap-1 text-xs font-semibold text-amber-500 bg-amber-50 rounded-lg px-2.5 py-1">
                        <PlusCircle size={11} /> Baru
                      </span>
                    </div>
                  )}

                {filteredProducts.length === 0 && (
                  <div className="px-5 py-3 text-center text-xs text-slate-400">
                    Tidak ditemukan di katalog.
                  </div>
                )}
              </div>
            )}
          </div>

          {!isLegacy && (
            <button
              onClick={() => onDeleteSection(section.id)}
              className="p-2 hover:bg-red-50 rounded-xl text-slate-300 hover:text-red-500 transition-all"
              title="Hapus section"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Items Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50/50 border-b border-slate-100">
            <tr>
              <th className="w-14 text-center px-4 py-3 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                ✓
              </th>
              <th className="px-4 py-3 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                Nama Produk
              </th>
              <th className="px-4 py-3 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest text-right w-28">
                Qty
              </th>
              <th className="px-4 py-3 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest w-24">
                Satuan
              </th>
              <th className="px-4 py-3 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                PO (Supplier)
              </th>
              <th className="px-4 py-3 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                Catatan
              </th>
              <th className="text-center w-16 px-4 py-3 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                Opsi
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                products={products}
                suppliers={suppliers}
                onToggleCheck={onToggleCheck}
                onDeleteItem={onDeleteItem}
                onReload={onReload}
              />
            ))}
            {items.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="text-center py-16 text-slate-400 bg-slate-50/20"
                >
                  <div className="flex flex-col items-center gap-2">
                    <ShoppingCart size={32} className="opacity-10 text-slate-900" />
                    <p className="text-xs font-semibold opacity-40">
                      Belum ada item. Gunakan kolom pencarian di atas.
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};

// ═══ ITEM ROW COMPONENT ═══

interface ItemRowProps {
  item: OrderItem;
  products: Product[];
  suppliers: Supplier[];
  onToggleCheck: (id: string) => void;
  onDeleteItem: (id: string) => void;
  onReload: () => void;
}

const ItemRow: React.FC<ItemRowProps> = ({
  item,
  products,
  suppliers,
  onToggleCheck,
  onDeleteItem,
  onReload,
}) => {
  const [qty, setQty] = useState(item.quantity);
  const [unit, setUnit] = useState(item.unit);
  const [notes, setNotes] = useState(item.notes || "");
  const [supplierId, setSupplierId] = useState(item.supplier_id || "");
  const [isDirty, setIsDirty] = useState(false);

  const product = products.find((p) => p.id === item.product_id);
  const availableUnits = product
    ? product.units.map((u) => u.unit_name)
    : [item.unit];

  const currentSupplier = suppliers.find((s) => s.id === supplierId);
  const isExternal = currentSupplier && !currentSupplier.is_internal;

  const saveChanges = async () => {
    if (!isDirty) return;
    try {
      await invoke("update_order_item", {
        payload: {
          id: item.id,
          product_name: item.product_name,
          quantity: qty,
          unit: unit,
          category: item.category,
          supplier_id: supplierId || null,
          supplier_name: suppliers.find(s => s.id === supplierId)?.name || null,
          notes: notes || null,
          buy_price: item.buy_price || null,
          sell_price: item.sell_price || null,
        },
      });
      setIsDirty(false);
      onReload();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <tr
      className={`${item.is_checked ? "opacity-40" : ""} ${isExternal ? "bg-amber-50" : "hover:bg-slate-50/50"} transition-all group border-l-4 ${isExternal ? "border-amber-400" : "border-transparent"}`}
    >
      <td className="text-center px-4 py-3">
        <div
          onClick={() => onToggleCheck(item.id)}
          className={`mx-auto w-6 h-6 rounded-lg border-2 flex items-center justify-center cursor-pointer transition-all ${item.is_checked ? "bg-blue-600 border-blue-600 text-white" : "border-slate-300 hover:border-blue-400 bg-white"}`}
        >
          {item.is_checked && <Check size={14} strokeWidth={4} />}
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span
            className={`font-extrabold text-sm ${item.is_checked ? "line-through text-slate-400" : "text-slate-800"}`}
          >
            {item.product_name}
          </span>
          {isExternal && (
            <span className="text-[8px] font-extrabold text-white bg-amber-500 px-1.5 py-0.5 rounded uppercase tracking-wider flex items-center gap-1 shadow-sm">
              <Sparkles size={8} /> EXT
            </span>
          )}
          {item.is_new_product && (
            <span className="text-[8px] font-extrabold text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded uppercase tracking-wider">
              BARU
            </span>
          )}
        </div>
      </td>
      <td className="px-4 py-3 text-right">
        <input
          type="number"
          className="w-20 text-right p-1.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-500 font-extrabold text-slate-700 text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          value={qty}
          min={0.1}
          step={0.1}
          onWheel={(e) => (e.target as HTMLInputElement).blur()}
          onChange={(e) => {
            setQty(Number(e.target.value));
            setIsDirty(true);
          }}
          onBlur={saveChanges}
        />
      </td>
      <td className="px-4 py-3">
        {product && product.units.length > 0 ? (
          <select
            className="w-20 p-1.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-500 font-semibold text-slate-600 text-xs uppercase appearance-none cursor-pointer"
            value={unit}
            onChange={(e) => {
              setUnit(e.target.value.toUpperCase());
              setIsDirty(true);
            }}
            onBlur={saveChanges}
          >
            {availableUnits.map((u, idx) => (
              <option key={idx} value={u.toUpperCase()}>
                {u.toUpperCase()}
              </option>
            ))}
          </select>
        ) : (
          <input
            className="w-20 p-1.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-500 font-semibold text-slate-600 text-xs uppercase"
            value={unit}
            onChange={(e) => {
              setUnit(e.target.value.toUpperCase());
              setIsDirty(true);
            }}
            onBlur={saveChanges}
          />
        )}
      </td>
      <td className="px-4 py-3">
        <select
          className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-500 font-semibold text-slate-600 text-[10px] uppercase appearance-none cursor-pointer"
          value={supplierId}
          onChange={(e) => {
            setSupplierId(e.target.value);
            setIsDirty(true);
          }}
          onBlur={saveChanges}
        >
          <option value="">-- Tanpa Supplier --</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.code})
            </option>
          ))}
        </select>
      </td>
      <td className="px-4 py-3">
        <input
          className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-blue-500 font-medium text-slate-500 text-xs placeholder:text-slate-300"
          value={notes}
          placeholder="Catatan..."
          onChange={(e) => {
            setNotes(e.target.value);
            setIsDirty(true);
          }}
          onBlur={saveChanges}
        />
      </td>
      <td className="px-4 py-3 text-center">
        <div className="flex items-center justify-center gap-1">
          {isDirty && (
            <button
              onClick={saveChanges}
              className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-500 transition-colors"
            >
              <Save size={13} />
            </button>
          )}
          <button
            onClick={() => onDeleteItem(item.id)}
            className="p-1.5 hover:bg-red-50 rounded-lg text-slate-300 hover:text-red-500 transition-colors"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </td>
    </tr>
  );
};
