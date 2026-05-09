import React, { useState, useEffect } from "react";
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
import type { Invoice, InvoiceDetail } from "../types";
import Swal from "sweetalert2";

export const InvoicePage: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceDetail | null>(
    null,
  );
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadInvoices();
  }, []);

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
      alert(String(e));
    }
  };

  const finalize = async (id: string) => {
    if (!confirm("Finalisasi invoice? Harga jual akan di-update ke katalog."))
      return;
    try {
      await invoke("finalize_invoice", { invoiceId: id });
      loadInvoices();
      if (selectedInvoice?.invoice.id === id) viewDetail(id);
    } catch (e) {
      Swal.fire("Gagal", String(e), "error");
    }
  };

  const updateItem = async (itemId: string, quantity: number, unitPrice: number) => {
    try {
      await invoke("update_invoice_item", { itemId, quantity, unitPrice });
      if (selectedInvoice) viewDetail(selectedInvoice.invoice.id);
      loadInvoices();
    } catch (e) {
      Swal.fire("Gagal", String(e), "error");
    }
  };

  const deleteItem = async (itemId: string) => {
    if (!confirm("Hapus item dari invoice?")) return;
    try {
      await invoke("delete_invoice_item", { itemId });
      if (selectedInvoice) viewDetail(selectedInvoice.invoice.id);
      loadInvoices();
    } catch (e) {
      Swal.fire("Gagal", String(e), "error");
    }
  };

  const addManualItem = async () => {
    if (!selectedInvoice) return;
    const { value: formValues } = await Swal.fire({
      title: 'Tambah Item Manual',
      html:
        '<input id="swal-name" class="swal2-input" placeholder="Nama Produk">' +
        '<input id="swal-qty" class="swal2-input" placeholder="Qty" type="number">' +
        '<input id="swal-unit" class="swal2-input" placeholder="Satuan (misal: KG)">' +
        '<input id="swal-price" class="swal2-input" placeholder="Harga Satuan" type="number">',
      focusConfirm: false,
      preConfirm: () => {
        return [
          (document.getElementById('swal-name') as HTMLInputElement).value,
          (document.getElementById('swal-qty') as HTMLInputElement).value,
          (document.getElementById('swal-unit') as HTMLInputElement).value,
          (document.getElementById('swal-price') as HTMLInputElement).value
        ]
      }
    });

    if (formValues) {
      const [productName, qty, unit, price] = formValues;
      if (!productName || !qty || !unit || !price) {
        Swal.fire("Gagal", "Semua field harus diisi", "error");
        return;
      }
      try {
        await invoke("add_manual_invoice_item", {
          invoiceId: selectedInvoice.invoice.id,
          productName,
          quantity: parseFloat(qty),
          unit,
          unitPrice: parseFloat(price)
        });
        viewDetail(selectedInvoice.invoice.id);
        loadInvoices();
      } catch (e) {
        Swal.fire("Gagal", String(e), "error");
      }
    }
  };

  const filteredInvoices = invoices.filter(
    (inv) =>
      inv.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
      (inv.kitchen_name || "").toLowerCase().includes(search.toLowerCase()),
  );

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

        <div className="max-w-5xl mx-auto space-y-4">
          {filteredInvoices.map((inv) => (
            <div
              key={inv.id}
              className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-6">
                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center border transition-all shadow-sm shrink-0 
                  ${inv.invoice_type === "daily" ? "bg-amber-50 text-amber-600 border-amber-100 group-hover:bg-amber-600 group-hover:text-white" : "bg-emerald-50 text-emerald-600 border-emerald-100 group-hover:bg-emerald-600 group-hover:text-white"}`}
                >
                  <Receipt size={22} strokeWidth={2.5} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-slate-800 text-lg tracking-tight">
                      {inv.invoice_number}
                    </h3>
                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-widest border 
                      ${inv.invoice_type === "daily" ? "bg-amber-50 text-amber-500 border-amber-100" : "bg-emerald-50 text-emerald-500 border-emerald-100"}`}
                    >
                      {inv.invoice_type === "daily" ? "HARIAN" : "OPS"}
                    </span>
                    {inv.status === "finalized" && (
                      <span className="flex items-center gap-1 text-[10px] font-black bg-blue-50 text-blue-600 px-2 py-0.5 rounded border border-blue-100 uppercase tracking-widest">
                        <CheckCircle2 size={10} /> FINALIZED
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-1.5 text-xs font-bold text-slate-400 uppercase tracking-tighter">
                    <span className="text-slate-800">{inv.kitchen_name}</span>
                    <span className="text-slate-200">•</span>
                    <span>{inv.invoice_date}</span>
                    <span className="text-slate-200">•</span>
                    <span className="text-blue-600 font-black">
                      Rp {inv.total_amount.toLocaleString("id-ID")}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => viewDetail(inv.id)}
                  className="bg-slate-50 hover:bg-slate-100 text-slate-800 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-slate-200 flex items-center gap-2"
                >
                  <Eye size={14} /> LIHAT
                </button>
                {inv.status !== "finalized" && (
                  <button
                    onClick={() => finalize(inv.id)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 transition-all border border-blue-600 flex items-center gap-2"
                  >
                    FINALISASI
                  </button>
                )}
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
                      {selectedInvoice.invoice.invoice_date}
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
                      <th className="border border-black px-4 py-3 w-24 text-right">
                        UNIT PRICE
                      </th>
                      <th className="border border-black px-4 py-3 w-28 text-right">
                        SUBTOTAL
                      </th>
                      {selectedInvoice.invoice.status === "draft" && (
                        <th className="border border-black px-4 py-3 w-10 text-center no-print">
                        </th>
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
                                className="w-12 text-right bg-transparent outline-none border-b border-dashed border-slate-300 focus:border-blue-500"
                                defaultValue={item.quantity}
                                onBlur={(e) => updateItem(item.id, parseFloat(e.target.value), item.unit_price)}
                              />
                              <span className="text-[9px] text-gray-400">
                                {item.unit}
                              </span>
                            </div>
                          ) : (
                            <>
                              {item.quantity}{" "}
                              <span className="text-[9px] text-gray-400 ml-1">
                                {item.unit}
                              </span>
                            </>
                          )}
                        </td>
                        <td className="border-x border-black px-4 py-3 text-right font-bold">
                          {selectedInvoice.invoice.status === "draft" ? (
                            <input
                              type="number"
                              className="w-full text-right bg-transparent outline-none border-b border-dashed border-slate-300 focus:border-blue-500"
                              defaultValue={item.unit_price}
                              onBlur={(e) => updateItem(item.id, item.quantity, parseFloat(e.target.value))}
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
                        <td className="border-x border-black px-4"></td>
                        <td className="border-x border-black px-4"></td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-100 font-black text-sm">
                      <td
                        colSpan={5}
                        className="border border-black px-6 py-4 text-right tracking-widest"
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
                    onClick={addManualItem}
                    className="bg-emerald-50 text-emerald-600 px-6 py-2.5 rounded-xl font-black text-[10px] shadow-sm hover:bg-emerald-600 hover:text-white transition-all flex items-center gap-2 uppercase tracking-widest"
                  >
                    <Plus size={14} /> Tambah Item Manual
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
            <div className="text-center mb-8 border-b-2 border-black pb-4">
              <h1 className="text-2xl font-black">ZEN SUPPLIER</h1>
              <p className="text-sm font-bold uppercase">
                {selectedInvoice.invoice.invoice_type === "daily"
                  ? "INVOICE HARIAN"
                  : "INVOICE OPERASIONAL"}
              </p>
              <p className="text-sm font-bold">
                NO: {selectedInvoice.invoice.invoice_number}
              </p>
            </div>
            <div className="flex justify-between text-sm mb-8 font-bold uppercase">
              <div>KEPADA: {selectedInvoice.invoice.kitchen_name}</div>
              <div>TANGGAL: {selectedInvoice.invoice.invoice_date}</div>
            </div>
            <table className="w-full border-collapse border border-black text-xs">
              <thead>
                <tr className="bg-gray-100 uppercase font-bold">
                  <th className="border border-black px-2 py-2">#</th>
                  <th className="border border-black px-2 py-2 text-left">
                    ITEM
                  </th>
                  <th className="border border-black px-2 py-2 text-right">
                    QTY
                  </th>
                  <th className="border border-black px-2 py-2 text-right">
                    HARGA
                  </th>
                  <th className="border border-black px-2 py-2 text-right">
                    TOTAL
                  </th>
                </tr>
              </thead>
              <tbody>
                {selectedInvoice.items.map((item, i) => (
                  <tr key={item.id}>
                    <td className="border border-black px-2 py-2 text-center">
                      {i + 1}
                    </td>
                    <td className="border border-black px-2 py-2 font-bold">
                      {item.product_name}
                    </td>
                    <td className="border border-black px-2 py-2 text-right font-black">
                      {item.quantity} {item.unit}
                    </td>
                    <td className="border border-black px-2 py-2 text-right">
                      {item.unit_price.toLocaleString("id-ID")}
                    </td>
                    <td className="border border-black px-2 py-2 text-right font-black">
                      {item.subtotal.toLocaleString("id-ID")}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-100 font-black">
                  <td
                    colSpan={4}
                    className="border border-black px-2 py-3 text-right"
                  >
                    GRAND TOTAL
                  </td>
                  <td className="border border-black px-2 py-3 text-right">
                    Rp{" "}
                    {selectedInvoice.invoice.total_amount.toLocaleString(
                      "id-ID",
                    )}
                  </td>
                </tr>
              </tfoot>
            </table>
            <div className="mt-20 text-center text-xs font-bold uppercase">
              <p className="mb-20">FINANCE DEPARTMENT,</p>
              <p>(________________)</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
