import React, { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  PackagePlus,
  ArrowLeft,
  Save,
  Info,
  Layers,
  Tag,
  PlusCircle,
  Trash2,
  AlertCircle,
  Search,
  ChevronDown,
  Building2,
  UserPlus,
  Check,
} from "lucide-react";
import type { Supplier, Product } from "../types";
import { SupplierModal } from "../components/SupplierModal";
import { CurrencyInput } from "../components/CurrencyInput";
import Swal from "sweetalert2";

interface ProductRegistrationPageProps {
  onBack: () => void;
  editingProduct?: Product | null;
}

interface AdditionalUnit {
  unit_name: string;
  conversion: number;
  buy_price: number | "";
  sell_price: number | "";
  is_custom_price: boolean;
}

export const ProductRegistrationPage: React.FC<
  ProductRegistrationPageProps
> = ({ onBack, editingProduct }) => {
  const [loading, setLoading] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [neto, setNeto] = useState("");
  const [baseUnit, setBaseUnit] = useState("");
  const [category, setCategory] = useState("");
  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [buyPrice, setBuyPrice] = useState<number | "">("");
  const [sellPrice, setSellPrice] = useState<number | "">("");
  const [additionalUnits, setAdditionalUnits] = useState<AdditionalUnit[]>([]);
  const [itemType, setItemType] = useState<"dapur" | "operational">("dapur");

  // Category search states
  const [categories, setCategories] = useState<string[]>([]);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const categoryRef = useRef<HTMLDivElement>(null);
  const [dbUnits, setDbUnits] = useState<string[]>([]);

  // Supplier states
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [showSupplierDropdown, setShowSupplierDropdown] = useState(false);
  const [supplierSearch, setSupplierSearch] = useState("");
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const supplierRef = useRef<HTMLDivElement>(null);

  // Unit search states
  const [showUnitDropdown, setShowUnitDropdown] = useState(false);
  const unitRef = useRef<HTMLDivElement>(null);
  const defaultUnits = [
    "KG",
    "PCS",
    "LTR",
    "GRM",
    "BOX",
    "SAK",
    "PAK",
    "DUS",
    "BTL",
    "KARUNG",
    "IKAT",
  ];

  useEffect(() => {
    if (editingProduct) {
      setName(editingProduct.name);
      setNeto(editingProduct.neto || "");
      setBaseUnit(editingProduct.base_unit);
      setCategory(editingProduct.category || "");
      setSupplierId(editingProduct.supplier_id);
      setItemType((editingProduct.item_type as any) || "dapur");

      // Use nullish coalescing to preserve 0 if it exists as a price
      const baseBuy = editingProduct.latest_buy_price ?? "";
      const baseSell = editingProduct.latest_sell_price ?? "";
      setBuyPrice(baseBuy);
      setSellPrice(baseSell);

      const units: AdditionalUnit[] = (editingProduct.units || [])
        .filter((u) => !u.is_base_unit)
        .map((u) => {
          const bp = u.latest_buy_price;
          const sp = u.latest_sell_price;

          // Determine if it's custom or derived
          const expectedBuy = typeof baseBuy === "number" ? baseBuy * u.conversion_to_base : 0;
          const expectedSell = typeof baseSell === "number" ? baseSell * u.conversion_to_base : 0;

          // It's custom if the price is set in DB and deviates from base price * conversion
          const isCustom = (bp !== null && Math.abs(bp - expectedBuy) > 0.1) ||
            (sp !== null && Math.abs(sp - expectedSell) > 0.1);

          return {
            unit_name: u.unit_name,
            conversion: u.conversion_to_base,
            buy_price: bp ?? (expectedBuy || ""),
            sell_price: sp ?? (expectedSell || ""),
            is_custom_price: isCustom,
          };
        });
      setAdditionalUnits(units);
    }
  }, [editingProduct]);

  useEffect(() => {
    loadCategories();
    loadSuppliers();
    loadDbUnits();

    const handleClickOutside = (event: MouseEvent) => {
      if (
        categoryRef.current &&
        !categoryRef.current.contains(event.target as Node)
      ) {
        setShowCategoryDropdown(false);
      }
      if (
        supplierRef.current &&
        !supplierRef.current.contains(event.target as Node)
      ) {
        setShowSupplierDropdown(false);
      }
      if (unitRef.current && !unitRef.current.contains(event.target as Node)) {
        setShowUnitDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const loadCategories = async () => {
    try {
      const data = await invoke<string[]>("get_categories");
      setCategories(data);
    } catch (e) {
      console.error(e);
    }
  };

  const loadDbUnits = async () => {
    try {
      // We'll create this command next
      const data = await invoke<string[]>("get_all_units");
      setDbUnits(data);
    } catch (e) {
      console.error(e);
    }
  };

  const loadSuppliers = async () => {
    try {
      const data = await invoke<Supplier[]>("get_suppliers");
      setSuppliers(data);
    } catch (e) {
      console.error(e);
    }
  };

  const syncDerivedPrices = (
    newBaseBuy: number | "",
    newBaseSell: number | "",
  ) => {
    setAdditionalUnits((prev) =>
      prev.map((u) => {
        if (u.is_custom_price) return u;
        return {
          ...u,
          buy_price: newBaseBuy !== "" ? newBaseBuy * u.conversion : "",
          sell_price: newBaseSell !== "" ? newBaseSell * u.conversion : "",
        };
      }),
    );
  };

  const handleBaseBuyChange = (val: number | "") => {
    setBuyPrice(val);
    syncDerivedPrices(val, sellPrice);
  };

  const handleBaseSellChange = (val: number | "") => {
    setSellPrice(val);
    syncDerivedPrices(buyPrice, val);
  };

  const handleSave = async () => {
    if (!name.trim() || !baseUnit.trim()) {
      Swal.fire({
        title: "Data Tidak Lengkap",
        text: "Nama Produk dan Satuan Dasar wajib diisi!",
        icon: "warning",
        confirmButtonColor: "#2563eb",
      });
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: name.trim(),
        neto: neto.trim() ? neto.trim() : null,
        base_unit: baseUnit.trim().toUpperCase(),
        category: category.trim() ? category.trim().toUpperCase() : null,
        supplier_id: supplierId,
        item_type: itemType,
        units: additionalUnits.map((u) => ({
          unit_name: u.unit_name.trim().toUpperCase(),
          conversion_to_base: Number(u.conversion),
          is_base_unit: false,
          buy_price: u.buy_price === "" ? null : Number(u.buy_price),
          sell_price: u.sell_price === "" ? null : Number(u.sell_price),
        })),
        buy_price: buyPrice === "" ? null : Number(buyPrice),
        sell_price: sellPrice === "" ? null : Number(sellPrice),
      };

      if (editingProduct) {
        await invoke("update_product", { productId: editingProduct.id, payload });
      } else {
        await invoke("create_product", { payload });
      }

      Swal.fire({
        title: "Berhasil!",
        text: "Produk berhasil ditambahkan ke katalog.",
        icon: "success",
        confirmButtonColor: "#2563eb",
        confirmButtonText: "Selesai",
        timer: 1500,
        timerProgressBar: true,
        customClass: {
          popup: "rounded-3xl border-0 shadow-2xl",
          confirmButton: "rounded-xl px-8 py-2.5 font-extrabold uppercase tracking-widest text-[10px]",
        },
      }).then(() => {
        onBack();
      });
    } catch (e) {
      Swal.fire({
        title: "Gagal!",
        text: "Gagal menyimpan produk: " + String(e),
        icon: "error",
        confirmButtonColor: "#ef4444",
      });
    } finally {
      setLoading(false);
    }
  };

  const addUnit = () => {
    const newUnit: AdditionalUnit = {
      unit_name: "",
      conversion: 1,
      buy_price: buyPrice !== "" ? buyPrice : "",
      sell_price: sellPrice !== "" ? sellPrice : "",
      is_custom_price: false,
    };
    setAdditionalUnits([...additionalUnits, newUnit]);
  };

  const removeUnit = (index: number) => {
    setAdditionalUnits(additionalUnits.filter((_, i) => i !== index));
  };

  const updateUnit = (index: number, updates: Partial<AdditionalUnit>) => {
    const newUnits = [...additionalUnits];
    let unit = { ...newUnits[index], ...updates };
    if ("conversion" in updates && !unit.is_custom_price) {
      unit.buy_price = buyPrice !== "" ? buyPrice * unit.conversion : "";
      unit.sell_price = sellPrice !== "" ? sellPrice * unit.conversion : "";
    }
    if ("buy_price" in updates || "sell_price" in updates) {
      unit.is_custom_price = true;
    }
    newUnits[index] = unit;
    setAdditionalUnits(newUnits);
  };

  const selectedSupplier = suppliers.find((s) => s.id === supplierId);
  const filteredSuppliers = suppliers.filter(
    (s) =>
      s.name.toLowerCase().includes(supplierSearch.toLowerCase()) ||
      s.code.toLowerCase().includes(supplierSearch.toLowerCase()),
  );

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f8fafc] overflow-hidden text-slate-900 selection:bg-blue-100 selection:text-blue-700">
      <SupplierModal
        isOpen={isSupplierModalOpen}
        onClose={() => setIsSupplierModalOpen(false)}
        onSuccess={(s) => {
          loadSuppliers();
          setSupplierId(s.id);
          setSupplierSearch(s.name);
        }}
      />

      {/* Sticky Header */}
      <div className="px-8 py-5 bg-white border-b border-slate-200 flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 transition-all"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-xl border border-blue-100">
              <PackagePlus size={20} className="text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">
                {editingProduct ? "Edit Master Produk" : "Registrasi Produk Baru"}
              </h2>
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-[0.2em] opacity-80">
                {editingProduct ? `Update data ${editingProduct.name}` : "Lengkapi data master produk"}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={loading}
            className={`bg-blue-600 text-white px-8 py-2.5 rounded-xl font-extrabold text-[10px] shadow-lg shadow-blue-500/20 hover:bg-blue-700 active:scale-95 transition-all flex items-center gap-2 uppercase tracking-widest ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <Save size={14} />
            )}
            SIMPAN PRODUK
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-8 space-y-8">
          {/* Row 1: Informasi Dasar (Full Width) */}
          <section className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-visible">
            <div className="px-8 py-5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
              <div className="p-1.5 bg-blue-100 text-blue-600 rounded-lg">
                <Info size={16} />
              </div>
              <h3 className="font-extrabold text-slate-800 text-sm uppercase tracking-tight">
                Informasi Dasar Produk
              </h3>
            </div>
            <div className="p-8">
              <div className="grid grid-cols-12 gap-6 items-start">
                {/* Nama Produk - 5 Columns */}
                <div className="col-span-5">
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2 block">
                    Nama Produk Master *
                  </label>
                  <div className="relative">
                    <input
                      className="w-full py-3 px-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-blue-500 font-semibold text-slate-800 text-lg transition-all focus:ring-4 focus:ring-blue-500/10 placeholder:font-medium"
                      placeholder="Misal: Minyak Goreng..."
                      value={name}
                      onChange={(e) => {
                        const val = e.target.value;
                        const proper = val.toLowerCase().replace(/(?:^|\s)\w/g, (m) => m.toUpperCase());
                        setName(proper);
                      }}
                    />
                  </div>
                </div>

                {/* Neto - 2 Columns (Optional) */}
                <div className="col-span-2">
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2 block">
                    Neto / Ukuran
                  </label>
                  <div className="relative">
                    <input
                      className="w-full py-3 px-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-blue-500 font-semibold text-slate-700 transition-all focus:ring-4 focus:ring-blue-500/10"
                      placeholder="18 Ltr, 500g..."
                      value={neto}
                      onChange={(e) => {
                        const val = e.target.value;
                        const proper = val.toLowerCase().replace(/(?:^|\s)\w/g, (m) => m.toUpperCase());
                        setNeto(proper);
                      }}
                    />
                  </div>
                </div>

                {/* Satuan Dasar - 2 Columns with Dropdown */}
                <div className="col-span-2 relative" ref={unitRef}>
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2 block text-center">
                    Satuan *
                  </label>
                  <div className="relative">
                    <input
                      className="w-full py-3 px-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-blue-500 font-semibold text-slate-700 text-center transition-all focus:ring-4 focus:ring-blue-500/10"
                      placeholder="Kg..."
                      value={baseUnit}
                      onChange={(e) => {
                        setBaseUnit(e.target.value.toUpperCase());
                        setShowUnitDropdown(true);
                      }}
                      onFocus={() => setShowUnitDropdown(true)}
                    />
                    {showUnitDropdown && (
                      <div className="absolute top-full left-0 w-full mt-2 border border-slate-200 rounded-2xl shadow-2xl z-50 max-h-64 overflow-y-auto p-2 animate-in fade-in slide-in-from-top-2 duration-300 backdrop-blur-xl bg-white/90">
                        {Array.from(new Set([...dbUnits, ...defaultUnits]))
                          .filter((u) =>
                            u.toLowerCase().includes(baseUnit.toLowerCase()),
                          )
                          .map((u, i) => (
                            <button
                              key={i}
                              className="w-full px-3 py-2.5 text-center text-xs font-semibold text-slate-600 hover:bg-blue-600 hover:text-white rounded-xl transition-all mb-0.5 last:mb-0"
                              onClick={() => {
                                setBaseUnit(u);
                                setShowUnitDropdown(false);
                              }}
                            >
                              {u}
                            </button>
                          ))}
                        {baseUnit &&
                          !defaultUnits.includes(baseUnit.toUpperCase()) && (
                            <button
                              className="w-full mt-1 px-2 py-2 text-center text-[10px] font-extrabold text-blue-600 bg-blue-50 rounded-lg"
                              onClick={() => setShowUnitDropdown(false)}
                            >
                              + "{baseUnit}"
                            </button>
                          )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="col-span-3 relative" ref={categoryRef}>
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2 block">
                    Kategori
                  </label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                      <Search size={16} />
                    </div>
                    <input
                      className="w-full pl-11 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-blue-500 font-semibold text-slate-700 transition-all focus:ring-4 focus:ring-blue-500/10 text-sm"
                      placeholder="Pilih..."
                      value={category}
                      onChange={(e) => {
                        const val = e.target.value;
                        const proper = val.toLowerCase().replace(/(?:^|\s)\w/g, (m) => m.toUpperCase());
                        setCategory(proper);
                        setShowCategoryDropdown(true);
                      }}
                      onFocus={() => setShowCategoryDropdown(true)}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300">
                      <ChevronDown
                        size={16}
                        className={`transition-transform duration-300 ${showCategoryDropdown ? "rotate-180" : ""}`}
                      />
                    </div>
                  </div>
                  {showCategoryDropdown && (
                    <div className="absolute top-full left-0 w-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 max-h-64 overflow-y-auto p-2 animate-in fade-in slide-in-from-top-2 duration-200">
                      {categories.filter((c) =>
                        c.toLowerCase().includes(category.toLowerCase()),
                      ).length > 0 ? (
                        categories
                          .filter((c) =>
                            c.toLowerCase().includes(category.toLowerCase()),
                          )
                          .map((c, i) => (
                            <button
                              key={i}
                              className="w-full px-4 py-3 text-left text-sm font-semibold text-slate-600 hover:bg-blue-50 hover:text-blue-600 rounded-xl transition-all flex items-center justify-between group"
                              onClick={() => {
                                setCategory(c);
                                setShowCategoryDropdown(false);
                              }}
                            >
                              <span className="truncate">{c}</span>
                              <Check
                                size={14}
                                className={`shrink-0 opacity-0 group-hover:opacity-100 transition-opacity ${category === c ? "opacity-100" : ""}`}
                              />
                            </button>
                          ))
                      ) : (
                        <div className="px-4 py-8 text-center text-slate-400">
                          <p className="text-[10px] font-extrabold uppercase tracking-widest">
                            Kosong
                          </p>
                        </div>
                      )}
                      {category && !categories.includes(category) && (
                        <button
                          className="w-full mt-1 px-4 py-3 text-left text-[10px] font-extrabold text-blue-600 bg-blue-50 rounded-xl flex items-center gap-2 hover:bg-blue-100 transition-all uppercase tracking-tight"
                          onClick={() => setShowCategoryDropdown(false)}
                        >
                          <PlusCircle size={14} />
                          Tambah "{category}"
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column: Supplier & Harga Dasar */}
            <div className="lg:col-span-4 space-y-8">
              {/* Section: Supplier Utama */}
              <section className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-visible">
                <div className="px-8 py-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-amber-100 text-amber-600 rounded-lg">
                      <Building2 size={16} />
                    </div>
                    <h3 className="font-extrabold text-slate-800 text-sm uppercase tracking-tight">
                      Supplier Utama
                    </h3>
                  </div>
                  <button
                    onClick={() => setIsSupplierModalOpen(true)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-all shadow-sm border border-blue-100 group"
                  >
                    <UserPlus
                      size={14}
                      className="group-hover:scale-110 transition-transform"
                    />
                    <span className="text-[10px] font-extrabold uppercase tracking-wider">
                      Tambah
                    </span>
                  </button>
                </div>
                <div className="p-8 space-y-4">
                  <div className="relative" ref={supplierRef}>
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2 block">
                      Pilih Supplier Referensi
                    </label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                        <Search size={18} />
                      </div>
                      <input
                        className="w-full pl-12 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-blue-500 font-semibold text-slate-700 transition-all focus:ring-4 focus:ring-blue-500/10"
                        placeholder="Cari Supplier..."
                        value={supplierSearch}
                        onChange={(e) => {
                          setSupplierSearch(e.target.value);
                          setShowSupplierDropdown(true);
                          if (!e.target.value) setSupplierId(null);
                        }}
                        onFocus={() => setShowSupplierDropdown(true)}
                      />
                      <button
                        onClick={() =>
                          setShowSupplierDropdown(!showSupplierDropdown)
                        }
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500"
                      >
                        <ChevronDown
                          size={20}
                          className={`transition-transform duration-300 ${showSupplierDropdown ? "rotate-180" : ""}`}
                        />
                      </button>
                    </div>

                    {showSupplierDropdown && (
                      <div className="absolute top-full left-0 w-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 max-h-72 overflow-y-auto p-2 animate-in fade-in slide-in-from-top-2 duration-200">
                        {filteredSuppliers.length === 0 ? (
                          <div className="px-5 py-8 text-center text-slate-400">
                            <p className="text-[10px] font-extrabold uppercase tracking-widest">
                              Supplier tidak ditemukan
                            </p>
                          </div>
                        ) : (
                          filteredSuppliers.map((s) => (
                            <button
                              key={s.id}
                              className={`w-full px-4 py-3 text-left flex items-center justify-between hover:bg-slate-50 rounded-xl transition-all mb-1 last:mb-0 group ${supplierId === s.id ? "bg-blue-50" : ""}`}
                              onClick={() => {
                                setSupplierId(s.id);
                                setSupplierSearch(s.name);
                                setShowSupplierDropdown(false);
                              }}
                            >
                              <div className="flex flex-col">
                                <span
                                  className={`text-sm font-extrabold transition-colors ${supplierId === s.id ? "text-blue-600" : "text-slate-700 group-hover:text-blue-600"}`}
                                >
                                  {s.name}
                                </span>
                                <span className="text-[9px] text-slate-400 font-mono font-semibold uppercase tracking-tighter">
                                  {s.code} •{" "}
                                  {s.is_internal ? "INTERNAL" : "EKSTERNAL"}
                                </span>
                              </div>
                              {supplierId === s.id && (
                                <Check size={18} className="text-blue-600" />
                              )}
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                  {selectedSupplier && (
                    <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-4 animate-in slide-in-from-left duration-300">
                      <div
                        className={`w-3 h-3 rounded-full shadow-sm ${selectedSupplier.is_internal ? "bg-blue-500" : "bg-amber-500"}`}
                      ></div>
                      <div>
                        <p className="text-xs font-extrabold text-slate-800 uppercase tracking-tight">
                          {selectedSupplier.name}
                        </p>
                        <p className="text-[9px] text-slate-500 font-semibold uppercase tracking-widest mt-0.5">
                          {selectedSupplier.is_internal
                            ? "Supplier Internal / Dapur"
                            : "Pasar / Supplier Luar"}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </section>

              {/* Section: Harga Dasar */}
              <section className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-8 py-5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
                  <div className="p-1.5 bg-emerald-100 text-emerald-600 rounded-lg">
                    <Tag size={16} />
                  </div>
                  <h3 className="font-extrabold text-slate-800 text-sm uppercase tracking-tight">
                    Harga Dasar (per {baseUnit})
                  </h3>
                </div>
                <div className="p-8 space-y-6">
                  <div>
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2 block">
                      Harga Beli Dasar
                    </label>
                    <CurrencyInput
                      value={buyPrice}
                      onChange={handleBaseBuyChange}
                      placeholder="0"
                      className="w-full pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-emerald-500 font-bold text-slate-700 text-xl transition-all focus:ring-4 focus:ring-emerald-500/10"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2 block">
                      Harga Jual Dasar
                    </label>
                    <CurrencyInput
                      value={sellPrice}
                      onChange={handleBaseSellChange}
                      placeholder="0"
                      className="w-full pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-blue-500 font-bold text-slate-700 text-xl transition-all focus:ring-4 focus:ring-blue-500/10"
                    />
                  </div>
                </div>
              </section>

              {/* Section: Tipe Produk */}
              <section className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-8 py-5 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
                  <div className="p-1.5 bg-purple-100 text-purple-600 rounded-lg">
                    <Info size={16} />
                  </div>
                  <h3 className="font-extrabold text-slate-800 text-sm uppercase tracking-tight">
                    Tipe Produk
                  </h3>
                </div>
                <div className="p-8">
                  <div className="flex gap-3">
                    <button
                      onClick={() => setItemType("dapur")}
                      className={`flex-1 py-3 px-4 rounded-2xl text-xs font-extrabold uppercase tracking-widest border-2 transition-all ${itemType === "dapur"
                        ? "bg-blue-50 border-blue-500 text-blue-700 shadow-sm"
                        : "bg-slate-50 border-slate-200 text-slate-400 hover:border-slate-300"
                        }`}
                    >
                      Bahan Dapur
                    </button>
                    <button
                      onClick={() => setItemType("operational")}
                      className={`flex-1 py-3 px-4 rounded-2xl text-xs font-extrabold uppercase tracking-widest border-2 transition-all ${itemType === "operational"
                        ? "bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm"
                        : "bg-slate-50 border-slate-200 text-slate-400 hover:border-slate-300"
                        }`}
                    >
                      Operasional
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-3 font-semibold">
                    {itemType === "dapur"
                      ? "Produk ini akan masuk ke invoice bahan dapur (ZS)"
                      : "Produk ini akan masuk ke invoice operasional (AGS)"}
                  </p>
                </div>
              </section>
            </div>

            {/* Right Column: Strategi Harga */}
            <div className="lg:col-span-8">
              <section className="bg-white rounded-3xl border border-slate-200 shadow-sm h-full flex flex-col overflow-hidden">
                <div className="px-8 py-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-purple-100 text-purple-600 rounded-lg">
                      <Layers size={16} />
                    </div>
                    <h3 className="font-extrabold text-slate-800 text-sm uppercase tracking-tight">
                      Strategi Harga Satuan Turunan
                    </h3>
                  </div>
                  <button
                    onClick={addUnit}
                    className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl font-extrabold text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 active:scale-95"
                  >
                    <PlusCircle size={16} /> Tambah Satuan
                  </button>
                </div>
                <div className="p-8 flex-1">
                  {additionalUnits.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center py-24 border-2 border-dashed border-slate-100 rounded-[2.5rem] bg-slate-50/30">
                      <div className="p-5 bg-white rounded-3xl shadow-sm mb-5 border border-slate-100">
                        <Layers size={40} className="text-slate-200" />
                      </div>
                      <p className="text-xs text-slate-400 font-extrabold uppercase tracking-widest">
                        Belum ada satuan tambahan
                      </p>
                      <p className="text-[10px] text-slate-300 mt-2 max-w-xs text-center leading-relaxed font-semibold">
                        Gunakan ini untuk mendefinisikan kemasan seperti Sak,
                        Pak, atau Dus dengan strategi harga yang berbeda.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="grid grid-cols-12 gap-4 px-6 text-[9px] font-extrabold text-slate-400 uppercase tracking-[0.15em]">
                        <div className="col-span-3">Nama Satuan</div>
                        <div className="col-span-2 text-center">
                          Isi ({baseUnit})
                        </div>
                        <div className="col-span-3">Harga Beli</div>
                        <div className="col-span-3">Harga Jual</div>
                        <div className="col-span-1"></div>
                      </div>
                      <div className="space-y-4">
                        {additionalUnits.map((u, i) => (
                          <div
                            key={i}
                            className={`grid grid-cols-12 gap-4 items-center bg-white p-6 rounded-4xl border transition-all group ${u.is_custom_price ? "border-amber-200 bg-amber-50/10 shadow-sm" : "border-slate-100 hover:border-blue-200"}`}
                          >
                            <div className="col-span-3">
                              <input
                                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-blue-500 font-semibold text-slate-700 text-sm transition-all placeholder:opacity-50"
                                placeholder="Sak, Pak, Dus..."
                                value={u.unit_name}
                                onChange={(e) =>
                                  updateUnit(i, {
                                    unit_name: e.target.value.toUpperCase(),
                                  })
                                }
                              />
                            </div>
                            <div className="col-span-2">
                              <input
                                type="number"
                                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-blue-500 font-extrabold text-slate-700 text-sm text-center transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                value={u.conversion}
                                min={1}
                                onWheel={(e) =>
                                  (e.target as HTMLInputElement).blur()
                                }
                                onChange={(e) =>
                                  updateUnit(i, {
                                    conversion: Math.max(
                                      1,
                                      Number(e.target.value),
                                    ),
                                  })
                                }
                              />
                            </div>
                            <div className="col-span-3">
                              <CurrencyInput
                                value={u.buy_price}
                                onChange={(val) =>
                                  updateUnit(i, { buy_price: val })
                                }
                                placeholder="0"
                                className={`w-full pr-3.5 py-2.5 bg-slate-50 border rounded-2xl outline-none transition-all font-extrabold text-sm ${u.is_custom_price ? "border-emerald-200 text-emerald-600 bg-emerald-50/30 focus:border-emerald-500" : "border-slate-200 text-slate-400 opacity-70 focus:border-blue-500"}`}
                              />
                            </div>
                            <div className="col-span-3">
                              <CurrencyInput
                                value={u.sell_price}
                                onChange={(val) =>
                                  updateUnit(i, { sell_price: val })
                                }
                                placeholder="0"
                                className={`w-full pr-3.5 py-2.5 bg-slate-50 border rounded-2xl outline-none transition-all font-extrabold text-sm ${u.is_custom_price ? "border-blue-200 text-blue-600 bg-blue-50/30 focus:border-blue-500" : "border-slate-200 text-slate-400 opacity-70 focus:border-blue-500"}`}
                              />
                            </div>
                            <div className="col-span-1 flex justify-end gap-5">
                              {u.is_custom_price && (
                                <button
                                  onClick={() =>
                                    updateUnit(i, {
                                      is_custom_price: false,
                                      conversion: u.conversion,
                                    })
                                  }
                                  className="p-2.5 hover:bg-amber-100 rounded-xl text-amber-500 transition-colors"
                                  title="Reset ke Harga Otomatis"
                                >
                                  <ArrowLeft size={18} className="rotate-90" />
                                </button>
                              )}
                              <button
                                onClick={() => removeUnit(i)}
                                className="p-2.5 hover:bg-red-50 rounded-xl text-slate-200 hover:text-red-500 transition-colors"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="mt-8 p-6 bg-slate-50 rounded-4xl border border-slate-100 flex items-start gap-5">
                    <div className="p-3 bg-white text-blue-600 rounded-2xl shadow-sm border border-slate-50">
                      <AlertCircle size={24} />
                    </div>
                    <div>
                      <p className="text-xs font-extrabold text-slate-800 uppercase tracking-tight mb-1.5">
                        Panduan Strategi Harga Turunan
                      </p>
                      <p className="text-[10px] text-slate-500 leading-relaxed font-semibold uppercase tracking-wide opacity-70">
                        Secara default, harga dihitung otomatis (Dasar x Isi).
                        Ketik langsung pada kolom harga untuk menerapkan
                        strategi harga khusus. Warna hijau/biru menandakan harga
                        kustom aktif.
                      </p>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
