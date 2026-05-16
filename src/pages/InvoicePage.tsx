import React, { useState, useEffect, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  Receipt,
  Eye,
  Printer,
  FileText,
  Search,
  X,
  CheckCircle2,
  Trash2,
  Plus,
} from "lucide-react";
import { formatIndonesianDate } from "../utils/formatters";
import type { Invoice, InvoiceDetail, Product, ProductUnit } from "../types";
import Swal from "sweetalert2";
import { CurrencyInput } from "../components/CurrencyInput";
import agsLogo from "../assets/AGS.png";
import appLogo from "../assets/app-icon.png";

export const InvoicePage: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceDetail | null>(
    null,
  );
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    loadInvoices();
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const data = await invoke<Product[]>("get_products");
      setProducts(data);
    } catch (e) {
      console.error(e);
    }
  };

  const loadInvoices = async () => {
    try {
      const data = await invoke<Invoice[]>("get_invoices", {
        dailyOrderId: null,
      });
      setInvoices(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const viewDetail = async (id: string) => {
    try {
      const detail = await invoke<InvoiceDetail>("get_invoice_detail", {
        invoiceId: id,
      });
      setSelectedInvoice(detail);
    } catch (e) {
      Swal.fire("Gagal", String(e), "error");
    }
  };

  const finalize = async (id: string) => {
    const result = await Swal.fire({
      title: "Finalisasi Invoice?",
      text: "Harga jual akan di-update ke katalog produk.",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#10b981",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Ya, Finalisasi",
      cancelButtonText: "Batal",
    });

    if (!result.isConfirmed) return;
    try {
      await invoke("finalize_invoice", { invoiceId: id });
      loadInvoices();
      if (selectedInvoice?.invoice.id === id) viewDetail(id);
    } catch (e) {
      Swal.fire("Gagal", String(e), "error");
    }
  };

  const updateItem = async (
    itemId: string,
    quantity: number,
    unitPrice: number,
    buyPrice: number | null,
  ) => {
    try {
      await invoke("update_invoice_item", {
        itemId,
        quantity,
        unitPrice,
        buyPrice,
      });
      if (selectedInvoice) viewDetail(selectedInvoice.invoice.id);
      loadInvoices();
    } catch (e) {
      Swal.fire("Gagal", String(e), "error");
    }
  };

  const deleteItem = async (itemId: string) => {
    const result = await Swal.fire({
      title: "Hapus Item?",
      text: "Apakah Anda yakin ingin menghapus item ini dari invoice?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Ya, Hapus",
      cancelButtonText: "Batal",
    });

    if (!result.isConfirmed) return;
    try {
      await invoke("delete_invoice_item", { itemId });
      if (selectedInvoice) viewDetail(selectedInvoice.invoice.id);
      loadInvoices();
    } catch (e) {
      Swal.fire("Gagal", String(e), "error");
    }
  };

  const [showAddItem, setShowAddItem] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<ProductUnit | null>(null);
  const [addQty, setAddQty] = useState(1);
  const [addPrice, setAddPrice] = useState<number | "">(0);

  const filteredProducts = products
    .filter((p) => p.name.toLowerCase().includes(productSearch.toLowerCase()))
    .slice(0, 5);

  const handleAddProduct = async () => {
    if (!selectedInvoice || !selectedProduct || !selectedUnit) return;
    try {
      await invoke("add_manual_invoice_item", {
        invoiceId: selectedInvoice.invoice.id,
        productName: selectedProduct.name,
        quantity: addQty,
        unit: selectedUnit.unit_name,
        unitPrice: typeof addPrice === "number" ? addPrice : 0,
        productId: selectedProduct.id,
        unitId: selectedUnit.id,
      });
      viewDetail(selectedInvoice.invoice.id);
      loadInvoices();
      setShowAddItem(false);
      resetAddForm();
    } catch (e) {
      Swal.fire("Gagal", String(e), "error");
    }
  };

  const resetAddForm = () => {
    setSelectedProduct(null);
    setSelectedUnit(null);
    setAddQty(1);
    setAddPrice(0);
    setProductSearch("");
  };

  const selectProduct = (p: Product) => {
    setSelectedProduct(p);
    const firstUnit = p.units[0];
    setSelectedUnit(firstUnit);
    setAddPrice(firstUnit?.latest_sell_price ?? p.latest_sell_price ?? 0);
  };

  const filteredInvoices = invoices.filter(
    (inv) =>
      inv.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
      (inv.kitchen_name || "").toLowerCase().includes(search.toLowerCase()),
  );

  const groupedInvoices = useMemo(() => {
    const groups: Record<string, Invoice[]> = {};
    filteredInvoices.forEach((inv) => {
      const key = inv.daily_order_id || `${inv.kitchen_id}-${inv.invoice_date}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(inv);
    });
    return Object.values(groups).sort((a, b) =>
      b[0].invoice_date.localeCompare(a[0].invoice_date),
    );
  }, [filteredInvoices]);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50 text-slate-900 font-sans">
      {/* Header */}
      <div className="px-8 py-6 border-b border-slate-200 bg-white flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-50 rounded-xl border border-amber-100 shadow-sm">
            <Receipt size={20} className="text-amber-600" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">
              Billing & Invoices
            </h2>
            <p className="text-xs text-slate-500 font-medium tracking-wide">
              Kelola tagihan harian dan operasional ke dapur
            </p>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="px-8 py-4 bg-white/50 border-b border-slate-200 flex items-center justify-between">
        <div className="relative w-full max-w-md group">
          <Search
            size={16}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors"
          />
          <input
            className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl outline-none focus:border-blue-500 font-bold text-slate-700 text-sm shadow-sm transition-all"
            placeholder="Cari No. Invoice atau Dapur..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        {invoices.length === 0 && !loading && (
          <div className="text-center py-24 bg-white rounded-3xl border-2 border-dashed border-slate-200">
            <div className="w-20 h-20 mx-auto rounded-3xl bg-amber-50 flex items-center justify-center text-amber-600 mb-6 border border-amber-100">
              <FileText size={32} />
            </div>
            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">
              Belum Ada Invoice
            </h3>
            <p className="text-sm text-slate-500 mt-2 font-medium">
              Invoice akan dibuat secara otomatis berdasarkan data PO Harian.
            </p>
          </div>
        )}

        <div className="max-w-7xl mx-auto space-y-8">
          {groupedInvoices.map((group: Invoice[], idx: number) => (
            <div key={idx} className="space-y-4">
              <div className="flex items-center gap-3 px-2">
                <div className="w-1.5 h-6 bg-amber-500 rounded-full shadow-sm shadow-amber-200"></div>
                <div>
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-3">
                    {group[0].kitchen_name}
                    <span className="text-[10px] text-slate-400 font-bold bg-white border border-slate-100 px-2.5 py-1 rounded-lg shadow-sm">
                      {formatIndonesianDate(group[0].invoice_date)}
                    </span>
                  </h3>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {group.map((inv: Invoice) => (
                  <div
                    key={inv.id}
                    className="bg-white p-5 rounded-4xl border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-5">
                      <div
                        className={`w-14 h-14 rounded-2xl flex items-center justify-center border-2 shadow-inner transition-all duration-300 ${inv.invoice_type === "operational"
                          ? "bg-purple-50 text-purple-600 border-purple-100 group-hover:bg-purple-600 group-hover:text-white"
                          : inv.invoice_type === "rapelan"
                            ? "bg-indigo-50 text-indigo-600 border-indigo-100 group-hover:bg-indigo-600 group-hover:text-white"
                            : "bg-amber-50 text-amber-600 border-amber-100 group-hover:bg-amber-600 group-hover:text-white"
                          }`}
                      >
                        <Receipt size={24} strokeWidth={2.5} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-black text-slate-800 text-lg tracking-tight">
                            {inv.invoice_number}
                          </h4>
                        </div>
                        <div className="flex items-center gap-3 mt-1.5 text-[10px] font-bold uppercase tracking-widest">
                          <span
                            className={`${inv.invoice_type === "operational"
                              ? "text-purple-500"
                              : inv.invoice_type === "rapelan"
                                ? "text-indigo-600"
                                : "text-amber-600"
                              } bg-slate-50 px-2 py-0.5 rounded border border-slate-100`}
                          >
                            {inv.invoice_type === "operational"
                              ? "OPS"
                              : inv.invoice_type === "rapelan"
                                ? "RAPELAN"
                                : "BAHAN DAPUR"}
                          </span>
                          <span className="text-slate-200">•</span>
                          <span className="text-slate-400 font-medium">
                            {inv.item_count} ITEMS
                          </span>
                          <span className="text-slate-200">•</span>
                          <span className="text-emerald-600 font-black">
                            Rp {inv.total_amount.toLocaleString("id-ID")}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                      <button
                        onClick={() => viewDetail(inv.id)}
                        className="p-3 bg-slate-50 text-slate-400 hover:bg-blue-600 hover:text-white rounded-2xl transition-all border border-slate-100 shadow-sm"
                        title="Lihat Detail"
                      >
                        <Eye size={18} />
                      </button>
                      {inv.status !== "finalized" && (
                        <button
                          onClick={() => finalize(inv.id)}
                          className="p-3 bg-slate-50 text-slate-400 hover:bg-emerald-600 hover:text-white rounded-2xl transition-all border border-slate-100 shadow-sm"
                          title="Finalisasi"
                        >
                          <CheckCircle2 size={18} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Invoice Detail Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl no-print">
            <div className="px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="font-black text-slate-800 uppercase tracking-tight">
                  Invoice Detail Preview
                </h3>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  {selectedInvoice.invoice.invoice_number}
                </p>
              </div>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="p-2 hover:bg-slate-200 rounded-xl text-slate-400 transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 bg-slate-100/30">
              {showAddItem && (
                <div className="mb-8 bg-white border-2 border-emerald-100 rounded-2xl p-6 shadow-sm animate-in fade-in slide-in-from-top-4 duration-300">
                  <h4 className="text-sm font-black text-slate-800 uppercase mb-4 flex items-center gap-2">
                    <Plus size={16} className="text-emerald-500" />
                    Tambah Item dari Katalog
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="relative">
                      <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">
                        Cari Produk
                      </label>
                      <div className="relative">
                        <Search
                          size={14}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                        />
                        <input
                          className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 text-sm font-bold"
                          placeholder="Nama barang..."
                          value={productSearch}
                          onChange={(e) => {
                            setProductSearch(e.target.value);
                            setSelectedProduct(null);
                          }}
                        />
                      </div>

                      {!selectedProduct && productSearch.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
                          {filteredProducts.map((p) => (
                            <button
                              key={p.id}
                              onClick={() => selectProduct(p)}
                              className="w-full px-4 py-3 text-left hover:bg-slate-50 border-b border-slate-50 last:border-0 flex justify-between items-center group"
                            >
                              <div>
                                <div className="text-sm font-bold text-slate-700 group-hover:text-emerald-600 transition-colors">
                                  {p.name} {p.neto ? "@" + p.neto : " "}
                                </div>
                                <div className="text-[10px] text-slate-400 uppercase font-bold">
                                  {p.category} • {p.base_unit}
                                </div>
                              </div>
                              <Plus
                                size={14}
                                className="text-slate-300 group-hover:text-emerald-500"
                              />
                            </button>
                          ))}
                          {filteredProducts.length === 0 && (
                            <div className="px-4 py-3 text-sm text-slate-400 italic">
                              Produk tidak ditemukan
                            </div>
                          )}
                        </div>
                      )}

                      {selectedProduct && (
                        <div className="mt-3 p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-between">
                          <div>
                            <div className="text-sm font-black text-emerald-900">
                              {selectedProduct.name}{" "}
                              {selectedProduct.neto
                                ? "@" + selectedProduct.neto
                                : ""}
                            </div>
                            <div className="text-[10px] font-bold text-emerald-600 uppercase">
                              {selectedProduct.base_unit}
                            </div>
                          </div>
                          <button
                            onClick={() => setSelectedProduct(null)}
                            className="p-1 hover:bg-emerald-200 rounded text-emerald-600"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">
                          Satuan
                        </label>
                        <select
                          className="w-full px-2 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 text-sm font-bold"
                          value={selectedUnit?.id || ""}
                          onChange={(e) => {
                            const unit =
                              selectedProduct?.units.find(
                                (u: ProductUnit) => u.id === e.target.value,
                              ) || null;
                            setSelectedUnit(unit);
                            if (unit) {
                              setAddPrice(
                                unit.latest_sell_price ??
                                selectedProduct?.latest_sell_price ??
                                0,
                              );
                            }
                          }}
                          disabled={!selectedProduct}
                        >
                          {selectedProduct?.units.map((u: ProductUnit) => (
                            <option key={u.id} value={u.id}>
                              {u.unit_name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">
                          Qty
                        </label>
                        <input
                          type="number"
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 text-sm font-bold"
                          value={addQty}
                          onChange={(e) =>
                            setAddQty(parseFloat(e.target.value))
                          }
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">
                          Harga
                        </label>
                        <CurrencyInput
                          value={addPrice}
                          onChange={(val) => setAddPrice(val)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 text-sm font-bold"
                          placeholder="0"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end gap-3">
                    <button
                      onClick={() => setShowAddItem(false)}
                      className="px-6 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-800"
                    >
                      Batal
                    </button>
                    <button
                      onClick={handleAddProduct}
                      disabled={!selectedProduct}
                      className="bg-emerald-600 text-white px-8 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-200 disabled:opacity-50 disabled:shadow-none hover:bg-emerald-700 active:scale-95 transition-all"
                    >
                      Konfirmasi Tambah
                    </button>
                  </div>
                </div>
              )}

              <div className="bg-white border border-slate-200 p-12 rounded-xl shadow-sm text-black font-mono">
                <div className="text-center mb-10 border-b-2 border-black pb-6">
                  <h1 className="text-3xl font-black tracking-tighter">
                    ZEN SUPPLIER
                  </h1>
                  <p className="text-[10px] uppercase font-bold tracking-[0.3em] text-gray-500 mt-1">
                    Daily Kitchen Supply Billing
                  </p>
                  <div className="mt-6 bg-black text-white inline-block px-6 py-1.5 text-sm font-black uppercase tracking-widest">
                    {selectedInvoice.invoice.invoice_type === "daily"
                      ? "INVOICE HARIAN"
                      : selectedInvoice.invoice.invoice_type === "rapelan"
                        ? "INVOICE RAPELAN"
                        : "INVOICE OPERASIONAL"}
                  </div>
                  <p className="text-sm font-black mt-3">
                    NO: {selectedInvoice.invoice.invoice_number}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-10 text-xs mb-10">
                  <div>
                    <p className="text-gray-400 font-black text-[9px] uppercase mb-2">
                      DITAGIHKAN KEPADA:
                    </p>
                    <p className="font-black text-lg uppercase tracking-tight">
                      {selectedInvoice.invoice.kitchen_name}
                    </p>
                    <p className="text-gray-500 mt-1">Dapur Area / SPPG MBG</p>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-400 font-black text-[9px] uppercase mb-2">
                      TANGGAL CETAK:
                    </p>
                    <p className="font-black text-lg">
                      {formatIndonesianDate(
                        selectedInvoice.invoice.invoice_date,
                      )}
                    </p>
                    <p
                      className={`text-[10px] font-black mt-2 inline-block px-2 py-1 rounded ${selectedInvoice.invoice.status === "finalized" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}
                    >
                      {selectedInvoice.invoice.status.toUpperCase()}
                    </p>
                  </div>
                </div>

                <table className="w-full border-collapse border border-black text-[11px]">
                  <thead>
                    <tr className="bg-gray-50 uppercase font-black">
                      <th className="border border-black px-2 py-3 w-10 text-center">
                        #
                      </th>
                      <th className="border border-black px-2 py-3 text-center w-24">
                        TANGGAL
                      </th>
                      <th className="border border-black px-4 py-3 text-left">
                        DESKRIPSI BARANG
                      </th>
                      <th className="border border-black px-4 py-3 w-16 text-right">
                        QTY
                      </th>
                      <th className="border border-black px-4 py-3 w-24 text-right no-print">
                        HARGA MODAL
                      </th>
                      <th className="border border-black px-4 py-3 w-24 text-right">
                        HARGA DAPUR
                      </th>
                      <th className="border border-black px-4 py-3 w-28 text-right">
                        SUBTOTAL
                      </th>
                      {selectedInvoice.invoice.status === "draft" && (
                        <th className="border border-black px-4 py-3 w-10 text-center no-print"></th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {selectedInvoice.items.map((item, i) => (
                      <tr
                        key={item.id}
                        className={`border-b border-gray-200 ${item.has_margin_warning ? "bg-red-50/50" : ""}`}
                      >
                        <td className="border-x border-black px-2 py-3 text-center text-gray-400 font-bold">
                          {i + 1}
                        </td>
                        <td className="border-x border-black px-2 py-3 text-center text-[9px] font-bold">
                          {item.day_name && (
                            <div>{item.day_name.toUpperCase()}</div>
                          )}
                          <div className="text-gray-400">{item.item_date}</div>
                        </td>
                        <td className="border-x border-black px-4 py-3 font-black">
                          {item.product_name}
                          {item.has_margin_warning && (
                            <span className="ml-2 text-[9px] bg-red-600 text-white px-1 rounded">
                              LOW MARGIN
                            </span>
                          )}
                        </td>
                        <td className="border-x border-black px-4 py-3 text-right font-black">
                          {selectedInvoice.invoice.status === "draft" ? (
                            <div className="flex items-center justify-end gap-1">
                              <input
                                type="number"
                                className="w-12 text-right bg-transparent outline-none border-b border-dashed border-slate-300 focus:border-blue-500 font-black"
                                defaultValue={item.quantity}
                                onBlur={(e) =>
                                  updateItem(
                                    item.id,
                                    parseFloat(e.target.value),
                                    item.unit_price,
                                    item.buy_price ?? null,
                                  )
                                }
                              />
                              <span className="text-[10px] font-black text-slate-400 uppercase">
                                {item.unit}
                              </span>
                            </div>
                          ) : (
                            <>
                              {item.quantity}{" "}
                              <span className="text-[10px] font-black text-slate-400 uppercase ml-1">
                                {item.unit}
                              </span>
                            </>
                          )}
                        </td>
                        <td className="border-x border-black px-4 py-3 text-right font-bold no-print">
                          {selectedInvoice.invoice.status === "draft" ? (
                            <CurrencyInput
                              value={item.buy_price ?? 0}
                              onChange={(val) => {
                                const newItems = selectedInvoice.items.map(
                                  (i) =>
                                    i.id === item.id
                                      ? {
                                        ...i,
                                        buy_price: val === "" ? 0 : val,
                                      }
                                      : i,
                                );
                                setSelectedInvoice({
                                  ...selectedInvoice,
                                  items: newItems,
                                });
                              }}
                              onBlur={() =>
                                updateItem(
                                  item.id,
                                  item.quantity,
                                  item.unit_price,
                                  item.buy_price ?? null,
                                )
                              }
                              prefix=""
                              className="w-full text-right bg-transparent outline-none border-b border-dashed border-slate-300 focus:border-emerald-500 text-emerald-700 px-0!"
                            />
                          ) : item.buy_price ? (
                            item.buy_price.toLocaleString("id-ID")
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="border-x border-black px-4 py-3 text-right font-bold">
                          {selectedInvoice.invoice.status === "draft" ? (
                            <CurrencyInput
                              value={item.unit_price}
                              onChange={(val) => {
                                const newItems = selectedInvoice.items.map(
                                  (i) =>
                                    i.id === item.id
                                      ? {
                                        ...i,
                                        unit_price: val === "" ? 0 : val,
                                      }
                                      : i,
                                );
                                setSelectedInvoice({
                                  ...selectedInvoice,
                                  items: newItems,
                                });
                              }}
                              onBlur={() =>
                                updateItem(
                                  item.id,
                                  item.quantity,
                                  item.unit_price,
                                  item.buy_price ?? null,
                                )
                              }
                              prefix=""
                              className="w-full text-right bg-transparent outline-none border-b border-dashed border-slate-300 focus:border-blue-500 px-0!"
                            />
                          ) : (
                            item.unit_price.toLocaleString("id-ID")
                          )}
                        </td>
                        <td className="border-x border-black px-4 py-3 text-right font-black">
                          Rp {item.subtotal.toLocaleString("id-ID")}
                        </td>
                        {selectedInvoice.invoice.status === "draft" && (
                          <td className="border-x border-black px-2 py-3 text-center no-print">
                            <button
                              onClick={() => deleteItem(item.id)}
                              className="text-red-400 hover:text-red-600 transition-colors"
                            >
                              <Trash2 size={12} />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                    {/* Empty padding rows */}
                    {[
                      ...Array(Math.max(0, 3 - selectedInvoice.items.length)),
                    ].map((_, i) => (
                      <tr key={i} className="border-b border-gray-100 h-10">
                        <td className="border-x border-black px-2"></td>
                        <td className="border-x border-black px-2"></td>
                        <td className="border-x border-black px-4"></td>
                        <td className="border-x border-black px-4"></td>
                        <td className="border-x border-black px-4 no-print"></td>
                        <td className="border-x border-black px-4"></td>
                        <td className="border-x border-black px-4"></td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-100 font-black text-sm">
                      <td
                        colSpan={6}
                        className="border border-black px-6 py-4 text-right tracking-widest print:hidden"
                      >
                        TOTAL TAGIHAN
                      </td>
                      <td
                        colSpan={5}
                        className="border border-black px-6 py-4 text-right tracking-widest hidden print:table-cell"
                      >
                        TOTAL TAGIHAN
                      </td>
                      <td className="border border-black px-6 py-4 text-right">
                        Rp{" "}
                        {selectedInvoice.invoice.total_amount.toLocaleString(
                          "id-ID",
                        )}
                      </td>
                    </tr>
                  </tfoot>
                </table>

                <div className="mt-8 grid grid-cols-2 gap-10">
                  <div className="text-[10px] text-gray-500 italic leading-relaxed">
                    <p className="font-bold text-black uppercase mb-1">
                      Catatan Pembayaran:
                    </p>
                    <p>
                      1. Pembayaran ditransfer ke rekening operasional ZEN
                      SUPPLIER.
                    </p>
                    <p>2. Harap lampirkan bukti transfer saat konfirmasi.</p>
                    <p>3. Invoice ini sah sebagai bukti tagihan operasional.</p>
                  </div>
                  <div className="text-center text-[10px] font-black uppercase flex flex-col justify-end h-32">
                    <p className="mb-16 italic text-gray-400">AUTHORIZED BY,</p>
                    <div className="w-40 h-px bg-black mx-auto"></div>
                    <p className="mt-2">FINANCE DEPARTMENT</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-8 py-6 border-t border-slate-100 flex justify-between items-center bg-slate-50/50 no-print">
              <div>
                {selectedInvoice.invoice.status === "draft" && (
                  <button
                    onClick={() => setShowAddItem(!showAddItem)}
                    className="bg-emerald-50 text-emerald-600 px-6 py-2.5 rounded-xl font-black text-[10px] shadow-sm hover:bg-emerald-600 hover:text-white transition-all flex items-center gap-2 uppercase tracking-widest"
                  >
                    <Plus size={14} />{" "}
                    {showAddItem ? "Batal Tambah" : "Tambah Item Catalog"}
                  </button>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setSelectedInvoice(null)}
                  className="px-6 py-2 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:text-slate-800 transition-all"
                >
                  Tutup
                </button>
                <button
                  onClick={() => window.print()}
                  className="bg-amber-600 text-white px-8 py-3 rounded-2xl font-black text-xs shadow-lg shadow-amber-500/30 hover:bg-amber-700 active:scale-95 transition-all flex items-center gap-2 uppercase tracking-widest"
                >
                  <Printer size={14} /> Print Invoice
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hidden Print Container */}
      <div className="hidden print:block fixed inset-0 bg-white z-9999">
        {selectedInvoice && (
          <div className="p-8 text-black font-mono">
            {/* ═══ UNIFIED PRINT LAYOUT ═══ */}
            {(() => {
              const isOps = selectedInvoice.invoice.invoice_type === "operational";
              const logo = isOps ? agsLogo : appLogo;
              const companyName = isOps ? "ALFARIZI GROUP SUPPLAY" : "ZEN SUPPLIER";
              const tagline = isOps ? "Professional Kitchen & Food Solutions" : "Daily Kitchen Supply Billing";
              const typeLabel = isOps
                ? "INVOICE OPERASIONAL"
                : selectedInvoice.invoice.invoice_type === "daily"
                  ? "INVOICE HARIAN"
                  : "INVOICE RAPELAN";

              return (
                <div className="space-y-6">
                  {/* Header */}
                  <div className="flex justify-between items-start border-b-2 border-black pb-4">
                    <div className="flex gap-6 items-center">
                      <img src={logo} alt="Logo" className="w-24 h-24 object-contain" />
                      <div>
                        <h1 className="text-2xl font-black tracking-tighter uppercase">{companyName}</h1>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">{tagline}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="bg-black text-white px-4 py-1 text-xs font-black uppercase tracking-widest mb-2 inline-block">
                        {typeLabel}
                      </div>
                      <p className="text-sm font-black uppercase">NO: {selectedInvoice.invoice.invoice_number}</p>
                      <p className="text-xs font-bold uppercase">{selectedInvoice.invoice.kitchen_name}</p>
                    </div>
                  </div>

                  {/* Information Grid */}
                  <div className="grid grid-cols-2 gap-8 text-[11px] leading-relaxed border-b border-black pb-4">
                    <div className="space-y-1">
                      <div className="grid grid-cols-[80px_1fr] gap-1">
                        <span className="font-bold">PIC</span>
                        <span>: Alfarizi</span>
                      </div>
                      <div className="grid grid-cols-[80px_1fr] gap-1">
                        <span className="font-bold">Alamat</span>
                        <span>: Jl. Sedahromo Lor, RT 02/RW 07. Kartasura, Sukoharjo Jawa Tengah</span>
                      </div>
                      <div className="grid grid-cols-[80px_1fr] gap-1">
                        <span className="font-bold">No Hp</span>
                        <span>: 082137476281</span>
                      </div>
                      <div className="mt-4 pt-2 border-t border-dashed border-gray-300">
                        <div className="grid grid-cols-[80px_1fr] gap-1 font-black">
                          <span>Pengiriman</span>
                          <span>: {formatIndonesianDate(selectedInvoice.invoice.invoice_date)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="grid grid-cols-[80px_1fr] gap-1">
                        <span className="font-bold">Orderer</span>
                        <span>: {selectedInvoice.invoice.kitchen_pic_name || "-"}</span>
                      </div>
                      <div className="grid grid-cols-[80px_1fr] gap-1">
                        <span className="font-bold">Alamat</span>
                        <span>: {selectedInvoice.invoice.kitchen_address || "-"}</span>
                      </div>
                      <div className="grid grid-cols-[80px_1fr] gap-1">
                        <span className="font-bold">No Hp</span>
                        <span>: {selectedInvoice.invoice.kitchen_pic_phone || "-"}</span>
                      </div>
                      <div className="mt-4 pt-2 border-t border-dashed border-gray-300">
                        <div className="grid grid-cols-[80px_1fr] gap-1 font-black">
                          <span>{isOps ? "Menu" : "Digunakan"}</span>
                          <span>: {(() => {
                            const date = new Date(selectedInvoice.invoice.invoice_date);
                            date.setDate(date.getDate() + 1);
                            return formatIndonesianDate(date.toISOString().split('T')[0]);
                          })()}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Table */}
                  <table className="w-full border-collapse border border-black text-[11px] mt-6">
                    <thead>
                      <tr className="bg-gray-100 uppercase font-black">
                        <th className="border border-black px-2 py-3 w-10 text-center">#</th>
                        <th className="border border-black px-4 py-3 text-left">DESKRIPSI BARANG</th>
                        <th className="border border-black px-4 py-3 w-16 text-right">QTY</th>
                        <th className="border border-black px-4 py-3 w-24 text-right">HARGA</th>
                        <th className="border border-black px-4 py-3 w-28 text-right">SUBTOTAL</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedInvoice.items.map((item, i) => (
                        <tr key={item.id} className="border-b border-black">
                          <td className="border-x border-black px-2 py-3 text-center">{i + 1}</td>
                          <td className="border-x border-black px-4 py-3 font-black">{item.product_name}</td>
                          <td className="border-x border-black px-4 py-3 text-right font-black">
                            {item.quantity} {item.unit}
                          </td>
                          <td className="border-x border-black px-4 py-3 text-right font-bold">
                            {item.unit_price.toLocaleString("id-ID")}
                          </td>
                          <td className="border-x border-black px-4 py-3 text-right font-black">
                            Rp {item.subtotal.toLocaleString("id-ID")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-100 font-black text-sm">
                        <td colSpan={4} className="border border-black px-6 py-4 text-right tracking-widest">
                          TOTAL TAGIHAN
                        </td>
                        <td className="border border-black px-6 py-4 text-right">
                          Rp {selectedInvoice.invoice.total_amount.toLocaleString("id-ID")}
                        </td>
                      </tr>
                    </tfoot>
                  </table>

                  {/* Footer / Signatures */}
                  <div className="mt-12 grid grid-cols-2 gap-10">
                    <div className="text-[10px] text-gray-500 italic leading-relaxed">
                      <p className="font-bold text-black uppercase mb-1">Catatan:</p>
                      <p>1. Invoice ini adalah bukti sah penagihan barang.</p>
                      <p>2. Pembayaran harap dilakukan sesuai dengan termin yang disepakati.</p>
                      <p>3. Barang yang sudah diterima tidak dapat dikembalikan.</p>
                    </div>
                    <div className="text-center text-[10px] font-black uppercase flex flex-col justify-end h-32">
                      <p className="mb-16 italic text-gray-400">HORMAT KAMI,</p>
                      <div className="w-40 h-px bg-black mx-auto"></div>
                      <p className="mt-2 font-black uppercase">{companyName}</p>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
};
